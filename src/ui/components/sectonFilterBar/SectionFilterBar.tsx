"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import clsx from "clsx";
import { initialData } from "@/seed/seed";
import { ProductGridProduct } from "../productos/ProductGridProduct";
import useSWRInfinite from "swr/infinite";
import Image from "next/image";
import type { ProductGuideExploreContext } from "@/perfil/guide/business-guide.types";
import type { EventSource, NavigationMode } from "@/analytics/events";
import { resolveSectionIdToSlug } from "@/perfil/helpers/catalog-section-url";

export interface ProductGridGroupContext {
  groupId: string;
  groupName: string;
  groupSlug?: string;
  highlightedProducts: ProductRedSocial[];
  onClear?: () => void;
}

interface ProductGridAnalyticsContext {
  negocioSlug: string;
  navigationMode: NavigationMode;
  source: EventSource;
}

interface Props {
  initialProducts: ProductRedSocial[];
  slug: string;
  take?: number;
  guideContext?: ProductGuideExploreContext | null;
  groupContext?: ProductGridGroupContext | null;
  analyticsContext?: ProductGridAnalyticsContext | null;
  initialSectionId?: string | null;
}

interface ProductsPage {
  products: ProductRedSocial[];
}

export const ProductGridWithSectionFilter = ({
  initialProducts,
  slug,
  take = 10,
  guideContext = null,
  groupContext = null,
  analyticsContext = null,
  initialSectionId = null,
}: Props) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [, setActiveGuideContext] = useState<ProductGuideExploreContext | null>(
    guideContext
  );
  const observerRef = useRef<HTMLDivElement>(null);
  const hasReachedEndRef = useRef(false);
  const [hasReachedEndLocal, setHasReachedEndLocal] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!guideContext) return;
    setActiveGuideContext(guideContext);
    setSelectedSectionId(guideContext.preferredSectionId ?? null);
  }, [guideContext]);

  useEffect(() => {
    if (guideContext?.preferredSectionId || groupContext?.groupId) return;
    setSelectedSectionId(initialSectionId ?? null);
  }, [groupContext?.groupId, guideContext?.preferredSectionId, initialSectionId]);

  useEffect(() => {
    if (!groupContext?.groupId || guideContext?.preferredSectionId) return;
    setSelectedSectionId(null);
  }, [groupContext?.groupId, guideContext?.preferredSectionId]);

  const getKey = (pageIndex: number, previousPageData: ProductsPage | null) => {
    if (hasReachedEndRef.current) return null;

    if (pageIndex === 0) {
      return `/api/productos/${slug}?skip=0&take=${take}`;
    }

    if (!previousPageData || !previousPageData.products || previousPageData.products.length === 0) {
      hasReachedEndRef.current = true;
      setHasReachedEndLocal(true);
      return null;
    }

    return `/api/productos/${slug}?skip=${pageIndex * take}&take=${take}`;
  };

  const fetcher = (url: string) =>
    fetch(url, { cache: "no-store" }).then((res) => res.json());

  const { data, setSize, isLoading, isValidating, error } = useSWRInfinite<ProductsPage>(
    getKey,
    fetcher,
    {
      initialSize: initialProducts.length > 0 ? 1 : 0,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 2000,
      revalidateOnMount: false,
    }
  );

  const hasReachedEnd = useMemo(() => {
    if (!data) return false;
    const lastPage = data[data.length - 1];
    return lastPage?.products?.length < take;
  }, [data, take]);

  const spotlightProducts = useMemo(
    () => groupContext?.highlightedProducts ?? [],
    [groupContext?.highlightedProducts]
  );

  const products = useMemo(() => {
    const allProducts = data
      ? data.flatMap((page: ProductsPage) => page?.products || [])
      : initialProducts;

    const uniqueProducts = Array.from(
      new Map([...spotlightProducts, ...allProducts].map((product) => [product.id, product])).values()
    );

    return uniqueProducts;
  }, [data, initialProducts, spotlightProducts]);

  const orderedProducts = useMemo(() => {
    if (!groupContext?.groupId || spotlightProducts.length === 0) {
      return products;
    }

    const spotlightOrder = new Map(
      spotlightProducts.map((product, index) => [product.id, index])
    );
    const originalOrder = new Map(products.map((product, index) => [product.id, index]));

    return [...products].sort((left, right) => {
      const leftSpotlightIndex = spotlightOrder.get(left.id);
      const rightSpotlightIndex = spotlightOrder.get(right.id);

      if (
        typeof leftSpotlightIndex === "number" &&
        typeof rightSpotlightIndex === "number"
      ) {
        return leftSpotlightIndex - rightSpotlightIndex;
      }

      if (typeof leftSpotlightIndex === "number") return -1;
      if (typeof rightSpotlightIndex === "number") return 1;

      return (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0);
    });
  }, [groupContext?.groupId, products, spotlightProducts]);

  const seccionesConProductos = useMemo(() => {
    const sectionIds = new Set(orderedProducts.flatMap((product) => product.sections));

    return initialData.secciones
      .filter((sec) => sectionIds.has(sec.id))
      .sort((a, b) => a.order - b.order);
  }, [orderedProducts]);

  useEffect(() => {
    if (!selectedSectionId) return;

    const hasVisibleSection = seccionesConProductos.some(
      (section) => section.id === selectedSectionId
    );

    if (!hasVisibleSection) {
      setSelectedSectionId(null);
    }
  }, [seccionesConProductos, selectedSectionId]);

  const productosFiltrados = useMemo(() => {
    if (!selectedSectionId) return orderedProducts;
    return orderedProducts.filter((product) => product.sections.includes(selectedSectionId));
  }, [orderedProducts, selectedSectionId]);

  const spotlightProductIds = useMemo(
    () => new Set(spotlightProducts.map((product) => product.id)),
    [spotlightProducts]
  );

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (
        entries[0].isIntersecting &&
        !isLoading &&
        !isValidating &&
        !hasReachedEndRef.current
      ) {
        setSize((prev) => prev + 1);
        if (observer.current) {
          observer.current.disconnect();
        }
      }
    },
    [isLoading, isValidating, setSize]
  );

  useEffect(() => {
    if (hasReachedEnd && !hasReachedEndRef.current) {
      hasReachedEndRef.current = true;
      setHasReachedEndLocal(true);
      if (observer.current) {
        observer.current.disconnect();
      }
    }
  }, [hasReachedEnd]);

  useEffect(() => {
    observer.current = new IntersectionObserver(handleObserver, { threshold: 0.5 });

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.current.observe(currentRef);
    }

    return () => {
      if (observer.current && currentRef) {
        observer.current.unobserve(currentRef);
      }
    };
  }, [handleObserver]);

  const Loader = () => (
    <div className="flex h-24 items-center justify-center">
      <div className="flex space-x-2">
        <div className="h-3 w-3 animate-bounce rounded-full bg-gray-600" />
        <div className="delay-100 h-3 w-3 animate-bounce rounded-full bg-gray-600" />
        <div className="delay-200 h-3 w-3 animate-bounce rounded-full bg-gray-600" />
      </div>
    </div>
  );

  const styles = `
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .animate-bounce {
      animation: bounce 0.6s infinite;
    }
    .delay-100 { animation-delay: 0.1s; }
    .delay-200 { animation-delay: 0.2s; }
  `;
  const showSectionBar = seccionesConProductos.length > 0;
  const clearSectionSelection = () => {
    setActiveGuideContext(null);
    setSelectedSectionId(null);
  };

  return (
    <div className="mb-2 w-full sp:mb-0">
      <style>{styles}</style>

      {showSectionBar && (
        <div className="mb-2 flex justify-start gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/80 p-1 pb-1.5 sm:flex-wrap sm:justify-center sm:overflow-visible lg:gap-2 lg:px-1.5 lg:py-2">
          <button
            type="button"
            onClick={clearSectionSelection}
            className={clsx(
              "inline-flex h-8 min-w-max shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors sm:h-9 sm:text-sm lg:h-10 lg:gap-2 lg:px-4 lg:text-[14px]",
              !selectedSectionId
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <span className={clsx(
              "h-1.5 w-1.5 rounded-full",
              !selectedSectionId ? "bg-white/85" : "bg-slate-300"
            )} />
            Todo
          </button>

          {seccionesConProductos.map((sec) => {
            const isSelected = selectedSectionId === sec.id;

            return (
              <button
                key={sec.id}
                data-testid={`catalog-section-chip-${sec.slug}`}
                onClick={() => {
                  setActiveGuideContext(null);
                  setSelectedSectionId(isSelected ? null : sec.id);
                }}
                className={clsx(
                  "inline-flex h-8 min-w-max shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors sm:h-9 sm:text-sm lg:h-10 lg:gap-2 lg:px-4 lg:text-[14px]",
                  isSelected
                    ? "border-slate-300 bg-white text-slate-900 shadow-sm"
                    : "border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                )}
              >
                <Image
                  src={`/imgs/iconos/${sec.iconName}`}
                  alt=""
                  aria-hidden="true"
                  width={14}
                  height={14}
                  className={clsx(
                    "h-3.5 w-3.5 shrink-0 object-contain opacity-70 lg:h-4 lg:w-4",
                    isSelected && "opacity-85"
                  )}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
                <span className="whitespace-nowrap leading-none">
                  {sec.nombre}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <ProductGridProduct
        products={productosFiltrados}
        cardVariant="business_profile"
        analyticsContextBuilder={
          analyticsContext
            ? (product, index) => {
                const belongsToActiveGroup =
                  Boolean(groupContext?.groupId) && spotlightProductIds.has(product.id);

                return {
                  negocioSlug: analyticsContext.negocioSlug,
                  navigationMode: analyticsContext.navigationMode,
                  source: analyticsContext.source,
                  position: index,
                  groupId: belongsToActiveGroup ? groupContext?.groupId : undefined,
                  groupSlug: belongsToActiveGroup ? groupContext?.groupSlug : undefined,
                  sectionId:
                    analyticsContext.navigationMode === "traditional" && selectedSectionId
                      ? selectedSectionId
                      : undefined,
                  sectionSlug:
                    analyticsContext.navigationMode === "traditional" && selectedSectionId
                      ? resolveSectionIdToSlug(selectedSectionId) ?? undefined
                      : undefined,
                };
              }
            : undefined
        }
      />

      <div ref={observerRef} className="mt-4">
        {(isLoading || isValidating) && <Loader />}
        {hasReachedEndLocal && (
          <div className="flex h-24 items-center justify-center">
            <span className="text-sm text-gray-500">No hay más productos disponibles</span>
          </div>
        )}
        {error && (
          <div className="flex h-24 items-center justify-center">
            <span className="text-sm text-red-500">Error al cargar productos</span>
          </div>
        )}
      </div>
    </div>
  );
};
