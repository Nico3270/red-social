"use client";

import React, { useState } from "react";
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
    IconButton,
    CircularProgress,
    Typography,
   
    Box,
} from "@mui/material";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { FaTrashAlt } from "react-icons/fa";
import Image from "next/image";
import { MdAddAPhoto } from "react-icons/md";
import imageCompression from "browser-image-compression"; // Importar la librería
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { createProduct, generateDescriptionFromText } from "@/ui/actions/productos/createNewProduct";
import { initialData } from "@/seed/seed";
import * as FaIcons from "react-icons/fa";
import * as RiIcons from "react-icons/ri";
import { IconType } from "react-icons";
import Divider from "../divider/Divider";
import { ProductStatus } from "@prisma/client";




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


// Define the type for iconMap based on possible icon names
type IconMap = {
    [key: string]: IconType;
};

// Create iconMap with type assertion
const iconMap: IconMap = {
    ...FaIcons,
    ...RiIcons,
};



export default function CreateNewProduct() {
    const { register, handleSubmit, control, setValue, watch } = useForm<ProductFormData>({
        defaultValues: {
            nombre: "",
            precio: 0,
            descripcion: "",
            descripcionCorta: "",
            slug: "",
            prioridad: 0,
            status: "disponible",
            tags: "",
            categoriaId: "",
        },
    });

    const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
    const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("");
    const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
    const [images, setImages] = useState<{ id: string; file: File; url: string }[]>([]);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [caracteristicas, setCaracteristicas] = useState("");
    const [componentesInput, setComponentesInput] = useState("");
    const [componentes, setComponentes] = useState<string[]>([]);
    const router = useRouter();
    const { data: session } = useSession();
    const id = session?.user.id;


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

    React.useEffect(() => {
        if (nombreProducto) {
            const nuevoSlug = generateSlug(nombreProducto);
            setValue("slug", nuevoSlug, { shouldValidate: true });
        }
    }, [nombreProducto, setValue]);

    const onSubmit = async (data: ProductFormData) => {

        try {
            setAlert(null);

            if (!selectedCategorySlug) {
                setAlert({ type: "error", message: "Debes seleccionar una categoría." });
                return;
            }

            if (uploadedImages.length === 0) {
                setAlert({ type: "error", message: "Debes subir al menos una imagen antes de crear el producto." });
                return;
            }

            if (selectedSections.size === 0) {
                setAlert({ type: "error", message: "Debes seleccionar al menos una sección." });
                return;
            }

            const formData = new FormData();
            formData.append("nombre", data.nombre);
            formData.append("precio", data.precio.toString());
            formData.append("descripcion", data.descripcion);
            formData.append("descripcionCorta", data.descripcionCorta);
            formData.append("slug", data.slug);
            formData.append("prioridad", data.prioridad.toString());
            formData.append("status", data.status);
            formData.append("tags", data.tags);
    


            const category = initialData.categorias.find((cat) => cat.slug === selectedCategorySlug);
            if (category) {
                formData.append("categoriaId", category.id); // ✅ Solo enviar el ID
            } else {
                setAlert({ type: "error", message: "La categoría seleccionada no existe." });
                return;
            }

            selectedSections.forEach((id) => formData.append("seccionIds", id));
            uploadedImages.forEach((url) => formData.append("imageUrls", url));
            componentes.forEach((componente) => formData.append("componentes", componente));

            
            const result = await createProduct(formData);

            if (result.ok) {
                const firstSectionId = Array.from(selectedSections)[0];
                const section = initialData.secciones.find((sec) => sec.id === firstSectionId);
                if (!section) {
                    setAlert({ type: "error", message: "La sección seleccionada no existe." });
                    return;
                }
                const redirectUrl = `/${selectedCategorySlug}/${section.slug}/${result.product?.slug}`;
                setAlert({ type: "success", message: "Producto creado exitosamente." });
                router.push(redirectUrl);
            } else {
                setAlert({ type: "error", message: result.message || "Ocurrió un error al crear el producto." });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error desconocido al enviar el formulario";
            setAlert({ type: "error", message: errorMessage });
            console.error("Error al enviar el formulario:", errorMessage);
        }
    };

    // Función actualizada para manejar la compresión de imágenes
    const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const maxSize = 10 * 1024 * 1024; // 10 MB en bytes
            const files = Array.from(e.target.files);

            const compressedFiles = await Promise.all(
                files.map(async (file) => {
                    if (file.size > maxSize) {
                        try {
                            setAlert({ type: "info", message: `Comprimiendo ${file.name}...` });
                            const compressedFile = await imageCompression(file, {
                                maxSizeMB: 10,
                                maxWidthOrHeight: 1920,
                                useWebWorker: true,
                            });
                            setAlert({ type: "success", message: `${file.name} comprimida con éxito.` });
                            return compressedFile;
                        } catch (error) {
                            setAlert({ type: "error", message: `Error al comprimir ${file.name}: ${error}` });
                            return null;
                        }
                    }
                    return file;
                })
            );

            const validImages = compressedFiles.filter((file): file is File => file !== null);
            if (validImages.length > 0) {
                const newImages = validImages.map((file) => ({
                    id: crypto.randomUUID(),
                    file,
                    url: URL.createObjectURL(file),
                }));
                setImages((prev) => [...prev, ...newImages]);
            }
        }
    };

    const handleRemoveImage = (id: string) => {
        setImages((prev) => prev.filter((img) => img.id !== id));
    };

    const handleRemoveUploadedImage = (url: string) => {
        setUploadedImages((prev) => prev.filter((imgUrl) => imgUrl !== url));
    };

    const handleUploadImages = async () => {
        if (images.length === 0) {
            setAlert({ type: "error", message: "Selecciona al menos una imagen antes de subir." });
            return;
        }

        setLoading(true);
        setAlert(null);
        const uploadedUrls: string[] = [];
        const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
        const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

        try {
            for (const image of images) {
                const formData = new FormData();
                formData.append("file", image.file);
                formData.append("upload_preset", UPLOAD_PRESET);

                const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) throw new Error(`Error en la carga: ${response.statusText}`);

                const data = await response.json();
                if (data.secure_url) uploadedUrls.push(data.secure_url);
            }

            if (uploadedUrls.length > 0) {
                setUploadedImages((prev) => [...prev, ...uploadedUrls]);
                setAlert({ type: "success", message: "Imágenes subidas con éxito." });
            } else {
                setAlert({ type: "error", message: "No se subieron imágenes." });
            }
        } catch (error) {
            console.error("Error al subir imagen:", error);
            setAlert({ type: "error", message: "Error al subir imágenes a Cloudinary." });
        }

        setImages([]);
        setLoading(false);
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
            console.log({ result });

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


    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-4 rounded-lg shadow-lg max-w-4xl mx-auto ml-0">

            <FormControl fullWidth>
                <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Ingresa el nombre de tus producto</FormLabel>
                <TextField label="Nombre" {...register("nombre", { required: true })} fullWidth />
            </FormControl>

            <FormControl fullWidth margin="normal">
                <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold" }}>Categoría</FormLabel>
                <Controller
                    name="categoriaId"
                    control={control}
                    render={({ field }) => (
                        <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                            {initialData.categorias.map((category) => {
                                const IconComponent = iconMap[category.iconName] || FaIcons.FaQuestion;
                                const isSelected = selectedCategorySlug === category.slug;

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
                                        <IconComponent size={18} style={{ marginRight: 8 }} />
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
                    Luego, presiona <strong>&quot;Cargar imágenes seleccionadas&quot;</strong> y espera el mensaje de confirmación antes de continuar.
                </p>
            </div>

            <div>
                <h3 className="font-bold mb-2  text-blue-500">Imágenes</h3>

                <Stack direction="row" spacing={2} flexWrap="wrap" marginBottom={2}>
                    {images.map((img) => (
                        <div key={img.id} className="relative w-64 h-64 mb-2">
                            <Image
                                src={img.url}
                                alt="Previsualización"
                                className="rounded-lg"
                                fill
                                style={{ objectFit: "cover" }}
                            />
                            <IconButton
                                size="small"
                                onClick={() => handleRemoveImage(img.id)}
                                className="absolute top-0 right-0 bg-white"
                            >
                                <FaTrashAlt color="red" />
                            </IconButton>
                        </div>
                    ))}

                    <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer">
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleAddImage}
                            className="hidden"
                            id="fileInput"
                        />
                        <button
                            type="button"
                            onClick={() => document.getElementById("fileInput")?.click()}
                            className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition duration-200"
                        >
                            <MdAddAPhoto className="text-5xl text-gray-600" />
                        </button>
                    </label>
                </Stack>

                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={<AiOutlineCloudUpload />}
                    onClick={handleUploadImages}
                    disabled={loading}
                    className="mt-4"
                >
                    {loading ? <CircularProgress size={24} /> : "Cargar imágenes seleccionadas"}
                </Button>
            </div>

            {uploadedImages.length > 0 && (
                <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
                    <h4 className="text-blue-700 font-semibold mb-2">📤 Imágenes Cargadas</h4>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                        {uploadedImages.map((url, index) => (
                            <div key={`${url} -${index}`} className="relative w-56 h-56">
                                <Image src={url} alt="Imagen subida" className="rounded-lg" fill style={{ objectFit: "cover" }} />
                                <IconButton
                                    size="small"
                                    onClick={() => handleRemoveUploadedImage(url)}
                                    className="absolute top-0 right-0 bg-white"
                                >
                                    <FaTrashAlt color="red" />
                                </IconButton>
                            </div>
                        ))}
                    </Stack>
                </div>
            )}
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
                Generar Componentes
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
            <FormControl fullWidth margin="normal">
                <FormLabel sx={{ mb: 1, color: 'info.main', fontWeight: "bold", }}>Prioridad</FormLabel>
                <TextField label="Prioridad" type="number" {...register("prioridad")} fullWidth />
            </FormControl>
            <Divider />
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



            <Button type="submit" variant="contained" color="primary" fullWidth>
                Crear Producto
            </Button>

            {alert && (
                <Alert severity={alert.type} onClose={() => setAlert(null)}>
                    {alert.message}
                </Alert>
            )}
        </form>
    );
}

