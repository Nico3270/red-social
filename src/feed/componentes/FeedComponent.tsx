"use client";

import { usePreferencesStore } from "@/store/preferences/preferences-store";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { buildSeenFeedId, extractSeenRawIds } from "../feed-ids";
import { buildDiscoveryFeed, dedupeFeedItems } from "../feedForYou";

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
  categoriaIconName?: string;
  discoveryContext?: "home" | "category";
}

type BackendExtendedParams = ExtendedFeedQueryParams & {
  categoriaSlug: string;
  cursor?: string;
};

type FeedTab = "Para ti" | "Publicaciones" | "Productos" | "Servicios" | "Negocios";

const getDefaultTabForContext = (context: "home" | "category"): FeedTab =>
  context === "category" ? "Productos" : "Para ti";

export default function FeedComponent({
  categoriaSlug,
  categoriaNombre,
  categoriaIconName,
  discoveryContext,
}: FeedComponentProps = {}) {
  const { data: session } = useSession();
  const {
    ciudad,
    departamento,
    preferencias,
    secciones,
    userLat,
    userLong,
    seenIds,
    addSeenId,
    resetSeenIds,
  } = usePreferencesStore();
  const [followedBusinessIds, setFollowedBusinessIds] = useState<string[]>([]);
  const resolvedDiscoveryContext = discoveryContext ?? (categoriaSlug ? "category" : "home");
  const [activeTab, setActiveTab] = useState<FeedTab>(() => getDefaultTabForContext(resolvedDiscoveryContext));
  const [feedCycle, setFeedCycle] = useState(0);
  const recycledFeedKeysRef = useRef<Set<string>>(new Set());

  // ← NUEVO: Ejecuta detección de ubicación en background
  useUserLocation();

  // Params: Incluye lat/long si disponibles
  const params = useMemo<ExtendedFeedQueryParams | null>(() => {
    if (!ciudad) return null;
    const baseParams: ExtendedFeedQueryParams = {
      ciudad,
      departamento,
      preferencias,
      secciones,
      followedBusinessIds,
      limit: activeTab === "Para ti" ? 10 : 20,
      seenIds,
      userId: session?.user?.id || null,
      userLat: userLat ?? undefined,
      userLong: userLong ?? undefined,
    };
    return categoriaSlug ? { ...baseParams, categoriaSlug } : baseParams;
  }, [
    ciudad,
    departamento,
    preferencias,
    secciones,
    followedBusinessIds,
    activeTab,
    seenIds,
    session?.user?.id,
    categoriaSlug,
    userLat,
    userLong,
  ]);

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

  useEffect(() => {
    setActiveTab(getDefaultTabForContext(resolvedDiscoveryContext));
  }, [categoriaSlug, resolvedDiscoveryContext]);

  // Helpers (sin cambios)
  const getQueryKey = useCallback((type: string) => ([
    "feed-" + type,
    categoriaSlug || "global",
    ciudad || "sin-ciudad",
    departamento || "sin-departamento",
    session?.user?.id || "anon",
    userLat ?? "sin-lat",
    userLong ?? "sin-long",
    preferencias.join("|"),
    secciones.join("|"),
    followedBusinessIds.join("|"),
    activeTab === "Para ti" ? "for-you" : "single-tab",
    `cycle-${feedCycle}`,
  ] as const), [
    categoriaSlug,
    ciudad,
    departamento,
    session?.user?.id,
    userLat,
    userLong,
    preferencias,
    secciones,
    followedBusinessIds,
    activeTab,
    feedCycle,
  ]);

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

  type FlexibleQueryKey = ReturnType<typeof getQueryKey>;

  const publicationsQuery = useInfiniteQuery<FeedResponse, Error, InfiniteData<FeedResponse>, FlexibleQueryKey, string | undefined>({
    queryKey: getQueryKey('publicaciones'),
    queryFn: getQueryFn('publications'),
    enabled: !!params && (activeTab === "Para ti" || activeTab === "Publicaciones"),
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
    enabled: !!params && (activeTab === "Para ti" || activeTab === "Productos"),
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
    enabled: !!params && (activeTab === "Para ti" || activeTab === "Servicios"),
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
    enabled: !!params && (activeTab === "Para ti" || activeTab === "Negocios"),
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
    "Para ti": publicationsQuery,
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
    if (!inView) return;

    if (activeTab === "Para ti") {
      const nextCandidates = ([
        { label: "Publicaciones" as const, query: publicationsQuery },
        { label: "Productos" as const, query: productsQuery },
        { label: "Servicios" as const, query: servicesQuery },
        { label: "Negocios" as const, query: businessesQuery },
      ])
        .map((entry) => ({
          ...entry,
          itemCount: entry.query.data?.pages.flatMap((page) => page.items).length ?? 0,
        }))
        .filter((entry) => entry.query.hasNextPage && !entry.query.isFetchingNextPage)
        .sort((a, b) => a.itemCount - b.itemCount);

      if (nextCandidates.length > 0) {
        void nextCandidates[0].query.fetchNextPage();
      }
      return;
    }

    const currentQuery = queries[activeTab];
    if (currentQuery.hasNextPage && !currentQuery.isFetchingNextPage) {
      void currentQuery.fetchNextPage();
    }
  }, [activeTab, businessesQuery, inView, productsQuery, publicationsQuery, queries, servicesQuery]);

  useEffect(() => {
    if (activeTab === "Para ti") {
      const failedSections = ([
        ["publicaciones", publicationsQuery.error],
        ["productos", productsQuery.error],
        ["servicios", servicesQuery.error],
        ["negocios", businessesQuery.error],
      ] as const).filter(([, error]) => !!error);

      if (failedSections.length > 0) {
        const contexto = categoriaNombre || 'global';
        toast.error(
          `Algunas secciones del feed en ${contexto} no cargaron correctamente.`, 
          {
            action: {
              label: 'Reintentar',
              onClick: () => {
                failedSections.forEach(([section]) => {
                  if (section === "publicaciones") void publicationsQuery.refetch();
                  if (section === "productos") void productsQuery.refetch();
                  if (section === "servicios") void servicesQuery.refetch();
                  if (section === "negocios") void businessesQuery.refetch();
                });
              },
            },
          }
        );
      }
      return;
    }

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
  }, [activeTab, businessesQuery, categoriaNombre, productsQuery, publicationsQuery, queries, servicesQuery]);

  const getItemsForQuery = useCallback((tab: Exclude<FeedTab, "Para ti">): FeedItem[] => {
    const query = queries[tab];
    const allItems = query.data?.pages.flatMap((page) => page.items) || [];
    
    if (process.env.NODE_ENV === "development") {
      console.log(`📊 getItemsForTab(${tab}): FlatMap ${allItems.length} items from ${query.data?.pages.length || 0} pages`);
    }
    
    const uniqueItems = dedupeFeedItems(allItems);
    
    if (process.env.NODE_ENV === "development") {
      console.log(`📊 getItemsForTab(${tab}): After dedup ${uniqueItems.length} items`);
    }
    
    return uniqueItems;
  }, [queries]);

  const getItemsForTab = useCallback((tab: FeedTab): FeedItem[] => {
    if (tab === "Para ti") {
      const allItems = [
        ...getItemsForQuery("Publicaciones"),
        ...getItemsForQuery("Productos"),
        ...getItemsForQuery("Servicios"),
        ...getItemsForQuery("Negocios"),
      ];

      return buildDiscoveryFeed(allItems, resolvedDiscoveryContext);
    }

    return getItemsForQuery(tab);
  }, [getItemsForQuery, resolvedDiscoveryContext]);

  const markAsSeen = useCallback(() => {
    const currentItems = getItemsForTab(activeTab);
    const unseenItems = currentItems.filter((item) => {
      const prefixedId = buildSeenFeedId(item.type, item.id);
      return !seenIds.includes(prefixedId);
    });

    if (unseenItems.length === 0) return;

    unseenItems.forEach((item) => {
      addSeenId(buildSeenFeedId(item.type, item.id));
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`👁️ markAsSeen(${activeTab}): +${unseenItems.length} nuevos IDs (total: ${seenIds.length + unseenItems.length})`);
    }
  }, [activeTab, addSeenId, getItemsForTab, seenIds]);

  useEffect(() => {
    if (activeTab === "Para ti") {
      const hasAnyData = [
        publicationsQuery,
        productsQuery,
        servicesQuery,
        businessesQuery,
      ].some((query) => query.isSuccess && (query.data?.pages.length ?? 0) > 0);

      if (hasAnyData) {
        markAsSeen();
      }
      return;
    }

    const currentQuery = queries[activeTab];
    if (currentQuery.isSuccess && currentQuery.data?.pages.length > 0) {
      markAsSeen();
    }
  }, [activeTab, businessesQuery, markAsSeen, productsQuery, publicationsQuery, queries, servicesQuery]);

  const items = getItemsForTab(activeTab);
  const recycleScopeKey = `${categoriaSlug || "global"}:${activeTab}`;
  const seenIdsForCurrentScope = useMemo(() => {
    switch (activeTab) {
      case "Publicaciones":
        return extractSeenRawIds(seenIds, "publications").length;
      case "Productos":
        return extractSeenRawIds(seenIds, "products").length;
      case "Servicios":
        return extractSeenRawIds(seenIds, "services").length;
      case "Negocios":
        return extractSeenRawIds(seenIds, "businesses").length;
      case "Para ti":
      default:
        return seenIds.length;
    }
  }, [activeTab, seenIds]);
  const hasMore = activeTab === "Para ti"
    ? Boolean(
        publicationsQuery.hasNextPage ||
        productsQuery.hasNextPage ||
        servicesQuery.hasNextPage ||
        businessesQuery.hasNextPage
      )
    : Boolean(queries[activeTab].hasNextPage);
  const isLoadingNext = activeTab === "Para ti"
    ? Boolean(
        publicationsQuery.isFetchingNextPage ||
        productsQuery.isFetchingNextPage ||
        servicesQuery.isFetchingNextPage ||
        businessesQuery.isFetchingNextPage
      )
    : queries[activeTab].isFetchingNextPage;
  const isLoading = !params || (
    activeTab === "Para ti"
      ? (
          (publicationsQuery.isPending || productsQuery.isPending || servicesQuery.isPending || businessesQuery.isPending) &&
          items.length === 0
        )
      : (
          queries[activeTab].isPending ||
          (queries[activeTab].isFetching && items.length === 0)
        )
  );

  useEffect(() => {
    if (items.length > 0) {
      recycledFeedKeysRef.current.delete(recycleScopeKey);
    }
  }, [items.length, recycleScopeKey]);

  useEffect(() => {
    if (isLoading || isLoadingNext || hasMore || items.length > 0) return;
    if (seenIdsForCurrentScope === 0) return;
    if (recycledFeedKeysRef.current.has(recycleScopeKey)) return;

    recycledFeedKeysRef.current.add(recycleScopeKey);
    resetSeenIds();
    setFeedCycle((current) => current + 1);

    toast.info(
      activeTab === "Para ti"
        ? "Volvimos a cargar el contenido disponible para que sigas explorando."
        : `Reiniciamos ${activeTab.toLowerCase()} para mostrarte de nuevo el contenido disponible.`
    );
  }, [
    activeTab,
    hasMore,
    isLoading,
    isLoadingNext,
    items.length,
    recycleScopeKey,
    resetSeenIds,
    seenIdsForCurrentScope,
  ]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <CircularProgress />
        <p className="mt-4 text-gray-600 text-sm">
          {categoriaNombre 
            ? `Cargando ${activeTab === "Para ti" ? "tu feed inteligente" : activeTab.toLowerCase()} en ${categoriaNombre}...` 
            : !ciudad 
            ? 'Estamos preparando un feed personalizado para ti...' 
            : activeTab === "Para ti"
            ? 'Cargando tu feed inteligente...'
            : `Cargando tu feed de ${activeTab.toLowerCase()}...`}
        </p>
      </div>
    );
  }

  return (
    <div className="p-0 w-full mx-auto ">
      <FeedRenderer
        items={items}
        hasMore={hasMore}
        isLoadingNext={isLoadingNext}
        sentinelRef={sentinelRef}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        discoveryContext={resolvedDiscoveryContext}
        categoriaSlug={categoriaSlug}
        categoriaNombre={categoriaNombre}
        categoriaIconName={categoriaIconName}
        ciudad={ciudad}
      />
    </div>
  );
}
