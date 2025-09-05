"use client";

import { usePreferencesStore } from "@/store/preferences/preferences-store";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getFollowedBusinesses } from "../actions/getFollowedBusinesses";
import { FeedItem, FeedQueryParams, FeedResponse } from "../feed.interfaces";
import { useInfiniteQuery } from '@tanstack/react-query';
import { getFeedData } from "../actions/getFeedData";
import { InfiniteData } from "@tanstack/react-query";
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';
import FeedRenderer from "@/publicaciones/componentes/FeedRederer";

export default function FeedComponent() {
  const { data: session } = useSession();
  const { ciudad, departamento, preferencias, secciones, seenIds, addSeenId, resetSeenIds } = usePreferencesStore();
  const [followedBusinessIds, setFollowedBusinessIds] = useState<string[]>([]);

  // Memoiza params para estabilidad (intacta)
  const params = useMemo(() => {
    if (!ciudad) return null;
    return {
      ciudad,
      departamento,
      preferencias,
      secciones,
      followedBusinessIds,
      page: 1,
      limit: 20,
      seenIds,
    };
  }, [ciudad, departamento, preferencias, secciones, followedBusinessIds, seenIds]);

  // Carga follows (intacta)
  useEffect(() => {
    async function loadFollows() {
      if (session?.user?.id) {
        try {
          const { followedBusinessIds: ids } = await getFollowedBusinesses();
          setFollowedBusinessIds(ids || []);
        } catch (error) {
          console.error("Error al cargar follows:", error);
          setFollowedBusinessIds([]);
          toast.error('Error al cargar negocios seguidos. Intenta de nuevo.');
        }
      }
    }
    loadFollows();
  }, [session]);

  // Infinite Query (intacta, con caching)
  const { 
    data, 
    isPending, 
    error, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery<
    FeedResponse, 
    Error, 
    InfiniteData<FeedResponse>, 
    [string, FeedQueryParams | null], 
    FeedQueryParams["cursor"] | undefined
  >({
    queryKey: ['feed', params],
    queryFn: async ({ pageParam }) => {
      if (!params) throw new Error("Params no listos");
      return getFeedData({ ...params, cursor: pageParam });
    },
    enabled: !!params,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Prefetching (intacta)
  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Errores (intacta)
  useEffect(() => {
    if (error) {
      toast.error(`Error al cargar feed: ${error.message}. Intenta refrescar.`);
    }
  }, [error]);

  // Items flattened con fix: unique por ID (evita duplicados y key errors)
  const items = useMemo(() => {
    const uniqueMap = new Map<string, FeedItem>();
    data?.pages.flatMap(page => page.items).forEach(item => {
      if (item && !uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });
    return Array.from(uniqueMap.values());
  }, [data]);

  const hasMore = hasNextPage ?? false;

  // Auto-add seenIds (intacta, callback estable)
  const markAsSeen = useCallback(() => {
    items.forEach(item => addSeenId(item.id));
  }, [items, addSeenId]);

  useEffect(() => {
    markAsSeen();
  }, [markAsSeen]);

  if (isPending) return <p className="text-center text-gray-600 py-8">Cargando tu feed personalizado...</p>;

  return (
    <div className="p-4 max-w-screen-xl mx-auto sm:mt-40">
      <FeedRenderer 
        items={items} 
        hasMore={hasMore} 
        isLoadingNext={isFetchingNextPage} 
        sentinelRef={sentinelRef} 
      />
    </div>
  );
}