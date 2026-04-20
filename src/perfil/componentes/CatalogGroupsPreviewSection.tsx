"use client";

import React from "react";
import { motion } from "framer-motion";
import { FaFolder, FaArrowRight } from "react-icons/fa";
import type { CatalogGroupPreview } from "@/actions/catalogGroups/preloadProfileCatalog";
import { trackAnalyticsEvent } from "@/analytics/events";

interface CatalogGroupsPreviewSectionProps {
  groups: CatalogGroupPreview[];
  negocioSlug?: string;
  onNavigateToGroup: (groupId: string) => void;
  onViewAll?: () => void;
}

const CatalogGroupsPreviewSection: React.FC<CatalogGroupsPreviewSectionProps> = ({
  groups,
  negocioSlug = "",
  onNavigateToGroup,
  onViewAll,
}) => {
  // Mostrar máximo 4 grupos
  const displayGroups = groups.slice(0, 4);

  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true, margin: "-80px" }}
      className="space-y-4"
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 sm:text-xl">
            <FaFolder className="text-amber-600" />
            Explora nuestro catálogo
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Organizado en {groups.length} secciones principales
          </p>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-2 whitespace-nowrap rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            Ver todo
            <FaArrowRight className="text-xs" />
          </button>
        )}
      </div>

      {/* Grid de grupos */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {displayGroups.map((group, index) => (
          <motion.button
            key={group.id}
            onClick={() => {
              trackAnalyticsEvent({
                event: "catalog_group_preview_clicked",
                timestamp: Date.now(),
                negocioSlug,
                navigationMode: "catalog_groups",
                source: "inicio",
                groupId: group.id,
                groupSlug: group.slug,
                groupName: group.nombre,
                totalGroups: groups.length,
              });

              onNavigateToGroup(group.id);
            }}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            viewport={{ once: true }}
            className="group relative flex flex-col items-start justify-start gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            {/* Ícono y nombre */}
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-200">
                  <FaFolder className="text-sm" />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                  {group.nombre}
                </h4>
              </div>
            </div>

            {/* Información */}
            <div className="flex min-h-[40px] flex-col items-start justify-center gap-1 text-xs text-gray-500">
              {group.hasSubgroups && (
                <span>
                  {group.subgroupCount > 0 ? `${group.subgroupCount} subcategoría${group.subgroupCount !== 1 ? "s" : ""}` : "Subcategorías"}
                </span>
              )}
              {group.productCount > 0 && (
                <span>
                  {group.productCount} producto{group.productCount !== 1 ? "s" : ""}
                </span>
              )}
              
              {/* Featured badge si existen */}
              {group.featured && group.featured.length > 0 && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                  ⭐ {group.featured.length} destacado{group.featured.length !== 1 ? "s" : ""}
                </span>
              )}
              
              {/* Rango de precios si disponible */}
              {group.stats?.minPrice !== undefined && group.stats?.maxPrice !== undefined && (
                <span className="text-gray-600 font-medium">
                  ${group.stats.minPrice.toLocaleString()} - ${group.stats.maxPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* CTA overlay */}
            <div className="absolute bottom-2 right-2 opacity-0 transition group-hover:opacity-100">
              <FaArrowRight className="text-xs text-amber-600" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 pt-6" />
    </motion.div>
  );
};

export default CatalogGroupsPreviewSection;
