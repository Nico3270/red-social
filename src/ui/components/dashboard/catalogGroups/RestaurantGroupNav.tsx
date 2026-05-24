/**
 * RestaurantGroupNav
 *
 * Navegación premium para grupos en modo restaurante
 * Tabs elegantes y sticky para seleccionar secciones del menú
 */

"use client";

import React from "react";
import { motion } from "framer-motion";

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
  onClearSelection?: () => void;
  isLoading?: boolean;
}

export const RestaurantGroupNav: React.FC<RestaurantGroupNavProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onClearSelection,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1560px] px-4 py-1.5 sm:px-6 lg:px-8 2xl:px-10">
          <div className="flex gap-1.5 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-9 min-w-[112px] animate-pulse rounded-full bg-slate-100"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="sticky top-0 z-10 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-xl"
      data-testid="restaurant-group-nav"
      aria-label="Secciones del menu"
    >
      <div className="mx-auto w-full max-w-[1560px] px-4 py-1.5 sm:px-6 lg:px-8 2xl:px-10">
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:justify-center md:overflow-visible">
          {selectedGroupId && onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="inline-flex h-9 min-w-max shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              Todo
            </button>
          )}

          {groups.map((group, index) => {
            const isSelected = selectedGroupId === group.id;

            return (
              <motion.button
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelectGroup(group.id)}
                className={`inline-flex h-9 min-w-max flex-shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors duration-200 ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isSelected ? "bg-white/85" : "bg-slate-300"
                  }`}
                />
                <span className="whitespace-nowrap">{group.nombre}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
