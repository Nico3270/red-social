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
import Image from "next/image";
import { ImageGalleryItem } from "../interfaces/types";
import { addNewImage } from "@/galeria/actions/addNewImage";
import { updateImagesOrder } from "@/galeria/actions/updateImagesOrder";
import { uploadImageToCloudinary } from "../actions/uploadImageToCloudinary";
import { SortableRow } from "./SortableRow";
import { FiMove, FiUploadCloud } from "react-icons/fi";
import { titulosPrincipales } from "@/config/fonts";


interface ShowGalleryImagesProps {
  initialImages: ImageGalleryItem[];
}

const ShowGalleryImages: React.FC<ShowGalleryImagesProps> = ({ initialImages }) => {
  const [images, setImages] = useState<ImageGalleryItem[]>(initialImages);
  const [newImage, setNewImage] = useState<ImageGalleryItem>({
    id: "",
    url: "",
    title: "",
    description: "",
    order: images.length + 1,
  });
  const [uploading, setUploading] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  // Manejar subida de imágenes
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const uploadedUrl = await uploadImageToCloudinary(file);
        setNewImage((prev) => ({ ...prev, url: uploadedUrl }));
        alert("Imagen subida con éxito.");
      } catch (error) {
        console.error("Error al subir la imagen:", error);
        alert("Error al subir la imagen.");
      } finally {
        setUploading(false);
      }
    }
  };

  // Agregar nueva imagen
  const handleAddImage = async () => {
    if (newImage.url && newImage.title && newImage.description) {
      try {
        const response = await addNewImage({
          url: newImage.url,
          title: newImage.title,
          description: newImage.description,
          order: images.length + 1,
        });

        if (response.success && response.image) {
          setImages([...images, response.image]);
          setNewImage({ id: "", url: "", title: "", description: "", order: images.length + 2 });
          alert("Imagen agregada con éxito.");
        } else {
          console.error(response || "Error al agregar la imagen.");
        }
      } catch (error) {
        console.error("Error al agregar la imagen:", error);
        alert("Error al agregar la imagen.");
      }
    } else {
      alert("Por favor, completa todos los campos antes de agregar una nueva imagen.");
    }
  };

  // Manejar reordenamiento de imágenes
  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = images.findIndex((image) => image.id === active.id);
      const newIndex = images.findIndex((image) => image.id === over.id);

      const reorderedImages = arrayMove(images, oldIndex, newIndex).map((image, index) => ({
        ...image,
        order: index + 1,
      }));

      setImages(reorderedImages);

      try {
        setIsSavingOrder(true);
        const result = await updateImagesOrder(
          reorderedImages.map(({ id, order }) => ({ id, order }))
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
        Administración de imágenes de la galería
      </h1>

      {/* Formulario para agregar una nueva imagen */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Agregar nueva imagen</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="fileInput"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => document.getElementById("fileInput")?.click()}
            className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md transition"
          >
            <FiUploadCloud className="text-xl" />
            {uploading ? "Subiendo..." : "Seleccionar Imagen"}
          </button>
          <input
            type="text"
            placeholder="Título"
            value={newImage.title}
            onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
            className="border rounded-md p-2"
          />
          <input
            type="text"
            placeholder="Descripción"
            value={newImage.description}
            onChange={(e) => setNewImage({ ...newImage, description: e.target.value })}
            className="border rounded-md p-2"
          />
        </div>
        <button
          onClick={handleAddImage}
          disabled={uploading}
          className={`mt-4 px-4 py-2 rounded-md ${
            uploading ? "bg-gray-400" : "bg-[#EB5B00] hover:bg-[#FFB200]"
          } text-white`}
        >
          {uploading ? "Subiendo..." : "Agregar Imagen"}
        </button>
      </div>

      {/* Listado de imágenes */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={images.map((image) => image.id)} strategy={verticalListSortingStrategy}>
          {images.map((image) => (
            <SortableRow key={image.id} id={image.id}>
              <div className="flex items-center gap-4 border-b py-4">
                <FiMove className="cursor-grab" />
                <Image src={image.url} alt={image.title} width={64} height={64} className="rounded" />
                <div>
                  <p className="font-semibold">{image.title}</p>
                  <p className="text-sm text-gray-500">{image.description}</p>
                </div>
                <Link
                  href={`/dashboard/galleryImages/${image.id}`}
                  className="ml-auto text-[#EB5B00] hover:underline"
                >
                  Modificar
                </Link>
              </div>
            </SortableRow>
          ))}
        </SortableContext>
      </DndContext>

      {isSavingOrder && <p className="text-center mt-4 text-blue-500">Guardando el orden...</p>}
    </div>
  );
};

export default ShowGalleryImages;
