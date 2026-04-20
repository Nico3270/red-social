"use client";

import { startTransition, useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BusinessGuideEntry } from "./BusinessGuideEntry";
import { BusinessGuideResults } from "./BusinessGuideResults";
import {
  getBusinessGuideConfig,
  resolveBusinessGuidePreset,
} from "@/perfil/guide/business-guide";
import type {
  BusinessGuideBusinessInfo,
  BusinessGuidePresetId,
  BusinessGuideResolvedPreset,
} from "@/perfil/guide/business-guide.types";
import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import type { ProfileCatalogPreloadData } from "@/actions/catalogGroups/preloadProfileCatalog";
import { textosFont } from "@/config/fonts";
import { trackAnalyticsEvent } from "@/analytics/events";

interface Props {
  business: BusinessGuideBusinessInfo;
  products: ProductRedSocial[];
  onExploreProducts: (selection: BusinessGuideResolvedPreset) => void;
  catalogPreloadData?: ProfileCatalogPreloadData;
}

export function BusinessGuideSection({
  business,
  products,
  onExploreProducts,
  catalogPreloadData,
}: Props) {
  const [selectionState, setSelectionState] = useState<{
    selectedPresetId: BusinessGuidePresetId | null;
    isPending: boolean;
  }>({
    selectedPresetId: null,
    isPending: false,
  });
  const navigationMode = catalogPreloadData?.hasCatalogGroups ? "catalog_groups" : "traditional";

  const config = useMemo(() => getBusinessGuideConfig(business, products, catalogPreloadData?.groupsSignal), [business, products, catalogPreloadData?.groupsSignal]);
  const presetSignature = config?.presets.map((preset) => preset.id).join("|") ?? "";

  useEffect(() => {
    setSelectionState({
      selectedPresetId: null,
      isPending: false,
    });
  }, [config?.vertical, business.slugNegocio, presetSignature, products.length]);

  const selectedResult = useMemo(() => {
    if (!config || !selectionState.selectedPresetId) return null;

    return resolveBusinessGuidePreset({
      business,
      products,
      catalogGroupsSignal: catalogPreloadData?.groupsSignal,
      presetId: selectionState.selectedPresetId,
      maxResults: 4,
    });
  }, [business, catalogPreloadData?.groupsSignal, config, products, selectionState.selectedPresetId]);

  useEffect(() => {
    if (!selectionState.isPending || !selectedResult) return;

    const timer = window.setTimeout(() => {
      setSelectionState((current) => ({ ...current, isPending: false }));
    }, 160);

    return () => window.clearTimeout(timer);
  }, [selectedResult, selectionState.isPending]);

  const handleSelectPreset = useCallback(
    (presetId: BusinessGuidePresetId) => {
      const presetLabel = config?.presets.find(p => p.id === presetId)?.label || presetId;
      const presetKind = config?.presets.find(p => p.id === presetId)?.kind || "unknown";
      
      trackAnalyticsEvent({
        event: "guide_preset_clicked",
        timestamp: Date.now(),
        negocioSlug: business.slugNegocio,
        navigationMode,
        source: "guia",
        presetId: presetId,
        presetLabel: presetLabel,
        presetKind: presetKind,
      });
      
      startTransition(() => {
        setSelectionState({
          selectedPresetId: presetId,
          isPending: true,
        });
      });
    },
    [business.slugNegocio, config?.presets, navigationMode]
  );

  const handleGuideResultClick = useCallback(
    (selection: BusinessGuideResolvedPreset, resultIndex: number) => {
      const item = selection.items[resultIndex];
      if (!item) {
        return;
      }

      trackAnalyticsEvent({
        event: "guide_result_clicked",
        timestamp: Date.now(),
        negocioSlug: business.slugNegocio,
        navigationMode,
        source: "guia",
        presetId: selection.preset.id,
        presetLabel: selection.preset.label,
        productId: item.product.id,
        productSlug: item.product.slug,
        productName: item.product.nombre,
        productPrice: item.product.precio,
        resultIndex,
      });
    },
    [business.slugNegocio, navigationMode]
  );

  const handleExploreMore = useCallback(
    (selection: BusinessGuideResolvedPreset) => {
      trackAnalyticsEvent({
        event: "guide_navigation_to_products",
        timestamp: Date.now(),
        negocioSlug: business.slugNegocio,
        navigationMode,
        source: "guia",
        presetId: selection.preset.id,
        presetLabel: selection.preset.label,
        targetGroupId: selection.exploreContext.groupId,
        targetGroupSlug: selection.exploreContext.groupSlug,
        targetGroupName: selection.exploreContext.groupName,
      });
      
      // Call original handler
      onExploreProducts(selection);
    },
    [business.slugNegocio, navigationMode, onExploreProducts]
  );

  if (!config || products.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5" data-testid="business-guide-section">
      <BusinessGuideEntry
        config={config}
        selectedPresetId={selectionState.selectedPresetId}
        isPending={selectionState.isPending}
        onSelectPreset={handleSelectPreset}
      />

      {selectedResult ? (
        <BusinessGuideResults
          selection={selectedResult}
          onExploreMore={handleExploreMore}
          onResultClick={handleGuideResultClick}
          onReset={() =>
            setSelectionState({
              selectedPresetId: null,
              isPending: false,
            })
          }
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="rounded-[26px] border border-dashed border-stone-200 bg-stone-50/70 px-5 py-4 text-sm text-slate-500 sm:px-6"
        >
          <p className={textosFont.className}>
            Elige una de las rutas rápidas de arriba y te mostramos entre 3 y 6 opciones recomendadas sin salir de esta landing.
          </p>
        </motion.div>
      )}
    </section>
  );
}
