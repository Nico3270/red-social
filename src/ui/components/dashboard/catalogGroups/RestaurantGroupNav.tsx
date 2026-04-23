/**
 * RestaurantGroupNav
 *
 * Navegación premium para grupos en modo restaurante
 * Tabs elegantes y sticky para seleccionar secciones del menú
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
import { getCatalogAccentTheme } from "@/perfil/helpers/catalogVisualThemes";

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
  if (isLoading) {
    return (
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1560px] px-4 py-3 sm:px-6 lg:px-8 2xl:px-10">
          <div className="flex gap-2.5 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-11 min-w-[140px] animate-pulse rounded-full bg-slate-100"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="sticky top-0 z-10 w-full border-b border-slate-200/80 bg-white/92 backdrop-blur-xl"
      data-testid="restaurant-group-nav"
      aria-label="Secciones del menu"
    >
      <div className="mx-auto w-full max-w-[1560px] px-4 py-3 sm:px-6 lg:px-8 2xl:px-10">
        <div className="flex gap-2.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:justify-center">
          {groups.map((group, index) => {
            const isSelected = selectedGroupId === group.id;
            const theme = getCatalogAccentTheme(group.id || group.slug);

            return (
              <motion.button
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelectGroup(group.id)}
                className="inline-flex h-11 min-w-max flex-shrink-0 items-center gap-2.5 rounded-full border px-3.5 pr-4 text-sm font-semibold transition-all duration-200"
                style={
                  isSelected
                    ? {
                        background: `linear-gradient(135deg, ${theme.surfaceStrong}, ${theme.surface})`,
                        borderColor: theme.border,
                        boxShadow: theme.shadow,
                        color: theme.text,
                      }
                    : {
                        background: `linear-gradient(135deg, ${theme.surfaceMuted}, rgba(255,255,255,0.96))`,
                        borderColor: theme.border,
                        color: theme.text,
                      }
                }
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: isSelected ? theme.solid : theme.badgeText }}
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
