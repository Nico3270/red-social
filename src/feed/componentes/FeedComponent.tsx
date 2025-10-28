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
import { useUserLocation } from "@/hooks/useUserLocation"; // ← NUEVO: Hook de ubicación

// EXTENSIÓN: Agrega categoriaSlug a params (para temático futuro)
interface ExtendedFeedQueryParams extends FeedQueryParams {
  userId?: string | null;
  categoriaSlug?: string;
  userLat?: number | null;   // ← NUEVO
  userLong?: number | null;  // ← NUEVO
}

// Props opcionales (default vacío para compatibilidad global)
interface FeedComponentProps {
  categoriaSlug?: string;
  categoriaNombre?: string;
}

type BackendExtendedParams = ExtendedFeedQueryParams & {
  categoriaSlug: string;
  cursor?: string;
};

export default function FeedComponent({ categoriaSlug, categoriaNombre }: FeedComponentProps = {}) {
  const { data: session } = useSession();
  const { ciudad, departamento, userLat, userLong, seenIds, addSeenId } = usePreferencesStore();
  const [followedBusinessIds, setFollowedBusinessIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"Publicaciones" | "Productos" | "Servicios" | "Negocios">("Publicaciones");
  const [prevItemsLength, setPrevItemsLength] = useState(0);

  // ← NUEVO: Ejecuta detección de ubicación en background
  useUserLocation();

  // Params: Incluye lat/long si disponibles
  const params = useMemo<ExtendedFeedQueryParams | null>(() => {
    if (!ciudad) return null;
    const baseParams: ExtendedFeedQueryParams = {
      ciudad,
      departamento,
      followedBusinessIds,
      limit: 20,
      seenIds,
      userId: session?.user?.id || null,
      userLat: userLat ?? undefined,
      userLong: userLong ?? undefined,
    };
    return categoriaSlug ? { ...baseParams, categoriaSlug } : baseParams;
  }, [ciudad, departamento, followedBusinessIds, seenIds, session?.user?.id, categoriaSlug, userLat, userLong]);

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

  // Toast si no hay ciudad (fallback Bogotá ya manejado en hook)
  useEffect(() => {
    if (!ciudad && params === null) {
      toast.info('Configura tu ciudad en preferencias para ver feeds locales.');
    }
  }, [ciudad, params]);

  // Helpers (sin cambios)
  const getQueryKey = useCallback((type: string): readonly (string | ExtendedFeedQueryParams | null)[] => {
    const key = ['feed-' + type, categoriaSlug || 'global', params];
    return key;
  }, [categoriaSlug, params]);

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

  type FlexibleQueryKey = readonly (string | ExtendedFeedQueryParams | null)[];

  const publicationsQuery = useInfiniteQuery<FeedResponse, Error, InfiniteData<FeedResponse>, FlexibleQueryKey, string | undefined>({
    queryKey: getQueryKey('publicaciones'),
    queryFn: getQueryFn('publications'),
    enabled: !!params,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: categoriaSlug ? 2 * 60 * 1000 : 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
    structuralSharing: false,
  });

  const productsQuery = useInfiniteQuery<FeedResponse, Error, InfiniteData<FeedResponse>, FlexibleQueryKey, string | undefined>({
    queryKey: getQueryKey('productos'),
    queryFn: getQueryFn('products'),
    enabled: !!params && activeTab === "Productos",
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 3,
    structuralSharing: false,
  });

  const servicesQuery = useInfiniteQuery<FeedResponse, Error, InfiniteData<FeedResponse>, FlexibleQueryKey, string | undefined>({
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

  const businessesQuery = useInfiniteQuery<FeedResponse, Error, InfiniteData<FeedResponse>, FlexibleQueryKey, string | undefined>({
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

  const queries = useMemo(() => ({
    Publicaciones: publicationsQuery,
    Productos: productsQuery,
    Servicios: servicesQuery,
    Negocios: businessesQuery,
  }), [publicationsQuery, productsQuery, servicesQuery, businessesQuery]);

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  useEffect(() => {
    const currentQuery = queries[activeTab];
    if (inView && currentQuery.hasNextPage && !currentQuery.isFetchingNextPage) {
      currentQuery.fetchNextPage();
    }
  }, [inView, activeTab, queries]);

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

  const getItemsForTab = useCallback((tab: typeof activeTab): FeedItem[] => {
    const query = queries[tab];
    const allItems = query.data?.pages.flatMap((page) => page.items) || [];
    
    if (process.env.NODE_ENV === "development") {
      console.log(`📊 getItemsForTab(${tab}): FlatMap ${allItems.length} items from ${query.data?.pages.length || 0} pages`);
    }
    
    const uniqueMap = new Map<string, FeedItem>();
    allItems.forEach((item) => {
      const prefixedId = categoriaSlug ? `${categoriaSlug}-${item.id}` : item.id;
      if (item && !uniqueMap.has(prefixedId)) {
        uniqueMap.set(prefixedId, item);
      }
    });
    
    const uniqueItems = Array.from(uniqueMap.values());
    
    if (process.env.NODE_ENV === "development") {
      console.log(`📊 getItemsForTab(${tab}): After dedup ${uniqueItems.length} items (prefixed: ${!!categoriaSlug})`);
    }
    
    return uniqueItems;
  }, [queries, categoriaSlug]);

  const markAsSeen = useCallback(() => {
    const currentItems = getItemsForTab(activeTab);
    const currentLength = currentItems.length;
    const newItemsCount = currentLength - prevItemsLength;
    if (newItemsCount > 0) {
      const itemsToMark = currentItems.slice(-newItemsCount);
      itemsToMark.forEach((item) => {
        const prefixedId = categoriaSlug ? `${categoriaSlug}-${item.id}` : item.id;
        if (!seenIds.includes(prefixedId)) {
          addSeenId(prefixedId);
        }
      });
      setPrevItemsLength(currentLength);
      if (process.env.NODE_ENV === "development") {
        console.log(`👁️ markAsSeen(${activeTab}): +${newItemsCount} nuevos IDs (total: ${seenIds.length + newItemsCount})`);
      }
    }
  }, [activeTab, getItemsForTab, categoriaSlug, addSeenId, seenIds, prevItemsLength]);

  useEffect(() => {
    const currentQuery = queries[activeTab];
    if (currentQuery.isSuccess && currentQuery.data?.pages.length > 0) {
      markAsSeen();
    }
  }, [activeTab, queries, markAsSeen]);

  const currentQuery = queries[activeTab];
  const items = getItemsForTab(activeTab);
  const isLoading = !params || currentQuery.isPending || (currentQuery.isFetching && items.length === 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <CircularProgress />
        <p className="mt-4 text-gray-600 text-sm">
          {categoriaNombre 
            ? `Cargando ${activeTab.toLowerCase()} en ${categoriaNombre}...` 
            : !ciudad 
            ? 'Configura tu ciudad para ver feeds locales...' 
            : `Cargando tu feed de ${activeTab.toLowerCase()}...`}
        </p>
      </div>
    );
  }

  return (
    <div className="p-0 w-full mx-auto ">
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