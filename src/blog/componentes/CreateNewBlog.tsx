"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  TextField,
  Button,
  Stack,
  IconButton,
  Alert,
  Typography,
  Divider,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import Image from "next/image";
import { MdAddAPhoto } from "react-icons/md";
import { FaTrashAlt } from "react-icons/fa";
import { AiOutlineCloudUpload, AiOutlinePlus } from "react-icons/ai";
import { postNewBlog } from "@/blog/actions/postNewBlog";
import { useSelectedProductsMagicSurprise } from "@/store/productsBlog/productsBlogStore";
import { toast } from "react-toastify";
import imageCompression from "browser-image-compression";
import { InfoEmpresa } from "@/config/config";

// Interfaces
interface Section {
  id: string;
  nombre: string;
}

interface Tema {
  titulo: string;
  imagen: string;
  parrafos: string[];
}

interface BlogFormData {
  titulo: string;
  descripcion: string;
  autor: string;
  orden: number;
  temas: Tema[];
  imagen: string;
  imagenes: { url: string }[];
  secciones: string[];
  productos: string[];
}

interface CreateNewBlogProps {
  secciones: Section[];
}

interface ImageBankContextValue {
  imageBank: string[];
  addImageToBank: (newImage: string) => boolean;
  newImageUrl: string;
  setNewImageUrl: (url: string) => void;
}

const ImageBankContext = createContext<ImageBankContextValue | null>(null);

export const ImageBankProvider = ({ children }: { children: React.ReactNode }) => {
  const { selectedProducts } = useSelectedProductsMagicSurprise();
  const [imageBank, setImageBank] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    const productImages = selectedProducts.flatMap((p) => p.imagenes);
    setImageBank((prevImages) => {
      const uniqueImages = Array.from(new Set([...prevImages, ...productImages]));
      return uniqueImages;
    });
  }, [selectedProducts]);

  const addImageToBank = (newImage: string) => {
    if (newImage && !imageBank.includes(newImage)) {
      setImageBank((prev) => [...prev, newImage]);
      return true;
    }
    return false;
  };

  const value: ImageBankContextValue = {
    imageBank,
    addImageToBank,
    newImageUrl,
    setNewImageUrl,
  };

  return (
    <ImageBankContext.Provider value={value}>
      {children}
    </ImageBankContext.Provider>
  );
};

export const useImageBankContext = () => {
  const context = useContext(ImageBankContext);
  if (!context) {
    throw new Error("useImageBankContext debe ser usado dentro de un ImageBankProvider");
  }
  return context;
};

export function ImageBankSelector({
  onSelect,
  selectedImage,
}: {
  onSelect: (image: string) => void;
  selectedImage?: string;
}) {
  const { imageBank } = useImageBankContext();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Seleccionar del Banco de Imágenes</h4>
        <Button
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
          variant="outlined"
        >
          {isExpanded ? "Cerrar" : "Mostrar Imágenes"}
        </Button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2 border rounded">
          {imageBank.map((image, index) => (
            <div
              key={index}
              className={`cursor-pointer border-2 p-1 rounded-md transition-all duration-200 
                ${selectedImage === image ? "border-blue-500 shadow-lg scale-105" : "border-gray-300"}`}
              onClick={() => onSelect(image)}
            >
              <Image
                src={image}
                alt="Imagen del Banco"
                width={60}
                height={60}
                className="rounded-md object-cover"
                style={{ width: "auto", height: "auto" }} // Evitar warning de aspect ratio
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateNewBlogComponent({ secciones }: CreateNewBlogProps) {
  const { register, handleSubmit, control, setValue, reset, watch } = useForm<BlogFormData>({
    defaultValues: {
      titulo: "",
      descripcion: "",
      autor: "",
      orden: 0,
      temas: [],
      secciones: [],
      productos: [],
      imagen: InfoEmpresa.imagenesPlaceholder.imagenRepresentativa || "",
      imagenes: [],
    },
  });

  const { imageBank, addImageToBank, newImageUrl, setNewImageUrl } = useImageBankContext();
  const { fields: temas, append: addTema, remove: removeTema } = useFieldArray({ control, name: "temas" });
  const { selectedProducts, removeProduct, clearSelectedProducts } = useSelectedProductsMagicSurprise();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [imagesToUpload, setImagesToUpload] = useState<{ id: string; file: File; url: string }[]>([]);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [parrafosValues, setParrafosValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const formProducts = watch("productos");
    const selectedProductIds = selectedProducts.map((p) => p.id);
    if (JSON.stringify(formProducts) !== JSON.stringify(selectedProductIds)) {
      setValue("productos", selectedProductIds);
    }
  }, [selectedProducts, setValue, watch]);

  

  const handleRemoveProduct = (productId: string) => {
    removeProduct(productId);
    setValue("productos", watch("productos").filter((id) => id !== productId));
  };

  const handleSelectImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const maxSize = 10 * 1024 * 1024; // 10 MB en bytes
      const files = Array.from(e.target.files);

      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.size > maxSize) {
            try {
              toast.info(`Comprimiendo ${file.name}...`);
              const compressedFile = await imageCompression(file, {
                maxSizeMB: 10, // Máximo 10 MB
                maxWidthOrHeight: 1920, // Redimensionar si es necesario
                useWebWorker: true, // Mejor rendimiento
              });
              return compressedFile;
            } catch (error) {
              toast.error(`Error al comprimir ${file.name}: ${error}`);
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
        setImagesToUpload((prev) => [...prev, ...newImages]);
      }
    }
  };

  const handleUploadImages = async () => {
    if (imagesToUpload.length === 0) {
      toast.error("Selecciona al menos una imagen antes de subir.");
      return;
    }

    setLoading(true);
    toast.info("Subiendo imágenes a Cloudinary...");
    const uploadedUrls: string[] = [];
    const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

    try {
      for (const image of imagesToUpload) {
        const formData = new FormData();
        formData.append("file", image.file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Error en la carga: ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
          addImageToBank(data.secure_url);
        }
      }

      if (uploadedUrls.length > 0) {
        setImagesToUpload([]);
        setValue("imagenes", uploadedUrls.map((url) => ({ url })));
        toast.success("Imágenes subidas y agregadas al banco con éxito.");
      }
    } catch (error) {
      console.error("Error al subir imagen:", error);
      toast.error(`Error al subir imágenes a Cloudinary: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddImageUrl = () => {
    if (newImageUrl.trim() && !imageBank.includes(newImageUrl)) {
      try {
        new URL(newImageUrl);
        addImageToBank(newImageUrl);
        setNewImageUrl("");
      } catch {
        toast.error("URL inválida. Asegúrate de ingresar un enlace correcto.");
      }
    }
  };

  const toggleSection = (id: string) => {
    setSelectedSections((prev) => {
      const updatedSections = prev.includes(id)
        ? prev.filter((sec) => sec !== id)
        : [...prev, id];
      setValue("secciones", updatedSections); // Sincroniza con el formulario
      return updatedSections;
    });
  };

  const handleFormSubmit = async (data: BlogFormData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("titulo", data.titulo);
      formData.append("descripcion", data.descripcion);
      formData.append("autor", data.autor);
      formData.append("orden", data.orden.toString());
      formData.append("imagen", data.imagen);
      formData.append("productos", JSON.stringify(selectedProducts.map((p) => p.id)));
      formData.append("temas", JSON.stringify(data.temas));
      formData.append("secciones", JSON.stringify(selectedSections));

      const result = await postNewBlog(formData);

      if (result.ok && result.slug) {
        clearSelectedProducts();
        setOpenModal(true);
        reset();
        setImagesToUpload([]);
        setParrafosValues({});
        setAlert({ type: "success", message: result.message });
        router.push(`/blog/${result.slug}`);
      } else {
        setAlert({ type: "error", message: result.message });
      }
    } catch (error) {
      setAlert({ type: "error", message: "Error al crear el blog." });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6 bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto"
    >
      <h3 className="text-2xl text-center font-bold">Crear Nuevo Blog</h3>
      <Divider />

      <div>
        <Typography variant="h6" fontWeight="bold">Construir Banco de Imágenes</Typography>
        
        <Typography variant="subtitle1">Imágenes de Productos Seleccionados</Typography>
        <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2 border rounded">
          {imageBank.map((image, index) => (
            <Image
              key={index}
              src={image}
              alt="Imagen del banco"
              width={60}
              height={60}
              className="rounded-md object-cover"
              style={{ width: "auto", height: "auto" }} // Evitar warning de aspect ratio
            />
          ))}
        </div>

        <Stack direction="row" spacing={2} className="mt-4">
          <TextField
            size="small"
            placeholder="Pegar URL de imagen"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            fullWidth
          />
          <Button variant="contained" onClick={handleAddImageUrl}>
            Agregar URL
          </Button>
        </Stack>

        <Stack direction="row" spacing={2} className="mt-4">
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outlined"
            startIcon={<MdAddAPhoto />}
          >
            Seleccionar Imágenes
          </Button>
          <Button
            onClick={handleUploadImages}
            variant="contained"
            startIcon={<AiOutlineCloudUpload />}
            disabled={loading || imagesToUpload.length === 0}
          >
            {loading ? <CircularProgress size={24} /> : "Subir a Cloudinary"}
          </Button>
          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleSelectImages}
          />
        </Stack>
        {imagesToUpload.length > 0 && (
          <div className="grid grid-cols-5 gap-2 mt-4">
            {imagesToUpload.map((img) => (
              <div key={img.id} className="relative">
                <Image
                  src={img.url}
                  alt="Preview"
                  width={60}
                  height={60}
                  className="rounded-md object-cover"
                  style={{ width: "auto", height: "auto" }} // Evitar warning de aspect ratio
                />
                <IconButton
                  size="small"
                  className="absolute top-0 right-0"
                  onClick={() => setImagesToUpload(imagesToUpload.filter((i) => i.id !== img.id))}
                >
                  <FaTrashAlt color="red" />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </div>

      <Divider />

      <TextField
        label="Título"
        {...register("titulo", { required: "El título es obligatorio" })}
        fullWidth
      />
      <TextField
        label="Descripción"
        {...register("descripcion", { required: true })}
        fullWidth
        multiline
        rows={4}
      />
      <TextField label="Autor" {...register("autor")} fullWidth />
      <TextField
        label="Orden"
        type="number"
        {...register("orden", { valueAsNumber: true })}
        fullWidth
      />

      <div>
        <Typography variant="h6" fontWeight="bold">Imagen Principal</Typography>
        {watch("imagen") && (
          <div className="mt-4 flex justify-center">
            <Image
              src={watch("imagen")}
              alt="Imagen principal"
              width={200}
              height={200}
              className="rounded-lg object-cover"
              style={{ width: "auto", height: "auto" }} // Evitar warning de aspect ratio
            />
          </div>
        )}
        <ImageBankSelector
          onSelect={(image) => setValue("imagen", image)}
          selectedImage={watch("imagen")}
        />
      </div>

      <Typography variant="h6" fontWeight="bold">Temas</Typography>
      {temas.map((tema, index) => {
        const temaImagen = watch(`temas.${index}.imagen`);
        const parrafosValue =
          parrafosValues[tema.id] ??
          (Array.isArray(watch(`temas.${index}.parrafos`)) ? watch(`temas.${index}.parrafos`).join("\n") : "");

        return (
          <Stack key={tema.id} spacing={2} className="border p-4 rounded-lg shadow-md">
            <TextField
              label="Título del Tema"
              fullWidth
              {...register(`temas.${index}.titulo`, { required: "El título es obligatorio" })}
            />
            <ImageBankSelector
              onSelect={(image) => setValue(`temas.${index}.imagen`, image)}
              selectedImage={temaImagen}
            />
            {temaImagen && (
              <div className="flex justify-center">
                <Image
                  src={temaImagen}
                  alt="Previsualización"
                  width={80}
                  height={80}
                  className="rounded-md object-cover"
                  style={{ width: "auto", height: "auto" }} // Evitar warning de aspect ratio
                />
              </div>
            )}
            <TextField
              label="Párrafos"
              multiline
              rows={6}
              fullWidth
              value={parrafosValue}
              onChange={(e) => {
                const texto = e.target.value;
                setParrafosValues((prev) => ({ ...prev, [tema.id]: texto }));
                setValue(`temas.${index}.parrafos`, texto.split("\n").filter((p) => p.trim() !== ""));
              }}
            />
            <IconButton
              onClick={() => {
                if (window.confirm("¿Estás seguro de que quieres eliminar este tema?")) {
                  removeTema(index);
                }
              }}
              color="error"
            >
              <FaTrashAlt />
            </IconButton>
          </Stack>
        );
      })}
      <Button
        variant="outlined"
        startIcon={<AiOutlinePlus />}
        onClick={() => addTema({ titulo: "", imagen: "", parrafos: [] })}
      >
        Añadir Tema
      </Button>

      <Typography variant="h6" fontWeight="bold">Productos Seleccionados</Typography>
      {selectedProducts.map((product) => (
        <Stack direction="row" key={product.id} spacing={1} alignItems="center">
          <Typography>{product.nombre}</Typography>
          <IconButton onClick={() => handleRemoveProduct(product.id)}>
            <FaTrashAlt color="red" />
          </IconButton>
        </Stack>
      ))}

      <Typography variant="h6" fontWeight="bold">Secciones</Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {secciones.map((seccion) => (
          <FormControlLabel
            key={seccion.id}
            control={
              <Checkbox
                checked={selectedSections.includes(seccion.id)}
                onChange={() => toggleSection(seccion.id)}
              />
            }
            label={seccion.nombre}
          />
        ))}
      </Stack>

      <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}>
        {loading ? <CircularProgress size={24} /> : "Crear Blog"}
      </Button>

      {alert && <Alert severity={alert.type}>{alert.message}</Alert>}

      <Dialog open={openModal} onClose={() => setOpenModal(false)}>
        <DialogTitle>Blog Creado</DialogTitle>
        <DialogContent>
          <Typography>El blog ha sido creado exitosamente.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </form>
  );
}

export default function CreateNewBlog(props: CreateNewBlogProps) {
  return (
    <ImageBankProvider>
      <CreateNewBlogComponent {...props} />
    </ImageBankProvider>
  );
}