"use client";

import React, { useRef} from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Swiper as SwiperCore } from "swiper"; // Importa el tipo SwiperCore
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { VideoGalleryItem } from "../interfaces/types";
import { SeccionesFont, titleFont } from "@/config/fonts";

interface CarruselVideoGalleryProps {
  videos: VideoGalleryItem[];
}

const CarruselVideoGallery: React.FC<CarruselVideoGalleryProps> = ({ videos }) => {
  const videoRefs = useRef<HTMLVideoElement[]>([]);

  const handleSlideChange = (swiper: SwiperCore) => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === swiper.activeIndex) {
          video.play(); // Reproduce el video activo
        } else {
          video.pause(); // Pausa los demás videos
          video.currentTime = 0; // Reinicia el video
        }
      }
    });
  };

  return (
    <section
      className="w-full bg-gradient-to-b from-gray-50 to-white py-6 flex justify-center"
      aria-label="Carrusel de videos"
    >
      <div className="w-full max-w-[400px]"> {/* Ajuste para pantallas tipo móvil */}
        <Swiper
          spaceBetween={20}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          loop
          modules={[Pagination, Navigation, Autoplay]}
          onSlideChange={handleSlideChange}
          className="video-swiper"
        >
          {videos.map((video, index) => {
            const isYouTube = video.url.includes("youtube.com") || video.url.includes("youtu.be");

            return (
              <SwiperSlide key={video.id} className="relative flex flex-col items-center">
                {/* Contenedor del video */}
                <div
                  className="relative rounded-lg overflow-hidden shadow-lg bg-black"
                  style={{
                    aspectRatio: "9 / 16", // Relación de aspecto fija para videos verticales
                    width: "100%",
                  }}
                >
                  {isYouTube ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeID(video.url)}?rel=0`}
                      title={video.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <video
                      ref={(el) => {
                        if (el) {
                          videoRefs.current[index] = el;
                        }
                      }}
                      src={video.url}
                      muted
                      loop
                      playsInline
                      controls
                      className="w-full h-full object-cover" // Ajusta el video para cubrir el contenedor
                    ></video>
                  )}
                </div>

                {/* Caja con título y descripción debajo del video */}
                <div className="mt-4 w-full p-4 sm:p-6 bg-white rounded-lg shadow-md">
                  <h3 className={`text-lg md:text-2xl font-bold color-titulo-tarjeta text-center ${SeccionesFont.className}`}>
                    {video.title}
                  </h3>
                  <p className={`text-sm md:text-base color-descripcion-tarjeta mt-2 text-center ${titleFont.className}`}>
                    {video.description}
                  </p>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
};

// Función para obtener el ID del video de YouTube
const getYouTubeID = (url: string): string | null => {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\\ ]{11})/;
  const match = url.match(regex);
  if (match && match.length > 1) {
    return match[1]; // Devuelve el ID del video si se encuentra
  }
  return null; // Devuelve null si no se encuentra un ID válido
};

export default CarruselVideoGallery;