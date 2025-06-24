"use client";

import React, { useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { ImageGalleryItem, VideoGalleryItem } from "../interfaces/types";
import CarruselVideoGallery from "./CarruselVideoGallery";
import { LatoFont,  SeccionesFont,  titleFont, titulosPrincipales } from "@/config/fonts";
import { InfoEmpresa } from "@/config/config";

interface GalleryComponentProps {
  videos: VideoGalleryItem[];
  images: ImageGalleryItem[];
}

const GalleryComponent: React.FC<GalleryComponentProps> = ({ videos, images }) => {
  const [selectedImage, setSelectedImage] = useState<ImageGalleryItem | null>(null);

  const closeModal = () => {
    setSelectedImage(null);
  };

  return (
    <section
      className="w-full min-h-screen flex flex-col gap-4 px-4 md:px-16 lg:px-32 py-12 bg-gradient-to-b from-gray-50 to-white"
      aria-labelledby="gallery-title"
    >
      {/* Título Principal */}
      <header className="text-center">
        <h1
          id="gallery-title"
          className={`text-4xl md:text-5xl font-extrabold  mb-4 ${titulosPrincipales.className} color-titulos `}
        >
          Galería de Inspiración
        </h1>
        <p className={`text-lg color-descripcion-tarjeta ${titleFont.className}`}>
          {`Momentos destacados en ${InfoEmpresa.nombreCompleto}`}
        </p>
      </header>

      {/* Sección del Carrusel de Videos */}
      <div className="w-full">
        <CarruselVideoGallery videos={videos} />
      </div>

      {/* Sección de Imágenes Estilo Pinterest */}
      <div className="w-full">
        <h1
          id="imagenes-inspiradoras"
          className={`text-4xl md:text-5xl text-center font-extrabold  mb-4 ${titulosPrincipales.className} color-titulos `}
        >
          Imágenes inspiradoras
        </h1>
        <p className={`text-lg mb-4 color-descripcion-tarjeta ${titleFont.className}`}>
          {`Momentos destacados en ${InfoEmpresa.nombreCompleto}`}
        </p>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          aria-label="Galería de imágenes"
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
      </div>

      {/* Modal Personalizado */}
      <div
        className={clsx(
          "fixed inset-0 bg-black/70 z-50 flex items-center justify-center transition-opacity duration-300",
          { "opacity-100 pointer-events-auto": selectedImage },
          { "opacity-0 pointer-events-none": !selectedImage }
        )}
        onClick={closeModal}
      >
        {selectedImage && (
          <div
            className="relative bg-white rounded-lg p-4 max-w-3xl w-full shadow-lg z-60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón de cierre */}
            <button
              className="absolute top-4 right-4 text-gray-200 color-boton-descripcion p-3 rounded-full cursor-pointer z-70"
              style={{ zIndex: 70 }} // Forzamos un z-index alto
              onClick={(e) => {
                e.stopPropagation();
                closeModal();
              }}
            >
              ✕
            </button>
            <div className="relative w-full h-96">
              <Image
                src={selectedImage.url}
                alt={selectedImage.title}
                fill
                className="object-contain"
              />
            </div>
            <div className="mt-4 text-center">
              <h3 className={`text-2xl font-bold color-titulo-tarjeta ${SeccionesFont.className}`}>
                {selectedImage.title}
              </h3>
              <p className={`color-descripcion-tarjeta mt-2 ${LatoFont.className} text-lg`}>
                {selectedImage.description}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default GalleryComponent;
