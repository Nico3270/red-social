"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaFilter, FaStar } from "react-icons/fa";
import useSWRInfinite from "swr/infinite";
import { ShowTestimonioPublicacion } from "@/publicaciones/componentes/ShowTestimonioPublicacion";
import { SocialMediaCarousel } from "@/publicaciones/componentes/SocialMediaPublicacion";
import { EnhancedPublicacion, Media } from "@/publicaciones/interfaces/enhancedPublicacion.interface";

import clsx from "clsx";
import "./FeedPublicaciones.css";
import { usePublicacionModalStore } from "@/store/publicacionModal/publicacionModalStore";
import PublicationModal from "./PublicationModal";
import { PublicacionesResult } from "@/app/api/publicaciones/[slug]/route";

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
  publicaciones: initialPublicaciones,
  productosDestacados = [],
  widgets = [],
}) => {
  const [filtro, setFiltro] = useState<"Recientes" | "Populares" | "Videos" | "Carruseles">("Recientes");
  const observerRef = useRef<HTMLDivElement>(null);
  const [hasReachedEnd, setHasReachedEnd] = useState(false); // Nueva bandera para el final

  const { isModalOpen, publicacionId } = usePublicacionModalStore();
  const selectedPublication = useMemo(() => {
    return initialPublicaciones.find((pub) => pub.id === publicacionId) || null;
  }, [initialPublicaciones, publicacionId]);

  const handleCloseModal = useCallback(() => {
    const { closeModal } = usePublicacionModalStore.getState();
    closeModal();
  }, []);

  const getKey = (pageIndex: number, previousPageData: PublicacionesResult | null) => {
    if (previousPageData && !previousPageData.publicaciones.length) {
      setHasReachedEnd(true); // Marca el final cuando no hay más publicaciones
      return null;
    }
    const slug = initialPublicaciones[0]?.negocio?.slug;
    if (!slug) return null;
    return `/api/publicaciones/${slug}?skip=${pageIndex * 10}&take=10`;
  };

  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite<PublicacionesResult>(
    getKey,
    fetcher,
    {
      initialSize: 1,
      revalidateOnFocus: false,
    }
  );

  const publicaciones = useMemo(() => {
    return data
      ? data.flatMap((page) => page.publicaciones)
      : initialPublicaciones;
  }, [data, initialPublicaciones]);

  const publicacionesFiltradas = useMemo(() => {
    let filtered = [...publicaciones];
    switch (filtro) {
      case "Populares":
        filtered.sort((a, b) => (b.numLikes || 0) + (b.numComentarios || 0) - ((a.numLikes || 0) + (a.numComentarios || 0)));
        break;
      case "Videos":
        filtered = filtered.filter((pub) =>
          pub.multimedia.some((media: Media) => media.tipo === "VIDEO")
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && !isValidating && !hasReachedEnd) {
          setSize((prev) => prev + 1);
        }
      },
      { threshold: 1.0 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [isLoading, isValidating, setSize, hasReachedEnd]);

  const renderPublicacion = (publicacion: EnhancedPublicacion) => {
    const Component = componentMap[publicacion.tipo] || ShowTestimonioPublicacion;
    return <Component key={publicacion.id} publicacion={publicacion} />;
  };

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
        {publicacionesFiltradas
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

        {publicacionesFiltradas
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

        {productosDestacados.length > 0 && (
          <ProductosDestacados productos={productosDestacados} />
        )}

        <div ref={observerRef}>
          {isLoading || isValidating ? (
            <p className="text-center text-gray-600">Cargando más publicaciones...</p>
          ) : hasReachedEnd ? (
            <p className="text-center text-gray-600">No hay más publicaciones que mostrar.</p>
          ) : null}
        </div>
      </div>

      <PublicationModal
        isOpen={isModalOpen}
        publication={selectedPublication}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default memo(FeedPublicaciones);