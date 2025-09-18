"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Alert,
  Stack,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Chip,
  FormControlLabel,
  CircularProgress,
  Typography,
  Box,
} from "@mui/material";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { FaTrashAlt, FaTimes } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { createProduct, generateDescriptionFromText } from "@/ui/actions/productos/createNewProduct";
import { initialData } from "@/seed/seed";
import Divider from "../divider/Divider";
import { ProductStatus } from "@prisma/client";
import { updateProduct } from "@/ui/actions/productos/updateProduct";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import AutoUploadMedia from "../autoUpload/AutoUploadMedia";
import { useProductosTransaccionesStore } from "@/store/productosTransacciones/productosTransaccionesStore";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import Image from "next/image";

interface ProductFormData {
  nombre: string;
  precio: number;
  descripcion: string;
  descripcionCorta: string;
  slug: string;
  status: ProductStatus;
  tags: string;
  categoriaId: string;
}

//Hacemos opcional el producto para que el componente sirva para editar o crear un nuevo producto
interface Props {
  product?: ProductRedSocial;
}

export default function CreateOrUpdateProduct({ product }: Props) {
  const { register, handleSubmit, control, setValue, watch, reset } = useForm<ProductFormData>({
    defaultValues: {
      nombre: "",
      precio: 0,
      descripcion: "",
      descripcionCorta: "",
      slug: "",
      status: "disponible" as ProductStatus,
      tags: "",
      categoriaId: "",
    },
  });

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  // Para saber el nombre o slug de la categoría seleccionada
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("");
  // Es un set o array de strings con las secciones seleccionadas, se inicia vacío 
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  // Imagenes cargadas, es un array con las imagenes ya subidas a Cloudinary
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  // Sirve para bloquear los botones mientras se esta creando o actualizando el producto
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  // String con las características del producto, cada característica separadas por comeas
  const [caracteristicas, setCaracteristicas] = useState("");
  // Componentes del producto en un solo string separados por comas
  const [componentesInput, setComponentesInput] = useState("");
  const [componentes, setComponentes] = useState<string[]>([]);
  // Para hacer redirección
  const router = useRouter();
  // Para obtener la información de la sesión desde next auth
  const { data: session } = useSession();
  // Obtenemos el id del dueño del negocio que actualizará su producto
  const id = session?.user.id;

  const updateProductoStore = useProductosTransaccionesStore((state) => state.updateProducto);

  const [modalState, setModalState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [modalMessage, setModalMessage] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleMediaChange = useCallback((urls: string[] | string | undefined) => {
    setUploadedImages(
        Array.isArray(urls) ? urls : urls ? [urls] : []
    );
}, []); // Dependencias vacías: setUploadedImages es estable.

  useEffect(() => {
    // Si viene el producto con el método rerset de useForm, insertamos estos valores del producto en el formulario
    if (product) {
      reset({
        nombre: product.nombre,
        precio: product.precio,
        descripcion: product.descripcion,
        descripcionCorta: product.descripcionCorta,
        slug: product.slug,
        status: product.status,
        tags: product.tags.join(", "),
        categoriaId: product.categoriaId,
      });

      // Desde el archivo initialData se revisa si la categoría que viene en el producto este en las disponibles
      const category = initialData.categorias.find((cat) => cat.id === product.categoriaId);
      // Si la verificación anterior se cumple y category no esta vacía, se obtiene el slug ("comidad") y se almacena en CategorySlug
      if (category) {
        setSelectedCategorySlug(category.slug);
      }
      // Como recibimos un producto que contiene secciones con id y slug, extraemos los ids de las secciones y los almacenamos en el set de selectedSections, queda algo así ["s1", "s3", "s5"]
      // Se almacenan como un set para evitar duplicados y facilitar la manipulación
      setSelectedSections(new Set(product.sections));


      // Obtenemos los componentes del producto y los almacenamos en el array de componentes
      setComponentes(product.componentes);
    }
    // Si no viene un producto, se reinicia el formulario con los valores por defecto
  }, [product, reset]);

  // Se utiliza para filtrar las secciones según la categoría seleccionada y solo mostrar las secciones que pertenecen a esa categoría
  const filteredSections = initialData.secciones.filter(
    (section) => section.categorySlug === selectedCategorySlug
  );

  // Función para generar un slug único basado en el nombre del producto
  const generateSlug = (title: string) => {
    const randomId = Math.random().toString(36).substring(2, 6);
    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    return `${slug}-${randomId}`;
  };
  // Vatiable que se utiliza para obtener el nombre del producto desde el formulario y generar un slug automáticamente
  const nombreProducto = watch("nombre");

  // Efecto que se ejecuta cuando cambia el nombre del producto, si no hay un producto cargado, genera un slug automáticamente
  useEffect(() => {
    if (!product && nombreProducto) {
      const nuevoSlug = generateSlug(nombreProducto);
      setValue("slug", nuevoSlug, { shouldValidate: true });
    }
  }, [nombreProducto, setValue, product]);


  // Función que se ejecuta al enviar el formulario, recibe los datos del formulario como parámetro
  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setModalState('loading');
    setModalMessage(product ? 'Estamos actualizando tu producto...' : 'Estamos creando tu producto...');

    try {
      setAlert(null);
      // Revisa el id del usuario autenticado, si no hay un id, muestra un mensaje de error
      if (!id) {
        setModalState('error');
        setModalMessage("Debes iniciar sesión para guardar el producto.");
        return;
      }
      // Cada producto debe tener al menos un nombre, un precio y un slug, si no hay un nombre, muestra un mensaje de error
      if (!selectedCategorySlug) {
        setModalState('error');
        setModalMessage("Debes seleccionar una categoría.");
        return;
      }
      // Cada producto debe tener imagenes, si no hay imágenes subidas, muestra un mensaje de error
      if (uploadedImages.length === 0) {
        setModalState('error');
        setModalMessage("Debes subir al menos una imagen antes de guardar el producto.");
        return;
      }
      // Cada productodebe pertenecer a una categoría y tener al menos una sección seleccionada, si no hay secciones seleccionadas, muestra un mensaje de error
      if (selectedSections.size === 0) {
        setModalState('error');
        setModalMessage("Debes seleccionar al menos una sección.");
        return;
      }
      // Se crea un formData para enviar los datos del formulario al servidor, se utiliza FormData para manejar archivos e imágenes con la información del formulario
      const formData = new FormData();
      // Se agregan los datos del formulario al formData con el método append, se convierten los números a string para evitar errores al enviar
      formData.append("nombre", data.nombre);
      formData.append("precio", data.precio.toString());
      formData.append("descripcion", data.descripcion);
      formData.append("descripcionCorta", data.descripcionCorta);
      formData.append("slug", data.slug);
      formData.append("prioridad", "1");
      formData.append("status", data.status);
      formData.append("tags", data.tags);
      formData.append("usuarioId", id);

      const category = initialData.categorias.find((cat) => cat.slug === selectedCategorySlug);
      if (category) {
        // Se agrega la categoría pero se agrega es el id de la categoría, no el slug
        formData.append("categoriaId", category.id);
      } else {
        // Si la categoría no existe, muestra un mensaje de error
        setModalState('error');
        setModalMessage("La categoría seleccionada no existe.");
        return;
      }
      // Se agregan las secciones seleccionadas, se convierte el set de selectedSections a un array y se agrega cada id al formData
      selectedSections.forEach((id) => formData.append("seccionIds", id));
      // se agregan las imágenes subidas a Cloudinary, se recorre el array de uploadedImages y se agrega cada url al formData
      uploadedImages.forEach((url) => formData.append("imageUrls", url));
      // Se agregan los componentes del producto, se recorre el array de componentes y se agrega cada componente al formData
      componentes.forEach((componente) => formData.append("componentes", componente));
      // Si inicialmente se paso un producto se utiliza updateProduct, se envía el formData actualizado, el id del producto
      const result = product
        ? await updateProduct(product.id, formData)
        // Si no se pasó un producto, se utiliza createProduct, se envía el formData con los datos del nuevo producto
        : await createProduct(formData);
      // Si la respuesta es exitosa, se redirige al usuario a la página del producto creado o actualizado
      if (result.ok) {
        // Se obtiene el slug de la categoría seleccionada y el id de la primera sección seleccionada
        const firstSectionId = Array.from(selectedSections)[0];
        const section = initialData.secciones.find((sec) => sec.id === firstSectionId);
        if (!section) {
          setModalState('error');
          setModalMessage("La sección seleccionada no existe.");
          return;
        }
        if (product && product.id) {
          updateProductoStore(product.id, {
            nombre: data.nombre,
            precio: data.precio,
          })
        }

        // enlace creado para redirigir al usuario a la página del producto creado o actualizado
        const url = `/${selectedCategorySlug}/${section.slug}/${result.product?.slug}`;
        setRedirectUrl(url);
        setSubmitted(true);
        setModalState('success');
        setModalMessage(product ? "Producto actualizado exitosamente." : "Producto creado exitosamente.");

        setTimeout(() => {
          router.push(url);
        }, 2000);
      } else {
        setModalState('error');
        setModalMessage(result.message || "Ocurrió un error al guardar el producto.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al enviar el formulario";
      setModalState('error');
      setModalMessage(errorMessage);
      console.error("Error al enviar el formulario:", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Función para alternar la selección de secciones, recibe el id de la sección y actualiza el set de selectedSections
  const toggleSection = (id: string) => {
    setSelectedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };
  // Fucnión que se ejecuta al cambiar la categoría, recibe el slug de la categoría y actualiza el estado de selectedCategorySlug y selectedSections
  const handleCategoryChange = (slug: string) => {
    setSelectedCategorySlug(slug);
    setSelectedSections(new Set()); // Clear sections when category changes
  };
  // funcuión que se ejecuta al cambiar el input de características del producto, actualiza el estado de caracteristicas
  const handleGenerateDescription = async () => {

    const nombreProducto = watch("nombre").trim();

    if (!nombreProducto) {
      setAlert({ type: "error", message: "Debes ingresar un nombre para el producto antes de generar la descripción." });
      return;
    }

    if (!caracteristicas.trim()) {
      setAlert({ type: "error", message: "Ingresa las características del producto antes de generar la descripción." });
      return;
    }

    setGenerating(true);
    setAlert(null);

    try {
      const result = await generateDescriptionFromText(nombreProducto, caracteristicas, componentes);
      if (result.ok) {
        // Se obtiene la descripción generada por openai y con el metodo setValue se actualizan los campos del formulario
        setValue("descripcion", result.description || "");
        setValue("descripcionCorta", result.shortDescription || "");
        setValue("tags", result.tags ? result.tags.join(", ") : "");
        setAlert({ type: "success", message: "Descripción generada exitosamente." });
      } else {
        setAlert({ type: "error", message: result.message || "Error al generar la descripción." });
      }
    } catch (error) {
      console.error("Error al generar la descripción:", error);
      setAlert({ type: "error", message: "Hubo un error al generar la descripción con IA." });
    }

    setGenerating(false);
  };

  // Función que se ejecuta al cambiar el input de componentes del producto, actualiza el estado de componentesInput
  const handleGenerateComponentes = () => {
    if (!componentesInput.trim()) return;

    const nuevosComponentes = componentesInput
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setComponentes((prev) => [...prev, ...nuevosComponentes]);
    setComponentesInput("");
  };

  const handleRemoveComponente = (index: number) => {
    setComponentes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCloseModal = () => {
    setModalState('idle');
    if (modalState === 'success' && redirectUrl) {
        router.push(redirectUrl);
    }
  };

  // Variables para definir la cantidad de archivos, si el input permite uno o varios, y si hay archivos iniciales

  const multiple = true;
  const dataEntrada = product?.imagenes;

  const isModalOpen = modalState !== 'idle';

  return (
    <>
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 bg-white p-4 rounded-lg shadow-lg w-full mx-auto ml-0"
    >
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        {product ? "Editar Producto" : "Crear Nuevo Producto"}
      </Typography>

      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Nombre del Producto</FormLabel>
        <TextField label="Nombre" {...register("nombre", { required: true })} fullWidth />
      </FormControl>

      <FormControl>
        <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Precio</FormLabel>
        <TextField label="Precio" type="number" {...register("precio", { required: true })} fullWidth />
      </FormControl>

      <FormControl fullWidth margin="normal">
        <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Categoría</FormLabel>
        <Controller
          name="categoriaId"
          control={control}
          render={({ field }) => (
            <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
              {initialData.categorias.map((category) => {
                const isSelected = field.value === category.id;

                return (
                  <Box
                    key={`${category.id}-${category.slug}`}
                    onClick={() => {
                      handleCategoryChange(category.slug);
                      setValue("categoriaId", category.id);
                    }}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      px: 2.5,
                      py: 1.2,
                      borderRadius: "12px",
                      backgroundColor: isSelected ? "primary.main" : "#fff",
                      boxShadow: isSelected ? 3 : 1,
                      border: "1px solid",
                      borderColor: isSelected ? "primary.main" : "grey.200",
                      color: isSelected ? "#fff" : "text.primary",
                      cursor: "pointer",
                      transition: "all 0.25s ease-in-out",
                      minWidth: "140px",
                      "&:hover": {
                        boxShadow: 3,
                        backgroundColor: isSelected ? "primary.dark" : "grey.100",
                        borderColor: "primary.main",
                      },
                    }}
                  >
                    <Image
                      src={`/imgs/iconos/${category.iconName}`}
                      alt={category.nombre}
                      width={18}
                      height={18}
                      style={{ marginRight: 8 }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {category.nombre}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          )}
        />
      </FormControl>
      <Divider />

      <FormControl fullWidth margin="normal">
        <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Secciones</FormLabel>
        {selectedCategorySlug === "" ? (
          <Typography color="textSecondary">
            Selecciona una categoría para ver las secciones disponibles.
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
            {filteredSections.map((section) => {
              const isActive = selectedSections.has(section.id);
              return (
                <Box
                  key={`${section.id}-${section.nombre}`}
                  onClick={() => toggleSection(section.id)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    px: 2.5,
                    py: 1.2,
                    borderRadius: "12px",
                    backgroundColor: isActive ? "primary.main" : "#fff",
                    boxShadow: isActive ? 3 : 1,
                    border: "1px solid",
                    borderColor: isActive ? "primary.main" : "grey.200",
                    color: isActive ? "#fff" : "text.primary",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      boxShadow: 3,
                      backgroundColor: isActive ? "primary.dark" : "grey.100",
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <Image
                    src={`/imgs/iconos/${section.iconName}`}
                    alt={section.nombre}
                    width={18}
                    height={18}
                    style={{ marginRight: 8 }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {section.nombre}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}
      </FormControl>

      <Divider />

      <div className="bg-gray-100 border-l-4 border-blue-500 p-4 rounded-lg shadow-sm">
        <h4 className="text-blue-700 font-semibold">📸 Instrucción para Subida de Imágenes</h4>
        <p className="text-gray-600 text-md mt-1">
          Agrega imágenes del producto utilizando el botón de carga, con icono de cámara. <br />
          Luego, presiona <strong> &quot;Cargar imágenes seleccionadas&quot; </strong>y espera el mensaje de confirmación antes de continuar.
        </p>
      </div>

      <FormControl>
        <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Imagenes del producto</FormLabel>
        <AutoUploadMedia
          initialData={
            multiple
              ? Array.isArray(dataEntrada)
                ? dataEntrada
                : dataEntrada
                  ? [dataEntrada]
                  : []
              : Array.isArray(dataEntrada)
                ? dataEntrada[0]
                : dataEntrada
          }
          multiple={multiple}
          onChange={handleMediaChange} // Usamos la versión memoizada
          onError={(message) => setAlert({ type: "error", message })}
          onLoading={setLoading}
          mediaType="image"
        />
      </FormControl>

      <div className="bg-gray-100 border-l-4 border-green-600 p-4 rounded-lg shadow-sm">
        <h4 className="text-green-600 font-semibold">🚀 Generación Automática de Descripciones y Tags con IA</h4>
        <p className="text-gray-600 text-md mt-1">
          Para optimizar la visibilidad de tu producto y atraer más clientes, ingresa una descripción detallada con sus principales características.
          No es necesario un formato específico, pero procura incluir información clara y relevante.
          <br /><br />
          Luego, presiona <strong>&quot;Generar Descripción con IA&quot;</strong>. En unos segundos, la IA mejorará la redacción, estructurará la información
          y generará palabras clave (tags) optimizadas para SEO, ayudando a que más personas encuentren tu producto fácilmente. Estas descripciones
          las puedes modificar o eliminar según tus preferencias.
        </p>
      </div>
      <Divider />

      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Componentes del Producto</FormLabel>
        <TextField
          label="Ingresa los componentes (uno por línea)"
          value={componentesInput}
          onChange={(e) => setComponentesInput(e.target.value)}
          multiline
          rows={4}
          placeholder="Ejemplo:\nBandeja decorada\nMix de frutas: Mango, Piña, Banano, Fresa\nHuevos de Codorniz"
          fullWidth
        />
      </FormControl>

      <Button variant="contained" color="primary" sx={{textTransform: "none", fontSize: "0.95rem"}} onClick={handleGenerateComponentes} fullWidth>
        Agregar
      </Button>
      <Divider />

      {componentes.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
          <h4 className="text-blue-700 font-semibold mb-2">📦 Componentes Generados</h4>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {componentes.map((componente, index) => (
              <Chip
                key={`componente-${index}`}
                label={componente}
                onDelete={() => handleRemoveComponente(index)}
                deleteIcon={<FaTrashAlt />}
                color="primary"
                variant="outlined"
              />
            ))}
          </Stack>
        </div>
      )}
      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Características principales del producto</FormLabel>
        <TextField
          label="Características Principales"
          value={caracteristicas}
          onChange={(e) => setCaracteristicas(e.target.value)}
          fullWidth
          multiline
          rows={3}
          helperText="Ejemplo: Bandeja decorada con jugo natural, sandwiches, queso, frutas como kiwi, fresas y duraznos."
        />

        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<AiOutlineCloudUpload />}
          onClick={handleGenerateDescription}
          disabled={generating}
          className="mt-4"
          sx={{textTransform: "none", fontSize: "0.95rem"}}
        >
          {generating ? <CircularProgress size={24} /> : "Generar Descripciones con IA"}
        </Button>

        {alert && (
          <Alert severity={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}
      </FormControl>
      <Divider />

      
      <Divider />

      <div className="bg-gray-100 border-l-4 border-blue-600 p-4 rounded-lg shadow-sm">
        <h5 className="text-blue-600 font-semibold">Descripción completa</h5>
        <p className="text-gray-600 text-md mt-1">
          Esta es la descripción que aparecerá en la información completa del producto
        </p>
      </div>
      <Divider />
      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Descripción</FormLabel>
        <TextField
          label="Descripción"
          {...register("descripcion", { required: true })}
          fullWidth
          multiline
          rows={8}
          InputLabelProps={{ shrink: true }}
        />
      </FormControl>
      <Divider />
      <div className="bg-gray-100 border-l-4 border-blue-600 p-4 rounded-lg shadow-sm">
        <h5 className="text-blue-600 font-semibold">Descripción corta</h5>
        <p className="text-gray-600 text-md mt-1">
          Esta es la descripción que aparece en las tarjetas de productos
        </p>
      </div>
      <Divider />
      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Descripción Corta</FormLabel>
        <TextField
          label="Descripción corta"
          {...register("descripcionCorta")}
          fullWidth
          multiline
          rows={4}
          InputLabelProps={{ shrink: true }}
        />
      </FormControl>
      <Divider />
      <div className="bg-gray-100 border-l-4 border-blue-600 p-4 rounded-lg shadow-sm">
        <h5 className="text-blue-600 font-semibold">🔍 Tags (Palabras Clave)</h5>
        <p className="text-gray-600 text-md mt-1">
          Los tags son palabras clave que ayudan a que tu producto sea más fácil de encontrar en búsquedas.
          Estas palabras están optimizadas para SEO y permiten relacionar el producto con lo que los clientes buscan.
          <br /><br />
          Asegúrate de que los tags sean relevantes y describan bien tu producto. Puedes usar palabras como ingredientes,
          materiales, colores o cualquier término que ayude a identificarlo mejor.
        </p>
      </div>
      <Divider />
      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Tags (Palabras Clave)</FormLabel>
        <TextField
          label="Tags"
          {...register("tags")}
          fullWidth
          multiline
          rows={3}
          helperText="Palabras clave separadas por comas, optimizadas para SEO."
          InputLabelProps={{ shrink: true }}
        />
      </FormControl>
      <Divider />

      <FormControl fullWidth margin="normal">
        <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Slug</FormLabel>
        <TextField
          label="Slug"
          {...register("slug")}
          fullWidth
          InputProps={{
            readOnly: !!product,
          }}
        />
      </FormControl>
      <Divider />
      <FormControl>
        <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>Estado</FormLabel>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <RadioGroup {...field} row>
              <FormControlLabel value="disponible" control={<Radio />} label="Disponible" />
              <FormControlLabel value="agotado" control={<Radio />} label="Agotado" />
              <FormControlLabel value="oculto" control={<Radio />} label="Oculto" />
              <FormControlLabel value="descontinuado" control={<Radio />} label="Descontinuado" />
            </RadioGroup>
          )}
        />
      </FormControl>

      <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading || submitted}>
        {loading ? <CircularProgress size={24} color="inherit" /> : (product ? "Actualizar Producto" : "Crear Producto")}
      </Button>

      {alert && (
        <Alert severity={alert.type} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}
    </form>

    {isModalOpen && createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleCloseModal}
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200 z-10"
              aria-label="Cerrar modal"
            >
              <FaTimes size={20} />
            </button>
            <div className="flex flex-col items-center justify-center text-center">
              {modalState === 'loading' && (
                <>
                  <CircularProgress size={40} className="mb-4" />
                  <Typography variant="h6" sx={{ color: "black" }}>{modalMessage}</Typography>
                </>
              )}
              {modalState === 'success' && (
                <>
                  <Typography variant="h6" color="success.main">{modalMessage}</Typography>
                  <Button onClick={handleCloseModal} variant="contained" color="primary" className="mt-4">
                    Cerrar
                  </Button>
                </>
              )}
              {modalState === 'error' && (
                <>
                  <Typography variant="h6" color="error.main">{modalMessage}</Typography>
                  <Button onClick={handleCloseModal} variant="contained" color="primary" className="mt-4">
                    Cerrar
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body
    )}
    </>
  );
}