"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import {
  FaBolt,
  FaCoins,
  FaComments,
  FaCompass,
  FaFireAlt,
  FaGamepad,
  FaGift,
  FaGlassCheers,
  FaHome,
  FaLayerGroup,
  FaLeaf,
  FaMagic,
  FaPalette,
  FaStar,
  FaTag,
  FaTshirt,
  FaVolumeUp,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { titleFont, textosFont } from "@/config/fonts";
import type { BusinessGuideConfig, BusinessGuideIcon, BusinessGuidePresetId } from "@/perfil/guide/business-guide.types";

interface Props {
  config: BusinessGuideConfig;
  selectedPresetId: BusinessGuidePresetId | null;
  isPending?: boolean;
  onSelectPreset: (presetId: BusinessGuidePresetId) => void;
}

const iconByPreset: Record<BusinessGuideIcon, ReactNode> = {
  catalog: <FaLayerGroup />,
  popular: <FaFireAlt />,
  budget: <FaCoins />,
  new: <FaLeaf />,
  contact: <FaComments />,
  quick: <FaBolt />,
  drink: <FaGlassCheers />,
  share: <FaStar />,
  casual: <FaTshirt />,
  elegant: <FaMagic />,
  gift: <FaGift />,
  birthday: <FaGift />,
  romantic: <FaGift />,
  audio: <FaVolumeUp />,
  gaming: <FaGamepad />,
  setup: <FaCompass />,
  decor: <FaPalette />,
  home: <FaHome />,
  section: <FaTag />,
};

export function BusinessGuideEntry({
  config,
  selectedPresetId,
  isPending = false,
  onSelectPreset,
}: Props) {
  return (
<div className="relative overflow-hidden rounded-[24px] border border-stone-200/80 bg-[linear-gradient(135deg,rgba(255,251,245,0.98),rgba(255,255,255,0.98),rgba(248,250,252,0.98))] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-amber-100/40 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-slate-100/60 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700/70">
              Guía rápida
            </p>
            <h2 className={`text-xl text-slate-900 sm:text-2xl font-semibold ${titleFont.className}`}>
              {config.title}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {config.presets.map((preset, index) => {
            const isSelected = selectedPresetId === preset.id;

            return (
              <motion.button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: index * 0.05 }}
                className={clsx(
                  "group inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-1",
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/15"
                    : "border-stone-200 bg-white/90 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-amber-200 hover:bg-white hover:text-slate-900"
                )}
                aria-pressed={isSelected}
              >
                <span
                  className={clsx(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors",
                    isSelected
                      ? "bg-white/15 text-amber-200"
                      : "bg-amber-50 text-amber-700 group-hover:bg-amber-100"
                  )}
                >
                  {iconByPreset[preset.icon]}
                </span>

                <span className="flex flex-col">
                  <span className="text-xs font-semibold sm:text-sm">{preset.label}</span>
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span
            className={clsx(
              "h-2 w-2 rounded-full transition-colors",
              isPending ? "bg-amber-500" : "bg-emerald-500"
            )}
          />
          <span className={clsx("leading-4", textosFont.className)}>
            {isPending ? "Actualizando..." : "Selecciona para explorar"}
          </span>
        </div>
      </div>
    </div>
  );
}
