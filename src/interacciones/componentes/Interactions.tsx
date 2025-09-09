"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { FaHeart, FaComment, FaShare } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { postInteraccionPublicacion } from "@/publicaciones/actions/postInteraccionPublicacion";
import Link from "next/link";
import useSWR, { SWRConfiguration } from "swr";
import useSWRInfinite, { SWRInfiniteKeyLoader } from "swr/infinite";
import { ReaccionTipo } from "@prisma/client";
import { usePublicacionModalStore } from "@/store/publicacionModal/publicacionModalStore";

interface SummaryData {
  numLikes: number;
  numComentarios: number;
  numCompartidos: number;
  userReaction: ReaccionTipo | null; // Solo LIKE o null
}

interface CommentsPage {
  ok: boolean;
  comentarios: Comment[];
}

interface InteractionsProps {
  publicacionId: string;
  slug?: string;
  numLikes: number;
  numComentarios: number;
  numCompartidos: number;
  userReaction: ReaccionTipo | null;
  initialComments?: Comment[];
  onOpenModal: () => void;
  isInModal?: boolean;
}

interface Comment {
  id: string;
  contenido: string;
  createdAt: string;
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    username: string;
    fotoPerfil?: string;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const Interactions: React.FC<InteractionsProps> = ({
  publicacionId,
  slug,
  numLikes: initialLikes,
  numComentarios: initialComentarios,
  numCompartidos: initialCompartidos,
  userReaction: initialReaction,
  initialComments = [],
  onOpenModal,
  isInModal = false,
}) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const userId = session?.user?.id;
  const {
    updatedComments,
    updatedNumComentarios,
    addComment,
    incrementNumComentarios,
    decrementNumComentarios,
    removeComment,
    updatedLikes,
    updatedUserReaction,
    updateLikes,
    updateUserReaction,
    updatedCompartidos,
    updateCompartidos,
  } = usePublicacionModalStore();

  // Estados locales inicializados con SSR
  const [localLikes, setLocalLikes] = useState(initialLikes);
  const [localComentarios, setLocalComentarios] = useState(initialComentarios);
  const [localCompartidos, setLocalCompartidos] = useState(initialCompartidos);
  const [localReaction, setLocalReaction] = useState(initialReaction);
  const [localComments, setLocalComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [hasMore, setHasMore] = useState(initialComentarios > initialComments.length);
  const observerRef = useRef<HTMLDivElement>(null);

  // SWR para summary con config tipada
  const summaryKey = `/api/summary/${publicacionId}`;
  const swrConfig: SWRConfiguration<SummaryData, Error> = {
    keepPreviousData: true,
    revalidateOnFocus: false,
    revalidateIfStale: false,
  };
  const { data: summaryData, mutate: mutateSummary, isLoading: isLoadingSummary } = useSWR<SummaryData, Error>(
    summaryKey,
    fetcher,
    swrConfig
  );

  // Effective values con store override en modal
  const effectiveLikes = useMemo(
    () => isInModal ? (updatedLikes[publicacionId] ?? summaryData?.numLikes ?? localLikes) : localLikes,
    [isInModal, updatedLikes[publicacionId], summaryData?.numLikes, localLikes]
  );
  const effectiveComentarios = useMemo(
    () => isInModal ? (updatedNumComentarios[publicacionId] ?? summaryData?.numComentarios ?? localComentarios) : localComentarios,
    [isInModal, updatedNumComentarios[publicacionId], summaryData?.numComentarios, localComentarios]
  );
  const effectiveCompartidos = useMemo(
    () => isInModal ? (updatedCompartidos[publicacionId] ?? summaryData?.numCompartidos ?? localCompartidos) : localCompartidos,
    [isInModal, updatedCompartidos[publicacionId], summaryData?.numCompartidos, localCompartidos]
  );
  const effectiveReaction = useMemo(
    () => isInModal ? (updatedUserReaction[publicacionId] ?? summaryData?.userReaction ?? localReaction) : localReaction,
    [isInModal, updatedUserReaction[publicacionId], summaryData?.userReaction, localReaction]
  );

  // SWRInfinite CONDicional: Tipado preciso para retornos de SWR (Promise<T | undefined>)
  type InfiniteData = CommentsPage[] | undefined;
  type SetSizeFn = (size: number | ((prevSize: number) => number)) => Promise<InfiniteData>;
  type MutateFn = () => Promise<InfiniteData>;
  let commentsPages: InfiniteData = undefined;
  let infiniteSize: number = 0;
  let infiniteSetSize: SetSizeFn | (() => void) = () => {};
  let infiniteIsLoadingComments: boolean = false;
  let infiniteMutateComments: MutateFn | (() => Promise<void>) = async () => {};
  if (isInModal) {
    const getCommentsKey: SWRInfiniteKeyLoader = (pageIndex: number, previousPageData?: CommentsPage) => {
      if (previousPageData && !previousPageData.comentarios?.length) return null;
      return `/api/comentarios/${publicacionId}?skip=${pageIndex * 10}&take=10`;
    };
    const infiniteConfig = {
      initialSize: 1,
      revalidateOnFocus: false,
      revalidateIfStale: false,
    };
    const infiniteHook = useSWRInfinite<CommentsPage>(getCommentsKey, fetcher, infiniteConfig);
    commentsPages = infiniteHook.data;
    infiniteSize = infiniteHook.size;
    infiniteSetSize = infiniteHook.setSize; // Ahora tipado como Promise<InfiniteData>
    infiniteIsLoadingComments = infiniteHook.isLoading;
    infiniteMutateComments = infiniteHook.mutate; // Tipado como Promise<InfiniteData>
  }

  // Merge comments en modal
  useEffect(() => {
    if (isInModal && commentsPages) {
      const fetchedComments = commentsPages.flatMap((page) => page.comentarios || []);
      const storeComments = updatedComments[publicacionId] || [];
      const allComments = [...fetchedComments, ...storeComments, ...initialComments];
      const uniqueComments = Array.from(new Map(allComments.map((c) => [c.id, c])).values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLocalComments(uniqueComments);
      setHasMore(commentsPages[commentsPages.length - 1]?.comentarios?.length === 10);
    }
  }, [commentsPages, isInModal, updatedComments[publicacionId], publicacionId, initialComments]);

  // Observer paginación en modal (usa updater sin await)
  useEffect(() => {
    if (!isInModal || !hasMore || !observerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !infiniteIsLoadingComments) {
          infiniteSetSize((prevSize) => prevSize + 1); // Updater, ignora Promise
        }
      },
      { threshold: 1.0 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [isInModal, hasMore, infiniteIsLoadingComments, infiniteSetSize]);

  // Handle Like
  const handleLike = useCallback(async () => {
    if (!isAuthenticated) return;
    const hasLiked = effectiveReaction === ReaccionTipo.LIKE;
    const optimisticLikes = hasLiked ? effectiveLikes - 1 : effectiveLikes + 1;
    const optimisticReaction = hasLiked ? null : ReaccionTipo.LIKE;

    setLocalLikes(optimisticLikes);
    setLocalReaction(optimisticReaction);
    if (isInModal) {
      updateLikes(publicacionId, optimisticLikes);
      updateUserReaction(publicacionId, optimisticReaction);
    }

    mutateSummary(
      (current) => ({
        numLikes: optimisticLikes,
        numComentarios: current?.numComentarios ?? effectiveComentarios,
        numCompartidos: current?.numCompartidos ?? effectiveCompartidos,
        userReaction: optimisticReaction,
      } as SummaryData),
      { revalidate: false }
    );

    try {
      const result = await postInteraccionPublicacion({
        publicacionId,
        slug,
        tipo: "REACCION",
        reaccionTipo: hasLiked ? null : ReaccionTipo.LIKE,
      });
      if (!result.ok) throw new Error(result.message);
      mutateSummary();
    } catch (error) {
      setLocalLikes(effectiveLikes);
      setLocalReaction(effectiveReaction);
      if (isInModal) {
        updateLikes(publicacionId, effectiveLikes);
        updateUserReaction(publicacionId, effectiveReaction);
      }
      mutateSummary();
      console.warn("Error en like:", error);
    }
  }, [
    isAuthenticated,
    publicacionId,
    slug,
    effectiveLikes,
    effectiveComentarios,
    effectiveCompartidos,
    effectiveReaction,
    isInModal,
    updateLikes,
    updateUserReaction,
    mutateSummary,
  ]);

  // Handle Comment
  const handleCommentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isAuthenticated || !newComment.trim()) return;

      const optimisticId = `temp-${Date.now()}`;
      const optimisticComment: Comment = {
        id: optimisticId,
        contenido: newComment,
        createdAt: new Date().toISOString(),
        usuario: {
          id: userId!,
          nombre: (session?.user?.name?.split(" ")?.[0] ?? "Usuario") as string,
          apellido: (session?.user?.name?.split(" ")?.[1] ?? "") as string,
          username: (session?.user?.name?.toLowerCase() ?? "user") as string,
          fotoPerfil: session?.user?.image ?? "/default-profile.png",
        },
      };

      setLocalComments((prev) => [optimisticComment, ...prev]);
      setLocalComentarios((prev) => prev + 1);
      if (isInModal) {
        incrementNumComentarios(publicacionId);
        addComment(publicacionId, optimisticComment);
      }
      setNewComment("");

      try {
        const result = await postInteraccionPublicacion({
          publicacionId,
          slug,
          tipo: "COMENTARIO",
          contenido: newComment,
        });
        if (!result.ok) throw new Error(result.message);

        const realComment: Comment = {
          id: result.id!,
          contenido: newComment,
          createdAt: result.createdAt!.toISOString(),
          usuario: {
            id: userId!,
            nombre: result.usuarioNombre ?? "Usuario",
            apellido: result.usuarioApellido ?? "",
            username: result.usuarioUsername ?? "user",
            fotoPerfil: result.usuarioFotoPerfil ?? undefined,
          },
        };

        setLocalComments((prev) =>
          prev
            .map((c) => (c.id === optimisticId ? realComment : c))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
        if (isInModal) {
          removeComment(publicacionId, optimisticId);
          addComment(publicacionId, realComment);
        }

        mutateSummary();
        if (isInModal) {
          infiniteMutateComments(); // Ignora Promise, fire-and-forget
        }
      } catch (error) {
        setLocalComments((prev) => prev.filter((c) => c.id !== optimisticId));
        setLocalComentarios((prev) => prev - 1);
        if (isInModal) {
          decrementNumComentarios(publicacionId);
          removeComment(publicacionId, optimisticId);
        }
        console.warn("Error en comentario:", error);
      }
    },
    [
      isAuthenticated,
      newComment,
      publicacionId,
      slug,
      userId,
      session?.user?.name,
      session?.user?.image,
      isInModal,
      incrementNumComentarios,
      decrementNumComentarios,
      addComment,
      removeComment,
      mutateSummary,
      infiniteMutateComments,
    ]
  );

  // Handle Share
  const handleShare = useCallback(async () => {
    if (!isAuthenticated) return;
    const optimisticCompartidos = effectiveCompartidos + 1;

    setLocalCompartidos(optimisticCompartidos);
    if (isInModal) updateCompartidos(publicacionId, optimisticCompartidos);

    mutateSummary(
      (current) => ({
        numLikes: current?.numLikes ?? effectiveLikes,
        numComentarios: current?.numComentarios ?? effectiveComentarios,
        numCompartidos: optimisticCompartidos,
        userReaction: current?.userReaction ?? effectiveReaction,
      } as SummaryData),
      { revalidate: false }
    );

    try {
      const result = await postInteraccionPublicacion({ publicacionId, slug, tipo: "COMPARTIDO" });
      if (!result.ok) throw new Error(result.message);
      mutateSummary();
    } catch (error) {
      setLocalCompartidos(effectiveCompartidos);
      if (isInModal) updateCompartidos(publicacionId, effectiveCompartidos);
      mutateSummary();
      console.warn("Error en compartir:", error);
    }
  }, [
    isAuthenticated,
    publicacionId,
    slug,
    effectiveCompartidos,
    effectiveLikes,
    effectiveComentarios,
    effectiveReaction,
    isInModal,
    updateCompartidos,
    mutateSummary,
  ]);

  // Skeletons
  const SummarySkeleton = () => (
    <div className="flex items-center gap-2 animate-pulse">
      <div className="h-6 w-16 bg-gray-200 rounded-full" />
      <div className="h-6 w-16 bg-gray-200 rounded-full" />
    </div>
  );

  const CommentSkeleton = () => (
    <div className="flex gap-3 mb-1 animate-pulse">
      <div className="w-8 h-8 bg-gray-200 rounded-full" />
      <div className="flex-1 bg-gray-200 rounded-lg p-2 h-16" />
    </div>
  );

  const hasLiked = effectiveReaction === ReaccionTipo.LIKE;

  return (
    <div className="w-full p-4 pt-6 border-t border-gray-100">
      {/* Contadores */}
      <div className="flex items-center justify-between mb-4">
        {isLoadingSummary ? (
          <SummarySkeleton />
        ) : (
          <div className="flex items-center gap-2">
            {effectiveLikes > 0 && (
              <motion.div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm text-gray-700">
                <FaHeart className="text-red-500" />
                <span>{effectiveLikes}</span>
              </motion.div>
            )}
            {effectiveComentarios > 0 && (
              <motion.button
                onClick={!isInModal ? onOpenModal : undefined}
                className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="Ver comentarios"
                disabled={isInModal}
              >
                <FaComment className="text-blue-500" />
                <span>{effectiveComentarios}</span>
              </motion.button>
            )}
            {effectiveCompartidos > 0 && (
              <motion.div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm text-gray-700">
                <FaShare className="text-green-500" />
                <span>{effectiveCompartidos}</span>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 md:gap-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLike}
            className={`flex items-center gap-2 ${hasLiked ? "text-red-500 font-semibold" : "text-gray-600 hover:text-red-500"}`}
            aria-label={hasLiked ? "Quitar me gusta" : "Me gusta"}
          >
            <FaHeart />
            <span>Me gusta</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={!isInModal ? onOpenModal : undefined}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-500"
            aria-label="Comentar"
            disabled={isInModal}
          >
            <FaComment />
            <span>Comentar</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="flex items-center gap-2 text-gray-600 hover:text-green-500"
            aria-label="Compartir"
          >
            <FaShare />
            <span>Compartir</span>
          </motion.button>
        </div>
      </div>

      {/* Form Comment */}
      {isAuthenticated && (
        <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-4">
          <div className="relative w-8 h-8 rounded-full overflow-hidden">
            <Image
              src={session?.user?.image || "/default-profile.png"}
              alt="Tu perfil"
              fill
              className="object-cover"
            />
          </div>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onFocus={!isInModal ? onOpenModal : undefined}
            placeholder="Escribe un comentario..."
            className="flex-1 p-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Escribe un comentario"
          />
          <motion.button
            type="submit"
            className="text-blue-500 hover:text-blue-600"
            disabled={!newComment.trim()}
            aria-label="Enviar comentario"
          >
            Enviar
          </motion.button>
        </form>
      )}

      {/* Lista Comments */}
      <div className="mb-2">
        {infiniteIsLoadingComments ? (
          <>
            <CommentSkeleton />
            <CommentSkeleton />
          </>
        ) : localComments.length > 0 ? (
          localComments.slice(0, isInModal ? undefined : 3).map((comment) => (
            <div key={comment.id} className="flex gap-3 mb-1">
              <div className="relative w-8 h-8 rounded-full overflow-hidden">
                <Image
                  src={comment.usuario.fotoPerfil || "/default-profile.png"}
                  alt={`${comment.usuario.nombre} ${comment.usuario.apellido}`}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 rounded-lg p-2">
                  <Link
                    href={`/perfil/${comment.usuario.id}`}
                    className="text-sm font-medium text-gray-900 hover:underline"
                  >
                    {comment.usuario.nombre} {comment.usuario.apellido}
                  </Link>
                  <p className="text-sm text-gray-700 mt-1">{comment.contenido}</p>
                </div>
                <span className="text-xs text-gray-500 block mt-1">
                  {formatDistanceToNow(new Date(comment.createdAt), { locale: es, addSuffix: true })}
                </span>
              </div>
            </div>
          ))
        ) : null}
        {!isInModal && effectiveComentarios > 3 && (
          <button
            onClick={onOpenModal}
            className="text-sm text-blue-500 hover:underline mt-2"
            aria-label="Ver todos los comentarios"
          >
            Ver más comentarios ({effectiveComentarios - 3})
          </button>
        )}
        {isInModal && hasMore && (
          <div ref={observerRef} className="mt-4">
            {infiniteIsLoadingComments && <p className="text-sm text-gray-500">Cargando más comentarios...</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Interactions;