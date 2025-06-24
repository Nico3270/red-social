// components/Masonry.tsx
"use client";

import { SeccionesFont } from "@/config/fonts"; // Assuming this is correctly imported
import Image from "next/image";
import React, { useEffect, useState } from "react";

interface Section {
  title: string;
  image: string;
  text: string[];
}

interface MasonryProps {
  title: string;
  sections: Section[];
}

export const Masonry = ({ title, sections }: MasonryProps) => {
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Ensures animations only run on client-side
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-b from-yellow-400 to-yellow-400 text-white flex flex-col items-center justify-start px-4 py-12">
      {/* 🔹 Título Principal */}
      <h1
        className={`text-4xl md:text-5xl font-bold text-center mb-12 ${SeccionesFont.className} text-gray-700 drop-shadow-lg ${isClient ? "animate-fadeIn" : ""}`}
      >
        {title}
      </h1>

      {/* 🔹 Masonry Layout */}
      <div className="w-full max-w-[95vw] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 auto-rows-[minmax(300px, auto)]">
        {sections.map((section, index) => {
          const isLarge = index % 3 === 0 || index % 5 === 0;
          const rowSpan = isLarge ? "row-span-2" : "row-span-1";
          const minHeight = section.title === "i-movyT" ? "400px" : "300px";

          return (
            <div
              key={index}
              className={`relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer ${rowSpan}`}
              onClick={() => setSelectedSection(section)}
              style={{ minHeight }}
            >
              <div className="relative w-full h-full">
                <Image
                  src={section.image}
                  alt={`${section.title} Image`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    console.error(`Error cargando imagen: ${section.image}`);
                    (e.target as HTMLImageElement).src = "/imgs/placeholder.jpg";
                  }}
                />
                <div className="absolute top-0 left-0 w-full p-2 bg-gray-800 bg-opacity-30 text-center">
                  <h3
                    className={`text-xl md:text-2xl font-bold text-yellow-300 drop-shadow-md truncate ${SeccionesFont.className}`}
                  >
                    {section.title}
                  </h3>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔹 Modal */}
      {selectedSection && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn"
          onClick={() => setSelectedSection(null)}
        >
          <div
            className="bg-gray-100 rounded-xl p-4 sm:p-8 max-w-lg w-full mx-4 text-black shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Contenedor desplazable para el contenido */}
            <div className="flex-1 overflow-y-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-500 mb-4 sm:mb-6">
                {selectedSection.title}
              </h2>
              <div className={`${SeccionesFont.className}`}>
                {selectedSection.title === "Objetivos" ? (
                  <ul className="list-disc list-inside space-y-3 text-base sm:text-lg text-gray-800">
                    {selectedSection.text.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  selectedSection.text.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className="text-base sm:text-lg mb-4 leading-relaxed text-gray-800"
                    >
                      {paragraph}
                    </p>
                  ))
                )}
              </div>
            </div>
            {/* Botón "Cerrar" fijo en la parte inferior */}
            <div className="mt-4 sm:mt-8 flex justify-center">
              <button
                className="px-4 py-2 sm:px-6 sm:py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-300 shadow-md"
                onClick={() => setSelectedSection(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};