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
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1560px] px-4 py-2 sm:px-6 lg:px-8 2xl:px-10">
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 min-w-[128px] animate-pulse rounded-full bg-slate-100"
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
      <div className="mx-auto w-full max-w-[1560px] px-4 py-2 sm:px-6 lg:px-8 2xl:px-10">
        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible lg:grid lg:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] lg:gap-3 lg:overflow-visible">
          {selectedGroupId && onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="inline-flex h-10 min-w-max shrink-0 items-center rounded-full border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 lg:min-h-[52px] lg:min-w-0 lg:w-full lg:justify-center"
            >
              Todo
            </button>
          )}

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
                className="inline-flex h-10 min-w-max flex-shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-all duration-200 lg:min-h-[52px] lg:min-w-0 lg:w-full lg:justify-center"
                style={
                  isSelected
                    ? {
                        background: `linear-gradient(135deg, ${theme.surfaceMuted}, rgba(255,255,255,0.96))`,
                        borderColor: theme.border,
                        boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                        color: theme.text,
                      }
                    : {
                        background: "rgba(255,255,255,0.96)",
                        borderColor: theme.border,
                        color: theme.text,
                      }
                }
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: isSelected ? theme.solid : theme.badgeText }}
                />
                <span className="whitespace-nowrap lg:text-center">{group.nombre}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
