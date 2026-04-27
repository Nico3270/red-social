"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion"; // 🔥 Para animaciones
import { initialData } from "@/seed/seed";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa"; // Icons elegantes para botones
import { titleFont } from "@/config/fonts";

interface MenuSectionsBarProps {
  compact?: boolean;
}

export const MenuSectionsBar = ({ compact = false }: MenuSectionsBarProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);
  const pathname = usePathname();

  const activeCategorySlug = pathname?.startsWith("/category/")
    ? pathname.split("/")[2] ?? null
    : null;
  const isHomeDiscoveryPage = pathname === "/";
  const shouldShowDiscoveryEntry = compact && (isHomeDiscoveryPage || Boolean(activeCategorySlug));
  const navigationEntries = [
    ...(shouldShowDiscoveryEntry
      ? [
          {
            id: "discovery-home",
            nombre: "Explorar",
            iconName: "home.png",
            href: "/",
            isActive: isHomeDiscoveryPage,
          },
        ]
      : []),
    ...initialData.categorias
      .filter((category) => category.isActive)
      .map((category) => ({
        id: category.id,
        nombre: category.nombre,
        iconName: category.iconName,
        href: `/category/${category.slug}`,
        isActive: activeCategorySlug === category.slug,
      })),
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Detectar overflow y actualizar visibilidad de botones
  useEffect(() => {
    const checkOverflow = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const hasOverflow = container.scrollWidth > container.clientWidth;
      setShowRightButton(hasOverflow); // Inicialmente, right si hay overflow
      setShowLeftButton(false); // Left oculto al inicio

      // Listener para actualizar basado en scroll position
      const handleScroll = () => {
        const scrollLeft = container.scrollLeft;
        setShowLeftButton(scrollLeft > 0);
        setShowRightButton(scrollLeft + container.clientWidth < container.scrollWidth);
      };

      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, []); // Removemos la dependencia innecesaria, ya que initialData es estático

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -200, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 200, behavior: "smooth" });
  };

  return (
    <div className="relative w-full color-fondo-principal">
      <div
        ref={scrollContainerRef}
        className={`flex flex-nowrap overflow-x-auto rounded-lg color-principal scrollbar-hide ${
          compact ? "gap-1.5 px-2 pt-2 " : "gap-1 "
        }`}
        style={{ scrollBehavior: "smooth" }}
      >
        {initialData.categorias.length === 0
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse flex flex-col items-center text-center min-w-[6px] sm:min-w-[100px] flex-shrink-0"
              >
                <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                <div className="mt-2 h-3 w-8 bg-gray-300 rounded"></div>
              </div>
            ))
          : navigationEntries.map((section) => (
              <Link key={section.id} href={section.href}>
                <div
                  className={`flex flex-col items-center rounded-2xl border text-center transition-colors ${
                    compact
                      ? "min-w-[78px] px-2 py-2 sm:min-w-[88px]"
                      : "min-w-[80px] px-2 py-1 sm:min-w-[90px]"
                  } ${
                    section.isActive
                      ? "border-sky-200 bg-sky-50 shadow-sm"
                      : "border-transparent hover:border-slate-200 hover:bg-white/70"
                  }`}
                >
                  <motion.img
                    src={`/imgs/iconos/${section.iconName}`}
                    alt={section.nombre}
                    className={compact ? "h-7 w-7 object-contain md:h-9 md:w-9" : "w-8 h-8 md:w-12 md:h-12 object-contain"}
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  />
                  <span
                    className={`mt-1 text-center leading-tight ${titleFont.className} ${
                      section.isActive ? "text-sky-700" : "color-iconos"
                    } ${compact ? "text-[8x] md:text-xs" : "text-xs md:text-xs"}`}
                    style={{
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                      textWrap: "balance",
                      minHeight: compact ? "24px" : "28px",
                    }}
                  >
                    {section.nombre}
                  </span>
                </div>
              </Link>
            ))}
      </div>

      {/* Botones de navegación: Visibles solo en md+ y si hay overflow */}
      {isClient && (
        <>
          {showLeftButton && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-gray-900 bg-opacity-80 rounded-full p-2 shadow-md hidden md:block"
              aria-label="Scroll izquierdo"
            >
              <FaChevronLeft className="text-gray-100" />
            </motion.button>
          )}
          {showRightButton && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            
              onClick={scrollRight}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-900 bg-opacity-80 rounded-full p-2 shadow-md hidden md:block"
              aria-label="Scroll derecho"
            >
              <FaChevronRight className="text-gray-100" />
            </motion.button>
          )}
        </>
      )}
    </div>
  );
};
