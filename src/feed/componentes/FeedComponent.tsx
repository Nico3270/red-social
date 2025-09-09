"use client";

import { usePreferencesStore } from "@/store/preferences/preferences-store";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getFollowedBusinesses } from "../actions/getFollowedBusinesses";
import { FeedItem, FeedQueryParams, FeedResponse } from "../feed.interfaces";
import { useInfiniteQuery } from '@tanstack/react-query';
import { getFeedDataByType } from "../actions/getFeedData";
import { InfiniteData } from "@tanstack/react-query";
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';
import FeedRenderer from "@/publicaciones/componentes/FeedRederer";


export default function FeedComponent() {
  const { data: session } = useSession();
  const { ciudad, departamento, preferencias, secciones, seenIds, addSeenId } = usePreferencesStore();
  const [followedBusinessIds, setFollowedBusinessIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"Publicaciones" | "Productos" | "Servicios" | "Negocios">("Publicaciones"); // Español

  // Params
  const params = useMemo<FeedQueryParams | null>(() => {
    if (!ciudad) return null;
    return {
      ciudad,
      departamento,
      preferencias,
      secciones,
      followedBusinessIds,
      limit: 20,
      seenIds,
    };
  }, [ciudad, departamento, preferencias, secciones, followedBusinessIds, seenIds]);

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

 

  const publicationsQuery = useInfiniteQuery<FeedResponse, Error, InfiniteData<FeedResponse>, [string, FeedQueryParams | null], string | undefined>({
    queryKey: ['feed-publicaciones', params],
    queryFn: async ({ pageParam }) => {
      if (!params) throw new Error("Params no listos");
      return getFeedDataByType("publications", { ...params, cursor: pageParam });
    },
    enabled: !!params,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const productsQuery = useInfiniteQuery<FeedResponse, Error, InfiniteData<FeedResponse>, [string, FeedQueryParams | null], string | undefined>({
    queryKey: ['feed-productos', params],
    queryFn: async ({ pageParam }) => {
      if (!params) throw new Error("Params no listos");
      return getFeedDataByType("products", { ...params, cursor: pageParam });
    },
    enabled: !!params && activeTab === "Productos",
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const servicesQuery = useInfiniteQuery<FeedResponse, Error, InfiniteData<FeedResponse>, [string, FeedQueryParams | null], string | undefined>({
    queryKey: ['feed-servicios', params],
    queryFn: async ({ pageParam }) => {
      if (!params) throw new Error("Params no listos");
      return getFeedDataByType("services", { ...params, cursor: pageParam });
    },
    enabled: !!params && activeTab === "Servicios",
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const businessesQuery = useInfiniteQuery<FeedResponse, Error, InfiniteData<FeedResponse>, [string, FeedQueryParams | null], string | undefined>({
    queryKey: ['feed-negocios', params],
    queryFn: async ({ pageParam }) => {
      if (!params) throw new Error("Params no listos");
      return getFeedDataByType("businesses", { ...params, cursor: pageParam });
    },
    enabled: !!params && activeTab === "Negocios",
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Queries mapeadas
  const queries = {
    Publicaciones: publicationsQuery,
    Productos: productsQuery,
    Servicios: servicesQuery,
    Negocios: businessesQuery,
  };

  // Sentinel
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

  // Errores
  useEffect(() => {
    const currentQuery = queries[activeTab];
    if (currentQuery.error) {
      toast.error(`Error al cargar ${activeTab}: ${currentQuery.error.message}. Intenta refrescar.`);
    }
  }, [activeTab, queries]);

  // Items por tab
  const getItemsForTab = useCallback((tab: typeof activeTab): FeedItem[] => {
    const query = queries[tab];
    const uniqueMap = new Map<string, FeedItem>();
    query.data?.pages.flatMap((page) => page.items).forEach((item) => {
      if (item && !uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });
    return Array.from(uniqueMap.values());
  }, [queries]);

  // SeenIds
  const markAsSeen = useCallback(() => {
    getItemsForTab(activeTab).forEach((item) => addSeenId(item.id));
  }, [activeTab, addSeenId, getItemsForTab]);

  useEffect(() => {
    markAsSeen();
  }, [markAsSeen]);

  // Pending
  if (publicationsQuery.isPending) return <p className="text-center text-gray-600 py-8">Cargando tu feed personalizado...</p>;

  return (
    <div className="p-2 w-full mx-auto sm:mt-40">
      <FeedRenderer
        items={getItemsForTab(activeTab)}
        hasMore={queries[activeTab].hasNextPage ?? false}
        isLoadingNext={queries[activeTab].isFetchingNextPage}
        sentinelRef={sentinelRef}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}