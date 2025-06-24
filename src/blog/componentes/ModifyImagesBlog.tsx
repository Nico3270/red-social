"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FaTrashAlt, FaPlus } from "react-icons/fa";
import { Modal, Box, Typography, Button, CircularProgress } from "@mui/material";
import { deleteImageFromBlog, uploadImages } from "../actions/blogImageActions";
import { InfoEmpresa as empresa } from "@/config/config";
interface ModifyImagesBlogProps {
  blogId: string;
  imagenPrincipal: string;
  imagenesAdicionales: string[];
  onImagesUpdated: (urls: { principal: string; adicionales: string[] }) => void;
}

const ModifyImagesBlog: React.FC<ModifyImagesBlogProps> = ({
  blogId,
  imagenPrincipal,
  imagenesAdicionales,
  onImagesUpdated,
}) => {
  const [previewMainImage, setPreviewMainImage] = useState<string>(imagenPrincipal);
  const [previewAdditionalImages, setPreviewAdditionalImages] = useState<string[]>(imagenesAdicionales);
  const [localMainImage, setLocalMainImage] = useState<File | null>(null);
  const [localAdditionalImages, setLocalAdditionalImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Manejar subida de nueva imagen principal
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLocalMainImage(file);
      setPreviewMainImage(URL.createObjectURL(file));
    }
  };

  // Añadir imágenes adicionales
  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const previews = files.map((file) => URL.createObjectURL(file));

      setLocalAdditionalImages((prev) => [...prev, ...files]);
      setPreviewAdditionalImages((prev) => [...prev, ...previews]);
    }
  };

  // Eliminar imagen adicional
  const handleRemoveAdditionalImage = async (index: number, imageUrl: string) => {
    setLoading(true);
    try {
      await deleteImageFromBlog(blogId, imageUrl);
      setPreviewAdditionalImages((prev) => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Error al eliminar imagen:", error);
    } finally {
      setLoading(false);
    }
  };

  // Guardar cambios (subir imágenes)
  const handleSaveImages = async () => {
    setLoading(true);
    const formData = new FormData();

    if (localMainImage) {
      formData.append("imagenPrincipal", localMainImage);
    }

    localAdditionalImages.forEach((file) => {
      formData.append("imagenes", file);
    });

    try {
      const uploadedUrls = await uploadImages(blogId, formData);
      const updatedUrls = {
        principal: uploadedUrls[0] || previewMainImage,
        adicionales: uploadedUrls.slice(1),
      };

      onImagesUpdated(updatedUrls);
      setLocalMainImage(null);
      setLocalAdditionalImages([]);
      setModalOpen(true);  // Mostrar modal al finalizar
    } catch (error) {
      console.error("Error al actualizar imágenes:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Imagen Principal */}
      <Typography variant="h6" className="font-bold">
        Imagen Principal
      </Typography>
      <div className="relative w-64 h-64 border-2 border-dashed">
        <Image
          src={previewMainImage || empresa.imagenesPlaceholder.notfound}
          alt="Imagen Principal"
          layout="fill"
          objectFit="cover"
          className="rounded-lg"
        />
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={handleMainImageChange}
        />
      </div>

      {/* Imágenes Adicionales */}
      <Typography variant="h6" className="font-bold mt-4">
        Imágenes Adicionales
      </Typography>
      <div className="flex gap-4 flex-wrap">
        {previewAdditionalImages.map((src, index) => (
          <div key={index} className="relative w-32 h-32">
            <Image src={src} alt="Imagen Adicional" layout="fill" objectFit="cover" className="rounded-lg" />
            <button
              type="button"
              onClick={() => handleRemoveAdditionalImage(index, src)}
              className="absolute top-0 right-0 bg-white p-1 rounded-full"
              disabled={loading}
            >
              <FaTrashAlt color="red" />
            </button>
          </div>
        ))}
        <label className="flex items-center cursor-pointer">
          <FaPlus className="text-2xl text-gray-500" />
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleAdditionalImagesChange}
          />
        </label>
      </div>

      {/* Botón Guardar */}
      <button
        type="button"
        className={`py-2 px-4 rounded-lg text-white ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600"
        }`}
        onClick={handleSaveImages}
        disabled={loading}
      >
        {loading ? <CircularProgress size={20} /> : "Guardar Imágenes"}
      </button>

      {/* Modal de Confirmación */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <Box className="p-6 bg-white rounded-md max-w-md mx-auto mt-20">
          <Typography variant="h6">Actualización Completa</Typography>
          <Typography>Las imágenes se han actualizado correctamente.</Typography>
          <Button
            onClick={() => setModalOpen(false)}
            variant="contained"
            color="primary"
            className="mt-4"
          >
            Cerrar
          </Button>
        </Box>
      </Modal>
    </div>
  );
};

export default ModifyImagesBlog;
