"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Masonry from 'react-masonry-css';
import { FeedItem, isBusinessItem, isProductItem, isPublicationItem, isServiceItem } from "@/feed/feed.interfaces";
import { ProductCard } from "@/ui/components/productos/ProductCard";
import ServicioViewer from "@/servicios/componentes/ServicioViewer";
import ShowTestimonioPublicacion from "@/publicaciones/componentes/ShowTestimonioPublicacion";
import { BusinessCard } from "@/feed/componentes/BusinessCard";
import SocialMediaCarousel from "@/publicaciones/componentes/SocialMediaPublicacion";
import { FaNewspaper, FaShoppingBag, FaTools, FaBuilding } from "react-icons/fa";
import Image from "next/image";
import { initialData } from "@/seed/seed"; // Importar para categorías

import "./FeedRenderer.css";

interface FeedRendererProps {
  items: FeedItem[];
  hasMore: boolean;
  isLoadingNext: boolean;
  sentinelRef: React.RefCallback<HTMLDivElement>;
  activeTab: "Publicaciones" | "Productos" | "Servicios" | "Negocios";
  onTabChange: (tab: "Publicaciones" | "Productos" | "Servicios" | "Negocios") => void;
}

const SkeletonCard = React.memo(() => (
  <div className="bg-gray-50 rounded-xl shadow-sm p-4 mb-4 animate-pulse">
    <div className="h-40 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg mb-2" />
    <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-100 rounded w-1/2" />
  </div>
));

SkeletonCard.displayName = "SkeletonCard";

// Objetos explícitos para breakpointCols (evita unions con undefined)
const PRODUCTOS_NEGOCIOS_BREAKPOINTS = {
  default: 4,  // 4 columnas en >1400px para productos/negocios
  1400: 3,
  1100: 2,
  768: 1,
} as const;

const PUBLICACIONES_SERVICIOS_BREAKPOINTS = {
  default: 3,  // 3 columnas para publicaciones/servicios (Masonry clásico)
  1100: 2,
  768: 1,
} as const;

const FeedRenderer: React.FC<FeedRendererProps> = ({ items, hasMore, isLoadingNext, sentinelRef, activeTab, onTabChange }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // Filtro por categoría (ID de initialData.categorias)
  const tabs = [
    { label: "Publicaciones" as const, icon: <FaNewspaper className="text-blue-600" /> },
    { label: "Productos" as const, icon: <FaShoppingBag className="text-green-600" /> },
    { label: "Servicios" as const, icon: <FaTools className="text-orange-600" /> },
    { label: "Negocios" as const, icon: <FaBuilding className="text-purple-600" /> },
  ];

  // Categorías base de initialData
  const todasCategorias = useMemo(() => initialData.categorias.filter(cat => cat.isActive), []);

  // Items filtrados SOLO por tab (sin categoría, para extraer categorías disponibles)
  const itemsPorTab = useMemo(() => {
    const filtrados = items.filter(item => {
      if (activeTab === "Productos" && !isProductItem(item)) return false;
      if (activeTab === "Servicios" && !isServiceItem(item)) return false;
      if (activeTab === "Negocios" && !isBusinessItem(item)) return false;
      if (activeTab === "Publicaciones" && !isPublicationItem(item)) return false;
      return true;
    });

    console.log("🌀 activeTab:", activeTab);
    console.log("📦 items originales:", items);
    console.log("✅ items filtrados:", filtrados);

    return filtrados;
  }, [items, activeTab]);

  // Categorías disponibles: únicas extraídas de itemsPorTab (solo para tabs relevantes)
  const categoriasDisponibles = useMemo(() => {
    if (activeTab === "Publicaciones") return []; // No aplica

    const catIds = new Set<string>();

    itemsPorTab.forEach(item => {
      if (isProductItem(item)) {
        // Para productos: agregar categoriaId
        catIds.add(item.data.categoriaId);
      } else if (isBusinessItem(item)) {
        // Para negocios: agregar cada ID del array categorias
        item.data.categorias.forEach(catId => catIds.add(catId));
      } else if (isServiceItem(item)) {
        // Para servicios: Si agregas categoriaId en el futuro, úsala aquí (e.g., catIds.add(item.data.categoriaId || ''));
        // Por ahora, no agregar (vacío)
      }
    });

    // Filtrar todasCategorias para solo las disponibles (y ordenar alfabéticamente por nombre, ya que no hay 'order')
    return todasCategorias
      .filter(cat => catIds.has(cat.id)) // Asumiendo IDs; si slugs, ajusta a catIds.has(cat.slug)
      .sort((a, b) => a.nombre.localeCompare(b.nombre)); // Orden alfabético: A-Z, elegante y sin depender de 'order'
  }, [itemsPorTab, todasCategorias, activeTab]);

  // BreakpointCols: Asignación explícita basada en tab (evita unions con undefined)
  const breakpointCols = useMemo(() => {
    return (activeTab === "Productos" || activeTab === "Negocios")
      ? PRODUCTOS_NEGOCIOS_BREAKPOINTS
      : PUBLICACIONES_SERVICIOS_BREAKPOINTS;
  }, [activeTab]);

  // Filtrar items por tab Y categoría, preservando orden DB original (no sort por score)
  const filteredItems = useMemo(() => {
    let filtered = itemsPorTab; // Ya filtrados por tab, en orden DB del parent

    // Filtrar por categoría solo si aplica y hay selección
    if (selectedCategory && (activeTab === "Productos" || activeTab === "Negocios" || activeTab === "Servicios")) {
      filtered = filtered.filter(item => {
        if (isProductItem(item)) {
          // Para productos: usa categoriaId directamente
          return item.data.categoriaId === selectedCategory;
        }
        if (isBusinessItem(item)) {
          // Para negocios: verifica si el array categorias incluye el ID seleccionado
          return item.data.categorias.includes(selectedCategory); // Asumiendo selectedCategory es ID
        }
        if (isServiceItem(item)) {
          // Para servicios: Si agregas categoriaId, úsala aquí; por ahora, muestra todos
          return true;
        }
        // Para publicaciones: No filtrar
        return true;
      });
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`📊 FeedRenderer filteredItems (${activeTab}, cat: ${selectedCategory || 'all'}): ${filtered.length} items, orden preservado DB`);
    }

    return filtered;
  }, [itemsPorTab, activeTab, selectedCategory]);

  // Render item (sin cambios; mantiene orden de array)
  const renderItem = (item: FeedItem, index: number) => {
    if (!item) return null;

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
        className="mb-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        {isProductItem(item) && <ProductCard product={item.data} />}
        {isServiceItem(item) && <ServicioViewer version={2} servicio={item.data} />}
        {isBusinessItem(item) && <BusinessCard business={item.data} />}
        {isPublicationItem(item) && item.data.tipo === 'TESTIMONIO' && <ShowTestimonioPublicacion publicacion={item.data} />}
        {isPublicationItem(item) && item.data.tipo === 'CARRUSEL_IMAGENES' && <SocialMediaCarousel publicacion={item.data} />}
      </motion.div>
    );
  };

  // Reset filtro al cambiar tab
  useEffect(() => {
    setSelectedCategory(null);
  }, [activeTab]);

  // Mini-navbar de categorías (solo categorías disponibles)
  const renderCategoryFilter = () => {
    if (activeTab === "Publicaciones" || categoriasDisponibles.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex overflow-x-auto justify-around gap-2 p-2 bg-white shadow-md rounded-xl mb-4"
      >
        {/* Botón "Todas" */}
        <button
          onClick={() => setSelectedCategory(null)}
          className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-colors ${
            !selectedCategory ? "bg-blue-50 text-blue-600 shadow-sm" : "hover:bg-gray-100 text-gray-600"
          }`}
          aria-label="Mostrar todas las categorías"
        >
          <span className="text-xs font-medium">Todas</span>
        </button>

        {categoriasDisponibles.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-colors ${
                isSelected ? "bg-blue-50 text-blue-600 shadow-sm" : "hover:bg-gray-100 text-gray-600"
              }`}
              aria-label={`Filtrar por ${cat.nombre}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 overflow-hidden ${
                isSelected ? "bg-blue-100 border-2 border-blue-300" : "bg-gray-100"
              }`}>
                <Image
                  src={`/imgs/iconos/${cat.iconName}`}
                  alt={cat.nombre}
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  unoptimized
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/imgs/iconos/placeholder.png";
                  }}
                />
              </div>
              <span className="text-xs font-medium text-center line-clamp-1">{cat.nombre}</span>
            </button>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className="w-full mx-auto px-6 sm:px-0 lg:px-4 py-6 min-h-screen overflow-y-auto bg-gray-50">
      {/* Tabs premium optimizadas */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between lg:justify-around w-5/6 px-6 mx-auto my-2 bg-white rounded-xl shadow-md border border-gray-100 overflow-x-auto lg:overflow-visible"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            onClick={() => onTabChange(tab.label)}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-1 lg:gap-2 px-2 lg:px-4 py-3 font-semibold text-xs lg:text-sm transition-all duration-200 hover:shadow-sm min-w-fit ${
              activeTab === tab.label
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            } ${index < tabs.length - 1 ? 'border-r border-gray-100' : ''} focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50`}
            aria-label={`Cambiar a pestaña ${tab.label}`}
          >
            {tab.icon}
            <span className={activeTab === tab.label ? 'inline' : 'hidden lg:inline'}>
              {tab.label}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Mini-navbar de filtros por categoría */}
      {renderCategoryFilter()}

      {/* Contenido con fade más suave */}
      <motion.div
        key={`${activeTab}-${selectedCategory}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        {filteredItems.length === 0 && !isLoadingNext ? (
          <div className="text-center py-8 text-gray-500 font-light">
            No hay {activeTab.toLowerCase()} disponibles{selectedCategory ? ` en la categoría "${categoriasDisponibles.find(cat => cat.id === selectedCategory)?.nombre || 'seleccionada'}"` : ""}.
          </div>
        ) : (
          <Masonry
            breakpointCols={breakpointCols}
            className="masonry-container flex w-auto -ml-1 sm:-ml-2"
            columnClassName="masonry-column pl-1 sm:pl-2 bg-clip-padding"
          >
            {filteredItems.map((item, index) => renderItem(item, index))}
          </Masonry>
        )}
      </motion.div>

      {/* Loaders */}
      {isLoadingNext && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* End message */}
      {!hasMore && !isLoadingNext && filteredItems.length > 0 && (
        <div className="text-center py-8 text-gray-500 font-light">
          No hay más {activeTab.toLowerCase()}.
        </div>
      )}

      {/* Sentinel */}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
};

export default FeedRenderer;