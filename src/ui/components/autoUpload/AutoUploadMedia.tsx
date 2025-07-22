
"use client";

import React, { useState, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { IconButton, CircularProgress } from "@mui/material";
import { FaTrashAlt } from "react-icons/fa";
import { MdAddAPhoto } from "react-icons/md";
import Image from "next/image";
import { titulo1 } from "@/config/fonts";

interface Media {
  id: string;
  file: File;
  url: string;
}



interface RenderMedia {
  id: string;
  url: string;
  file: File;
  publicId?: string;
}

type UploadedMedia = {
  url: string;
  publicId: string;
};

interface AutoUploadMediaProps {
  initialData?: string | string[]; // dependiendo de `multiple`
  multiple?: boolean;
  mediaType?: string;
  titulo?: string;
  onChange: (urls: string[] | string | undefined) => void;
  onError?: (message: string) => void;
  onLoading?: (isLoading: boolean) => void;
}

const AutoUploadMedia: React.FC<AutoUploadMediaProps> = ({
  onChange,
  initialData,
  onError,
  onLoading,
  multiple = false,
  mediaType = "mixto",
  titulo
}) => {
  const [media, setMedia] = useState<Media[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  // Determinar el atributo accept según mediaType
  const getAcceptValue = () => {
    switch (mediaType) {
      case "image":
        return "image/*";
      case "video":
        return "video/mp4,video/webm,video/ogg";
      case "mixto":
      default:
        return "image/*,video/mp4,video/webm,video/ogg";
    }
  };

  // 1. Efecto para inicializar `uploadedMedia` desde initialData
  useEffect(() => {
    const initialUrls = Array.isArray(initialData)
      ? initialData
      : initialData
        ? [initialData]
        : [];

    const validUrls = initialUrls.filter((url) => url && !url.includes("default-profile.png"));

    if (validUrls.length === 0) return;

    setUploadedMedia(
      validUrls.map((url) => {
        const publicId = url.split("/").slice(-2).join("/").split(".")[0];
        return { url, publicId };
      })
    );
  }, [initialData]);

  // 2. Efecto separado para ejecutar `onChange` de forma segura
  useEffect(() => {
    const urls = uploadedMedia.map((m) => m.url);
    onChange(multiple ? urls : urls[0] || undefined);
  }, [uploadedMedia, multiple]);


  // Manejar selección de archivo
  const handleAddMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const supportedVideoFormats = ["video/mp4", "video/webm", "video/ogg"];
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxVideoSize = 100 * 1024 * 1024; // 100MB

    // Validar que los archivos coincidan con mediaType
    for (const file of files) {
      if (mediaType === "image" && !file.type.startsWith("image/")) {
        onError?.(`Archivo ${file.name} no es una imagen.`);
        return;
      }
      if (mediaType === "video" && !file.type.startsWith("video/")) {
        onError?.(`Archivo ${file.name} no es un video.`);
        return;
      }
    }

    // Si multiple es false, limpiar medios previos
    if (!multiple && (media.length > 0 || uploadedMedia.length > 0)) {
      if (uploadedMedia.length > 0) {
        await Promise.all(
          uploadedMedia.map((m) => handleRemoveFromCloudinary(m.publicId, m.url))
        );
      }
      setMedia([]);
      setUploadedMedia([]);
    }

    const newMedia: Media[] = [];
    for (const file of files) {
      if (file.type.startsWith("video/")) {
        if (!supportedVideoFormats.includes(file.type)) {
          onError?.(`Formato de video no compatible en ${file.name}. Usa MP4, WebM o OGG.`);
          continue;
        }
        if (file.size > maxVideoSize) {
          onError?.(`El video ${file.name} excede el tamaño máximo de 100MB.`);
          continue;
        }
        newMedia.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
      } else if (file.type.startsWith("image/")) {
        if (file.size > maxImageSize) {
          try {
            onLoading?.(true);
            const compressedFile = await imageCompression(file, {
              maxSizeMB: 10,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            });
            newMedia.push({
              id: crypto.randomUUID(),
              file: compressedFile,
              url: URL.createObjectURL(compressedFile),
            });
          } catch (error) {
            onError?.(`Error al comprimir ${file.name}: ${error}`);
          }
        } else {
          newMedia.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
        }
      }
    }

    setMedia((prev) => (multiple ? [...prev, ...newMedia] : newMedia.slice(0, 1)));
    onLoading?.(false);
  };

  // Subir archivo automáticamente
  useEffect(() => {
    const uploadFile = async (mediaItem: Media) => {
      const fileId = mediaItem.id;
      if (uploadingFiles.has(fileId)) {
        console.log("File already uploading, skipping:", fileId);
        return;
      }

      setUploadingFiles((prev) => new Set(prev).add(fileId));
      setLoading(true);
      onLoading?.(true);
      const formData = new FormData();
      formData.append("file", mediaItem.file);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

      try {
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!}/${mediaItem.file.type.startsWith("video/") ? "video" : "image"
          }/upload`,
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(`Error en la carga: ${data.error?.message || response.statusText}`);
        }
        if (data.secure_url) {
          const newUploadedMedia = { url: data.secure_url, publicId: data.public_id };
          setUploadedMedia((prev) => {
            const updated = multiple ? [...prev, newUploadedMedia] : [newUploadedMedia];
            onChange(multiple ? updated.map((m) => m.url) : updated[0]?.url || undefined);
            return updated;
          });
        } else {
          throw new Error("No se subió el archivo.");
        }
      } catch (error) {
        console.error("Upload error:", error);
        onError?.(`Error al subir archivo a Cloudinary: ${error}`);
      } finally {
        setUploadingFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        setLoading(false);
        onLoading?.(false);
        setMedia((prev) => {
          const updated = prev.filter((m) => m.id !== fileId);
          updated.forEach((m) => URL.revokeObjectURL(m.url));
          return updated;
        });
      }
    };

    if (media.length > 0) {
      media.forEach((m) => uploadFile(m));
    }
  }, [media, multiple, onChange, onError, onLoading]);

  // Eliminar archivo de Cloudinary
  const handleRemoveFromCloudinary = async (publicId: string, url: string) => {
    setLoading(true);
    onLoading?.(true);
    try {
      const response = await fetch("/api/cloudinary/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId,
          resourceType: url.includes("video") ? "video" : "image",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          `Error al eliminar de Cloudinary: ${data.error?.message || response.statusText || "Unknown error"}`
        );
      }
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      onError?.(`Error al eliminar archivo: ${error}`);
      return false;
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  };

  // Manejar eliminación de archivos locales
  const handleRemoveMedia = async (id: string) => {
    setMedia((prev) => {
      const mediaToRemove = prev.find((m) => m.id === id);
      if (mediaToRemove) URL.revokeObjectURL(mediaToRemove.url);
      return prev.filter((m) => m.id !== id);
    });
  };

  // Manejar eliminación de archivos subidos
  const handleRemoveUploadedMedia = async (publicId: string, url: string) => {
    const success = await handleRemoveFromCloudinary(publicId, url);
    if (success) {
      setUploadedMedia((prev) => {
        const updated = prev.filter((m) => m.publicId !== publicId);
        onChange(multiple ? updated.map((m) => m.url) : updated[0]?.url || undefined);
        return updated;
      });
    }
  };

  // Combinar media y uploadedMedia para renderizar
  const renderMedia: RenderMedia[] = [
    ...media.map((m) => ({ ...m, publicId: undefined })),
    ...uploadedMedia.map((m) => ({ id: m.publicId, url: m.url, file: {} as File, publicId: m.publicId })),
  ];

  // Justo antes del return en el componente
  const getTitleText = () => {
    if (mediaType === "image") {
      return multiple ? "Añade tus fotos" : "Añade una foto";
    } else if (mediaType === "video") {
      return multiple ? "Añade tus videos" : "Añade un video";
    } else {
      // Caso mixto
      return multiple ? "Añade tus fotos o videos" : "Añade una foto o video";
    }
  };

  return (
    <div className="mb-6">
      {titulo && (
  <h1 className={`text-xl font-semibold shadow-md border border-gray-400 py-1 rounded-lg text-center text-gray-600 mb-4 ${titulo1.className}`}>
    {titulo}
  </h1>
)}

      <h3 className={`text-xl font-semibold text-center text-indigo-600 mb-4 ${titulo1.className}`}>
        {getTitleText()}
      </h3>

      <div className="flex flex-wrap gap-4 mb-4">
        {renderMedia.map((img) => (
          <div key={img.id} className="relative w-64 h-64 mb-4 shadow-md rounded-lg overflow-hidden">
            {img.url.includes("video") ? (
              <video src={img.url} className="rounded-lg object-cover w-full h-full" controls />
            ) : (
              <Image src={img.url} alt="Previsualización" className="rounded-lg object-cover" fill />
            )}
            <IconButton
              size="small"
              onClick={() =>
                img.publicId
                  ? handleRemoveUploadedMedia(img.publicId, img.url)
                  : handleRemoveMedia(img.id)
              }
              className="absolute top-2 right-2 bg-white/80 hover:bg-red-100 rounded-full transition-all"
              aria-label={`Eliminar ${img.url.includes("video") ? "video" : "imagen"} ${img.id}`}
            >
              <FaTrashAlt color="red" />
            </IconButton>
          </div>
        ))}
        <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-all">
          <input
            type="file"
            accept={getAcceptValue()}
            onChange={handleAddMedia}
            className="hidden"
            id="media-file-input"
            multiple={multiple}
          />
          <button
            type="button"
            onClick={() => document.getElementById("media-file-input")?.click()}
            className="p-3 rounded-full bg-gray-200 hover:bg-blue-100 text-gray-600 hover:text-blue-600 transition-all"
          >
            <MdAddAPhoto className="text-4xl" />
          </button>
        </label>
      </div>
      {loading && <CircularProgress size={24} sx={{ color: "blue" }} />}
    </div>
  );
};

export default AutoUploadMedia;