"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Modal from "react-modal";
import { ImageGalleryItem } from "../interfaces/types";

interface ImageSectionGalleryProps {
  images: ImageGalleryItem[];
}

const ImageSectionGallery: React.FC<ImageSectionGalleryProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<ImageGalleryItem | null>(null);

  // Configuración de react-modal solo cuando el DOM está listo
  useEffect(() => {
    const appElement = document.getElementById("__next");
    if (appElement) {
      Modal.setAppElement(appElement);
    } else {
      console.error("El elemento con ID '__next' no fue encontrado.");
    }
  }, []);

  const closeModal = () => {
    setSelectedImage(null);
  };

  return (
    <section
      className="w-full bg-gray-50 py-8 px-2 sm:px-4 md:px-8 lg:px-12"
      aria-label="Galería de imágenes"
    >
      {/* Grid de imágenes */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        aria-label="Galería de detalles"
      >
        {images.map((image) => (
          <figure
            key={image.id}
            className="relative group cursor-pointer overflow-hidden rounded-lg shadow-md"
            style={{ height: "300px" }}
            onClick={() => setSelectedImage(image)}
          >
            {/* Imagen */}
            <Image
              src={image.url}
              alt={image.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Superposición con título y descripción */}
            <figcaption className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 to-transparent p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <h3 className="text-lg font-bold">{image.title}</h3>
              <p className="text-sm">{image.description}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Modal para la imagen seleccionada */}
      <Modal
        isOpen={!!selectedImage}
        onRequestClose={closeModal} // Cierre con clic fuera o tecla ESC
        contentLabel="Imagen Ampliada"
        className="flex items-center justify-center inset-0 z-50"
        overlayClassName="fixed inset-0 bg-black/70"
      >
        {selectedImage && (
          <div className="relative bg-white rounded-lg p-4 max-w-3xl w-full shadow-lg">
            {/* Botón de cierre */}
            <button
              className="absolute top-4 right-4 text-gray-800 bg-gray-200 hover:bg-gray-300 p-2 rounded-full cursor-pointer"
              onClick={closeModal}
            >
              ✕
            </button>
            {/* Imagen dentro del modal */}
            <div className="relative w-full h-96">
              <Image
                src={selectedImage.url}
                alt={selectedImage.title}
                fill
                className="object-contain"
              />
            </div>
            {/* Título y descripción */}
            <div className="mt-4 text-center">
              <h3 className="text-2xl font-bold text-gray-800">{selectedImage.title}</h3>
              <p className="text-gray-600 mt-2">{selectedImage.description}</p>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};

export default ImageSectionGallery;
