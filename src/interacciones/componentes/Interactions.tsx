"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHeart, FaComment, FaShare } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { postInteraccionPublicacion } from "@/publicaciones/actions/postInteraccionPublicacion";
import Link from "next/link";
import { usePublicacionModalStore } from "@/store/publicacionModal/publicacionModalStore";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { ReaccionTipo } from "@prisma/client";

interface SummaryData {
  numLikes: number;
  numComentarios: number;
  numCompartidos: number;
  userReaction: ReaccionTipo | null; // Solo LIKE o null
}

interface InteractionsProps {
  publicacionId: string;
  slug?: string;
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

const Interactions: React.FC<InteractionsProps> = ({ publicacionId, slug }) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const userId = session?.user?.id;

  const { isModalOpen, modalPublicacionId, openModal, updatedComments, updatedNumComentarios, addComment, updateComment, incrementNumComentarios } = usePublicacionModalStore();

  const [newComment, setNewComment] = useState("");
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);

  const summaryKey = `/api/summary/${publicacionId}${userId ? `?userId=${userId}` : ''}`;
  const { data: summaryData, mutate: mutateSummary, isLoading: isLoadingSummary } = useSWR<SummaryData>(summaryKey, fetcher, {
    keepPreviousData: true,
    errorRetryCount: 3,
  });

  const numLikes = summaryData?.numLikes ?? 0;
  const numComentarios = (summaryData?.numComentarios ?? 0) + (updatedNumComentarios[publicacionId] || 0);
  const numCompartidos = summaryData?.numCompartidos ?? 0;
  const hasLiked = summaryData?.userReaction === "LIKE";

  const isInModal = isModalOpen && modalPublicacionId === publicacionId;

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

  const handleLike = useCallback(async () => {
  if (!isAuthenticated) return;
  const previousLiked = hasLiked;
  const optimisticNumLikes = hasLiked ? numLikes - 1 : numLikes + 1;
  const optimisticReaction = hasLiked ? null : ReaccionTipo.LIKE;  // Usa ReaccionTipo.LIKE para consistencia (equivalente a "LIKE")
  mutateSummary(
    {
      numLikes: optimisticNumLikes,
      numComentarios: summaryData?.numComentarios ?? 0,
      numCompartidos: summaryData?.numCompartidos ?? 0,
      userReaction: optimisticReaction,
    },
    { revalidate: false }
  );

  try {
    const result = await postInteraccionPublicacion({ publicacionId, slug, tipo: "REACCION", reaccionTipo: hasLiked ? null : ReaccionTipo.LIKE });  // Usa ReaccionTipo.LIKE aquí también
    if (!result.ok) throw new Error(result.message);
    mutateSummary(
      (current: SummaryData | undefined) => ({
        numLikes: result.newNumLikes ?? current?.numLikes ?? 0,
        numComentarios: current?.numComentarios ?? 0,
        numCompartidos: current?.numCompartidos ?? 0,
        userReaction: result.newUserReaction ?? null,  // Agrega ?? null para manejar undefined
      }),
      { revalidate: false }
    );
  } catch (error) {
    mutateSummary(
      (current: SummaryData | undefined) => ({
        numLikes: previousLiked ? (current?.numLikes ?? 0) + 1 : (current?.numLikes ?? 0) - 1,
        numComentarios: current?.numComentarios ?? 0,
        numCompartidos: current?.numCompartidos ?? 0,
        userReaction: previousLiked ? ReaccionTipo.LIKE : null,  // Usa ReaccionTipo.LIKE para consistencia
      }),
      { revalidate: false }
    );
    console.warn("Error en like:", error);
  }
}, [isAuthenticated, publicacionId, slug, hasLiked, numLikes, summaryData, mutateSummary]);

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
      mutateSummary();
      mutateComments();
    } catch (error) {
      setLocalComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      console.warn("Error en comentario:", error);
    }
  }, [isAuthenticated, newComment, publicacionId, slug, userId, session, addComment, incrementNumComentarios, updateComment, mutateSummary, mutateComments]);

  const handleShare = useCallback(async () => {
    if (!isAuthenticated) return;

    mutateSummary(
      {
        numLikes: summaryData?.numLikes ?? 0,
        numComentarios: summaryData?.numComentarios ?? 0,
        numCompartidos: numCompartidos + 1,
        userReaction: summaryData?.userReaction ?? null,
      },
      { revalidate: false }
    );

    try {
      const result = await postInteraccionPublicacion({ publicacionId, slug, tipo: "COMPARTIDO" });
      if (!result.ok) throw new Error(result.message);
      mutateSummary();
    } catch (error) {
      mutateSummary(
        {
          numLikes: summaryData?.numLikes ?? 0,
          numComentarios: summaryData?.numComentarios ?? 0,
          numCompartidos: numCompartidos - 1,
          userReaction: summaryData?.userReaction ?? null,
        },
        { revalidate: false }
      );
      console.warn("Error en compartir:", error);
    }
  }, [isAuthenticated, publicacionId, slug, numCompartidos, summaryData, mutateSummary]);

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
      <div className="flex items-center justify-between mb-4">
        {isLoadingSummary ? (
          <SummarySkeleton />
        ) : (
          <div className="flex items-center gap-2">
            {numLikes > 0 && (
              <motion.div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm text-gray-700">
                <FaHeart className="text-red-500" />
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

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLike}
            className={`flex items-center gap-2 ${hasLiked ? "text-red-500 font-semibold" : "text-gray-600 hover:text-red-500"}`}
            aria-label={hasLiked ? "Quitar me gusta" : "Me gusta"}
          >
            <FaHeart />
            <span>{hasLiked ? "Me gusta" : "Me gusta"}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openModal(publicacionId)}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-500"
            aria-label="Comentar"
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