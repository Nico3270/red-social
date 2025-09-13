"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { FaHeart, FaComment,  } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { postInteraccionPublicacion } from "@/publicaciones/actions/postInteraccionPublicacion";
import Link from "next/link";
import useSWRInfinite, { SWRInfiniteKeyLoader } from "swr/infinite";
import { ReaccionTipo } from "@prisma/client";
import { usePublicacionModalStore } from "@/store/publicacionModal/publicacionModalStore";

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
  // numCompartidos: initialCompartidos,
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
    // updatedCompartidos,
    // updateCompartidos,
  } = usePublicacionModalStore();

  // Estados locales inicializados con SSR (SIN CAMBIOS)
  const [localLikes, setLocalLikes] = useState(initialLikes);
  const [localComentarios, setLocalComentarios] = useState(initialComentarios);
  // const [localCompartidos, setLocalCompartidos] = useState(initialCompartidos);
  const [localReaction, setLocalReaction] = useState(initialReaction);
  const [localComments, setLocalComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [hasMore, setHasMore] = useState(initialComentarios > initialComments.length);
  const observerRef = useRef<HTMLDivElement>(null);

  // REMOVIDO: SWR para summary (redundante ahora con props de EnhancedPublicacion)
  // En su lugar, effective values usan solo props + store (más simple y eficiente)

  // Extraer expresiones complejas para dependencias estáticas
  const updatedLikesForId = updatedLikes[publicacionId];
  const updatedNumComentariosForId = updatedNumComentarios[publicacionId];
  // const updatedCompartidosForId = updatedCompartidos[publicacionId];
  const updatedUserReactionForId = updatedUserReaction[publicacionId];
  const updatedCommentsForId = updatedComments[publicacionId];

  // Effective values simplificados: Props + store override en modal (SIN SWR)
  const effectiveLikes = useMemo(
    () => isInModal ? (updatedLikesForId ?? localLikes) : localLikes,
    [isInModal, updatedLikesForId, localLikes]
  );
  const effectiveComentarios = useMemo(
    () => isInModal ? (updatedNumComentariosForId ?? localComentarios) : localComentarios,
    [isInModal, updatedNumComentariosForId, localComentarios]
  );
  // const effectiveCompartidos = useMemo(
  //   () => isInModal ? (updatedCompartidosForId ?? localCompartidos) : localCompartidos,
  //   [isInModal, updatedCompartidosForId, localCompartidos]
  // );
  const effectiveReaction = useMemo(
    () => isInModal ? (updatedUserReactionForId ?? localReaction) : localReaction,
    [isInModal, updatedUserReactionForId, localReaction]
  );

  // SWRInfinite para comentarios en modal (MANTENIDO: Solo para paginación lazy)
  const getCommentsKey: SWRInfiniteKeyLoader = (pageIndex: number, previousPageData?: CommentsPage) => {
    if (!isInModal) return null;
    if (previousPageData && !previousPageData.comentarios?.length) return null;
    return `/api/comentarios/${publicacionId}?skip=${pageIndex * 10}&take=10`;
  };
  const infiniteConfig = {
    initialSize: 1,
    revalidateOnFocus: false,
    revalidateIfStale: false,
  };
  const infiniteHook = useSWRInfinite<CommentsPage>(getCommentsKey, fetcher, infiniteConfig);
  const commentsPages = infiniteHook.data;
  const infiniteSetSize = infiniteHook.setSize;
  const infiniteIsLoadingComments = infiniteHook.isLoading;
  const infiniteMutateComments = infiniteHook.mutate;

  // Merge comments en modal (SIN CAMBIOS)
  useEffect(() => {
    if (isInModal && commentsPages) {
      const fetchedComments = commentsPages.flatMap((page) => page.comentarios || []);
      const storeComments = updatedCommentsForId || [];
      const allComments = [...fetchedComments, ...storeComments, ...initialComments];
      const uniqueComments = Array.from(new Map(allComments.map((c) => [c.id, c])).values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLocalComments(uniqueComments);
      setHasMore(commentsPages[commentsPages.length - 1]?.comentarios?.length === 10);
    }
  }, [commentsPages, isInModal, updatedCommentsForId, publicacionId, initialComments, updatedComments]);

  // Observer paginación en modal (SIN CAMBIOS)
  useEffect(() => {
    if (!isInModal || !hasMore || !observerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !infiniteIsLoadingComments) {
          infiniteSetSize((prevSize) => prevSize + 1);
        }
      },
      { threshold: 1.0 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [isInModal, hasMore, infiniteIsLoadingComments, infiniteSetSize]);

  // Sincronizar store con estados locales incluso fuera del modal (para updates post-modal)
  useEffect(() => {
    if (!isInModal) {
      if (updatedLikesForId !== undefined && updatedLikesForId !== localLikes) {
        setLocalLikes(updatedLikesForId);
      }
      if (updatedNumComentariosForId !== undefined && updatedNumComentariosForId !== localComentarios) {
        setLocalComentarios(updatedNumComentariosForId);
      }
      if (updatedUserReactionForId !== undefined && updatedUserReactionForId !== localReaction) {
        setLocalReaction(updatedUserReactionForId);
      }
      if (updatedCommentsForId && updatedCommentsForId.length > 0) {
        // Mergear comentarios del store con locales, similar al effect de merge en modal
        const allComments = [...localComments, ...updatedCommentsForId];
        const uniqueComments = Array.from(new Map(allComments.map((c) => [c.id, c])).values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Opcional: Comparar si cambió (simple check de longitud y primer/último id)
        if (uniqueComments.length !== localComments.length ||
            (uniqueComments.length > 0 && uniqueComments[0].id !== localComments[0]?.id)) {
          setLocalComments(uniqueComments);
        }
      }
      // Opcional: Limpiar el store después de sincronizar, si no quieres persistir indefinidamente
      // Por ejemplo, si el store tiene métodos para reset:
      // updateLikes(publicacionId, undefined);
      // updateNumComentarios(publicacionId, undefined);
      // updateUserReaction(publicacionId, undefined);
      // updatedComments[publicacionId] = []; // o usa un setter si existe
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isInModal,
    updatedLikesForId,
    updatedNumComentariosForId,
    updatedUserReactionForId,
    updatedCommentsForId,
  ]);

  // Handle Like (SIMPLIFICADO: Removido mutateSummary, ya que no hay SWR)
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

    try {
      const result = await postInteraccionPublicacion({
        publicacionId,
        slug,
        tipo: "REACCION",
        reaccionTipo: hasLiked ? null : ReaccionTipo.LIKE,
      });
      if (!result.ok) throw new Error(result.message);
      // REMOVIDO: mutateSummary (no needed)
    } catch (error) {
      setLocalLikes(effectiveLikes);
      setLocalReaction(effectiveReaction);
      if (isInModal) {
        updateLikes(publicacionId, effectiveLikes);
        updateUserReaction(publicacionId, effectiveReaction);
      }
      console.warn("Error en like:", error);
    }
  }, [
    isAuthenticated,
    publicacionId,
    slug,
    effectiveLikes,
    effectiveReaction,
    isInModal,
    updateLikes,
    updateUserReaction,
  ]);

  // Handle Comment (SIMPLIFICADO: Removido mutateSummary)
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

        // REMOVIDO: mutateSummary (no needed)
        if (isInModal) {
          infiniteMutateComments(); // Mantenido para revalidar comentarios
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
      infiniteMutateComments,
    ]
  );

  // Handle Share (SIMPLIFICADO: Removido mutateSummary)
  // const handleShare = useCallback(async () => {
  //   if (!isAuthenticated) return;
  //   const optimisticCompartidos = effectiveCompartidos + 1;

  //   setLocalCompartidos(optimisticCompartidos);
  //   if (isInModal) updateCompartidos(publicacionId, optimisticCompartidos);

  //   try {
  //     const result = await postInteraccionPublicacion({ publicacionId, slug, tipo: "COMPARTIDO" });
  //     if (!result.ok) throw new Error(result.message);
  //     // REMOVIDO: mutateSummary
  //   } catch (error) {
  //     setLocalCompartidos(effectiveCompartidos);
  //     if (isInModal) updateCompartidos(publicacionId, effectiveCompartidos);
  //     console.warn("Error en compartir:", error);
  //   }
  // }, [
  //   isAuthenticated,
  //   publicacionId,
  //   slug,
  //   effectiveCompartidos,
  //   isInModal,
  //   updateCompartidos,
  // ]);

  // Skeletons (SIN CAMBIOS)
  const CommentSkeleton = () => (
    <div className="flex gap-3 mb-1 animate-pulse">
      <div className="w-8 h-8 bg-gray-200 rounded-full" />
      <div className="flex-1 bg-gray-200 rounded-lg p-2 h-16" />
    </div>
  );

  const hasLiked = effectiveReaction === ReaccionTipo.LIKE;

  return (
    <div className="w-full p-4 pt-2 border-t border-gray-100">
      {/* Contadores (SIMPLIFICADO: Sin loading de summary, usa props directas) */}
      <div className="flex items-center justify-between mb-4">
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
          {/* {effectiveCompartidos > 0 && (
            <motion.div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm text-gray-700">
              <FaShare className="text-green-500" />
              <span>{effectiveCompartidos}</span>
            </motion.div>
          )} */}
        </div>
      </div>

      {/* Botones, Form Comment, Lista Comments (SIN CAMBIOS) */}
      {/* ... (resto del return idéntico al original, sin referencias a summaryData o mutateSummary) */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-8 md:gap-6">
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

          {/* <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="flex items-center gap-2 text-gray-600 hover:text-green-500"
            aria-label="Compartir"
          >
            <FaShare />
            <span>Compartir</span>
          </motion.button> */}
        </div>
      </div>

      {/* Form Comment */}
      {isAuthenticated && (
        <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-4">
          <div className="relative w-8 h-8 rounded-full overflow-hidden">
            <Image
              src={ "default-profile.png"}
              alt="Tu foto de perfil"
              unoptimized={true}
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
            className="flex-1 p-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
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
          localComments.slice(0, isInModal ? undefined : 1).map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex gap-3 mb-4 last:mb-0"
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden ring-1 ring-gray-200 ring-opacity-50 hover:ring-gray-300 transition-all">
                <Image
                  src={comment.usuario.fotoPerfil || "/default-profile.png"}
                  alt={`${comment.usuario.nombre} ${comment.usuario.apellido}`}
                  fill
                  className="object-cover"
                  unoptimized={true}
                />
              </div>
              <div className="flex-1">
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                  <Link
                    href={`/perfil/${comment.usuario.id}`}
                    className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {comment.usuario.nombre} {comment.usuario.apellido}
                  </Link>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">{comment.contenido}</p>
                </div>
                <span className="text-xs text-gray-400 block mt-2 font-light">
                  {formatDistanceToNow(new Date(comment.createdAt), { locale: es, addSuffix: true })}
                </span>
              </div>
            </motion.div>
          ))
        ) : null}
        {!isInModal && effectiveComentarios > 1 && (
          <button
            onClick={onOpenModal}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors mt-2"
            aria-label="Ver todos los comentarios"
          >
            Ver más comentarios ({effectiveComentarios - 1})
          </button>
        )}
        {isInModal && hasMore && (
          <div ref={observerRef} className="mt-4">
            {infiniteIsLoadingComments && <p className="text-sm text-gray-400 font-light">Cargando más comentarios...</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Interactions;