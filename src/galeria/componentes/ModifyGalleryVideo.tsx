"use client";

import React, { useState } from "react";
import { deleteVideo } from "@/galeria/actions/deleteVideo";
import { VideoGalleryItem } from "@/galeria/interfaces/types";
import { uploadVideoToCloudinary } from "@/galeria/actions/uploadVideoToCloudinary";
import { deleteVideoFromCloudinary } from "@/galeria/actions/deleteVideoFromCloudinary";
import { FiTrash2, FiEdit, FiUploadCloud } from "react-icons/fi";
import { updateGalleryVideo } from "@/galeria/actions/updateGalleryVideo";

interface ModifyGalleryVideoProps {
  initialVideo: VideoGalleryItem;
}

const ModifyGalleryVideo: React.FC<ModifyGalleryVideoProps> = ({ initialVideo }) => {
  const [formData, setFormData] = useState({
    url: initialVideo.url,
    title: initialVideo.title,
    description: initialVideo.description,
  });
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Subir nuevo video
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        // Subir nuevo video
        const uploadedUrl = await uploadVideoToCloudinary(file);

        // Eliminar video anterior de Cloudinary
        const publicId = formData.url.split('/').pop()?.split('.')[0];
        if (publicId) {
          const deleteResponse = await deleteVideoFromCloudinary(publicId);
          if (!deleteResponse.success) {
            alert("Error al eliminar el video anterior.");
          }
        }

        // Actualizar URL del video
        setFormData((prev) => ({ ...prev, url: uploadedUrl }));
        alert("Video subido con éxito.");
      } catch (error) {
        console.error("Error al subir el video:", error);
        alert("Error al subir el video.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await updateGalleryVideo({
        id: initialVideo.id,
        ...formData,
        order: initialVideo.order,
      });

      if (response.success) {
        alert("Video actualizado con éxito.");
      } else {
        alert(response.error || "Error al actualizar el video.");
      }
    } catch (error) {
      console.error("Error al actualizar el video:", error);
      alert("Error al actualizar el video.");
    }
  };

  const handleDelete = async () => {
    if (confirm("¿Estás seguro de que deseas eliminar este video?")) {
      setDeleting(true);
      try {
        const publicId = formData.url.split('/').pop()?.split('.')[0];
        if (publicId) {
          const deleteResponse = await deleteVideoFromCloudinary(publicId);
          if (!deleteResponse.success) {
            alert("Error al eliminar el video de Cloudinary.");
          }
        }

        const response = await deleteVideo(initialVideo.id);

        if (response.success) {
          alert("Video eliminado con éxito.");
          window.location.href = "/dashboard/galleryVideos";
        } else {
          alert(response.error || "Error al eliminar el video.");
        }
      } catch (error) {
        console.error("Error al eliminar el video:", error);
        alert("Error al eliminar el video.");
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white shadow-md rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Modificar Video</h1>
      <video
        src={formData.url}
        className="w-full h-48 object-cover rounded-lg mb-6"
        controls
      />
      <div className="grid grid-cols-1 gap-4">
        {/* Input oculto para selección de archivo */}
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
          id="videoFileInput"
        />

        {/* Botón con ícono para subir nuevo video */}
        <button
          type="button"
          onClick={() => document.getElementById("videoFileInput")?.click()}
          className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md transition"
        >
          <FiUploadCloud className="text-xl" />
          {uploading ? "Subiendo video..." : "Seleccionar nuevo video"}
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
          <FiEdit /> {uploading ? "Subiendo..." : "Modificar"}
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

export default ModifyGalleryVideo;
