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
  const [activeGuideContext, setActiveGuideContext] = useState<ProductGuideExploreContext | null>(
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
        <div className="mb-2 flex justify-start gap-1.5 overflow-x-auto rounded-[18px] border border-slate-200 bg-white/90 p-1.5 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(96px,1fr))] lg:gap-2 lg:overflow-visible lg:p-2">
          <button
            type="button"
            onClick={clearSectionSelection}
            className={clsx(
              "inline-flex min-w-[76px] shrink-0 items-center justify-center rounded-2xl px-3 py-2 text-xs font-semibold transition lg:min-h-[90px] lg:min-w-0 lg:w-full",
              !selectedSectionId
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
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
                  "flex min-w-[84px] shrink-0 flex-col items-center justify-center rounded-2xl px-2.5 py-2 transition-colors lg:min-h-[90px] lg:min-w-0 lg:w-full lg:px-3 lg:py-3",
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div
                  className={clsx(
                    "mb-1 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full lg:mb-1.5 lg:h-9 lg:w-9",
                    isSelected ? "bg-white/15 text-white" : "bg-slate-100"
                  )}
                >
                  <Image
                    src={`/imgs/iconos/${sec.iconName}`}
                    alt={sec.nombre}
                    width={36}
                    height={36}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/imgs/iconos/placeholder.png";
                    }}
                  />
                </div>

                <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight lg:text-xs">
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
