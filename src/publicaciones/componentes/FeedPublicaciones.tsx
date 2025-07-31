"use client";

import React, { useState, useCallback, memo, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaFilter, FaStar } from "react-icons/fa";
import { useStore } from "zustand"; // Elimina { shallow }
import { ShowTestimonioPublicacion } from "@/publicaciones/componentes/ShowTestimonioPublicacion";
import { SocialMediaCarousel } from "@/publicaciones/componentes/SocialMediaPublicacion";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import clsx from "clsx";
import "./FeedPublicaciones.css"; // Asegúrate de que la ruta sea correcta
import { State, usePublicacionModalStore } from "@/store/publicacionModal/publicacionModalStore";
import PublicationModal from "./PublicationModal";

interface ProductDestacado {
  id: string;
  nombre: string;
  precio: number;
  imagen: string | null;
  slug: string;
}

interface FeedPublicacionesProps {
  publicaciones: EnhancedPublicacion[];
  productosDestacados?: ProductDestacado[];
  widgets?: { id: string; titulo: string; contenido?: string }[];
}

const componentMap: Record<string, React.FC<{ publicacion: EnhancedPublicacion }>> = {
  TESTIMONIO: ShowTestimonioPublicacion,
  CARRUSEL_IMAGENES: SocialMediaCarousel,
};

const WidgetCard: React.FC<{ id: string; titulo: string; contenido?: string }> = ({
  id,
  titulo,
  contenido,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="w-full bg-white rounded-2xl shadow-md overflow-hidden p-4 mb-6"
  >
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{titulo}</h3>
    <p className="text-gray-600 text-sm">
      {contenido || "Contenido placeholder para widget o publicidad."}
    </p>
  </motion.div>
);

const ProductosDestacados: React.FC<{ productos: ProductDestacado[] }> = ({ productos }) => (
  <div className="w-full bg-white rounded-2xl shadow-md p-4 mb-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <FaStar className="text-yellow-500" />
      Productos Destacados
    </h3>
    <div className="space-y-4">
      {productos.map((producto) => (
        <Link
          key={producto.id}
          href={`/producto/${producto.slug}`}
          className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
        >
          <div className="relative w-16 h-16">
            <Image
              src={producto.imagen || "/placeholder-image.jpg"}
              alt={producto.nombre}
              fill
              className="object-cover rounded-md"
              sizes="64px"
              loading="lazy"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{producto.nombre}</p>
            <p className="text-sm text-gray-600">${producto.precio.toFixed(2)}</p>
          </div>
        </Link>
      ))}
    </div>
  </div>
);

const FeedPublicaciones: React.FC<FeedPublicacionesProps> = ({
  publicaciones,
  productosDestacados = [],
  widgets = [],
}) => {
  const [filtro, setFiltro] = useState<"Recientes" | "Populares" | "Videos" | "Carruseles">("Recientes");

  // Suscripción al store usando selectores individuales
  const isModalOpen = usePublicacionModalStore((state) => state.isModalOpen);
  const publicacionId = usePublicacionModalStore((state) => state.publicacionId);

  // Obtener la publicación seleccionada
  const selectedPublication = useMemo(() => {
    return publicaciones.find((pub) => pub.id === publicacionId) || null;
  }, [publicaciones, publicacionId]);

  const publicacionesFiltradas = useCallback(() => {
    let filtered = [...publicaciones];
    switch (filtro) {
      case "Populares":
        filtered.sort((a, b) => b.numLikes + b.numComentarios - (a.numLikes + a.numComentarios));
        break;
      case "Videos":
        filtered = filtered.filter((pub) =>
          pub.multimedia.some((media) => media.tipo === "VIDEO")
        );
        break;
      case "Carruseles":
        filtered = filtered.filter((pub) => pub.tipo === "CARRUSEL_IMAGENES");
        break;
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return filtered;
  }, [filtro, publicaciones]);

  const renderPublicacion = (publicacion: EnhancedPublicacion) => {
    const Component = componentMap[publicacion.tipo] || ShowTestimonioPublicacion;
    return <Component key={publicacion.id} publicacion={publicacion} />;
  };

  // Función para cerrar el modal y actualizar el store
  const handleCloseModal = useCallback(() => {
    const { closeModal } = usePublicacionModalStore.getState();
    closeModal();
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 flex-wrap">
          {["Recientes", "Populares", "Videos", "Carruseles"].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f as typeof filtro)}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                filtro === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
              aria-label={`Filtrar por ${f}`}
            >
              {f}
            </button>
          ))}
        </div>
        <FaFilter className="text-gray-500 text-lg" aria-hidden="true" />
      </div>

      <div className="flex-1 masonry-container">
        {publicacionesFiltradas()
          .filter((pub) => pub.id === "fijada")
          .map((pub) => (
            <motion.div
              key={pub.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full bg-yellow-50 border-2 border-yellow-400 rounded-2xl shadow-md overflow-hidden mb-6"
            >
              <div className="p-2 text-sm font-medium text-yellow-700">
                Publicación Fijada
              </div>
              {renderPublicacion(pub)}
            </motion.div>
          ))}

        {publicacionesFiltradas()
          .filter((pub) => pub.id !== "fijada")
          .map((pub) => renderPublicacion(pub))}

        {widgets.map((widget) => (
          <WidgetCard
            key={widget.id}
            id={widget.id}
            titulo={widget.titulo}
            contenido={widget.contenido}
          />
        ))}
      </div>

      {productosDestacados.length > 0 && (
        <div className="lg:hidden mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaStar className="text-yellow-500" />
            Productos Destacados
          </h3>
          <div className="flex overflow-x-auto gap-4 pb-4">
            {productosDestacados.map((producto) => (
              <Link
                key={producto.id}
                href={`/producto/${producto.slug}`}
                className="w-40 shrink-0 bg-white rounded-xl shadow-md p-3 hover:shadow-lg transition-shadow"
              >
                <div className="relative w-full h-24 mb-2">
                  <Image
                    src={producto.imagen || "/placeholder-image.jpg"}
                    alt={producto.nombre}
                    fill
                    className="object-cover rounded-md"
                    sizes="160px"
                    loading="lazy"
                  />
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{producto.nombre}</p>
                <p className="text-sm text-gray-600">${producto.precio.toFixed(2)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Renderizado del modal */}
      <PublicationModal
        isOpen={isModalOpen}
        publication={selectedPublication}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default memo(FeedPublicaciones);