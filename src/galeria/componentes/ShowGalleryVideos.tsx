"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Link from "next/link";
import { VideoGalleryItem } from "../interfaces/types";
import { addNewVideo } from "@/galeria/actions/addNewVideo";
import { updateVideosOrder } from "@/galeria/actions/updateVideosOrder";
import { uploadVideoToCloudinary } from "../actions/uploadVideoToCloudinary";
import { SortableRow } from "./SortableRow";
import { FiMove, FiEdit } from "react-icons/fi";
import { titulosPrincipales } from "@/config/fonts";


interface ShowGalleryVideosProps {
  initialVideos: VideoGalleryItem[];
}

const ShowGalleryVideos: React.FC<ShowGalleryVideosProps> = ({ initialVideos }) => {
  const [videos, setVideos] = useState<VideoGalleryItem[]>(initialVideos);
  const [newVideo, setNewVideo] = useState<VideoGalleryItem>({
    id: "",
    url: "",
    title: "",
    description: "",
    order: videos.length + 1,
  });
  const [uploading, setUploading] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  // Subir video a Cloudinary
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const uploadedUrl = await uploadVideoToCloudinary(file);
        setNewVideo((prev) => ({ ...prev, url: uploadedUrl }));
        alert("Video subido con éxito.");
      } catch (error) {
        console.error("Error al subir el video:", error);
        alert("Error al subir el video.");
      } finally {
        setUploading(false);
      }
    }
  };

  // Agregar nuevo video
  const handleAddVideo = async () => {
    if (newVideo.url && newVideo.title && newVideo.description) {
      try {
        const response = await addNewVideo({
          url: newVideo.url,
          title: newVideo.title,
          description: newVideo.description,
          order: videos.length + 1,
        });

        if (response.success && response.video) {
          setVideos([...videos, response.video]);
          setNewVideo({ id: "", url: "", title: "", description: "", order: videos.length + 2 });
          alert("Video agregado con éxito.");
        } else {
          console.error(response || "Error al agregar el video.");
        }
      } catch (error) {
        console.error("Error al agregar el video:", error);
        alert("Error al agregar el video.");
      }
    } else {
      alert("Por favor, completa todos los campos antes de agregar un nuevo video.");
    }
  };

  // Reordenar videos mediante Drag & Drop
  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = videos.findIndex((video) => video.id === active.id);
      const newIndex = videos.findIndex((video) => video.id === over.id);

      const reorderedVideos = arrayMove(videos, oldIndex, newIndex).map((video, index) => ({
        ...video,
        order: index + 1,
      }));

      setVideos(reorderedVideos);

      try {
        setIsSavingOrder(true);
        const result = await updateVideosOrder(
          reorderedVideos.map(({ id, order }) => ({ id, order }))
        );
        if (result.success) {
          alert("Orden actualizado con éxito.");
        } else {
          console.error("Error al actualizar el orden.");
        }
      } catch (error) {
        console.error("Error al guardar el orden:", error);
      } finally {
        setIsSavingOrder(false);
      }
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <h1 className={`text-2xl font-bold mb-4 text-center color-titulo-tarjeta ${titulosPrincipales.className}`}>
        Administración de videos de la galería
      </h1>

      {/* Formulario para agregar un nuevo video */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Agregar nuevo video</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="border rounded-md p-2"
          />
          <input
            type="text"
            placeholder="Título"
            value={newVideo.title}
            onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
            className="border rounded-md p-2"
          />
          <input
            type="text"
            placeholder="Descripción"
            value={newVideo.description}
            onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
            className="border rounded-md p-2"
          />
        </div>
        <button
          onClick={handleAddVideo}
          disabled={uploading}
          className={`mt-4 px-4 py-2 rounded-md ${uploading ? "bg-gray-400" : "bg-[#EB5B00] hover:bg-[#FFB200]"
            } text-white`}
        >
          {uploading ? "Subiendo..." : "Agregar Video"}
        </button>
      </div>

      {/* Tabla de videos */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={videos.map((video) => video.id)} strategy={verticalListSortingStrategy}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200 text-gray-800">
                <th className="p-2 border">Orden</th>
                <th className="p-2 border">Vista previa</th>
                <th className="p-2 border">Título</th>
                <th className="p-2 border">Modificar</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <SortableRow key={video.id} id={video.id}>
                  <td className="p-2 border text-center cursor-grab">
                    <FiMove className="text-gray-500" />
                  </td>
                  <td className="p-2 border">
                    <video src={video.url} className="h-16 w-28 object-cover" controls />
                  </td>
                  <td className="p-2 border">{video.title}</td>
                  <td className="p-2 border text-center">
                    <Link href={`/dashboard/galleryVideos/${video.id}`} className="text-blue-500 hover:underline">
                      <FiEdit /> Modificar
                    </Link>
                  </td>
                </SortableRow>
              ))}
            </tbody>
          </table>
        </SortableContext>
        {isSavingOrder && (
          <p className="text-center text-blue-500 mt-4">Guardando el nuevo orden...</p>
        )}
      </DndContext>
    </div>
  );
};

export default ShowGalleryVideos;
