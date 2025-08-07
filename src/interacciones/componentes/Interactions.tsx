"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHeart, FaComment, FaShare, FaSmile, FaSadTear, FaAngry, FaThumbsUp } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { postInteraccionPublicacion } from "@/publicaciones/actions/postInteraccionPublicacion";
import Link from "next/link";
import { usePublicacionModalStore } from "@/store/publicacionModal/publicacionModalStore";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";

interface InteractionsProps {
  publicacionId: string;
  slug?: string;
}

const reactionIcons: Record<"LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY", JSX.Element> = {
  LIKE: <FaThumbsUp className="text-blue-500" />,
  LOVE: <FaHeart className="text-red-500" />,
  WOW: <FaSmile className="text-yellow-500" />,
  SAD: <FaSadTear className="text-blue-300" />,
  ANGRY: <FaAngry className="text-orange-500" />,
};

const reactionLabels: Record<"LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY", string> = {
  LIKE: "Me gusta",
  LOVE: "Me encanta",
  WOW: "Me sorprende",
  SAD: "Me entristece",
  ANGRY: "Me enoja",
};

// Fetcher para SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

const Interactions: React.FC<InteractionsProps> = ({ publicacionId, slug }) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const userId = session?.user?.id;

  const { isModalOpen, modalPublicacionId, openModal, updatedComments, updatedNumComentarios, addComment, updateComment, incrementNumComentarios } = usePublicacionModalStore();

  const [currentReaction, setCurrentReaction] = useState<"LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY" | null>(null);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [localComments, setLocalComments] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  // Fetch summary con SWR
  const summaryKey = `/api/summary/${publicacionId}${userId ? `?userId=${userId}` : ''}`;
  const { data: summaryData, mutate: mutateSummary, isLoading: isLoadingSummary } = useSWR(summaryKey, fetcher);

  const numLikes = summaryData?.numLikes ?? 0;
  const numComentarios = (summaryData?.numComentarios ?? 0) + (updatedNumComentarios[publicacionId] || 0);
  const numCompartidos = summaryData?.numCompartidos ?? 0;
  const reactionsByType = summaryData?.reactionsByType ?? { LIKE: 0, LOVE: 0, WOW: 0, SAD: 0, ANGRY: 0 };
  const userReactionTipo = summaryData?.userReaction ?? null;

  useEffect(() => {
    setCurrentReaction(userReactionTipo);
  }, [userReactionTipo]);

  // Modo modal check
  const isInModal = isModalOpen && modalPublicacionId === publicacionId;

  // Fetch comentarios en modal con SWRInfinite
  const getCommentsKey = (pageIndex: number, previousPageData: any) => {
    if (!isInModal || previousPageData && !previousPageData.comentarios.length) return null;
    return `/api/comentarios/${publicacionId}?skip=${pageIndex * 5}&take=5`;
  };

  const { data: commentsPages, size, setSize, isLoading: isLoadingComments, mutate: mutateComments } = useSWRInfinite(getCommentsKey, fetcher, {
    initialSize: 1,
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (isInModal && commentsPages) {
      const fetchedComments = commentsPages.flatMap((page) => page.comentarios || []);
      const commentsFromStore = updatedComments[publicacionId] || [];
      const combined = [...commentsFromStore, ...fetchedComments];
      const unique = Array.from(new Map(combined.map((c) => [c.id, c])).values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setLocalComments(unique);
      setHasMore(commentsPages[commentsPages.length - 1]?.comentarios?.length === 5);
    }
  }, [commentsPages, updatedComments, publicacionId, isInModal]);

  // Observer para load more en modal
  useEffect(() => {
    if (!observerRef.current || !hasMore || !isInModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingComments) {
          setSize((prev) => prev + 1);
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(observerRef.current);

    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, [hasMore, isLoadingComments, setSize, isInModal]);

  // Manejar clics fuera menú reacciones
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (reactionMenuRef.current && !reactionMenuRef.current.contains(event.target as Node)) {
        setShowReactionMenu(false);
        setIsLongPressing(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Handle reaction
  const handleReaction = useCallback(async (reaction: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY") => {
    if (!isAuthenticated) return;
    const previous = currentReaction;
    setCurrentReaction(reaction);
    setShowReactionMenu(false);
    setIsLongPressing(false);

    try {
      const result = await postInteraccionPublicacion({ publicacionId, slug, tipo: "REACCION", reaccionTipo: reaction });
      if (!result.ok) throw new Error(result.message);
      mutateSummary(); // Refresca conteos
    } catch (error) {
      setCurrentReaction(previous);
      console.warn("Error al guardar reacción:", error);
    }
  }, [isAuthenticated, publicacionId, slug, currentReaction, mutateSummary]);

  // Handle remove reaction
  const handleRemoveReaction = useCallback(async () => {
    if (!isAuthenticated) return;
    const previous = currentReaction;
    setCurrentReaction(null);
    setShowReactionMenu(false);
    setIsLongPressing(false);

    try {
      const result = await postInteraccionPublicacion({ publicacionId, slug, tipo: "REACCION", reaccionTipo: null });
      if (!result.ok) throw new Error(result.message);
      mutateSummary();
    } catch (error) {
      setCurrentReaction(previous);
      console.warn("Error al eliminar reacción:", error);
    }
  }, [isAuthenticated, publicacionId, slug, currentReaction, mutateSummary]);

  // Long-press
  const handleLongPressStart = useCallback(() => {
    if (!isAuthenticated) return;
    setIsLongPressing(true);
    reactionTimeoutRef.current = setTimeout(() => setShowReactionMenu(true), 400);
  }, [isAuthenticated]);

  const handleLongPressEnd = useCallback(() => {
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    if (!isLongPressing && !showReactionMenu) {
      if (currentReaction) handleRemoveReaction();
      else handleReaction("LIKE");
    }
    setIsLongPressing(false);
  }, [isLongPressing, showReactionMenu, currentReaction, handleRemoveReaction, handleReaction]);

  // Handle nuevo comentario (solo modal)
  const handleCommentSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !newComment.trim()) return;

    const optimisticComment = {
      id: `temp-${Date.now()}`,
      contenido: newComment,
      createdAt: new Date().toISOString(),
      usuario: {
        id: userId!,
        nombre: session?.user.name?.split(" ")?.[0] || "Usuario",
        apellido: session?.user.name?.split(" ")?.[1] || "",
        username: session?.user.name?.toLowerCase() || "user",
        fotoPerfil: session?.user.image || "/default-profile.png",
      },
    };

    setLocalComments((prev) => [optimisticComment, ...prev]);
    addComment(publicacionId, optimisticComment);
    incrementNumComentarios(publicacionId);
    setNewComment("");

    try {
      const result = await postInteraccionPublicacion({ publicacionId, slug, tipo: "COMENTARIO", contenido: newComment });
      if (!result.ok) throw new Error(result.message);

      const realComment = {
        id: result.id!,
        contenido: newComment,
        createdAt: result.createdAt!.toISOString(),
        usuario: {
          id: userId!,
          nombre: result.usuarioNombre || "Usuario",
          apellido: result.usuarioApellido || "",
          username: result.usuarioUsername || "user",
          fotoPerfil: result.usuarioFotoPerfil,
        },
      };

      setLocalComments((prev) =>
        prev.map((c) => (c.id === optimisticComment.id ? realComment : c)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
      updateComment(publicacionId, optimisticComment.id, realComment);
      mutateSummary(); // Refresca conteos
      mutateComments(); // Refresca paginados
    } catch (error) {
      setLocalComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      console.warn("Error al guardar comentario:", error);
    }
  }, [isAuthenticated, newComment, publicacionId, slug, userId, session, addComment, incrementNumComentarios, updateComment, mutateSummary, mutateComments]);

  // Handle compartir
  const handleShare = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const result = await postInteraccionPublicacion({ publicacionId, slug, tipo: "COMPARTIDO" });
      if (!result.ok) throw new Error(result.message);
      mutateSummary();
    } catch (error) {
      console.warn("Error al compartir:", error);
    }
  }, [isAuthenticated, publicacionId, slug, mutateSummary]);

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

  return (
    <div className="w-full p-4 pt-6 border-t border-gray-100">
      {/* Resumen (conteos) */}
      <div className="flex items-center justify-between mb-4">
        {isLoadingSummary ? (
          <SummarySkeleton />
        ) : (
          <div className="flex items-center gap-2">
            {numLikes > 0 && (
              <motion.div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm text-gray-700">
                <div className="flex items-center gap-1">
                  {Object.entries(reactionsByType).map(([type, count]) => (
                    (count as number) > 0 && (
                      <span key={type}>
                        {reactionIcons[type as keyof typeof reactionIcons]}
                      </span>
                    )
                  ))}
                </div>
                <span>{numLikes}</span>
              </motion.div>
            )}
            {numComentarios > 0 && (
              <motion.button
                onClick={() => openModal(publicacionId)}
                className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="Ver comentarios"
              >
                <FaComment className="text-blue-500" />
                <span>{numComentarios}</span>
              </motion.button>
            )}
            {numCompartidos > 0 && (
              <motion.div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm text-gray-700">
                <FaShare className="text-green-500" />
                <span>{numCompartidos}</span>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <motion.div className="relative" ref={reactionMenuRef}>
            <motion.button
              onMouseDown={handleLongPressStart}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={handleLongPressStart}
              onTouchEnd={handleLongPressEnd}
              className={`flex items-center gap-2 text-gray-600 hover:text-red-500 ${currentReaction ? "text-red-500 font-semibold" : ""}`}
              aria-label={currentReaction ? `Quitar ${reactionLabels[currentReaction]}` : "Reaccionar"}
            >
              {currentReaction ? reactionIcons[currentReaction] : <FaHeart />}
              <span>{currentReaction ? reactionLabels[currentReaction] : "Me gusta"}</span>
            </motion.button>

            <AnimatePresence>
              {showReactionMenu && (
                <motion.div
                  className="absolute -top-16 left-0 flex gap-2 bg-white rounded-full shadow-xl p-3 z-50 border border-gray-200"
                >
                  {(["LIKE", "LOVE", "WOW", "SAD", "ANGRY"] as const).map((reaction) => (
                    <motion.button
                      key={reaction}
                      onClick={() => handleReaction(reaction)}
                      className="text-2xl"
                      aria-label={`Reaccionar con ${reactionLabels[reaction]}`}
                    >
                      {reactionIcons[reaction]}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.button
            onClick={() => openModal(publicacionId)}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-500"
            aria-label="Comentar"
          >
            <FaComment />
            <span>Comentar</span>
          </motion.button>

          <motion.button
            onClick={handleShare}
            className="flex items-center gap-2 text-gray-600 hover:text-green-500"
            aria-label="Compartir"
          >
            <FaShare />
            <span>Compartir</span>
          </motion.button>
        </div>
      </div>

      {/* Input comentario (teaser en feed, activo en modal) */}
      {isAuthenticated && (
        <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-4">
          <div className="relative w-8 h-8 rounded-full overflow-hidden">
            <Image src={session?.user?.image || "/default-profile.png"} alt="Perfil" fill className="object-cover" />
          </div>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onFocus={() => {
              if (!isInModal) openModal(publicacionId);
            }}
            placeholder="Escribe un comentario..."
            className="flex-1 p-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Comentario"
            readOnly={!isInModal}
          />
          <motion.button type="submit" className="text-blue-500" disabled={!isInModal || !newComment.trim()} aria-label="Enviar">
            Enviar
          </motion.button>
        </form>
      )}

      {/* Comentarios (solo modal) */}
      {isInModal && (
        <div className="mb-2">
          {isLoadingComments ? (
            <>
              <CommentSkeleton />
              <CommentSkeleton />
              <CommentSkeleton />
            </>
          ) : (
            localComments.map((comment) => (
              <div key={comment.id} className="flex gap-3 mb-1">
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <Image src={comment.usuario.fotoPerfil || "/default-profile.png"} alt={comment.usuario.nombre} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-2">
                    <Link href={`/perfil/${comment.usuario.id}`} className="text-sm font-medium text-gray-900 hover:underline">
                      {comment.usuario.nombre} {comment.usuario.apellido}
                    </Link>
                    <p className="text-sm text-gray-700">{comment.contenido}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.createdAt), { locale: es, addSuffix: true })}
                  </span>
                </div>
              </div>
            ))
          )}
          {hasMore && (
            <div ref={observerRef} className="mt-4">
              {isLoadingComments && <p className="text-sm text-gray-500">Cargando más...</p>}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Interactions;