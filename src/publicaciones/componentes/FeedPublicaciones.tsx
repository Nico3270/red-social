"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from "react";
import { motion } from "framer-motion";
import Masonry from 'react-masonry-css';  // Para masonry estable y responsive
import Image from "next/image";
import Link from "next/link";
import { FaStar } from "react-icons/fa";
import useSWRInfinite from "swr/infinite";
import { ShowTestimonioPublicacion } from "@/publicaciones/componentes/ShowTestimonioPublicacion";
import { SocialMediaCarousel } from "@/publicaciones/componentes/SocialMediaPublicacion";


import "./FeedPublicaciones.css";
import { PublicacionesResult } from "@/actions/perfil/getInfoPerfilSlugNegocio";
import { EnhancedPublicacion, Media } from "../interfaces/enhancedPublicacion.interface";
import clsx from "clsx";
import ResenaProductoCard from "@/resenas/componentes/ResenaProductoCard";

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

const WidgetCard: React.FC<{ titulo: string; contenido?: string }> = ({
  titulo,
  contenido,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="w-full bg-white rounded-2xl shadow-md overflow-hidden p-4"
  >
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{titulo}</h3>
    <p className="text-gray-600 text-sm">
      {contenido || "Contenido placeholder para widget o publicidad."}
    </p>
  </motion.div>
);

const ProductosDestacados: React.FC<{ productos: ProductDestacado[] }> = ({ productos }) => (
  <div className="w-full bg-white rounded-2xl shadow-md p-4">
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

// Función para reordenar en columnas
function reorderForColumns<T extends EnhancedPublicacion>(items: T[], cols: number): T[] {
  if (cols <= 1 || !items.length) return items;
  const out: T[] = [];
  for (let c = 0; c < cols; c++) {
    for (let i = c; i < items.length; i += cols) out.push(items[i]);
  }
  return out;
}

const FeedPublicaciones = memo(function FeedPublicaciones({
  publicaciones: initialPublicaciones = [],
  productosDestacados = [],
  widgets = [],
}: FeedPublicacionesProps) {
  const [filtro, setFiltro] = useState<"Recientes" | "Videos" | "Carruseles" | "Populares">("Recientes");
  const [dynamicPublicaciones, setDynamicPublicaciones] = useState<EnhancedPublicacion[]>([]);
  const observerRef = useRef<HTMLDivElement>(null);
  const hasReachedEndRef = useRef(false);
  const [hasReachedEndLocal, setHasReachedEndLocal] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const masonryWrapperRef = useRef<HTMLDivElement | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Force relayout (adaptado de FeedRenderer)
  const forceRelayout = useCallback((delay = 0) => {
    if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    
    resizeTimeoutRef.current = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      
      if (masonryWrapperRef.current) {
        const wrapper = masonryWrapperRef.current;
        const currentDisplay = wrapper.style.display;
        wrapper.style.display = 'none';
        void wrapper.offsetHeight; // Forzar reflow
        wrapper.style.display = currentDisplay || '';
      }
      
      setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
    }, delay);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "Initial publicaciones en FeedPublicaciones:",
        initialPublicaciones.map((pub) => ({ id: pub.id, tipo: pub.tipo, createdAt: pub.createdAt, hasUserReaction: !!pub.userReaction }))
      );
    }
  }, [initialPublicaciones]);

  const getKey = (pageIndex: number, previousPageData: PublicacionesResult | null) => {
    if (hasReachedEndRef.current) {
      // console.log("getKey: Reached end, no more requests");
      return null;
    }
    const slug = initialPublicaciones[0]?.negocio?.slug;
    if (!slug) {
      console.log("getKey: No slug available");
      return null;
    }
    const skip = initialPublicaciones.length + pageIndex * 10;
    const url = `/api/publicaciones/${slug}?skip=${skip}&take=10`;
    // console.log("getKey: pageIndex=", pageIndex, "skip=", skip, "url=", url);
    if (previousPageData && (!previousPageData.publicaciones || previousPageData.publicaciones.length === 0)) {
      console.log("getKey: No more data, pageIndex=", pageIndex);
      hasReachedEndRef.current = true;
      setHasReachedEndLocal(true);
      return null;
    }
    return url;
  };

  const fetcher = async (url: string) => {
    // console.log("Fetching URL:", url);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    // console.log("Fetched data:", data);
    return data as PublicacionesResult;
  };

  const { data, size, setSize, isLoading, isValidating, error } = useSWRInfinite<PublicacionesResult>(
    getKey,
    fetcher,
    {
      initialSize: initialPublicaciones.length > 0 ? 1 : 0,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      persistSize: true,
      revalidateFirstPage: false,
      revalidateOnMount: false,
    }
  );

  useEffect(() => {
    if (data && Array.isArray(data)) {
      const newDynamicPublicaciones = data.flatMap((page) => page?.publicaciones || []);
      if (process.env.NODE_ENV === "development") {
        console.log("Updating dynamic publicaciones:", newDynamicPublicaciones.length);
        console.log(
          "New dynamic publicaciones:",
          newDynamicPublicaciones.map((pub) => ({ id: pub.id, tipo: pub.tipo, createdAt: pub.createdAt, hasUserReaction: !!pub.userReaction }))
        );
      }
      setDynamicPublicaciones((prev) => {
        const publicationMap = new Map<string, EnhancedPublicacion>();
        prev.forEach((pub) => publicationMap.set(pub.id, pub));
        newDynamicPublicaciones.forEach((pub) => publicationMap.set(pub.id, pub));
        const updated = Array.from(publicationMap.values());
        if (process.env.NODE_ENV === "development") {
          console.log(
            "Updated dynamic publicaciones:",
            updated.map((pub) => ({ id: pub.id, tipo: pub.tipo, createdAt: pub.createdAt, hasUserReaction: !!pub.userReaction }))
          );
        }
        return updated;
      });
    }
  }, [data]);

  const publicaciones = useMemo(() => {
    const publicationMap = new Map<string, EnhancedPublicacion>();
    initialPublicaciones.forEach((pub) => publicationMap.set(pub.id, pub));
    dynamicPublicaciones.forEach((pub) => publicationMap.set(pub.id, pub));
    return Array.from(publicationMap.values());
  }, [initialPublicaciones, dynamicPublicaciones]);

  const publicacionesFiltradas = useMemo((): EnhancedPublicacion[] => {  // Tipo explícito para evitar void
    let filtered: EnhancedPublicacion[] = [...publicaciones];
    switch (filtro) {
      case "Videos":
        filtered = filtered.filter((pub) =>
          pub.multimedia.some((media: Media) => media.tipo === "VIDEO")
        );
        return filtered;
      case "Carruseles":
        filtered = filtered.filter((pub) => pub.tipo === "CARRUSEL_IMAGENES");
        return filtered;
      case "Populares":
        filtered.sort((a, b) => ((b.numLikes || 0) + (b.numComentarios || 0)) - ((a.numLikes || 0) + (a.numComentarios || 0)));
        return filtered;
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return filtered;
    }
  }, [filtro, publicaciones]);

  const [cols, setCols] = useState(3);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setCols(w <= 768 ? 1 : w <= 1100 ? 2 : 3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const fijadas = useMemo(
    () => publicacionesFiltradas.filter((p) => p.id === "fijada"),
    [publicacionesFiltradas]
  );
  const noFijadas = useMemo(
    () => publicacionesFiltradas.filter((p) => p.id !== "fijada"),
    [publicacionesFiltradas]
  );

  const reorderedNoFijadas = useMemo(
    () => reorderForColumns(noFijadas, cols),
    [noFijadas, cols]
  );

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (hasReachedEndRef.current) {
      if (observer.current) {
        observer.current.disconnect();
      }
      return;
    }

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && !isValidating && !hasReachedEndRef.current) {
          // console.log("Loading more publications, size:", size);
          setSize((prev) => prev + 1);
        }
      },
      { threshold: 1.0 }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.current.observe(currentRef);
    }

    return () => {
      if (observer.current && currentRef) {
        observer.current.unobserve(currentRef);
      }
    };
  }, [isLoading, isValidating, setSize, size]);

  const renderPublicacion = (publicacion: EnhancedPublicacion, index: number) => {  // Tipos explícitos
    return (
      <motion.div
        key={publicacion.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
        className="mb-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
        onAnimationComplete={() => {
          if (index === Math.min(4, reorderedNoFijadas.length - 1)) {
            forceRelayout(100);
          }
        }}
      >
        {publicacion.tipo === 'TESTIMONIO' && publicacion.producto && (
          <ResenaProductoCard publicacion={publicacion} />
        )}
        {publicacion.tipo === 'TESTIMONIO' && !publicacion.producto && (
          <ShowTestimonioPublicacion publicacion={publicacion} />
        )}
        {publicacion.tipo === 'CARRUSEL_IMAGENES' && (
          <SocialMediaCarousel publicacion={publicacion} />
        )}
      </motion.div>
    );
  };

  const Loader = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-center items-center h-24"
    >
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </motion.div>
  );

  const styles = `
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .animate-bounce {
      animation: bounce 0.6s infinite;
    }
  `;

  // Relayout en cambios (filtro/mount)
  useEffect(() => {
    if (!mounted) return;
    
    const handleChange = async () => {
      setIsLayoutReady(false);
      await new Promise(resolve => setTimeout(resolve, 100));
      forceRelayout(0);
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsLayoutReady(true);
      forceRelayout(100);
    };
    
    handleChange();
  }, [filtro, mounted, forceRelayout]);

  // Image load handling
  useEffect(() => {
    if (!masonryWrapperRef.current || !isLayoutReady) return;
    
    let loaded = 0;
    const imgs = Array.from(masonryWrapperRef.current.querySelectorAll("img"));
    
    if (imgs.length === 0) {
      forceRelayout(100);
      return;
    }
    
    const checkAllLoaded = () => {
      loaded += 1;
      if (loaded >= imgs.length) {
        forceRelayout(50);
        setTimeout(() => {
          const newImgs = Array.from(masonryWrapperRef.current?.querySelectorAll("img") || []);
          if (newImgs.every(img => img.complete)) {
            forceRelayout(0);
          }
        }, 200);
      }
    };
    
    imgs.forEach((img) => {
      if (img.complete) checkAllLoaded();
      else {
        img.addEventListener("load", checkAllLoaded);
        img.addEventListener("error", checkAllLoaded);
      }
    });
    
    return () => {
      imgs.forEach((img) => {
        img.removeEventListener("load", checkAllLoaded);
        img.removeEventListener("error", checkAllLoaded);
      });
    };
  }, [publicacionesFiltradas, isLayoutReady, forceRelayout]);

  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, []);

  // Breakpoints responsive
  const breakpointCols = {
    default: 3,
    1100: 2,
    768: 1,
  };

  // Hash para key en Masonry
  const itemsHash = useMemo(() => publicacionesFiltradas.map(pub => pub.id).join(','), [publicacionesFiltradas]);

  return (
    <div className="w-full px-1 sm:px-6 lg:px-8 py-2 min-h-screen overflow-y-auto">
      <style>{styles}</style> 
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 flex-wrap">
          {["Recientes", "Populares", "Videos", "Carruseles"].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f as typeof filtro)}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                filtro === f
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
              )}
              aria-label={`Filtrar por ${f}`}
            >
              {f}
            </button>
          ))}
        </div>

      </div> 

      <div ref={masonryWrapperRef} className="flex-1">
        {!mounted ? (
          <div className="text-center py-4 text-gray-400">Cargando…</div>
        ) : publicacionesFiltradas.length === 0 && !isLoading && !isValidating ? (
          <div className="text-center py-4 text-gray-500 font-light">
            No hay publicaciones disponibles.
          </div>
        ) : (
          <Masonry
            key={`masonry-${filtro}-${itemsHash}-${isLayoutReady ? 'ready' : 'loading'}`}
            breakpointCols={breakpointCols}
            className="masonry-container flex w-auto -ml-0 lg:-ml-2"
            columnClassName="masonry-column pl-0 md:px-2 bg-clip-padding"
          >
            {fijadas.map((pub, index) => (
              <motion.div
                key={pub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl shadow-md overflow-hidden"
              >
                <div className="p-2 text-sm font-medium text-yellow-700">
                  Publicación Fijada
                </div>
                {renderPublicacion(pub, index)}
              </motion.div>
            ))}

            {reorderedNoFijadas.map((pub, index) => renderPublicacion(pub, index + fijadas.length))}

            {widgets.map((widget) => (
              <WidgetCard
                key={widget.id}
                titulo={widget.titulo}
                contenido={widget.contenido}
              />
            ))}

            {productosDestacados.length > 0 && (
              <ProductosDestacados productos={productosDestacados} />
            )}
          </Masonry>
        )}
      </div>

      <div ref={observerRef} className="mt-4">
        {(isLoading || isValidating) && <Loader />}
        {hasReachedEndLocal && (
          <p className="text-center text-gray-600 py-8">No hay más publicaciones que mostrar.</p>
        )}
        {error && (
          <p className="text-center text-red-600 py-8">Error al cargar publicaciones: {error?.message ?? 'Desconocido'}</p>
        )}
      </div>
    </div>
  );
});

export default FeedPublicaciones;