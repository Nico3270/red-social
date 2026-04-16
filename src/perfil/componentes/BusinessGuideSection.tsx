"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
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
import { textosFont } from "@/config/fonts";

interface Props {
  business: BusinessGuideBusinessInfo;
  products: ProductRedSocial[];
  onExploreProducts: (selection: BusinessGuideResolvedPreset) => void;
}

export function BusinessGuideSection({
  business,
  products,
  onExploreProducts,
}: Props) {
  const [selectionState, setSelectionState] = useState<{
    selectedPresetId: BusinessGuidePresetId | null;
    isPending: boolean;
  }>({
    selectedPresetId: null,
    isPending: false,
  });

  const config = useMemo(() => getBusinessGuideConfig(business, products), [business, products]);
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
      presetId: selectionState.selectedPresetId,
      maxResults: 4,
    });
  }, [business, config, products, selectionState.selectedPresetId]);

  useEffect(() => {
    if (!selectionState.isPending || !selectedResult) return;

    const timer = window.setTimeout(() => {
      setSelectionState((current) => ({ ...current, isPending: false }));
    }, 160);

    return () => window.clearTimeout(timer);
  }, [selectedResult, selectionState.isPending]);

  if (!config || products.length === 0) {
    return null;
  }

  const handleSelectPreset = (presetId: BusinessGuidePresetId) => {
    startTransition(() => {
      setSelectionState({
        selectedPresetId: presetId,
        isPending: true,
      });
    });
  };

  const handleReset = () => {
    setSelectionState({
      selectedPresetId: null,
      isPending: false,
    });
  };

  return (
    <section className="space-y-5">
      <BusinessGuideEntry
        config={config}
        selectedPresetId={selectionState.selectedPresetId}
        isPending={selectionState.isPending}
        onSelectPreset={handleSelectPreset}
      />

      {selectedResult ? (
        <BusinessGuideResults
          selection={selectedResult}
          onExploreMore={onExploreProducts}
          onReset={handleReset}
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
