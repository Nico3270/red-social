"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import clsx from "clsx";
import { initialData } from "@/seed/seed";
import { ProductGridProduct } from "../productos/ProductGridProduct";
import useSWRInfinite from "swr/infinite";
import Image from "next/image";
import type { ProductGuideExploreContext } from "@/perfil/guide/business-guide.types";

interface Props {
  initialProducts: ProductRedSocial[];
  slug: string;
  take?: number;
  guideContext?: ProductGuideExploreContext | null;
}

interface ProductsPage {
  products: ProductRedSocial[];
}

export const ProductGridWithSectionFilter = ({
  initialProducts,
  slug,
  take = 10,
  guideContext = null,
}: Props) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [activeGuideContext, setActiveGuideContext] = useState<ProductGuideExploreContext | null>(guideContext);
  const observerRef = useRef<HTMLDivElement>(null);
  const hasReachedEndRef = useRef(false); // Para el freno en getKey
  const [hasReachedEndLocal, setHasReachedEndLocal] = useState(false); // Para la UI
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!guideContext) return;

    setActiveGuideContext(guideContext);
    setSelectedSectionId(guideContext.preferredSectionId ?? null);
  }, [guideContext]);

  // Mejorar getKey con freno definitivo
  const getKey = (pageIndex: number, previousPageData: ProductsPage | null) => {
    if (hasReachedEndRef.current) return null; // Freno definitivo
    if (pageIndex === 0) return `/api/productos/${slug}?skip=0&take=${take}`;
    if (!previousPageData || !previousPageData.products || previousPageData.products.length === 0) {
      hasReachedEndRef.current = true; // Actualizar ref al detectar el final
      setHasReachedEndLocal(true); // Sincronizar con estado para UI
      return null;
    }
    return `/api/productos/${slug}?skip=${pageIndex * take}&take=${take}`;
  };

  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  const { data,  setSize, isLoading, isValidating, error } = useSWRInfinite<ProductsPage>(
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

  const products = useMemo(() => {
    const allProducts = data
  ? data.flatMap((page: ProductsPage) => page?.products || [])
  : initialProducts;
    const uniqueProducts = Array.from(
      new Map(allProducts.map((product) => [product.id, product])).values()
    );
    return uniqueProducts;
  }, [data, initialProducts]);

  const seccionesConProductos = useMemo(() => {
    const sectionIds = new Set(products.flatMap((p) => p.sections));
    return initialData.secciones
      .filter((sec) => sectionIds.has(sec.id))
      .sort((a, b) => a.order - b.order);
  }, [products]);

  const productosFiltrados = useMemo(() => {
    if (!selectedSectionId) return products;
    return products.filter((p) => p.sections.includes(selectedSectionId));
  }, [products, selectedSectionId]);

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
          observer.current.disconnect(); // Desconectar después del primer disparo
        }
      }
    },
    [isLoading, isValidating, setSize]
  );

  useEffect(() => {
    if (hasReachedEnd && !hasReachedEndRef.current) {
      hasReachedEndRef.current = true; // Actualizar ref al detectar el final
      setHasReachedEndLocal(true); // Sincronizar con estado para UI
      if (observer.current) {
        observer.current.disconnect(); // Desconecta el observer al llegar al final
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

  // Loader personalizado con puntos animados
  const Loader = () => (
    <div className="flex justify-center items-center h-24">
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce"></div>
        <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce delay-100"></div>
        <div className="w-3 h-3 bg-gray-600 rounded-full animate-bounce delay-200"></div>
      </div>
    </div>
  );

  // Estilos CSS para la animación
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

  return (
    <div className="w-full sp:mb-0 mb-20">
      <style>{styles}</style>
      {activeGuideContext && (
        <div className="mb-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Llegaste desde la guía
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {activeGuideContext.title}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {activeGuideContext.summary}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveGuideContext(null);
                setSelectedSectionId(null);
              }}
              className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"
            >
              Ver todo el catálogo
            </button>
          </div>
        </div>
      )}

      <div className="flex overflow-x-auto justify-around gap-4 p-2 bg-white shadow rounded-xl mb-2">
        {seccionesConProductos.map((sec) => {
          const isSelected = selectedSectionId === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setSelectedSectionId(isSelected ? null : sec.id)}
              className={clsx(
                "flex flex-col items-center justify-center px-3 py-0 rounded-xl transition-colors",
                isSelected ? "bg-gray-500 text-gray-100" : "hover:bg-gray-100 text-gray-600"
              )}
            >
              <div
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center mb-1 overflow-hidden",
                  isSelected ? "bg-gray-500 text-white" : "bg-gray-100"
                )}
              >
                <Image
  src={`/imgs/iconos/${sec.iconName}`}
  alt={sec.nombre}
  width={32}
  height={32}
  className="w-full h-full object-contain"
  loading="lazy"
  onError={(e) => {
    (e.currentTarget as HTMLImageElement).src = "/imgs/iconos/placeholder.png";
  }}
/>
              </div>
              <span className="text-xs font-medium text-center">{sec.nombre}</span>
            </button>
          );
        })}
      </div>

      <ProductGridProduct products={productosFiltrados} />

      <div ref={observerRef} className="mt-4">
        {(isLoading || isValidating) && <Loader />}
        {hasReachedEndLocal && (
          <div className="flex justify-center items-center h-24">
            <span className="text-gray-500 text-sm">No hay más productos disponibles</span>
          </div>
        )}
        {error && (
          <div className="flex justify-center items-center h-24">
            <span className="text-red-500 text-sm">Error al cargar productos</span>
          </div>
        )}
      </div>
    </div>
  );
};
