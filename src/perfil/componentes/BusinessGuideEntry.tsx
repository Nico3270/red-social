"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaArrowRight,
  FaBolt,
  FaBriefcase,
  FaCalendarCheck,
  FaChevronDown,
  FaChevronUp,
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
  FaRegNewspaper,
  FaStar,
  FaTag,
  FaTshirt,
  FaVolumeUp,
} from "react-icons/fa";
import { titleFont, textosFont } from "@/config/fonts";
import { BusinessGuideSocialTeaser } from "./BusinessGuideSocialTeaser";
import type { BusinessGuideSocialTeaserData } from "./BusinessGuideSocialTeaser";
import type {
  BusinessGuideConfig,
  BusinessGuideIcon,
  BusinessGuidePreset,
  BusinessGuidePresetId,
  BusinessGuideVertical,
} from "@/perfil/guide/business-guide.types";

export type BusinessGuideEntryIcon =
  | BusinessGuideIcon
  | "reservation"
  | "services"
  | "social";

export interface BusinessGuidePrimaryCta {
  id: string;
  label: string;
  description: string;
  icon: BusinessGuideEntryIcon;
  onActivate: () => void;
}

export interface BusinessGuideQuickAccess {
  id: string;
  kind: "preset" | "action";
  label: string;
  shortResultLabel: string;
  icon: BusinessGuideEntryIcon;
  priority: number;
  presetId?: BusinessGuidePresetId;
  onActivate: () => void;
}

export interface BusinessGuideIntroChoice {
  id: string;
  label: string;
  description: string;
  icon: BusinessGuideEntryIcon;
  tone: "commercial" | "social" | "action";
  isPrimary?: boolean;
  isActive?: boolean;
  onActivate: () => void;
}

export interface BusinessGuideSecondaryToggle {
  label: string;
  description: string;
  isOpen: boolean;
  onActivate: () => void;
}

interface Props {
  config: BusinessGuideConfig;
  selectedPresetId: BusinessGuidePresetId | null;
  isPending?: boolean;
  onSelectPreset: (presetId: BusinessGuidePresetId) => void;
  introChoices: BusinessGuideIntroChoice[];
  quickActions?: BusinessGuideQuickAccess[];
  socialTeaser?: BusinessGuideSocialTeaserData | null;
  isCommercialPanelOpen?: boolean;
  commercialPanelToggle?: BusinessGuideSecondaryToggle | null;
  onCloseCommercialGuide?: () => void;
}

const iconByPreset: Record<BusinessGuideEntryIcon, ReactNode> = {
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
  reservation: <FaCalendarCheck />,
  services: <FaBriefcase />,
  social: <FaRegNewspaper />,
};

const choiceToneStyles: Record<
  BusinessGuideIntroChoice["tone"],
  { border: string; bg: string; icon: string; text: string }
> = {
  commercial: {
    border: "border-amber-200",
    bg: "bg-amber-50/75 hover:bg-amber-50",
    icon: "bg-amber-100 text-amber-700",
    text: "text-amber-700",
  },
  social: {
    border: "border-sky-200",
    bg: "bg-sky-50/75 hover:bg-sky-50",
    icon: "bg-sky-100 text-sky-700",
    text: "text-sky-700",
  },
  action: {
    border: "border-emerald-200",
    bg: "bg-emerald-50/75 hover:bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-700",
    text: "text-emerald-700",
  },
};

const defaultPresetPriorityById: Record<string, number> = {
  "universal:popular": 20,
  "contextual:quick": 32,
  "contextual:drinks": 28,
  "contextual:share": 34,
  "contextual:casual": 34,
  "contextual:elegant": 36,
  "contextual:gift": 28,
  "contextual:birthday": 30,
  "contextual:romantic": 32,
  "contextual:audio": 32,
  "contextual:gaming": 34,
  "contextual:setup": 36,
  "contextual:decor": 34,
  "contextual:cozy_home": 36,
  "universal:budget": 40,
  "universal:new": 26,
  "universal:contact": 64,
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const includesKeyword = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

const getPresetPriority = (
  preset: BusinessGuidePreset,
  vertical: BusinessGuideVertical,
  originalIndex: number
) => {
  const searchableValue = normalizeText(
    `${preset.label} ${preset.shortResultLabel} ${preset.hint} ${preset.groupName ?? ""}`
  );

  if (vertical === "restaurant") {
    if (preset.id === "universal:popular") return 0 + originalIndex;
    if (
      includesKeyword(searchableValue, [
        "bebida",
        "jugo",
        "limonada",
        "granizado",
        "cafe",
        "coctel",
        "malteada",
      ])
    ) {
      return 8 + originalIndex;
    }
    if (
      includesKeyword(searchableValue, [
        "postre",
        "dulce",
        "helado",
        "torta",
        "cheesecake",
        "brownie",
      ])
    ) {
      return 12 + originalIndex;
    }
    if (preset.id === "contextual:quick") return 16 + originalIndex;
    if (preset.id === "contextual:share") return 22 + originalIndex;
    if (preset.id === "universal:new") return 28 + originalIndex;
    if (preset.id === "universal:budget") return 34 + originalIndex;
  }

  if (vertical === "fashion") {
    if (preset.id === "universal:popular") return 0 + originalIndex;
    if (preset.id === "universal:new" || includesKeyword(searchableValue, ["novedad", "nuevo"])) {
      return 10 + originalIndex;
    }
    if (includesKeyword(searchableValue, ["casual", "elegante", "coleccion", "colección"])) {
      return 18 + originalIndex;
    }
    if (includesKeyword(searchableValue, ["promo", "oferta", "econom"])) {
      return 26 + originalIndex;
    }
  }

  if (vertical === "tech") {
    if (preset.id === "universal:popular") return 0 + originalIndex;
    if (preset.id === "universal:new") return 8 + originalIndex;
    if (includesKeyword(searchableValue, ["audio", "gaming", "setup", "smart", "accesorio"])) {
      return 14 + originalIndex;
    }
    if (includesKeyword(searchableValue, ["promo", "econom", "oferta"])) {
      return 24 + originalIndex;
    }
  }

  if (vertical === "home") {
    if (preset.id === "universal:popular") return 0 + originalIndex;
    if (preset.id === "universal:new") return 10 + originalIndex;
    if (includesKeyword(searchableValue, ["decor", "hogar", "cocina", "mueble"])) {
      return 16 + originalIndex;
    }
    if (includesKeyword(searchableValue, ["promo", "econom", "oferta"])) {
      return 28 + originalIndex;
    }
  }

  if (vertical === "flowers_gifts") {
    if (includesKeyword(searchableValue, ["regalo", "detalle", "gift"])) return 0 + originalIndex;
    if (includesKeyword(searchableValue, ["cumple", "birthday", "celebra"])) return 8 + originalIndex;
    if (includesKeyword(searchableValue, ["romant", "aniversario", "rosa"])) return 12 + originalIndex;
    if (preset.id === "universal:new") return 20 + originalIndex;
  }

  if (vertical === "generic") {
    if (includesKeyword(searchableValue, ["destacad", "popular", "favorito"])) return 0 + originalIndex;
    if (preset.id === "universal:new") return 10 + originalIndex;
    if (includesKeyword(searchableValue, ["promo", "econom", "oferta"])) return 20 + originalIndex;
    if (includesKeyword(searchableValue, ["regalo", "detalle", "gift"])) return 24 + originalIndex;
  }

  if (preset.kind === "group" || preset.kind === "section") {
    if (includesKeyword(searchableValue, ["destacad", "promo", "oferta", "postre", "bebida"])) {
      return 24 + originalIndex;
    }
    return 44 + originalIndex;
  }

  if (defaultPresetPriorityById[preset.id] !== undefined) {
    return defaultPresetPriorityById[preset.id] + originalIndex;
  }

  return 80 + originalIndex;
};

const buildGuideCopy = ({
  vertical,
  hasSocialTeaser,
  isCommercialPanelOpen,
  hasCommercialRoute,
}: {
  vertical: BusinessGuideVertical;
  hasSocialTeaser: boolean;
  isCommercialPanelOpen: boolean;
  hasCommercialRoute: boolean;
}) => {
  if (vertical === "restaurant") {
    return {
      eyebrow: "Inicio del negocio",
      title: "¿Que buscas hoy?",
      subtitle: hasSocialTeaser
        ? "Puedes entrar directo al menu, ver una novedad reciente o escribir al negocio sin pasar por una capa intermedia."
        : "Te ayudamos a empezar por el menu real, una accion directa o una ruta util sin saturarte de opciones.",
      panelTitle: "Atajos para elegir mas rapido",
      panelSubtitle:
        "El menu principal ya vive en Productos. Aqui dejamos solo accesos utiles para entrar con mas precision.",
      helper: hasCommercialRoute
        ? isCommercialPanelOpen
          ? "El acceso principal ya va directo a Productos; estos atajos quedan como apoyo rapido."
          : "El menu principal te lleva directo a Productos y estos atajos quedan como apoyo secundario."
        : "Mantenemos esta entrada ligera para que Inicio respire mejor.",
    };
  }

  return {
    eyebrow: "Inicio del negocio",
    title: "¿Que buscas hoy?",
    subtitle: hasSocialTeaser
      ? "Puedes explorar el catalogo real, ver lo mas reciente o entrar por una accion directa segun lo que necesites."
      : "Agrupamos solo las decisiones mas utiles para que Inicio se sienta claro, cercano y facil de usar.",
    panelTitle: vertical === "generic" ? "Atajos para empezar mejor" : "Atajos del catalogo",
    panelSubtitle:
      "El acceso principal ya lleva al catalogo real. Esta capa queda solo como ayuda para elegir rutas mas precisas.",
    helper: hasCommercialRoute
      ? isCommercialPanelOpen
        ? "El CTA principal ya abre Productos y estos accesos quedan como apoyo contextual."
        : "La capa guiada queda como apoyo opcional, no como una segunda experiencia de menu."
      : "Esta vista prioriza una entrada clara y una senal viva del negocio.",
  };
};

export function BusinessGuideEntry({
  config,
  selectedPresetId,
  isPending = false,
  onSelectPreset,
  introChoices,
  quickActions = [],
  socialTeaser,
  isCommercialPanelOpen = false,
  commercialPanelToggle,
  onCloseCommercialGuide,
}: Props) {
  const excludedPresetIds = new Set<BusinessGuidePresetId | "universal:catalog">([
    "universal:catalog",
  ]);

  if (quickActions.some((shortcut) => shortcut.id === "action:contact")) {
    excludedPresetIds.add("universal:contact");
  }

  const presetShortcuts = config.presets
    .map((preset, originalIndex) => ({ preset, originalIndex }))
    .filter(({ preset }) => !excludedPresetIds.has(preset.id))
    .map(({ preset, originalIndex }) => ({
      id: preset.id,
      kind: "preset" as const,
      label: preset.label,
      shortResultLabel: preset.shortResultLabel,
      icon: preset.icon,
      priority: getPresetPriority(preset, config.vertical, originalIndex),
      presetId: preset.id,
      onActivate: () => onSelectPreset(preset.id),
    }));

  const visibleSecondaryItems = [...quickActions, ...presetShortcuts]
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 4);

  const hasSecondaryPanel = visibleSecondaryItems.length > 0;
  const hasCommercialRoute = Boolean(commercialPanelToggle && hasSecondaryPanel);
  const guideCopy = buildGuideCopy({
    vertical: config.vertical,
    hasSocialTeaser: Boolean(socialTeaser),
    isCommercialPanelOpen,
    hasCommercialRoute,
  });

  return (
    <div
      data-testid="business-guide-entry"
      className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,250,241,0.94),rgba(255,255,255,0.98))] p-3.5 shadow-[0_14px_30px_rgba(15,23,42,0.055)] sm:p-4 lg:p-5"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700/75">
          {guideCopy.eyebrow}
        </p>
        <h2 className={`mt-1 text-[1.28rem] font-semibold leading-tight text-slate-950 sm:text-[1.7rem] ${titleFont.className}`}>
          {guideCopy.title}
        </h2>
        <p className={clsx("mt-1.5 max-w-2xl text-sm leading-5 text-slate-600", textosFont.className)}>
          {guideCopy.subtitle}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {introChoices.map((choice) => {
          const toneStyle = choiceToneStyles[choice.tone];
          const isPrimaryChoice = Boolean(choice.isPrimary);

          return (
            <button
              key={choice.id}
              type="button"
              onClick={choice.onActivate}
              className={clsx(
                "group rounded-[20px] border px-3 py-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 sm:px-3.5",
                isPrimaryChoice && "col-span-2 px-4 py-4 sm:px-4.5",
                isPrimaryChoice
                  ? "border-slate-950 bg-[linear-gradient(135deg,#0f172a_0%,#172554_46%,#1e3a5f_100%)] text-white shadow-[0_18px_34px_rgba(15,23,42,0.24)] hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(15,23,42,0.28)]"
                  : choice.isActive
                    ? "border-slate-950 bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]"
                    : `${toneStyle.border} ${toneStyle.bg} text-slate-800 hover:-translate-y-0.5`
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={clsx(
                    "flex shrink-0 items-center justify-center rounded-2xl text-sm transition-colors",
                    isPrimaryChoice
                      ? "h-10 w-10 bg-white/12 text-sky-100"
                      : choice.isActive
                        ? "h-9 w-9 bg-white/14 text-amber-200"
                        : `h-9 w-9 ${toneStyle.icon}`
                  )}
                >
                  {iconByPreset[choice.icon]}
                </span>

                <div className="flex items-center gap-2">
                  {isPrimaryChoice && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-100">
                      Principal
                    </span>
                  )}
                  <FaArrowRight
                    className={clsx(
                      "mt-0.5 shrink-0 text-[11px] transition",
                      isPrimaryChoice
                        ? "text-sky-100"
                        : choice.isActive
                          ? "text-amber-200"
                          : toneStyle.text
                    )}
                  />
                </div>
              </div>

              <div className={clsx("mt-2.5", isPrimaryChoice && "mt-3")}>
                <p className={clsx("font-bold leading-5", isPrimaryChoice ? "text-base sm:text-[1.02rem]" : "text-sm")}>
                  {choice.label}
                </p>
                <p
                  className={clsx(
                    "mt-1 leading-5",
                    isPrimaryChoice
                      ? "text-sm text-slate-200"
                      : choice.isActive
                        ? "text-xs text-slate-300"
                        : "text-xs text-slate-600"
                  )}
                >
                  {choice.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {commercialPanelToggle && hasSecondaryPanel && (
        <div className="mt-3">
          <button
            type="button"
            onClick={commercialPanelToggle.onActivate}
            className="group flex w-full items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-slate-50/85 px-3.5 py-3 text-left transition hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">
                {commercialPanelToggle.label}
              </p>
              <p className={clsx("mt-1 text-xs leading-5 text-slate-500", textosFont.className)}>
                {commercialPanelToggle.description}
              </p>
            </div>

            {commercialPanelToggle.isOpen ? (
              <FaChevronUp className="shrink-0 text-[11px] text-slate-500 transition group-hover:text-slate-700" />
            ) : (
              <FaChevronDown className="shrink-0 text-[11px] text-slate-500 transition group-hover:text-slate-700" />
            )}
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {!isCommercialPanelOpen && socialTeaser && (
          <motion.div
            key="social-teaser"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <BusinessGuideSocialTeaser teaser={socialTeaser} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isCommercialPanelOpen && hasCommercialRoute && (
          <motion.div
            key="commercial-panel"
            initial={{ opacity: 0, y: 14, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-[22px] border border-slate-200 bg-white/86 p-3.5 shadow-[0_12px_24px_rgba(15,23,42,0.05)] backdrop-blur sm:p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Atajos
                  </p>
                  <h3 className={`mt-1 text-lg font-semibold leading-tight text-slate-950 ${titleFont.className}`}>
                    {guideCopy.panelTitle}
                  </h3>
                  <p className={clsx("mt-1 text-sm leading-5 text-slate-600", textosFont.className)}>
                    {guideCopy.panelSubtitle}
                  </p>
                </div>

                {onCloseCommercialGuide && (
                  <button
                    type="button"
                    onClick={onCloseCommercialGuide}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white"
                  >
                    <FaChevronUp className="text-[10px]" />
                    Ocultar
                  </button>
                )}
              </div>

              <div className="rounded-[18px] border border-slate-100 bg-slate-50/70 p-2.5 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3 px-1">
                  <p className="text-xs font-bold text-slate-700">Accesos curados</p>
                  <span className="text-[11px] font-medium text-slate-400">
                    {visibleSecondaryItems.length} opciones
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {visibleSecondaryItems.map((shortcut, index) => {
                    const isSelected =
                      shortcut.kind === "preset" && shortcut.presetId === selectedPresetId;

                    return (
                      <motion.button
                        key={shortcut.id}
                        type="button"
                        onClick={shortcut.onActivate}
                        data-testid={
                          shortcut.kind === "preset"
                            ? `business-guide-preset-${index}`
                            : `business-guide-shortcut-${index}`
                        }
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: index * 0.04 }}
                        className={clsx(
                          "group flex min-h-[64px] flex-col justify-between rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-1",
                          isSelected
                            ? "border-slate-950 bg-slate-950 text-white shadow-md shadow-slate-900/15"
                            : "border-slate-200 bg-white text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.045)] hover:-translate-y-0.5 hover:border-amber-200 hover:text-slate-950"
                        )}
                        aria-pressed={shortcut.kind === "preset" ? isSelected : undefined}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={clsx(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs transition-colors",
                              isSelected
                                ? "bg-white/20 text-amber-200"
                                : "bg-amber-50 text-amber-700 group-hover:bg-amber-100"
                            )}
                          >
                            {iconByPreset[shortcut.icon]}
                          </span>
                          <span className="line-clamp-2 text-[12px] font-bold leading-4 sm:text-sm">
                            {shortcut.label}
                          </span>
                        </span>

                        <span
                          className={clsx(
                            "mt-1 line-clamp-1 text-[11px] leading-4",
                            isSelected ? "text-slate-300" : "text-slate-500"
                          )}
                        >
                          {shortcut.shortResultLabel}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2 px-1 text-xs text-slate-500">
                  <span
                    className={clsx(
                      "h-2 w-2 rounded-full transition-colors",
                      isPending ? "bg-amber-500" : "bg-emerald-500"
                    )}
                  />
                  <span className={clsx("leading-4", textosFont.className)}>
                    {isPending ? "Actualizando opciones..." : guideCopy.helper}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
