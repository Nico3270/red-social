"use client";

import React, { useState, useEffect, useRef, useId } from "react"; // Agregamos useRef
import { IconButton, CircularProgress } from "@mui/material";
import { FaTrashAlt } from "react-icons/fa";
import { MdAddAPhoto } from "react-icons/md";
import Image from "next/image";
import { titleFont } from "@/config/fonts";
import { uploadAuthorizedMedia } from "@/lib/cloudinary/uploadAuthorizedMedia";
import {
  getCloudinaryAssetReference,
  inferCloudinaryResourceType,
  type CloudinaryResourceType,
} from "@/lib/cloudinary/cloudinaryAsset";

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
  resourceType?: CloudinaryResourceType | null;
  isUploaded?: boolean;
  deleteAuthorization?: string;
}

type UploadedMedia = {
  deleteAuthorization?: string;
  url: string;
  publicId: string | null;
  resourceType: CloudinaryResourceType | null;
};

type OptimizableImageMimeType =
  | "image/jpeg"
  | "image/jpg"
  | "image/png"
  | "image/webp";

const OPTIMIZABLE_IMAGE_TYPES = new Set<string>([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGE_WIDTH = 1600;
const MAX_IMAGE_HEIGHT = 1600;
const IMAGE_COMPRESSION_QUALITY = 0.82;

const isOptimizableRasterImage = (file: File): file is File & { type: OptimizableImageMimeType } =>
  OPTIMIZABLE_IMAGE_TYPES.has(file.type.toLowerCase());

const getOutputImageType = (file: File): OptimizableImageMimeType => {
  const normalizedType = file.type.toLowerCase();

  if (normalizedType === "image/png") {
    return "image/png";
  }

  if (normalizedType === "image/webp") {
    return "image/webp";
  }

  return "image/jpeg";
};

const getExtensionForImageType = (type: OptimizableImageMimeType) => {
  switch (type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpg":
    case "image/jpeg":
    default:
      return "jpg";
  }
};

const buildOptimizedFileName = (file: File, outputType: OptimizableImageMimeType) => {
  const safeOriginalName =
    file.name
      .split(/[\\/]/)
      .pop()
      ?.trim()
      .replace(/[^\w.\-()\s]/g, "-") || "image";
  const extension = getExtensionForImageType(outputType);
  const extensionIndex = safeOriginalName.lastIndexOf(".");
  const baseName =
    extensionIndex > 0 ? safeOriginalName.slice(0, extensionIndex) : safeOriginalName;

  return `${baseName}-optimized.${extension}`;
};

const warnImageOptimization = (message: string, error?: unknown) => {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[AutoUploadMedia] ${message}`, error);
  }
};

const loadImageFromFile = (file: File): Promise<{ image: HTMLImageElement; objectUrl: string }> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.decoding = "async";
    image.onload = () => {
      image.onload = null;
      image.onerror = null;
      resolve({ image, objectUrl });
    };
    image.onerror = () => {
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No fue posible decodificar la imagen antes de subirla."));
    };
    image.src = objectUrl;
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  outputType: OptimizableImageMimeType
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No fue posible generar la imagen optimizada."));
          return;
        }

        resolve(blob);
      },
      outputType,
      outputType === "image/png" ? undefined : IMAGE_COMPRESSION_QUALITY
    );
  });

const optimizeImageBeforeUpload = async (file: File): Promise<File> => {
  if (!isOptimizableRasterImage(file)) {
    return file;
  }

  let objectUrl: string | null = null;
  let canvas: HTMLCanvasElement | null = null;

  try {
    const { image, objectUrl: imageObjectUrl } = await loadImageFromFile(file);
    objectUrl = imageObjectUrl;

    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;

    if (!sourceWidth || !sourceHeight) {
      return file;
    }

    const scale = Math.min(
      1,
      MAX_IMAGE_WIDTH / sourceWidth,
      MAX_IMAGE_HEIGHT / sourceHeight
    );
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
    const outputType = getOutputImageType(file);

    canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d", {
      alpha: outputType === "image/png",
    });

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const optimizedBlob = await canvasToBlob(canvas, outputType);

    if (optimizedBlob.size >= file.size) {
      return file;
    }

    return new File([optimizedBlob], buildOptimizedFileName(file, outputType), {
      type: outputType,
      lastModified: file.lastModified,
    });
  } catch (error) {
    warnImageOptimization("Se usará la imagen original porque falló la optimización previa.", error);
    return file;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
};

interface AutoUploadMediaProps {
  initialData?: string | string[]; // dependiendo de `multiple`
  multiple?: boolean;
  mediaType?: string;
  titulo?: string;
  onChange: (urls: string[] | string | undefined) => void;
  onError?: (message: string) => void;
  onLoading?: (isLoading: boolean) => void;
  // En editores con guardado diferido, conservar el asset persistido hasta confirmar los cambios.
  deleteRemoteOnRemove?: boolean;
  /** Presentación opt-in; conserva el flujo y los permisos existentes. */
  presentation?: "default" | "productGallery";
}

const AutoUploadMedia: React.FC<AutoUploadMediaProps> = ({
  onChange,
  initialData,
  onError,
  onLoading,
  multiple = false,
  deleteRemoteOnRemove = true,
  mediaType = "mixto",
  titulo,
  presentation = "default",
}) => {
  const [media, setMedia] = useState<Media[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const uploadingFiles = useRef(new Set<string>());
  const isInitialized = useRef(false); // Flag para inicialización (no causa re-renders)
  const inputId = useId();

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

  // 1. Efecto para inicializar `uploadedMedia` desde initialData (con safeguard)
  useEffect(() => {
    if (isInitialized.current) return; // Solo inicializa una vez

    const initialUrls = Array.isArray(initialData)
      ? initialData
      : initialData
        ? [initialData]
        : [];

    const validUrls = initialUrls.filter((url) => url && !url.includes("default-profile.png"));

    if (validUrls.length === 0) return;

    setUploadedMedia(
      validUrls.map((url) => {
        const assetReference = getCloudinaryAssetReference(url);
        return {
          url,
          publicId: assetReference?.publicId ?? null,
          resourceType: assetReference?.resourceType ?? null,
        };
      })
    );

    isInitialized.current = true; // Marca como inicializado
  }, [initialData]);

  // 2. Efecto separado para ejecutar `onChange` de forma segura
  useEffect(() => {
    const urls = uploadedMedia.map((m) => m.url);
    onChange(multiple ? urls : urls[0] || undefined);
  }, [uploadedMedia, multiple, onChange]);

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

    // La referencia anterior permanece intacta hasta completar la nueva subida.
    // El borrado remoto de assets persistidos pertenece a la limpieza posterior al guardado.
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
        onLoading?.(true);
        const fileToUpload = await optimizeImageBeforeUpload(file);

        if (fileToUpload.size > maxImageSize) {
          onError?.(`La imagen ${file.name} excede el tamaño máximo de 10MB.`);
          continue;
        }

        newMedia.push({
          id: crypto.randomUUID(),
          file: fileToUpload,
          url: URL.createObjectURL(fileToUpload),
        });
      }
    }

    setMedia((prev) => (multiple ? [...prev, ...newMedia] : newMedia.slice(0, 1)));
    onLoading?.(false);
  };

  // Subir archivo automáticamente
  useEffect(() => {
    const uploadFile = async (mediaItem: Media) => {
      const fileId = mediaItem.id;
      if (uploadingFiles.current.has(fileId)) {
        // console.log("File already uploading, skipping:", fileId);
        return;
      }

      uploadingFiles.current.add(fileId);
      setLoading(true);
      onLoading?.(true);
      try {
        const uploaded = await uploadAuthorizedMedia(mediaItem.file);
        setUploadedMedia((prev) => multiple ? [...prev, uploaded] : [uploaded]);
      } catch (error) {
        console.error("Upload error:", error);
        onError?.(`Error al subir archivo a Cloudinary: ${error}`);
      } finally {
        uploadingFiles.current.delete(fileId);
        setLoading(uploadingFiles.current.size > 0);
        onLoading?.(uploadingFiles.current.size > 0);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media, multiple, onChange, onError, onLoading]);

  // Eliminar archivo de Cloudinary
  const handleRemoveFromCloudinary = async (
    publicId: string | null,
    url: string,
    resourceType?: CloudinaryResourceType | null,
    deleteAuthorization?: string,
  ) => {
    setLoading(true);
    onLoading?.(true);
    try {
      const assetReference = !publicId ? getCloudinaryAssetReference(url) : null;
      const resolvedPublicId = publicId || assetReference?.publicId || null;
      const resolvedResourceType =
        resourceType || assetReference?.resourceType || inferCloudinaryResourceType(url);

      if (!resolvedPublicId) {
        throw new Error(
          "No fue posible resolver un publicId confiable para eliminar este asset."
        );
      }

      const response = await fetch("/api/cloudinary/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: resolvedPublicId,
          resourceType: resolvedResourceType || "image",
          url,
          deleteAuthorization,
        }),
      });
      const data = await response.json();
      // El archivo ya se guardó: se permite retirarlo del borrador sin destruirlo remotamente.
      if (response.status === 409 && data.code === "ASSET_IN_USE") return true;
      if (!response.ok || data.success !== true) {
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
  const handleRemoveUploadedMedia = async (
    publicId: string | null,
    url: string,
    resourceType?: CloudinaryResourceType | null,
    deleteAuthorization?: string,
  ) => {
    // Sin prueba de creación (incluidos assets antiguos), solo cambia el formulario.
    const success = !deleteRemoteOnRemove || !deleteAuthorization || await handleRemoveFromCloudinary(publicId, url, resourceType, deleteAuthorization);
    if (success) {
      setUploadedMedia((prev) => {
        const updated = prev.filter(
          (m) => !(m.url === url && m.publicId === publicId)
        );
        onChange(multiple ? updated.map((m) => m.url) : updated[0]?.url || undefined);
        return updated;
      });
    }
  };

  // Combinar media y uploadedMedia para renderizar
  const renderMedia: RenderMedia[] = [
    ...media.map((m) => ({
      ...m,
      publicId: undefined,
      resourceType: null,
      isUploaded: false,
    })),
    ...uploadedMedia.map((m) => ({
      id: m.publicId || m.url,
      url: m.url,
      file: {} as File,
      publicId: m.publicId ?? undefined,
      resourceType: m.resourceType,
      isUploaded: true,
      deleteAuthorization: m.deleteAuthorization,
    })),
  ];

  // Justo antes del return en el componente
  const getTitleText = () => {
    if (mediaType === "image") {
      return multiple ? "Añade tus imágenes" : "Añade una imagen";
    } else if (mediaType === "video") {
      return multiple ? "Añade tus videos" : "Añade un video";
    } else {
      // Caso mixto
      return multiple ? "Añade tus imágenes o videos" : "Añade una imagen o video";
    }
  };

  if (presentation === "productGallery") {
    return (
      <div className="min-w-0" aria-busy={loading}>
        <input
          id={inputId}
          type="file"
          accept={getAcceptValue()}
          multiple={multiple}
          disabled={loading}
          onChange={handleAddMedia}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => document.getElementById(inputId)?.click()}
          disabled={loading}
          className="flex min-h-[116px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-gray-700 transition-colors hover:border-gray-500 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-700 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        >
          <MdAddAPhoto size={25} aria-hidden="true" />
          <span className="text-sm font-semibold">
            {loading ? "Subiendo fotografías…" : "Añadir fotografías"}
          </span>
          <span className="text-xs leading-5 text-gray-500">
            Selecciona una o varias imágenes de tu dispositivo
          </span>
        </button>
        {renderMedia.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {renderMedia.map((img, index) => (
              <div
                key={img.id}
                className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
              >
                <div className="relative aspect-square">
                  <Image
                    src={img.url}
                    alt={`Fotografía ${index + 1} del producto`}
                    fill
                    sizes="(max-width: 639px) 40vw, (max-width: 1023px) 25vw, 200px"
                    className={`object-cover ${!img.isUploaded ? "opacity-50" : ""}`}
                  />
                  {img.isUploaded && (
                    <IconButton
                      type="button"
                      aria-label={`Eliminar fotografía ${index + 1}`}
                      disabled={loading}
                      onClick={() =>
                        handleRemoveUploadedMedia(
                          img.publicId ?? null,
                          img.url,
                          img.resourceType ??
                            inferCloudinaryResourceType(img.url),
                          img.deleteAuthorization,
                        )
                      }
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 44,
                        height: 44,
                        bgcolor: "rgba(255,255,255,.95)",
                        color: "#374151",
                        "&:hover": { bgcolor: "#fef2f2", color: "#b91c1c" },
                        "&:focus-visible": {
                          outline: "2px solid #b91c1c",
                          outlineOffset: 2,
                        },
                      }}
                    >
                      <FaTrashAlt size={14} />
                    </IconButton>
                  )}
                  {!img.isUploaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CircularProgress
                        size={24}
                        sx={{ color: "#374151" }}
                        aria-label="Subiendo fotografía"
                      />
                    </div>
                  )}
                </div>
                <p className="px-3 py-2 text-xs leading-5 text-gray-600">
                  {img.isUploaded
                    ? "✓ Fotografía subida"
                    : "Pendiente de subida"}
                </p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-gray-500" role="status">
          {loading
            ? "Espera a que las fotografías terminen de subir."
            : uploadedMedia.length > 0
              ? `${uploadedMedia.length} fotografía${uploadedMedia.length === 1 ? "" : "s"} subida${uploadedMedia.length === 1 ? "" : "s"}.`
              : "Al menos una fotografía. Máximo 10 MB por imagen después de optimizar."}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {titulo && (
        <h1 className={`text-xl font-semibold shadow-md border border-gray-400 py-1 rounded-lg text-center text-gray-600 mb-4 ${titleFont.className}`}>
          {titulo}
        </h1>
      )}

      <h3 className={`text-xl font-semibold text-center text-indigo-600 mb-4 ${titleFont.className}`}>
        {getTitleText()}
      </h3>

      <div className="flex flex-wrap gap-4 mb-4 justify-center">
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
                img.isUploaded
                  ? handleRemoveUploadedMedia(
                      img.publicId ?? null,
                      img.url,
                      img.resourceType ?? inferCloudinaryResourceType(img.url),
                      img.deleteAuthorization,
                    )
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
            disabled={loading}
            accept={getAcceptValue()}
            onChange={handleAddMedia}
            className="hidden"
            id={inputId}  // Usa el ID único
            multiple={multiple}
          />
          <button
            type="button"
            disabled={loading}
            aria-label="Añadir archivo multimedia"
            onClick={() => document.getElementById(inputId)?.click()}  // Busca por el ID único
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
