"use client";

import React from "react";
import { motion } from "framer-motion";
import { FaArrowRight, FaFolder } from "react-icons/fa";
import type { CatalogGroupPreview } from "@/actions/catalogGroups/preloadProfileCatalog";
import { trackAnalyticsEvent } from "@/analytics/events";

interface CatalogGroupsPreviewSectionProps {
  groups: CatalogGroupPreview[];
  negocioSlug?: string;
  title?: string;
  subtitle?: string;
  viewAllLabel?: string;
  onNavigateToGroup: (groupId: string) => void;
  onViewAll?: () => void;
}

const CatalogGroupsPreviewSection: React.FC<CatalogGroupsPreviewSectionProps> = ({
  groups,
  negocioSlug = "",
  title = "Explora por tipo de producto",
  subtitle,
  viewAllLabel = "Ver catalogo",
  onNavigateToGroup,
  onViewAll,
}) => {
  if (!groups || groups.length === 0) {
    return null;
  }

  const displayGroups = groups.slice(0, 4);
  const hiddenGroupsCount = Math.max(groups.length - displayGroups.length, 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      viewport={{ once: true, margin: "-80px" }}
      className="rounded-[22px] border border-slate-200 bg-white/95 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.045)] sm:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Categorías
          </p>
          <h3 className="mt-1 text-base font-bold leading-tight text-slate-950 sm:text-lg">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-4 text-slate-500 sm:text-sm">
            {subtitle || `Atajos principales del catalogo${hiddenGroupsCount > 0 ? `, con ${hiddenGroupsCount} mas en productos.` : "."}`}
          </p>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {viewAllLabel}
            <FaArrowRight className="text-[10px]" />
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {displayGroups.map((group, index) => (
          <motion.button
            key={group.id}
            type="button"
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
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.04 }}
            viewport={{ once: true }}
            className="group flex min-h-[58px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 text-left shadow-[0_6px_14px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-300 sm:px-3"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 transition group-hover:bg-amber-100">
              <FaFolder className="text-xs" />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-xs font-bold leading-4 text-slate-900 sm:text-sm">
                {group.nombre}
              </span>
              <span className="block truncate text-[11px] leading-4 text-slate-500">
                {group.productCount > 0
                  ? `${group.productCount} producto${group.productCount !== 1 ? "s" : ""}`
                  : group.hasSubgroups
                    ? `${group.subgroupCount} subcategoría${group.subgroupCount !== 1 ? "s" : ""}`
                    : "Ver opciones"}
              </span>
            </span>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
};

export default CatalogGroupsPreviewSection;
