"use client";

import React, { useCallback, useState, } from "react";
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
import { FaTrashAlt } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { createProduct, generateDescriptionFromText } from "@/ui/actions/productos/createNewProduct";
import { initialData } from "@/seed/seed";
import Divider from "../divider/Divider";
import { ProductStatus } from "@prisma/client";
import AutoUploadMedia from "../autoUpload/AutoUploadMedia";
import { useProductosTransaccionesStore } from "@/store/productosTransacciones/productosTransaccionesStore";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";

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
}


export default function CreateNewProduct() {
    const { register, handleSubmit, control, setValue, watch } = useForm<ProductFormData>({
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
        },
    });

    const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
    const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("");
    const [submitted, setSubmitted] = useState(false);
    const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [caracteristicas, setCaracteristicas] = useState("");
    const [componentesInput, setComponentesInput] = useState("");
    const [componentes, setComponentes] = useState<string[]>([]);
    const router = useRouter();
    const addProducto = useProductosTransaccionesStore((state) => state.addProducto);

    const [modalState, setModalState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [modalMessage, setModalMessage] = useState('');
    const [redirectUrl, setRedirectUrl] = useState('');

    const filteredSections = initialData.secciones.filter(
        (section) => section.categorySlug === selectedCategorySlug
    );


    // Generar slug automático
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

    const nombreProducto = watch("nombre");

    const handleMediaChange = useCallback((urls: string[] | string | undefined) => {
        setUploadedImages(
            Array.isArray(urls) ? urls : urls ? [urls] : []
        );
    }, []); // Dependencias vacías: setUploadedImages es estable.

    React.useEffect(() => {
        if (nombreProducto) {
            const nuevoSlug = generateSlug(nombreProducto);
            setValue("slug", nuevoSlug, { shouldValidate: true });
        }
    }, [nombreProducto, setValue]);

    const onSubmit = async (data: ProductFormData) => {
        setLoading(true);
        setModalState('loading');
        setModalMessage('Estamos creando tu producto...');

        try {
            if (!selectedCategorySlug) {
                setModalState('error');
                setModalMessage("Debes seleccionar una categoría.");
                return;
            }

            if (uploadedImages.length === 0) {
                setModalState('error');
                setModalMessage("Debes subir al menos una imagen antes de crear el producto.");
                return;
            }

            if (selectedSections.size === 0) {
                setModalState('error');
                setModalMessage("Debes seleccionar al menos una sección.");
                return;
            }

            const formData = new FormData();
            formData.append("nombre", data.nombre);
            formData.append("precio", data.precio.toString());
            formData.append("descripcion", data.descripcion);
            formData.append("descripcionCorta", data.descripcionCorta);
            formData.append("slug", data.slug);
            formData.append("prioridad", "1");
            formData.append("status", data.status);
            formData.append("tags", data.tags);



            const category = initialData.categorias.find((cat) => cat.slug === selectedCategorySlug);
            if (category) {
                formData.append("categoriaId", category.id); // ✅ Solo enviar el ID
            } else {
                setModalState('error');
                setModalMessage("La categoría seleccionada no existe.");
                return;
            }

            selectedSections.forEach((id) => formData.append("seccionIds", id));
            uploadedImages.forEach((url) => formData.append("imageUrls", url));
            componentes.forEach((componente) => formData.append("componentes", componente));


            const result = await createProduct(formData);

            if (result.ok) {
                const firstSectionId = Array.from(selectedSections)[0];
                setSubmitted(true); // ✅ Bloqueamos el botón hasta redirigir
                const section = initialData.secciones.find((sec) => sec.id === firstSectionId);
                if (!section) {
                    setModalState('error');
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
                setModalState('success');
                setModalMessage("Producto creado exitosamente.");

                setTimeout(() => {
                    router.push(url);
                }, 2000);
            } else {
                setModalState('error');
                setModalMessage(result.message || "Ocurrió un error al crear el producto.");
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



    const toggleSection = (id: string) => {
        setSelectedSections((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleCategoryChange = (slug: string) => {
        setSelectedCategorySlug(slug);
        setSelectedSections(new Set()); // Clear sections when category changes
    };

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
            // console.log({ result });

            if (result.ok) {
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

    const multiple = true;

    const isModalOpen = modalState !== 'idle';

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-4  rounded-lg shadow-lg w-full mx-auto ml-0">

                <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Ingresa el nombre de tus producto</FormLabel>
                    <TextField label="Nombre" {...register("nombre", { required: true })} fullWidth />
                </FormControl>

                <FormControl fullWidth margin="normal">
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold" }}>Categoría</FormLabel>
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 400, mb: 2 }}>
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
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold" }}>Secciones</FormLabel>
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 400, mb: 2 }}>
                        Selecciona una o mas secciones asociadas a tu producto.
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
                        alignItems: "center", // centra horizontal
                        textAlign: "center",
                    }}
                >
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold" }}>
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
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Componentes del Producto</FormLabel>
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

                <Button variant="contained" color="primary" onClick={handleGenerateComponentes} fullWidth>
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
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Características principales del producto</FormLabel>
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

                <FormControl>
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Precio</FormLabel>
                    <TextField label="Precio" type="number" {...register("precio", { required: true })} fullWidth />
                </FormControl>
                <Divider />

                <div className="bg-gray-100 border-l-4 border-blue-600 p-4 rounded-lg shadow-sm">
                    <h5 className="text-blue-600 font-semibold">Descripción completa</h5>
                    <p className="text-gray-600 text-md mt-1">
                        Esta es la descripción que aparecerá en la información completa del producto
                    </p>
                </div>
                <Divider />
                <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Descripción</FormLabel>
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
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Descripción Corta</FormLabel>
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
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Tags (Palabras Clave)</FormLabel>
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
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Slug</FormLabel>
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
                {/* <FormControl fullWidth margin="normal">
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Prioridad</FormLabel>
                    <TextField label="Prioridad" type="number" {...register("prioridad")} fullWidth />
                </FormControl>
                <Divider /> */}
                <FormControl>
                    <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Estado</FormLabel>
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



                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={loading || submitted}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Crear Producto"}
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
                                        <Typography variant="h6">{modalMessage}</Typography>
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