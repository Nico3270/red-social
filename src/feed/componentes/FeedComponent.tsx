"use client";

import { usePreferencesStore } from "@/store/preferences/preferences-store";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getFollowedBusinesses } from "../actions/getFollowedBusinesses";
import { FeedItem, FeedQueryParams, FeedResponse } from "../feed.interfaces";
import { useInfiniteQuery } from '@tanstack/react-query';
import { getFeedDataByType } from "../actions/getFeedData";
import { getFeedDataByCategory } from "../actions/getFeedDataByCategory";
import { InfiniteData } from "@tanstack/react-query";
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';
import FeedRenderer from "@/publicaciones/componentes/FeedRederer";
import { CircularProgress } from "@mui/material";

// EXTENSIÓN: Agrega categoriaSlug a params
interface ExtendedFeedQueryParams extends FeedQueryParams {
  userId?: string | null;
  categoriaSlug?: string;  // Para filtrado temático
}

// Props opcionales (default vacío para compatibilidad global)
interface FeedComponentProps {
  categoriaSlug?: string;
  categoriaNombre?: string;  // Para UX en loaders/toasts
}

// Tipo local mirror de backend ExtendedParams (para aserción segura)
type BackendExtendedParams = ExtendedFeedQueryParams & {
  categoriaSlug: string;  // Requerido para temático
  cursor?: string;
};

export default function FeedComponent({ categoriaSlug, categoriaNombre }: FeedComponentProps = {}) {
  const { data: session } = useSession();
  const { ciudad, departamento, preferencias, secciones, seenIds, addSeenId } = usePreferencesStore();
  const [followedBusinessIds, setFollowedBusinessIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"Publicaciones" | "Productos" | "Servicios" | "Negocios">("Publicaciones");
  const [prevItemsLength, setPrevItemsLength] = useState(0); // Track para marking lazy de nuevos items

  console.log({ categoriaSlug });

  // Params incluyen categoriaSlug condicional
  const params = useMemo<ExtendedFeedQueryParams | null>(() => {
    if (!ciudad) return null;
    const baseParams: ExtendedFeedQueryParams = {
      ciudad,
      departamento,
      preferencias,
      secciones,
      followedBusinessIds,
      limit: 20,
      seenIds,
      userId: session?.user?.id || null,
    };
    return categoriaSlug ? { ...baseParams, categoriaSlug } : baseParams;
  }, [ciudad, departamento, preferencias, secciones, followedBusinessIds, seenIds, session?.user?.id, categoriaSlug]);

  // Carga follows
  useEffect(() => {
    async function loadFollows() {
      if (session?.user?.id) {
        try {
          const { followedBusinessIds: ids } = await getFollowedBusinesses();
          setFollowedBusinessIds(ids || []);
        } catch (error) {
          console.error("Error al cargar follows:", error);
          toast.error('Error al cargar negocios seguidos. Intenta de nuevo.');
        }
      }
    }
    loadFollows();
  }, [session]);

  // Helper para queryKey flexible
  const getQueryKey = useCallback((type: string): readonly (string | ExtendedFeedQueryParams | null)[] => {
    const key = ['feed-' + type, categoriaSlug || 'global', params];
    return key;
  }, [categoriaSlug, params]);

  // Helper para queryFn condicional (con log debug)
  const getQueryFn = useCallback((type: "publications" | "products" | "services" | "businesses") => 
    async ({ pageParam }: { pageParam?: string }) => {
      if (!params) throw new Error("Params no listos");
      const queryParams = { ...params, cursor: pageParam };
      if (process.env.NODE_ENV === "development") {
        console.log(`🔍 Fetching ${type} with cursor: ${pageParam || 'initial'}, seenIds len: ${queryParams.seenIds.length}`);
      }
      return categoriaSlug 
        ? getFeedDataByCategory(type, { ...queryParams, categoriaSlug } as BackendExtendedParams)
        : getFeedDataByType(type, queryParams);
    }, [params, categoriaSlug]
  );

  // Genérico flexible para queryKey
  type FlexibleQueryKey = readonly (string | ExtendedFeedQueryParams | null)[];

  const publicationsQuery = useInfiniteQuery<
    FeedResponse, 
    Error, 
    InfiniteData<FeedResponse>, 
    FlexibleQueryKey, 
    string | undefined
  >({
    queryKey: getQueryKey('publicaciones'),
    queryFn: getQueryFn('publications'),
    enabled: !!params,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: categoriaSlug ? 2 * 60 * 1000 : 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3, // Aumentado para robustez
    structuralSharing: false, // Optimiza para data mutante
  });

  const productsQuery = useInfiniteQuery<
    FeedResponse, 
    Error, 
    InfiniteData<FeedResponse>, 
    FlexibleQueryKey, 
    string | undefined
  >({
    queryKey: getQueryKey('productos'),
    queryFn: getQueryFn('products'),
    enabled: !!params && activeTab === "Productos",
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 2 * 60 * 1000, // Más corto para tabs (refresca al switch)
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,  // Refresca al activar tab
    retry: 3,
    structuralSharing: false,
  });

  const servicesQuery = useInfiniteQuery<
    FeedResponse, 
    Error, 
    InfiniteData<FeedResponse>, 
    FlexibleQueryKey, 
    string | undefined
  >({
    queryKey: getQueryKey('servicios'),
    queryFn: getQueryFn('services'),
    enabled: !!params && activeTab === "Servicios",
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 3,
    structuralSharing: false,
  });

  const businessesQuery = useInfiniteQuery<
    FeedResponse, 
    Error, 
    InfiniteData<FeedResponse>, 
    FlexibleQueryKey, 
    string | undefined
  >({
    queryKey: getQueryKey('negocios'),
    queryFn: getQueryFn('businesses'),
    enabled: !!params && activeTab === "Negocios",
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 3,
    structuralSharing: false,
  });

  // Queries mapeadas
  const queries = {
    Publicaciones: publicationsQuery,
    Productos: productsQuery,
    Servicios: servicesQuery,
    Negocios: businessesQuery,
  };

  // Sentinel para infinite scroll (pre-fetch suave)
  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px', // Pre-carga antes de llegar al fondo
  });

  useEffect(() => {
    const currentQuery = queries[activeTab];
    if (inView && currentQuery.hasNextPage && !currentQuery.isFetchingNextPage) {
      currentQuery.fetchNextPage();
    }
  }, [inView, activeTab, queries]);

  // Manejo de errores con retry manual
  useEffect(() => {
    const currentQuery = queries[activeTab];
    if (currentQuery.error) {
      const contexto = categoriaNombre || 'global';
      toast.error(
        `Error al cargar ${activeTab} en ${contexto}: ${currentQuery.error.message}.`, 
        { 
          action: { 
            label: 'Reintentar', 
            onClick: () => currentQuery.refetch() 
          } 
        }
      );
    }
  }, [activeTab, queries, categoriaNombre]);

  // Items por tab: FlatMap + dedup + sort por DB order (no score)
  const getItemsForTab = useCallback((tab: typeof activeTab): FeedItem[] => {
    const query = queries[tab];
    const allItems = query.data?.pages.flatMap((page) => page.items) || [];
    
    if (process.env.NODE_ENV === "development") {
      console.log(`📊 getItemsForTab(${tab}): FlatMap ${allItems.length} items from ${query.data?.pages.length || 0} pages`);
    }
    
    // Deduplica con prefijo para seenIds temático (sin mixing extra; backend ya intercala)
    const uniqueMap = new Map<string, FeedItem>();
    allItems.forEach((item) => {
      const prefixedId = categoriaSlug ? `${categoriaSlug}-${item.id}` : item.id;
      if (item && !uniqueMap.has(prefixedId)) {
        uniqueMap.set(prefixedId, item);
      }
    });
    
    const uniqueItems = Array.from(uniqueMap.values());
    
    if (process.env.NODE_ENV === "development") {
      console.log(`📊 getItemsForTab(${tab}): After dedup ${uniqueItems.length} items (prefixed for categoria: ${!!categoriaSlug})`);
    }
    
    // Sort final por orden DB (orden DESC + createdAt DESC; respeta backend)
    return uniqueItems.sort((a, b) => {
      const dataA = a.data as any;
      const dataB = b.data as any;
      const orderA = dataA.orden || 0;
      const orderB = dataB.orden || 0;
      if (orderB !== orderA) return orderB - orderA;
      return new Date(dataB.createdAt || 0).getTime() - new Date(dataA.createdAt || 0).getTime();
    });
  }, [queries, categoriaSlug]);

  // Mark as seen lazy: Solo nuevos items (delta con prevLength)
  const markAsSeen = useCallback(() => {
    const currentItems = getItemsForTab(activeTab);
    const currentLength = currentItems.length;
    const newItemsCount = currentLength - prevItemsLength;
    if (newItemsCount > 0) {
      // Solo marca los últimos/nuevos
      const itemsToMark = currentItems.slice(-newItemsCount);
      itemsToMark.forEach((item) => {
        const prefixedId = categoriaSlug ? `${categoriaSlug}-${item.id}` : item.id;
        if (!seenIds.includes(prefixedId)) {
          addSeenId(prefixedId);
        }
      });
      setPrevItemsLength(currentLength);
      if (process.env.NODE_ENV === "development") {
        console.log(`👁️ markAsSeen(${activeTab}): +${newItemsCount} nuevos IDs agregados (total now: ${seenIds.length + newItemsCount})`);
      }
    }
  }, [activeTab, getItemsForTab, categoriaSlug, addSeenId, seenIds, prevItemsLength]);

  // Lazy marking: Post-fetch success y solo si hay datos nuevos
  useEffect(() => {
    const currentQuery = queries[activeTab];
    if (currentQuery.isSuccess && currentQuery.data?.pages.length > 0) {
      markAsSeen();
    }
  }, [activeTab, queries, markAsSeen]);

  // Estado de loading generalizado para tab activo
  const currentQuery = queries[activeTab];
  const items = getItemsForTab(activeTab);
  const isLoading = currentQuery.isPending || (currentQuery.isFetching && items.length === 0);

  // Loader: Spinner elegante para inicial o cambio de tab
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <CircularProgress />
        <p className="mt-4 text-gray-600 text-sm">
          {categoriaNombre 
            ? `Cargando ${activeTab.toLowerCase()} en ${categoriaNombre}...` 
            : `Cargando tu feed de ${activeTab.toLowerCase()}...`}
        </p>
      </div>
    );
  }

  return (
    <div className="p-2 w-full mx-auto sm:mt-40">
      <FeedRenderer
        items={items}
        hasMore={currentQuery.hasNextPage ?? false}
        isLoadingNext={currentQuery.isFetchingNextPage}
        sentinelRef={sentinelRef}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}