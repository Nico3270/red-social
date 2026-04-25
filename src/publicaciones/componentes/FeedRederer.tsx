
"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Masonry from 'react-masonry-css';
import { FeedItem, ProductRedSocial, isBusinessItem, isProductItem, isPublicationItem, isServiceItem } from "@/feed/feed.interfaces";
import { ProductCard } from "@/ui/components/productos/ProductCard";
import { FaNewspaper, FaShoppingBag, FaTools, FaBuilding, FaCompass } from "react-icons/fa";
import Image from "next/image";
import { initialData } from "@/seed/seed";
import DiscoveryBusinessCard from "@/feed/componentes/DiscoveryBusinessCard";
import DiscoveryPublicationCard from "@/feed/componentes/DiscoveryPublicationCard";
import DiscoveryPulseModule, { DiscoveryPulseTone } from "@/feed/componentes/DiscoveryPulseModule";
import DiscoveryServiceCard from "@/feed/componentes/DiscoveryServiceCard";

type FeedTab = "Para ti" | "Publicaciones" | "Productos" | "Servicios" | "Negocios";
type SupportType = "publication" | "business" | "service";
type SupportFeedItem = FeedItem;
type ProductFeedItem = FeedItem & { data: ProductRedSocial };

interface SupportPlan {
  size: number;
  preferred: SupportType[];
}

type CadenceSection =
  | {
      kind: "products";
      key: string;
      emphasis: "lead" | "flow";
      items: ProductFeedItem[];
    }
  | {
      kind: "pulse";
      key: string;
      tone: DiscoveryPulseTone;
      badge: string;
      title: string;
      description: string;
      items: SupportFeedItem[];
    };

interface FeedRendererProps {
  items: FeedItem[];
  hasMore: boolean;
  isLoadingNext: boolean;
  sentinelRef: React.RefCallback<HTMLDivElement>;
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  discoveryContext: "home" | "category";
  categoriaSlug?: string;
  categoriaNombre?: string;
  categoriaIconName?: string;
  ciudad?: string;
}

const SkeletonCard = React.memo(() => (
  <div className="bg-gray-50 rounded-xl shadow-sm p-4 mb-4 animate-pulse">
    <div className="h-40 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg mb-2" />
    <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-100 rounded w-1/2" />
  </div>
));

SkeletonCard.displayName = "SkeletonCard";

const PRODUCTOS_NEGOCIOS_BREAKPOINTS = {
  default: 4,
  1400: 3,
  1100: 2,
  768: 1,
} as const;

const PUBLICACIONES_SERVICIOS_BREAKPOINTS = {
  default: 4,
  1400: 3,
  1100: 2,
  768: 1,
} as const;

const MIXED_HOME_BREAKPOINTS = {
  default: 4,
  1480: 3,
  1100: 2,
  768: 1,
} as const;

const MIXED_CATEGORY_BREAKPOINTS = {
  default: 4,
  1480: 3,
  1100: 2,
  768: 1,
} as const;

const HOME_PRODUCT_PATTERN = [2, 2, 3] as const;
const CATEGORY_PRODUCT_PATTERN = [3, 2, 3] as const;

const HOME_SUPPORT_PATTERN: readonly SupportPlan[] = [
  { size: 1, preferred: ["publication", "business", "service"] },
  { size: 1, preferred: ["business", "publication", "service"] },
  { size: 2, preferred: ["publication", "business", "service"] },
] as const;

const CATEGORY_SUPPORT_PATTERN: readonly SupportPlan[] = [
  { size: 1, preferred: ["publication", "business", "service"] },
  { size: 1, preferred: ["business", "publication", "service"] },
] as const;

const SUPPORT_FALLBACK_ORDER: readonly SupportType[] = [
  "publication",
  "business",
  "service",
] as const;

const takeQueueItems = <T,>(queue: T[], count: number) => queue.splice(0, count);

const hasSupportItems = (queues: Record<SupportType, SupportFeedItem[]>) =>
  SUPPORT_FALLBACK_ORDER.some((type) => queues[type].length > 0);

const takeSupportItems = (
  queues: Record<SupportType, SupportFeedItem[]>,
  plan: SupportPlan,
) => {
  const picked: SupportFeedItem[] = [];

  const pullFromType = (type: SupportType) => {
    const item = queues[type].shift();
    if (item) {
      picked.push(item);
    }
  };

  plan.preferred.forEach((type) => {
    if (picked.length >= plan.size) return;
    pullFromType(type);
  });

  while (picked.length < plan.size && hasSupportItems(queues)) {
    const nextType = SUPPORT_FALLBACK_ORDER.find((type) => queues[type].length > 0);
    if (!nextType) break;
    pullFromType(nextType);
  }

  return picked;
};

const buildPulseMeta = (
  items: SupportFeedItem[],
  context: "home" | "category",
  categoriaNombre?: string,
) => {
  const hasPublication = items.some((item) => item.type === "publication");
  const hasBusiness = items.some((item) => item.type === "business");
  const hasService = items.some((item) => item.type === "service");
  const categoryLabel = categoriaNombre || "esta categoría";

  if (context === "home") {
    if (hasPublication && hasBusiness) {
      return {
        tone: "mixed" as const,
        badge: "Se mueve cerca",
        title: "Myckeo se siente vivo entre productos",
        description:
          "Intercalamos reseñas y negocios activos para que el scroll mantenga contexto local y energía social.",
      };
    }

    if (hasPublication) {
      return {
        tone: "social" as const,
        badge: "Pulso local",
        title: "Lo que la gente está compartiendo",
        description:
          "Un respiro social entre productos para que la experiencia se sienta más entretenida y menos catálogo puro.",
      };
    }

    if (hasBusiness) {
      return {
        tone: "business" as const,
        badge: "Negocio vivo",
        title: "Negocios que vale la pena abrir",
        description:
          "Perfiles activos para seguir explorando más allá del producto y descubrir quién se está moviendo cerca.",
      };
    }

    if (hasService) {
      return {
        tone: "service" as const,
        badge: "A la mano",
        title: "Servicios que suman utilidad al feed",
        description:
          "Entradas más puntuales para resolver necesidades concretas sin quitarle protagonismo al discovery comercial.",
      };
    }
  }

  if (hasPublication && hasBusiness) {
    return {
      tone: "mixed" as const,
      badge: "Pulso de categoría",
      title: `Lo que se mueve en ${categoryLabel}`,
      description:
        "Mantenemos viva la categoría con señales sociales y negocios activos, sin perder foco en producto.",
    };
  }

  if (hasPublication) {
    return {
      tone: "social" as const,
      badge: "Prueba social",
      title: `Lo que recomiendan en ${categoryLabel}`,
      description:
        "Una capa breve de reseñas y publicaciones para que la categoría no se sienta seca ni puramente catálogo.",
    };
  }

  if (hasBusiness) {
    return {
      tone: "business" as const,
      badge: "Negocios de la categoría",
      title: `Perfiles activos dentro de ${categoryLabel}`,
      description:
        "Negocios compactos que aportan contexto y continuidad al discovery de la categoría.",
    };
  }

  return {
    tone: "service" as const,
    badge: "Complemento útil",
    title: `Servicios relacionados con ${categoryLabel}`,
    description:
      "Un módulo breve para ampliar el tipo de soluciones visibles sin desviar el foco principal del feed.",
  };
};

const getProductClusterGridClass = (count: number) => {
  if (count >= 4) {
    return "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";
  }

  if (count === 3) {
    return "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3";
  }

  return "grid grid-cols-1 gap-3 md:grid-cols-2";
};

const FeedRenderer: React.FC<FeedRendererProps> = ({
  items,
  hasMore,
  isLoadingNext,
  sentinelRef,
  activeTab,
  onTabChange,
  discoveryContext,
  categoriaSlug,
  categoriaNombre,
  categoriaIconName,
  ciudad,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const isCategoryFeed = discoveryContext === "category";

  const masonryWrapperRef = useRef<HTMLDivElement | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leadProductCount = isCategoryFeed ? 4 : 3;

  useEffect(() => setMounted(true), []);

  // Función mejorada para forzar relayout
  const forceRelayout = useCallback((delay = 0) => {
    if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);

    resizeTimeoutRef.current = setTimeout(() => {
      // Múltiples estrategias para forzar relayout
      window.dispatchEvent(new Event("resize"));

      // Forzar recálculo de dimensiones del contenedor
      if (masonryWrapperRef.current) {
        const wrapper = masonryWrapperRef.current;
        const currentDisplay = wrapper.style.display;
        wrapper.style.display = 'none';
        void wrapper.offsetHeight; // Forzar reflow sin expresión no usada
        wrapper.style.display = currentDisplay || '';
      }

      // Segundo resize después de un breve delay
      setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
    }, delay);
  }, []);

  const itemsPorTab = useMemo(() => {
    const filtrados = items.filter(item => {
      if (activeTab === "Productos" && !isProductItem(item)) return false;
      if (activeTab === "Servicios" && !isServiceItem(item)) return false;
      if (activeTab === "Negocios" && !isBusinessItem(item)) return false;
      if (activeTab === "Publicaciones" && !isPublicationItem(item)) return false;
      return true;
    });

    return filtrados;
  }, [items, activeTab]);

  const filteredItems = useMemo(() => {
    let filtered = itemsPorTab;

    if (selectedCategory && (activeTab === "Productos" || activeTab === "Negocios" || activeTab === "Servicios")) {
      filtered = filtered.filter(item => {
        if (isProductItem(item)) {
          return item.data.categoriaId === selectedCategory;
        }
        if (isBusinessItem(item)) {
          return item.data.categorias.includes(selectedCategory);
        }
        if (isServiceItem(item)) {
          return true;
        }
        return true;
      });
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`📊 FeedRenderer filteredItems (${activeTab}, cat: ${selectedCategory || 'all'}): ${filtered.length} items, orden preservado DB`);
    }

    return filtered;
  }, [itemsPorTab, activeTab, selectedCategory]);

  const itemsHash = useMemo(() => filteredItems.map(item => `${item.type}-${item.id}`).join(','), [filteredItems]);
  const cadenceSections = useMemo<CadenceSection[]>(() => {
    if (activeTab !== "Para ti") return [];

    const productQueue = filteredItems.filter(isProductItem);
    const supportQueues: Record<SupportType, SupportFeedItem[]> = {
      publication: filteredItems.filter(
        (item): item is SupportFeedItem => isPublicationItem(item),
      ),
      business: filteredItems.filter(
        (item): item is SupportFeedItem => isBusinessItem(item),
      ),
      service: filteredItems.filter(
        (item): item is SupportFeedItem => isServiceItem(item),
      ),
    };

    const productPattern = isCategoryFeed
      ? CATEGORY_PRODUCT_PATTERN
      : HOME_PRODUCT_PATTERN;
    const supportPattern = isCategoryFeed
      ? CATEGORY_SUPPORT_PATTERN
      : HOME_SUPPORT_PATTERN;
    const sections: CadenceSection[] = [];

    const leadItems = takeQueueItems(productQueue, leadProductCount);
    if (leadItems.length > 0) {
      sections.push({
        kind: "products",
        key: "products-lead",
        emphasis: "lead",
        items: leadItems,
      });
    }

    let productPatternIndex = 0;
    let supportPatternIndex = 0;

    while (productQueue.length > 0 || hasSupportItems(supportQueues)) {
      const productCount = productPattern[productPatternIndex % productPattern.length];
      const productItems = takeQueueItems(productQueue, productCount);

      if (productItems.length > 0) {
        sections.push({
          kind: "products",
          key: `products-${sections.length}`,
          emphasis: "flow",
          items: productItems,
        });
        productPatternIndex += 1;
      }

      if (!hasSupportItems(supportQueues)) {
        if (productItems.length === 0) break;
        continue;
      }

      if (productItems.length === 0 && productQueue.length > 0) {
        continue;
      }

      const supportPlan = supportPattern[supportPatternIndex % supportPattern.length];
      const supportItems = takeSupportItems(supportQueues, supportPlan);

      if (supportItems.length > 0) {
        sections.push({
          kind: "pulse",
          key: `pulse-${sections.length}`,
          ...buildPulseMeta(supportItems, discoveryContext, categoriaNombre),
          items: supportItems,
        });
        supportPatternIndex += 1;
      }

      if (productItems.length === 0 && !hasSupportItems(supportQueues)) {
        break;
      }
    }

    return sections;
  }, [activeTab, categoriaNombre, discoveryContext, filteredItems, isCategoryFeed, leadProductCount]);

  // Efecto principal para manejar cambios de tab y relayout
  useEffect(() => {
    if (!mounted) return;

    const handleTabChange = async () => {
      setIsLayoutReady(false);

      // Forzar re-mount del componente Masonry
      await new Promise(resolve => setTimeout(resolve, 100));

      forceRelayout(0);

      await new Promise(resolve => setTimeout(resolve, 300));
      setIsLayoutReady(true);
      forceRelayout(100);
    };

    handleTabChange();
  }, [activeTab, mounted, forceRelayout]);

  // Efecto específico para manejar imágenes
  useEffect(() => {
    if (activeTab === "Para ti") return;
    if (!masonryWrapperRef.current || !isLayoutReady) return;

    let loaded = 0;
    const imgs = Array.from(masonryWrapperRef.current.querySelectorAll("img"));

    if (imgs.length === 0) {
      forceRelayout(100);
      return;
    }

    const checkAllLoaded = () => {
      loaded += 1;
      if (loaded >= imgs.length) {
        forceRelayout(50);

        // Verificación adicional después de que todas las imágenes se carguen
        setTimeout(() => {
          const newImgs = Array.from(masonryWrapperRef.current?.querySelectorAll("img") || []);
          const allComplete = newImgs.every(img => img.complete);
          if (allComplete) {
            forceRelayout(0);
          }
        }, 200);
      }
    };

    imgs.forEach((img) => {
      if (img.complete) {
        checkAllLoaded();
      } else {
        img.addEventListener("load", checkAllLoaded);
        img.addEventListener("error", checkAllLoaded);
      }
    });

    return () => {
      imgs.forEach((img) => {
        img.removeEventListener("load", checkAllLoaded);
        img.removeEventListener("error", checkAllLoaded);
      });
    };
  }, [activeTab, filteredItems, isLayoutReady, forceRelayout]);

  // Cleanup de timeouts
  useEffect(() => {
    const resizeTimeout = resizeTimeoutRef.current;

    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);

  const tabs = useMemo(() => {
    if (isCategoryFeed) {
      return [
        { label: "Productos" as const, icon: <FaShoppingBag className="text-green-600" /> },
        { label: "Para ti" as const, icon: <FaCompass className="text-sky-600" /> },
        { label: "Negocios" as const, icon: <FaBuilding className="text-purple-600" /> },
        { label: "Publicaciones" as const, icon: <FaNewspaper className="text-blue-600" /> },
        { label: "Servicios" as const, icon: <FaTools className="text-orange-600" /> },
      ];
    }

    return [
      { label: "Para ti" as const, icon: <FaCompass className="text-sky-600" /> },
      { label: "Productos" as const, icon: <FaShoppingBag className="text-green-600" /> },
      { label: "Negocios" as const, icon: <FaBuilding className="text-purple-600" /> },
      { label: "Publicaciones" as const, icon: <FaNewspaper className="text-blue-600" /> },
      { label: "Servicios" as const, icon: <FaTools className="text-orange-600" /> },
    ];
  }, [isCategoryFeed]);

  const todasCategorias = useMemo(() => initialData.categorias.filter(cat => cat.isActive), []);

  const categoriasDisponibles = useMemo(() => {
    if (activeTab === "Publicaciones" || activeTab === "Para ti") return [];

    const catIds = new Set<string>();

    itemsPorTab.forEach(item => {
      if (isProductItem(item)) {
        catIds.add(item.data.categoriaId);
      } else if (isBusinessItem(item)) {
        item.data.categorias.forEach(catId => catIds.add(catId));
      } else if (isServiceItem(item)) {
        // Para servicios futuros
      }
    });

    return todasCategorias
      .filter(cat => catIds.has(cat.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [itemsPorTab, todasCategorias, activeTab]);

  const breakpointCols = useMemo(() => {
    if (activeTab === "Productos" || activeTab === "Negocios") {
      return PRODUCTOS_NEGOCIOS_BREAKPOINTS;
    }

    if (activeTab === "Para ti") {
      return isCategoryFeed ? MIXED_CATEGORY_BREAKPOINTS : MIXED_HOME_BREAKPOINTS;
    }

    return PUBLICACIONES_SERVICIOS_BREAKPOINTS;
  }, [activeTab, isCategoryFeed]);

  const renderCardContent = (item: FeedItem) => {
    if (!item) return null;

    if (isProductItem(item)) return <ProductCard product={item.data} />;
    if (isServiceItem(item)) return <DiscoveryServiceCard servicio={item.data} />;
    if (isBusinessItem(item)) return <DiscoveryBusinessCard business={item.data} />;
    if (isPublicationItem(item)) return <DiscoveryPublicationCard publicacion={item.data} />;

    return null;
  };

  const renderCadenceFeed = () => {
    if (activeTab !== "Para ti" || cadenceSections.length === 0) return null;

    return cadenceSections.map((section, sectionIndex) => {
      if (section.kind === "products") {
        const sectionTitle =
          section.emphasis === "lead"
            ? isCategoryFeed
              ? `Productos para empezar en ${categoriaNombre || "esta categoría"}`
              : "Productos para empezar"
            : null;
        const sectionDescription =
          section.emphasis === "lead"
            ? isCategoryFeed
              ? "Abrimos con producto para que la categoría se sienta enfocada, y luego dejamos entrar ritmo social de forma dosificada."
              : "Abrimos con producto para que el discovery siga siendo comercial, pero luego el feed gane respiración con señales de negocio vivo."
            : null;

        return (
          <section
            key={section.key}
            className={section.emphasis === "lead" ? "mb-6" : "mb-5"}
          >
            {sectionTitle && (
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                    {sectionTitle}
                  </h2>
                  <p className="text-sm text-slate-600">{sectionDescription}</p>
                </div>
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                  Discovery principal
                </span>
              </div>
            )}

            <div className={getProductClusterGridClass(section.items.length)}>
              {section.items.map((item, itemIndex) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min((sectionIndex + itemIndex) * 0.03, 0.18),
                    ease: "easeOut",
                  }}
                  className="h-full"
                >
                  {renderCardContent(item)}
                </motion.div>
              ))}
            </div>
          </section>
        );
      }

      return (
        <DiscoveryPulseModule
          key={section.key}
          badge={section.badge}
          title={section.title}
          description={section.description}
          tone={section.tone}
          city={ciudad}
          itemCount={section.items.length}
        >
          {section.items.map((item, itemIndex) => (
            <motion.div
              key={`${section.key}-${item.id}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.22,
                delay: Math.min((sectionIndex + itemIndex) * 0.025, 0.16),
                ease: "easeOut",
              }}
            >
              {renderCardContent(item)}
            </motion.div>
          ))}
        </DiscoveryPulseModule>
      );
    });
  };

  useEffect(() => {
    setSelectedCategory(null);
  }, [activeTab]);

  const placeholderImages: Record<FeedTab, string> = {
    "Para ti": "/imgs/no_publicaciones.png",
    "Publicaciones": "/imgs/no_publicaciones.png",
    "Productos": "/imgs/no_productos.png",
    "Servicios": "/imgs/no_servicios.png",
    "Negocios": "/imgs/no_negocios.png",
  };

  const renderDiscoveryIntro = () => {
    if (isCategoryFeed) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50">
              <Image
                src={categoriaIconName ? `/imgs/iconos/${categoriaIconName}` : "/imgs/iconos/placeholder.png"}
                alt={categoriaNombre || categoriaSlug || "Categoría"}
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                  Categoría
                </span>
                {ciudad && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {ciudad}
                  </span>
                )}
              </div>

              <h1 className="mt-2 text-lg font-semibold text-slate-900 sm:text-xl">
                {categoriaNombre || "Explora esta categoría"}
              </h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Empezamos por productos para que el discovery sea más claro y dejamos la mezcla de
                negocios y publicaciones disponible en <span className="font-medium text-slate-700">Para ti</span>.
              </p>
            </div>

            <Link
              href="/"
              className="hidden rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-sky-200 hover:text-sky-700 sm:inline-flex"
            >
              Volver a explorar
            </Link>
          </div>
        </motion.div>
      );
    }

    if (activeTab !== "Para ti") return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            <FaCompass className="text-[11px]" />
            Descubre primero
          </div>
          {ciudad && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {ciudad}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Este tramo prioriza productos para que encuentres opciones rápido. Luego entran negocios y
          publicaciones para darte contexto social sin romper el ritmo de compra.
        </p>
      </motion.div>
    );
  };

  const renderCategoryFilter = () => {
    if (isCategoryFeed || activeTab === "Publicaciones" || activeTab === "Para ti" || categoriasDisponibles.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex overflow-x-auto justify-around gap-2 p-2 bg-white shadow-md rounded-xl mb-4"
      >
        <button
          onClick={() => setSelectedCategory(null)}
          className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-colors ${!selectedCategory ? "bg-blue-50 text-blue-600 shadow-sm" : "hover:bg-gray-100 text-gray-600"
            }`}
          aria-label="Mostrar todas las categorías"
        >
          <span className="text-xs font-medium">Todas</span>
        </button>

        {categoriasDisponibles.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-colors ${isSelected ? "bg-blue-50 text-blue-600 shadow-sm" : "hover:bg-gray-100 text-gray-600"
                }`}
              aria-label={`Filtrar por ${cat.nombre}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 overflow-hidden ${isSelected ? "bg-blue-100 border-2 border-blue-300" : "bg-gray-100"
                }`}>
                <Image
                  src={`/imgs/iconos/${cat.iconName}`}
                  alt={cat.nombre}
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/imgs/iconos/placeholder.png";
                  }}
                />
              </div>
              <span className="text-xs font-medium text-center line-clamp-1">{cat.nombre}</span>
            </button>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 px-1 py-2 sm:px-2 sm:py-4 lg:px-6 xl:px-12">
      {renderDiscoveryIntro()}

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto mb-4 mt-2 flex w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white/90 px-2 shadow-sm lg:justify-around lg:overflow-visible"
      >
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => onTabChange(tab.label)}
            className={`relative flex-1 lg:flex-none flex items-center justify-center gap-2 
                  px-3 lg:px-5 py-3 lg:py-4 font-medium text-sm lg:text-base transition-all 
                  duration-300 rounded-xl
                  ${activeTab === tab.label
                ? "text-gray-600 bg-gray-70/90 shadow-sm border-b-4 border-gray-500"
                : "text-gray-700 hover:text-gray-900 hover:bg-blue-300"
              } 
                  focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50`}
            aria-label={`Cambiar a pestaña ${tab.label}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </motion.div>

      {renderCategoryFilter()}

      <motion.div
        key={`${activeTab}-${selectedCategory}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        style={{ minHeight: isLayoutReady ? 'auto' : '400px' }}
      >
        {!mounted ? (
          <div className="text-center py-4 text-gray-400">Cargando…</div>
        ) : filteredItems.length === 0 && !isLoadingNext ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-center text-gray-800 font-bold mb-4 text-lg sm:text-2xl">
              {activeTab === "Para ti"
                ? "Aun no encontramos contenido ideal para ti"
                : `No hay ${activeTab.toLowerCase()} disponibles`}
              {selectedCategory
                ? ` en la categoría "${categoriasDisponibles.find(cat => cat.id === selectedCategory)
                  ?.nombre || "seleccionada"
                }"`
                : ""}
              .
            </p>
            <Image
              src={placeholderImages[activeTab]}
              alt={`No hay ${activeTab.toLowerCase()} disponibles`}
              width={500}
              height={500}
              className="max-w-xs md:max-w-md lg:max-w-lg w-full h-auto object-contain mb-4"
              loading="lazy"
      
            />
            
          </div>
        ) : (
          <>
            {activeTab === "Para ti" ? (
              renderCadenceFeed()
            ) : (
              <div ref={masonryWrapperRef} className="w-full">
                <Masonry
                  key={`${activeTab}-${itemsHash}-${isLayoutReady ? 'ready' : 'loading'}`}
                  breakpointCols={breakpointCols}
                  className="masonry-container flex w-auto -ml-0 lg:-ml-2"
                  columnClassName="masonry-column pl-0 md:px-2 bg-clip-padding"
                >
                  {filteredItems.map((item, index) => (
                    <motion.div
                      key={`${item.type}-${item.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
                      className={`motion-transition ${isProductItem(item) ? "mb-4" : "mb-3"} transition-transform duration-200`}
                    >
                      {renderCardContent(item)}
                    </motion.div>
                  ))}
                </Masonry>
              </div>
            )}
          </>
        )}
      </motion.div>

      {isLoadingNext && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!hasMore && !isLoadingNext && filteredItems.length > 0 && (
        <div className="flex flex-col items-center justify-center py-8">
          <Image
            src={placeholderImages[activeTab]}
            alt={`No hay más ${activeTab.toLowerCase()}`}
            width={300}
            height={300}
            className="max-w-xs md:max-w-md lg:max-w-lg w-full h-auto object-contain mb-4"
            loading="lazy"
       
          />
          <p className="text-center text-gray-500 font-light">
            No hay más {activeTab.toLowerCase()}.
          </p>
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />
    </div>
  );
};

export default FeedRenderer;
