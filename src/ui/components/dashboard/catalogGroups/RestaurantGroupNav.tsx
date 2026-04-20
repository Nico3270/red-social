/**
 * RestaurantGroupNav
 *
 * Navegación premium para grupos en modo restaurante
 * Tabs elegantes y sticky para seleccionar secciones del menú
 */

"use client";

import React, { useCallback } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface GroupNavItem {
  id: string;
  nombre: string;
  slug: string;
  subgroupCount?: number;
}

interface RestaurantGroupNavProps {
  groups: GroupNavItem[];
  selectedGroupId?: string;
  onSelectGroup: (groupId: string) => void;
  isLoading?: boolean;
}

export const RestaurantGroupNav: React.FC<RestaurantGroupNavProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  isLoading = false,
}) => {
  const [scrollPosition, setScrollPosition] = React.useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  }, []);

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollContainerRef.current
    ? scrollContainerRef.current.scrollLeft <
      scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth - 10
    : false;

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-12 w-32 flex-shrink-0 bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="sticky top-0 z-10 w-full border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm"
      data-testid="restaurant-group-nav"
      aria-label="Secciones del menu"
    >
      <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="relative flex items-center gap-2 py-4">
          {/* SCROLL LEFT */}
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => scroll("left")}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FaChevronLeft className="text-gray-600" />
            </motion.button>
          )}

          {/* SCROLL CONTAINER */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="flex gap-3 min-w-min px-2">
              {groups.map((group, index) => {
                const isSelected = selectedGroupId === group.id;

                return (
                  <motion.button
                    key={group.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSelectGroup(group.id)}
                    className={clsx(
                      "flex-shrink-0 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 whitespace-nowrap",
                      isSelected
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    <span className="block">{group.nombre}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* SCROLL RIGHT */}
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => scroll("right")}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FaChevronRight className="text-gray-600" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};
