"use client";

import React, { useState } from "react";
import { updateGalleryImage } from "@/galeria/actions/updateGalleryImage";
import { deleteImage } from "@/galeria/actions/deleteImage";
import { ImageGalleryItem } from "@/galeria/interfaces/types";
import { uploadImageToCloudinary } from "@/galeria/actions/uploadImageToCloudinary";
import { FiTrash2, FiEdit, FiCamera } from "react-icons/fi";
import Image from "next/image";

interface ModifyGalleryImageProps {
  initialImage: ImageGalleryItem;
}

const ModifyGalleryImage: React.FC<ModifyGalleryImageProps> = ({ initialImage }) => {
  const [formData, setFormData] = useState({
    url: initialImage.url,
    title: initialImage.title,
    description: initialImage.description,
  });

  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Subir nueva imagen a Cloudinary
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const uploadedUrl = await uploadImageToCloudinary(file);
        setFormData((prev) => ({ ...prev, url: uploadedUrl }));
        alert("Imagen subida con éxito.");
      } catch (error) {
        console.error("Error al subir la imagen:", error);
        alert("Error al subir la imagen.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await updateGalleryImage({
        id: initialImage.id,
        ...formData,
        order: initialImage.order,
      });

      if (response.success) {
        alert("Imagen actualizada con éxito.");
      } else {
        alert(response.error || "Error al actualizar la imagen.");
      }
    } catch (error) {
      console.error("Error al actualizar la imagen:", error);
      alert("Error al actualizar la imagen.");
    }
  };

  const handleDelete = async () => {
    if (confirm("¿Estás seguro de que deseas eliminar esta imagen?")) {
      setDeleting(true);
      try {
        const response = await deleteImage(initialImage.id);

        if (response.success) {
          alert("Imagen eliminada con éxito.");
          window.location.href = "/dashboard/galleryImages";
        } else {
          alert(response.error || "Error al eliminar la imagen.");
        }
      } catch (error) {
        console.error("Error al eliminar la imagen:", error);
        alert("Error al eliminar la imagen.");
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white shadow-md rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Modificar Imagen</h1>
      
      <Image
        src={formData.url}
        alt={formData.title}
        width={600}
        height={400}
        className="w-full h-48 object-cover rounded-lg mb-6"
      />

      <div className="grid grid-cols-1 gap-4">
        {/* Botón de selección de imagen con ícono */}
        <input
          type="file"
          accept="image/*"
              multiple
          onChange={handleFileChange}
          className="hidden"
          id="fileInput"
        />
        
        <button
          type="button"
          onClick={() => document.getElementById("fileInput")?.click()}
          className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md transition"
        >
          <FiCamera className="text-xl" /> 
          {uploading ? "Subiendo imagen..." : "Seleccionar nueva imagen"}
        </button>

        <input
          type="text"
          placeholder="Título"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="border rounded-md p-2"
        />
        <input
          type="text"
          placeholder="Descripción"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="border rounded-md p-2"
        />
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={handleUpdate}
          disabled={uploading}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2"
        >
          <FiEdit /> {uploading ? "Actualizando..." : "Modificar"}
        </button>
        
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 flex items-center gap-2"
        >
          <FiTrash2 /> {deleting ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </div>
  );
};

export default ModifyGalleryImage;
