"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Masonry from 'react-masonry-css'; // Para masonry responsive y ligero (~5KB)
import AutoSizer from 'react-virtualized-auto-sizer'; // Auto-sizing
import { FeedItem, isBusinessItem, isProductItem, isPublicationItem, isServiceItem } from "@/feed/feed.interfaces";
import { ProductCard } from "@/ui/components/productos/ProductCard"; // Ajustado a tu path
import ServicioViewer from "@/servicios/componentes/ServicioViewer";
import ShowTestimonioPublicacion from "@/publicaciones/componentes/ShowTestimonioPublicacion";
import { BusinessCard } from "@/feed/componentes/BusinessCard";
import "./FeedRenderer.css"; // Tu CSS adaptado
import SocialMediaCarousel from "./SocialMediaPublicacion";

interface FeedRendererProps {
  items: FeedItem[];
  hasMore: boolean;
  isLoadingNext: boolean;
  sentinelRef: React.RefCallback<HTMLDivElement>; // Callback para useInView compatibilidad
}

const SkeletonCard = () => (
  <div className="bg-gray-100 rounded-2xl shadow-md p-4 mb-4 animate-pulse">
    <div className="h-40 bg-gray-200 rounded mb-2" />
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
  </div>
);

const FeedRenderer: React.FC<FeedRendererProps> = ({ items, hasMore, isLoadingNext, sentinelRef }) => {
  const breakpointCols = {
    default: 3,
    1100: 2,
    768: 1
  }; // Responsive: como tu media queries

  // Orden por score para engagement
  const orderedItems = useMemo(() => {
    return [...items].sort((a, b) => b.score - a.score); // High-score first
  }, [items]);

  // Render item por tipo (distribución type-safe)
  const renderItem = (item: FeedItem, index: number) => {
    if (!item) return null;

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }} // Staggered para fluidez
        className="mb-4"
      >
        {isProductItem(item) && <ProductCard product={item.data} />} {/* Prop correcta: product */}
        {isServiceItem(item) && <ServicioViewer version={2} servicio={item.data} />} {/* Prop correcta: servicio */}
        {isBusinessItem(item) && <BusinessCard business={item.data} />} {/* Prop correcta: business */}
        {isPublicationItem(item) && item.data.tipo === 'TESTIMONIO' && <ShowTestimonioPublicacion publicacion={item.data} />} {/* Prop correcta: publicacion */}
        {isPublicationItem(item) && item.data.tipo === 'CARRUSEL_IMAGENES' && <SocialMediaCarousel publicacion={item.data} />} {/* Prop correcta: publicacion */}
      </motion.div>
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 min-h-screen overflow-y-auto">
      <Masonry
        breakpointCols={breakpointCols}
        className="masonry-container flex w-auto"
        columnClassName="masonry-column bg-clip-padding pl-4 first:pl-0" // Clases para columns
      >
        {orderedItems.map((item, index) => renderItem(item, index))}
      </Masonry>

      {/* Loaders y End-of-Feed */}
      {isLoadingNext && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)} {/* Más skeletons para buffering visual */}
        </div>
      )}
      {!hasMore && !isLoadingNext && (
        <div className="text-center py-8 text-gray-600">
          <p className="text-lg font-medium mb-2">¡Has llegado al final!</p>
          <p className="text-sm">Explora más categorías o sigue nuevos negocios para ver contenido fresco.</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">
            Descubre más
          </button>
        </div>
      )}

      {/* Sentinel para prefetch */}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
};

export default FeedRenderer;