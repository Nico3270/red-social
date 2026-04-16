"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Switch,
  Divider as MuiDivider,
  IconButton,
} from "@mui/material";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { FaTrashAlt, FaPlus, FaTimes } from "react-icons/fa";
import { useRouter } from "next/navigation";
import {
  createProduct,
  generateDescriptionFromText,
} from "@/ui/actions/productos/createNewProduct";
import { initialData } from "@/seed/seed";
import Divider from "../divider/Divider";
import { ProductStatus } from "@prisma/client";
import AutoUploadMedia from "../autoUpload/AutoUploadMedia";
import { useProductosTransaccionesStore } from "@/store/productosTransacciones/productosTransaccionesStore";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface ProductFormData {
  nombre: string;
  precio: number;
  descripcion: string;
  descripcionCorta: string;
  slug: string;
  prioridad: number;
  status: ProductStatus;
  tags: string;
  categoriaId: string;
  stock: number | null;
  stockIlimitado: boolean;
  usaVariantes: boolean;
}

interface ProductAttributeInput {
  id: string;
  nombre: string;
  valor: string;
}

interface ProductVariantOptionInput {
  id: string;
  nombre: string;
  valor: string;
}

interface ProductVariantInput {
  id: string;
  nombre: string;
  sku: string;
  precio: string;
  stock: string;
  stockIlimitado: boolean;
  imagenUrl: string;
  isActive: boolean;
  options: ProductVariantOptionInput[];
}

const createId = () => Math.random().toString(36).slice(2, 10);

export default function CreateNewProduct() {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
  } = useForm<ProductFormData>({
    defaultValues: {
      nombre: "",
      precio: 0,
      descripcion: "",
      descripcionCorta: "",
      slug: "",
      prioridad: 1,
      status: "disponible",
      tags: "",
      categoriaId: "",
      stock: null,
      stockIlimitado: true,
      usaVariantes: false,
    },
  });

  const [alert, setAlert] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [caracteristicas, setCaracteristicas] = useState("");
  const [componentesInput, setComponentesInput] = useState("");
  const [componentes, setComponentes] = useState<string[]>([]);

  const [atributos, setAtributos] = useState<ProductAttributeInput[]>([]);
  const [variantes, setVariantes] = useState<ProductVariantInput[]>([]);

  const [showAdvancedInventory, setShowAdvancedInventory] = useState(false);
  const [showAttributesBlock, setShowAttributesBlock] = useState(false);
  const [showVariantsBlock, setShowVariantsBlock] = useState(false);

  const router = useRouter();
  const addProducto = useProductosTransaccionesStore((state) => state.addProducto);

  const [modalState, setModalState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [modalMessage, setModalMessage] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");

  const selectedCategoryId = watch("categoriaId");
  const nombreProducto = watch("nombre");
  const usaVariantes = watch("usaVariantes");
  const stockIlimitado = watch("stockIlimitado");

  const filteredSections = useMemo(
    () =>
      initialData.secciones.filter(
        (section) => section.categorySlug === selectedCategorySlug
      ),
    [selectedCategorySlug]
  );

  const multiple = true;
  const isModalOpen = modalState !== "idle";

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

  useEffect(() => {
    if (nombreProducto) {
      const nuevoSlug = generateSlug(nombreProducto);
      setValue("slug", nuevoSlug, { shouldValidate: true });
    }
  }, [nombreProducto, setValue]);

  useEffect(() => {
    if (usaVariantes) {
      setValue("stockIlimitado", true);
      setValue("stock", null);
    }
  }, [usaVariantes, setValue]);

  const handleMediaChange = useCallback((urls: string[] | string | undefined) => {
    setUploadedImages(Array.isArray(urls) ? urls : urls ? [urls] : []);
  }, []);

  const toggleSection = (id: string) => {
    setSelectedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleCategoryChange = (slug: string, categoryId: string) => {
    setSelectedCategorySlug(slug);
    setSelectedSections(new Set());
    setValue("categoriaId", categoryId, { shouldValidate: true });
  };

  const handleGenerateDescription = async () => {
    const nombre = watch("nombre").trim();

    if (!nombre) {
      setAlert({
        type: "error",
        message: "Debes ingresar un nombre para el producto antes de generar la descripción.",
      });
      return;
    }

    if (!caracteristicas.trim()) {
      setAlert({
        type: "error",
        message: "Ingresa las características del producto antes de generar la descripción.",
      });
      return;
    }

    setGenerating(true);
    setAlert(null);

    try {
      const result = await generateDescriptionFromText(
        nombre,
        caracteristicas,
        componentes
      );

      if (result.ok) {
        setValue("descripcion", result.description || "");
        setValue("descripcionCorta", result.shortDescription || "");
        setValue("tags", result.tags ? result.tags.join(", ") : "");
        setAlert({
          type: "success",
          message: "Descripción generada exitosamente.",
        });
      } else {
        setAlert({
          type: "error",
          message: result.message || "Error al generar la descripción.",
        });
      }
    } catch (error) {
      console.error("Error al generar la descripción:", error);
      setAlert({
        type: "error",
        message: "Hubo un error al generar la descripción con IA.",
      });
    } finally {
      setGenerating(false);
    }
  };

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
    setModalState("idle");
    if (modalState === "success" && redirectUrl) {
      router.push(redirectUrl);
    }
  };

  const addAtributo = () => {
    setAtributos((prev) => [
      ...prev,
      { id: createId(), nombre: "", valor: "" },
    ]);
  };

  const updateAtributo = (
    id: string,
    field: keyof Omit<ProductAttributeInput, "id">,
    value: string
  ) => {
    setAtributos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeAtributo = (id: string) => {
    setAtributos((prev) => prev.filter((item) => item.id !== id));
  };

  const addVariant = () => {
    setVariantes((prev) => [
      ...prev,
      {
        id: createId(),
        nombre: "",
        sku: "",
        precio: "",
        stock: "",
        stockIlimitado: true,
        imagenUrl: "",
        isActive: true,
        options: [],
      },
    ]);
  };

  const updateVariant = (
    id: string,
    field: keyof Omit<ProductVariantInput, "id" | "options">,
    value: string | boolean
  ) => {
    setVariantes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeVariant = (id: string) => {
    setVariantes((prev) => prev.filter((item) => item.id !== id));
  };

  const addVariantOption = (variantId: string) => {
    setVariantes((prev) =>
      prev.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              options: [
                ...variant.options,
                { id: createId(), nombre: "", valor: "" },
              ],
            }
          : variant
      )
    );
  };

  const updateVariantOption = (
    variantId: string,
    optionId: string,
    field: keyof Omit<ProductVariantOptionInput, "id">,
    value: string
  ) => {
    setVariantes((prev) =>
      prev.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              options: variant.options.map((option) =>
                option.id === optionId ? { ...option, [field]: value } : option
              ),
            }
          : variant
      )
    );
  };

  const removeVariantOption = (variantId: string, optionId: string) => {
    setVariantes((prev) =>
      prev.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              options: variant.options.filter((option) => option.id !== optionId),
            }
          : variant
      )
    );
  };

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setModalState("loading");
    setModalMessage("Estamos creando tu producto...");

    try {
      if (!selectedCategorySlug || !selectedCategoryId) {
        setModalState("error");
        setModalMessage("Debes seleccionar una categoría.");
        return;
      }

      if (uploadedImages.length === 0) {
        setModalState("error");
        setModalMessage("Debes subir al menos una imagen antes de crear el producto.");
        return;
      }

      if (selectedSections.size === 0) {
        setModalState("error");
        setModalMessage("Debes seleccionar al menos una sección.");
        return;
      }

      if (usaVariantes && variantes.length === 0) {
        setModalState("error");
        setModalMessage("Si activas variantes, debes agregar al menos una.");
        return;
      }

      const atributosValidos = atributos
        .map((item) => ({
          nombre: item.nombre.trim(),
          valor: item.valor.trim(),
        }))
        .filter((item) => item.nombre && item.valor);

      const variantesValidas = variantes
        .map((variant) => ({
          nombre: variant.nombre.trim() || null,
          sku: variant.sku.trim() || null,
          precio:
            variant.precio.trim() !== "" && !Number.isNaN(Number(variant.precio))
              ? Number(variant.precio)
              : null,
          stock:
            variant.stock.trim() !== "" && !Number.isNaN(Number(variant.stock))
              ? Number(variant.stock)
              : null,
          stockIlimitado: variant.stockIlimitado,
          imagenUrl: variant.imagenUrl.trim() || null,
          isActive: variant.isActive,
          options: variant.options
            .map((option) => ({
              nombre: option.nombre.trim(),
              valor: option.valor.trim(),
            }))
            .filter((option) => option.nombre && option.valor),
        }))
        .filter((variant) => {
          if (!usaVariantes) return false;
          return (
            variant.nombre ||
            variant.sku ||
            variant.precio !== null ||
            variant.stock !== null ||
            variant.options.length > 0
          );
        });

      const formData = new FormData();
      formData.append("nombre", data.nombre.trim());
      formData.append("precio", String(Number(data.precio) || 0));
      formData.append("descripcion", data.descripcion);
      formData.append("descripcionCorta", data.descripcionCorta || "");
      formData.append("slug", data.slug);
      formData.append("prioridad", String(data.prioridad || 1));
      formData.append("status", data.status);
      formData.append("tags", data.tags);

      formData.append("categoriaId", selectedCategoryId);

      formData.append("stockIlimitado", String(data.stockIlimitado));
      formData.append("usaVariantes", String(data.usaVariantes));

      if (!data.usaVariantes && data.stockIlimitado === false && data.stock !== null) {
        formData.append("stock", String(data.stock));
      }

      selectedSections.forEach((id) => formData.append("seccionIds", id));
      uploadedImages.forEach((url) => formData.append("imageUrls", url));
      componentes.forEach((componente) => formData.append("componentes", componente));

      if (atributosValidos.length > 0) {
        formData.append("atributos", JSON.stringify(atributosValidos));
      }

      if (variantesValidas.length > 0) {
        formData.append("variantes", JSON.stringify(variantesValidas));
      }

      const result = await createProduct(formData);

      if (result.ok) {
        const firstSectionId = Array.from(selectedSections)[0];
        const section = initialData.secciones.find((sec) => sec.id === firstSectionId);

        if (!section) {
          setModalState("error");
          setModalMessage("La sección seleccionada no existe.");
          return;
        }

        if (result.product) {
          addProducto({
            id: result.product.id,
            nombre: result.product.nombre,
            precio: result.product.precio,
          });
        }

        const url = `/${selectedCategorySlug}/${section.slug}/${result.product?.slug}`;
        setRedirectUrl(url);
        setSubmitted(true);
        setModalState("success");
        setModalMessage("Producto creado exitosamente.");

        window.setTimeout(() => {
          router.push(url);
        }, 2000);
      } else {
        setModalState("error");
        setModalMessage(result.message || "Ocurrió un error al crear el producto.");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error desconocido al enviar el formulario";

      setModalState("error");
      setModalMessage(errorMessage);
      console.error("Error al enviar el formulario:", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto ml-0 w-full space-y-4 rounded-2xl bg-white p-4 shadow-lg"
      >
        <FormControl fullWidth>
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
            Ingresa el nombre de tu producto
          </FormLabel>
          <TextField label="Nombre" {...register("nombre", { required: true })} fullWidth />
        </FormControl>

        <FormControl fullWidth>
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
            Precio base
          </FormLabel>
          <TextField
            label="Precio"
            type="number"
            {...register("precio", {
              required: true,
              valueAsNumber: true,
            })}
            fullWidth
          />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
            Categoría
          </FormLabel>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            Selecciona la categoría que mejor se relacione con tu producto.
          </Typography>

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
                      onClick={() => handleCategoryChange(category.slug, category.id)}
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
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
            Secciones
          </FormLabel>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            Selecciona una o más secciones asociadas a tu producto.
          </Typography>

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

        <FormControl
          fullWidth
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
            Imágenes del producto
          </FormLabel>

          <AutoUploadMedia
            multiple={multiple}
            onChange={handleMediaChange}
            onError={(message) => setAlert({ type: "error", message })}
            onLoading={setLoading}
            mediaType="image"
          />
        </FormControl>

        <Divider />

        <div className="rounded-lg border-l-4 border-green-600 bg-gray-100 p-4 shadow-sm">
          <h4 className="font-semibold text-green-600">
            🚀 Generación Automática de Descripciones y Tags con IA
          </h4>
          <p className="mt-1 text-md text-gray-600">
            Para optimizar la visibilidad de tu producto y atraer más clientes, ingresa
            una descripción detallada con sus principales características.
            <br />
            <br />
            Luego, presiona <strong>&quot;Generar Descripciones con IA&quot;</strong>.
          </p>
        </div>

        <Divider />

        <FormControl fullWidth>
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
            Componentes del producto
          </FormLabel>
          <TextField
            label="Ingresa los componentes (uno por línea)"
            value={componentesInput}
            onChange={(e) => setComponentesInput(e.target.value)}
            multiline
            rows={4}
            placeholder={`Ejemplo:
Bandeja decorada
Mix de frutas
Huevos de codorniz`}
            fullWidth
          />
        </FormControl>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            variant="contained"
            color="primary"
            sx={{
              textTransform: "none",
              fontSize: "0.95rem",
              width: { xs: "100%", sm: "300px" },
            }}
            onClick={handleGenerateComponentes}
            fullWidth
          >
            Agregar
          </Button>
        </Box>

        <Divider />

        {componentes.length > 0 && (
          <div className="rounded-lg bg-gray-100 p-4 shadow-sm">
            <h4 className="mb-2 font-semibold text-blue-700">📦 Componentes generados</h4>
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
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
            Características principales del producto
          </FormLabel>
          <TextField
            label="Características principales"
            value={caracteristicas}
            onChange={(e) => setCaracteristicas(e.target.value)}
            fullWidth
            multiline
            rows={3}
            helperText="Ejemplo: Material, beneficios, presentación, uso, estilo, contenido, etc."
          />

          <Box sx={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<AiOutlineCloudUpload />}
              onClick={handleGenerateDescription}
              disabled={generating}
              sx={{
                textTransform: "none",
                fontSize: "0.95rem",
                width: { xs: "100%", sm: "300px" },
              }}
            >
              {generating ? <CircularProgress size={24} /> : "Generar Descripciones con IA"}
            </Button>
          </Box>

          {alert && (
            <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mt: 2 }}>
              {alert.message}
            </Alert>
          )}
        </FormControl>

        <Divider />

        <div className="rounded-lg border-l-4 border-blue-600 bg-gray-100 p-4 shadow-sm">
          <h5 className="font-semibold text-blue-600">Descripción completa</h5>
          <p className="mt-1 text-md text-gray-600">
            Esta es la descripción que aparecerá en la información completa del producto.
          </p>
        </div>

        <Divider />

        <FormControl fullWidth>
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
            Descripción
          </FormLabel>
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

        <div className="rounded-lg border-l-4 border-blue-600 bg-gray-100 p-4 shadow-sm">
          <h5 className="font-semibold text-blue-600">Descripción corta</h5>
          <p className="mt-1 text-md text-gray-600">
            Esta es la descripción que aparece en las tarjetas de productos.
          </p>
        </div>

        <Divider />

        <FormControl fullWidth>
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
            Descripción corta
          </FormLabel>
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

        <div className="rounded-lg border-l-4 border-blue-600 bg-gray-100 p-4 shadow-sm">
          <h5 className="font-semibold text-blue-600">🔍 Tags (Palabras Clave)</h5>
          <p className="mt-1 text-md text-gray-600">
            Los tags ayudan a que tu producto sea más fácil de encontrar en búsquedas.
          </p>
        </div>

        <Divider />

        <FormControl fullWidth>
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
            Tags (Palabras clave)
          </FormLabel>
          <TextField
            label="Tags"
            {...register("tags")}
            fullWidth
            multiline
            rows={3}
            helperText="Palabras clave separadas por comas."
            InputLabelProps={{ shrink: true }}
          />
        </FormControl>

        <Divider />

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h5 className="font-semibold text-gray-800">Inventario y opciones avanzadas</h5>
              <p className="mt-1 text-sm text-gray-500">
                Activa estas opciones solo si tu producto lo necesita.
              </p>
            </div>

            <Button
              variant="outlined"
              color="inherit"
              onClick={() => setShowAdvancedInventory((prev) => !prev)}
              sx={{ textTransform: "none", borderRadius: "12px" }}
            >
              {showAdvancedInventory ? "Ocultar" : "Configurar"}
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {showAdvancedInventory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <MuiDivider sx={{ my: 3 }} />

                <Stack spacing={3}>
                  <FormControlLabel
                    control={
                      <Controller
                        name="stockIlimitado"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                        )}
                      />
                    }
                    label="Stock ilimitado"
                  />

                  {!stockIlimitado && !usaVariantes && (
                    <TextField
                      label="Stock disponible"
                      type="number"
                      fullWidth
                      {...register("stock", {
                        setValueAs: (value) =>
                          value === "" || value === null ? null : Number(value),
                      })}
                    />
                  )}

                  <FormControlLabel
                    control={
                      <Controller
                        name="usaVariantes"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                        )}
                      />
                    }
                    label="Este producto tiene variantes"
                  />
                </Stack>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Divider />

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h5 className="font-semibold text-gray-800">Atributos adicionales</h5>
              <p className="mt-1 text-sm text-gray-500">
                Úsalos para datos como material, marca, estilo, potencia, uso, etc.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => setShowAttributesBlock((prev) => !prev)}
                sx={{ textTransform: "none", borderRadius: "12px" }}
              >
                {showAttributesBlock ? "Ocultar" : "Mostrar"}
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setShowAttributesBlock(true);
                  addAtributo();
                }}
                startIcon={<FaPlus />}
                sx={{ textTransform: "none", borderRadius: "12px" }}
              >
                Agregar
              </Button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {showAttributesBlock && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <MuiDivider sx={{ my: 3 }} />

                {atributos.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aún no has agregado atributos.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {atributos.map((atributo) => (
                      <Box
                        key={atributo.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <Typography fontWeight={600}>Atributo</Typography>
                          <IconButton
                            onClick={() => removeAtributo(atributo.id)}
                            size="small"
                            color="error"
                          >
                            <FaTrashAlt size={14} />
                          </IconButton>
                        </div>

                        <Stack spacing={2}>
                          <TextField
                            label="Nombre"
                            value={atributo.nombre}
                            onChange={(e) =>
                              updateAtributo(atributo.id, "nombre", e.target.value)
                            }
                            fullWidth
                          />
                          <TextField
                            label="Valor"
                            value={atributo.valor}
                            onChange={(e) =>
                              updateAtributo(atributo.id, "valor", e.target.value)
                            }
                            fullWidth
                          />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Divider />

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h5 className="font-semibold text-gray-800">Variantes del producto</h5>
              <p className="mt-1 text-sm text-gray-500">
                Ejemplo: talla, color, presentación, capacidad o tamaño.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => setShowVariantsBlock((prev) => !prev)}
                sx={{ textTransform: "none", borderRadius: "12px" }}
              >
                {showVariantsBlock ? "Ocultar" : "Mostrar"}
              </Button>
              <Button
                variant="contained"
                disabled={!usaVariantes}
                onClick={() => {
                  setShowVariantsBlock(true);
                  addVariant();
                }}
                startIcon={<FaPlus />}
                sx={{ textTransform: "none", borderRadius: "12px" }}
              >
                Agregar variante
              </Button>
            </div>
          </div>

          {!usaVariantes && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Activa “Este producto tiene variantes” para usar esta sección.
            </Typography>
          )}

          {usaVariantes && (
            <Box className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4">
              <Typography fontWeight={700} color="text.primary">
                Como crear variantes sin confusion
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.2 }}>
                Cada bloque de variante representa una opcion comprable distinta.
                Si vendes "Grande" y "Extra grande", debes crear 2 variantes
                separadas.
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                <Chip label="Variante 1: Grande" size="small" color="primary" variant="outlined" />
                <Chip label="Variante 2: Extra grande" size="small" color="primary" variant="outlined" />
              </Stack>

              <Stack spacing={1} sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                    Nombre que ve el cliente:
                  </Box>{" "}
                  escribe la opcion real, por ejemplo: "Grande".
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                    SKU interno:
                  </Box>{" "}
                  es un codigo opcional para inventario o integraciones, por ejemplo:
                  "SALCH-GRA". Si no usas codigos internos, puedes dejarlo vacio.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                    Detalles de la variante:
                  </Box>{" "}
                  sirven para describir esa variante, por ejemplo: atributo
                  "Tamano" y valor "Grande". No crean variantes nuevas por si
                  solos.
                </Typography>
              </Stack>
            </Box>
          )}

          <AnimatePresence initial={false}>
            {showVariantsBlock && usaVariantes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <MuiDivider sx={{ my: 3 }} />

                {variantes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aún no has agregado variantes.
                  </Typography>
                ) : (
                  <Stack spacing={3}>
                    {variantes.map((variant, index) => (
                      <Box
                        key={variant.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <Typography fontWeight={700}>
                            Variante {index + 1}
                          </Typography>
                          <IconButton
                            onClick={() => removeVariant(variant.id)}
                            size="small"
                            color="error"
                          >
                            <FaTrashAlt size={14} />
                          </IconButton>
                        </div>

                        <Stack spacing={2}>
                          <TextField
                            label="Nombre que vera el cliente"
                            value={variant.nombre}
                            onChange={(e) =>
                              updateVariant(variant.id, "nombre", e.target.value)
                            }
                            fullWidth
                            helperText='Ej: Grande, Extra grande, Roja, 1 kg. Este es el texto que el cliente elegira.'
                          />

                          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                            <TextField
                              label="SKU interno (opcional)"
                              value={variant.sku}
                              onChange={(e) =>
                                updateVariant(variant.id, "sku", e.target.value)
                              }
                              fullWidth
                              helperText='Codigo interno para inventario. Ej: SALCH-GRA. No es el nombre visible.'
                            />
                            <TextField
                              label="Precio"
                              type="number"
                              value={variant.precio}
                              onChange={(e) =>
                                updateVariant(variant.id, "precio", e.target.value)
                              }
                              fullWidth
                              helperText="Precio final de esta variante."
                            />
                          </Stack>

                          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={variant.stockIlimitado}
                                  onChange={(e) =>
                                    updateVariant(
                                      variant.id,
                                      "stockIlimitado",
                                      e.target.checked
                                    )
                                  }
                                />
                              }
                              label="Stock ilimitado"
                            />

                            <FormControlLabel
                              control={
                                <Switch
                                  checked={variant.isActive}
                                  onChange={(e) =>
                                    updateVariant(
                                      variant.id,
                                      "isActive",
                                      e.target.checked
                                    )
                                  }
                                />
                              }
                              label="Activa"
                            />
                          </Stack>

                          {!variant.stockIlimitado && (
                            <TextField
                              label="Stock"
                              type="number"
                              value={variant.stock}
                              onChange={(e) =>
                                updateVariant(variant.id, "stock", e.target.value)
                              }
                              fullWidth
                              helperText="Cantidad disponible solo para esta variante."
                            />
                          )}

                          <TextField
                            label="URL de imagen específica (opcional)"
                            value={variant.imagenUrl}
                            onChange={(e) =>
                              updateVariant(variant.id, "imagenUrl", e.target.value)
                            }
                            fullWidth
                            helperText="Usala si esta variante tiene una foto distinta al producto principal."
                          />

                          <Box className="rounded-xl border border-dashed border-gray-300 bg-white p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <Typography fontWeight={600}>
                                Detalles opcionales de esta variante
                              </Typography>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<FaPlus />}
                                onClick={() => addVariantOption(variant.id)}
                                sx={{ textTransform: "none", borderRadius: "10px" }}
                              >
                                Opción
                              </Button>
                            </div>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Estos campos describen esta variante. Ejemplo: atributo
                              "Tamano" y valor "Grande". Si solo quieres crear
                              opciones comprables como "Grande" y "Extra grande",
                              crea dos variantes separadas arriba.
                            </Typography>

                            {variant.options.length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                Agrega detalles como tamano, color, sabor o presentacion
                                si necesitas mostrarlos con mas claridad.
                              </Typography>
                            ) : (
                              <Stack spacing={2}>
                                {variant.options.map((option) => (
                                  <Box
                                    key={option.id}
                                    className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                                  >
                                    <div className="mb-2 flex items-center justify-between">
                                      <Typography fontWeight={600}>
                                        Opción
                                      </Typography>
                                      <IconButton
                                        onClick={() =>
                                          removeVariantOption(variant.id, option.id)
                                        }
                                        size="small"
                                        color="error"
                                      >
                                        <FaTrashAlt size={13} />
                                      </IconButton>
                                    </div>

                                    <Stack
                                      direction={{ xs: "column", md: "row" }}
                                      spacing={2}
                                    >
                                      <TextField
                                        label="Atributo"
                                        value={option.nombre}
                                        onChange={(e) =>
                                          updateVariantOption(
                                            variant.id,
                                            option.id,
                                            "nombre",
                                            e.target.value
                                          )
                                        }
                                        fullWidth
                                        helperText="Ej: tamano, color, presentacion"
                                      />
                                      <TextField
                                        label="Valor visible"
                                        value={option.valor}
                                        onChange={(e) =>
                                          updateVariantOption(
                                            variant.id,
                                            option.id,
                                            "valor",
                                            e.target.value
                                          )
                                        }
                                        fullWidth
                                        helperText="Ej: Grande, Negro, 1 kg"
                                      />
                                    </Stack>
                                  </Box>
                                ))}
                              </Stack>
                            )}
                          </Box>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Divider />

        <FormControl fullWidth margin="normal">
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
            Slug
          </FormLabel>
          <TextField
            label="Slug"
            {...register("slug")}
            fullWidth
            InputProps={{
              readOnly: true,
            }}
          />
        </FormControl>

        <Divider />

        <FormControl>
          <FormLabel sx={{ mb: 1, color: "info.main", fontWeight: "bold" }}>
            Estado
          </FormLabel>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <RadioGroup {...field} row>
                <FormControlLabel
                  sx={{ color: "black" }}
                  value="disponible"
                  control={<Radio />}
                  label="Disponible"
                />
                <FormControlLabel
                  sx={{ color: "black" }}
                  value="descontinuado"
                  control={<Radio />}
                  label="Descontinuado"
                />
                <FormControlLabel
                  sx={{ color: "black" }}
                  value="agotado"
                  control={<Radio />}
                  label="Agotado"
                />
                <FormControlLabel
                  sx={{ color: "black" }}
                  value="oculto"
                  control={<Radio />}
                  label="Oculto"
                />
              </RadioGroup>
            )}
          />
        </FormControl>

        <Box sx={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading || submitted}
            sx={{
              textTransform: "none",
              fontSize: "0.95rem",
              width: { xs: "100%", sm: "320px" },
              borderRadius: "12px",
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Crear producto"}
          </Button>
        </Box>

        {alert && (
          <Alert severity={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}
      </form>

      {isModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ scale: 0.96, y: 24 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 24 }}
                transition={{ type: "spring", damping: 22, stiffness: 280 }}
                className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleCloseModal}
                  className="absolute right-4 top-4 z-10 text-gray-500 transition-colors duration-200 hover:text-gray-700"
                  aria-label="Cerrar modal"
                >
                  <FaTimes size={20} />
                </button>

                <div className="flex flex-col items-center justify-center text-center">
                  {modalState === "loading" && (
                    <>
                      <CircularProgress size={40} className="mb-4" />
                      <Typography sx={{ color: "black" }} variant="h6">
                        {modalMessage}
                      </Typography>
                    </>
                  )}

                  {modalState === "success" && (
                    <>
                      <Typography variant="h6" color="success.main">
                        {modalMessage}
                      </Typography>
                      <Button
                        onClick={handleCloseModal}
                        variant="contained"
                        color="primary"
                        className="mt-4"
                        sx={{ mt: 3, textTransform: "none", borderRadius: "12px" }}
                      >
                        Cerrar
                      </Button>
                    </>
                  )}

                  {modalState === "error" && (
                    <>
                      <Typography variant="h6" color="error.main">
                        {modalMessage}
                      </Typography>
                      <Button
                        onClick={handleCloseModal}
                        variant="contained"
                        color="primary"
                        className="mt-4"
                        sx={{ mt: 3, textTransform: "none", borderRadius: "12px" }}
                      >
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
