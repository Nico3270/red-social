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

interface InteractionsProps {
  publicacionId: string;
  slug?: string;
  numLikes: number;
  numComentarios: number;
  numCompartidos: number;
  userReaction: { id: string; tipo: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY" } | null;
  comments: Array<{
    id: string;
    contenido: string;
    createdAt: string;
    usuario: {
      id: string;
      nombre: string;
      apellido: string;
      fotoPerfil?: string;
      username?: string;
    };
  }>;
  isAuthenticated?: boolean;
  onInteraction?: (
    type: "COMENTARIO" | "REACCION" | "COMPARTIDO",
    data: { reaction?: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY"; comment?: string }
  ) => void;
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

const Interactions: React.FC<InteractionsProps> = ({
  publicacionId,
  slug,
  numLikes,
  numComentarios,
  numCompartidos,
  userReaction,
  comments,
  
  onInteraction,
}) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [likes, setLikes] = useState(numLikes);
  const [currentReaction, setCurrentReaction] = useState(userReaction?.tipo || null);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const { isModalOpen, updatedComments, updatedNumComentarios, openModal, addComment, updateComment, incrementNumComentarios } = usePublicacionModalStore();
  const [numComentariosLocal, setNumComentariosLocal] = useState(numComentarios); // Estado local para contador
  const [loadedComments, setLoadedComments] = useState(comments ?? []);
  const [localComments, setLocalComments] = useState(comments ?? []);
  const [newComment, setNewComment] = useState("");
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [skip, setSkip] = useState(comments?.length || 0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  // Manejar clics fuera del menú de reacciones
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        reactionMenuRef.current &&
        event.target instanceof Node &&
        !reactionMenuRef.current.contains(event.target)
      ) {
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

  // Sincronizar localComments con loadedComments y updatedComments
  useEffect(() => {
    const commentsFromStore = updatedComments[publicacionId] || [];
    const combined = [...commentsFromStore, ...loadedComments];
    const uniqueComments = Array.from(new Map(combined.map((c) => [c.id, c])).values());
    setLocalComments(
      uniqueComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  }, [loadedComments, updatedComments, publicacionId]);

  // Sincronizar numComentariosLocal con updatedNumComentarios
  useEffect(() => {
    const storeNum = updatedNumComentarios[publicacionId];
    if (storeNum !== undefined) {
      setNumComentariosLocal(storeNum);
    }
  }, [updatedNumComentarios, publicacionId]);

  // Función para cargar más comentarios desde la API
  const loadMoreComments = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/comentarios/${publicacionId}?skip=${skip}&take=5`);
      const data = await response.json();
      if (data.ok) {
        const newComments = data.comentarios;
        setLoadedComments((prev) => [...prev, ...newComments]);
        setSkip((prev) => prev + newComments.length);
        setHasMore(newComments.length === 5); // Si devuelve menos de 5, no hay más
      } else {
        console.error(data.message);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error al cargar más comentarios:", error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [publicacionId, skip, hasMore, isLoadingMore]);

  // Configurar IntersectionObserver para detectar el final del scroll
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreComments();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(observerRef.current);

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [loadMoreComments, hasMore]);

  // Manejar el clic en "Me gusta" o reacción
  const handleReaction = useCallback(
    async (reaction: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY") => {
      if (!isAuthenticated || !session?.user?.id) {
        console.warn("Debes iniciar sesión para reaccionar");
        return;
      }

      const previousReaction = currentReaction;
      const previousLikes = likes;

      setCurrentReaction(reaction);
      setLikes(previousReaction ? likes : likes + 1);
      setShowReactionMenu(false);
      setIsLongPressing(false);

      try {
        const result = await postInteraccionPublicacion({
          publicacionId,
          slug,
          tipo: "REACCION",
          reaccionTipo: reaction,
        });

        if (!result.ok) {
          throw new Error(result.message);
        }
        onInteraction?.("REACCION", { reaction });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("El usuario ya dio LIKE a esta publicación")
        ) {
          await handleRemoveReaction();
        } else {
          setCurrentReaction(previousReaction);
          setLikes(previousLikes);
          setShowReactionMenu(false);
          setIsLongPressing(false);
          console.warn("Error al guardar reacción:", error);
        }
      }
    },
    [isAuthenticated, session?.user?.id, publicacionId, slug, currentReaction, likes, onInteraction]
  );

  // Manejar quitar reacción
  const handleRemoveReaction = useCallback(async () => {
    if (!isAuthenticated || !session?.user?.id) {
      console.warn("Debes iniciar sesión para quitar la reacción");
      return;
    }

    const previousReaction = currentReaction;
    const previousLikes = likes;

    setCurrentReaction(null);
    setLikes(likes - 1);
    setShowReactionMenu(false);
    setIsLongPressing(false);

    try {
      const result = await postInteraccionPublicacion({
        publicacionId,
        slug,
        tipo: "REACCION",
        reaccionTipo: null,
      });

      if (!result.ok) {
        throw new Error(result.message);
      }
      onInteraction?.("REACCION", { reaction: undefined });
    } catch (error) {
      setCurrentReaction(previousReaction);
      setLikes(previousLikes);
      setShowReactionMenu(false);
      setIsLongPressing(false);
      console.warn("Error al eliminar reacción:", error);
    }
  }, [isAuthenticated, session?.user?.id, publicacionId, slug, currentReaction, likes, onInteraction]);

  // Mostrar menú de reacciones al mantener presionado
  const handleLongPressStart = useCallback(() => {
    if (!isAuthenticated || !session?.user?.id) {
      console.warn("Debes iniciar sesión para reaccionar");
      return;
    }

    setIsLongPressing(true);
    reactionTimeoutRef.current = setTimeout(() => {
      setShowReactionMenu(true);
    }, 400);
  }, [isAuthenticated, session?.user?.id]);

  // Cancelar el temporizador y manejar LIKE
  const handleLongPressEnd = useCallback(() => {
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current);
    }
    if (!isLongPressing && !showReactionMenu) {
      if (currentReaction) {
        handleRemoveReaction();
      } else {
        handleReaction("LIKE");
      }
    }
    setIsLongPressing(false);
  }, [isLongPressing, showReactionMenu, currentReaction, handleReaction, handleRemoveReaction]);

  // Manejar nuevo comentario
  const handleCommentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isAuthenticated || !session?.user?.id || !newComment.trim()) return;

      const nameParts = session.user.name?.split(" ") || ["Usuario"];
      const optimisticComment = {
        id: `temp-${Date.now()}`,
        contenido: newComment,
        createdAt: new Date().toISOString(),
        usuario: {
          id: session.user.id,
          nombre: nameParts[0],
          apellido: nameParts[1] || "",
          username: `${nameParts[0].toLowerCase()}${nameParts[1]?.toLowerCase() || ""}` || "user",
          fotoPerfil: session.user.image || "/default-profile.png",
        },
      };

      // Actualización optimista
      setLocalComments([optimisticComment, ...localComments]);
      addComment(publicacionId, optimisticComment);
      incrementNumComentarios(publicacionId); // Incrementar contador en store
      setNumComentariosLocal((prev) => prev + 1); // Incrementar local
      setNewComment("");

      try {
        const result = await postInteraccionPublicacion({
          publicacionId,
          slug,
          tipo: "COMENTARIO",
          contenido: newComment,
        });

        if (!result.ok) {
          throw new Error(result.message);
        }

        // Actualizar comentario con datos reales
        const realComment = {
          id: result.id!,
          contenido: newComment,
          createdAt: result.createdAt!.toISOString(),
          usuario: {
            id: session.user.id,
            nombre: result.usuarioNombre || "Usuario",
            apellido: result.usuarioApellido || "",
            username: result.usuarioUsername || `${(result.usuarioNombre || "usuario").toLowerCase()}${result.usuarioApellido?.toLowerCase() || ""}`,
            fotoPerfil: result.usuarioFotoPerfil,
          },
        };

        setLocalComments((prev) =>
          prev.map((c) => (c.id === optimisticComment.id ? realComment : c)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
        updateComment(publicacionId, optimisticComment.id, realComment);
        onInteraction?.("COMENTARIO", { comment: newComment });
      } catch (error) {
        // Revertir en caso de error
        setLocalComments(localComments.filter((c) => c.id !== optimisticComment.id));
        addComment(publicacionId, optimisticComment); // Revertir también en el store
        incrementNumComentarios(publicacionId); // Revertir incremento (decrementar)
        setNumComentariosLocal((prev) => prev - 1);
        console.warn("Error al guardar comentario:", error);
      }
    },
    [isAuthenticated, session?.user, publicacionId, slug, localComments, newComment, onInteraction]
  );

  // Manejar compartir
  const handleShare = useCallback(async () => {
    if (!isAuthenticated || !session?.user?.id) {
      console.warn("Debes iniciar sesión para compartir");
      return;
    }

    try {
      const result = await postInteraccionPublicacion({
        publicacionId,
        slug,
        tipo: "COMPARTIDO",
      });

      if (!result.ok) {
        throw new Error(result.message);
      }
      onInteraction?.("COMPARTIDO", {});
    } catch (error) {
      console.warn("Error al compartir:", error);
    }
  }, [isAuthenticated, session?.user?.id, publicacionId, slug, onInteraction]);

  return (
    <div className="w-full p-4 pt-6 border-t border-gray-100">
      {/* Resumen de interacciones */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {likes > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm text-gray-700"
            >
              <div className="flex items-center gap-1">
                {likes > 0 && <motion.span>{reactionIcons.LIKE}</motion.span>}
                {likes > 1 && <motion.span>{reactionIcons.LOVE}</motion.span>}
                {likes > 2 && <motion.span>{reactionIcons.WOW}</motion.span>}
              </div>
              <span>{likes}</span>
            </motion.div>
          )}
          {numComentariosLocal > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm text-gray-700"
            >
              <FaComment className="text-blue-500" />
              <span>{numComentariosLocal}</span> // Usar el estado local actualizado
            </motion.div>
          )}
        </div>
        {numCompartidos > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 text-sm text-gray-700"
          >
            <FaShare className="text-green-500" />
            <span>{numCompartidos}</span>
          </motion.div>
        )}
      </div>

      {/* Botones de interacción */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <motion.div className="relative" ref={reactionMenuRef}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
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
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute -top-16 left-0 mt-2 flex gap-2 bg-white rounded-full shadow-xl p-3 z-50 border border-gray-200"
                >
                  {(["LIKE", "LOVE", "WOW", "SAD", "ANGRY"] as const).map((reaction) => (
                    <motion.button
                      key={reaction}
                      whileHover={{ scale: 1.3, rotate: 10 }}
                      whileTap={{ scale: 0.9 }}
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
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => document.getElementById(`comment-input-${publicacionId}`)?.focus()}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-500"
            aria-label="Comentar"
          >
            <FaComment />
            <span>Comentar</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
            className="flex items-center gap-2 text-gray-600 hover:text-green-500"
            aria-label="Compartir"
          >
            <FaShare />
            <span>Compartir</span>
          </motion.button>
        </div>
      </div>

      {/* Lista de comentarios */}
      {localComments.length > 0 && (
        <div className="mb-2">
          {isModalOpen ? (
            // En modal: Mostrar todos
            localComments.map((comment) => (
              <div key={comment.id} className="flex gap-3 mb-1">
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src={comment.usuario.fotoPerfil || "/default-profile.png"}
                    alt={`Foto de perfil de ${comment.usuario.username || comment.usuario.nombre}`}
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
                    <p className="text-sm text-gray-700">{comment.contenido}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.createdAt), { locale: es, addSuffix: true })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            // En feed: Mostrar máximo 3
            localComments.slice(0, 3).map((comment) => (
              <div key={comment.id} className="flex gap-3 mb-1">
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src={comment.usuario.fotoPerfil || "/default-profile.png"}
                    alt={`Foto de perfil de ${comment.usuario.username || comment.usuario.nombre}`}
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
                    <p className="text-sm text-gray-700">{comment.contenido}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.createdAt), { locale: es, addSuffix: true })}
                  </span>
                </div>
              </div>
            ))
          )}
          {!isModalOpen && localComments.length > 3 && (
            <button
              onClick={() => openModal(publicacionId)}
              className="text-sm text-blue-500 hover:underline"
              aria-label="Ver más comentarios"
            >
              Ver más comentarios
            </button>
          )}
          {/* Indicador de carga y referencia para IntersectionObserver */}
          {hasMore && (
            <div ref={observerRef} className="mt-4">
              {isLoadingMore && <p className="text-sm text-gray-500">Cargando más comentarios...</p>}
            </div>
          )}
        </div>
      )}

      {/* Campo para nuevo comentario */}
      {isAuthenticated && (
        <form onSubmit={handleCommentSubmit} className="flex gap-2">
          <div className="relative w-8 h-8 rounded-full overflow-hidden">
            <Image
              src={session?.user?.image || "/default-profile.png"}
              alt="Foto de perfil del usuario"
              fill
              className="object-cover"
            />
          </div>
          <input
            id={`comment-input-${publicacionId}`}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onFocus={() => openModal(publicacionId)}
            placeholder="Escribe un comentario..."
            className="flex-1 p-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Escribe un comentario"
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            type="submit"
            className="text-blue-500"
            aria-label="Enviar comentario"
          >
            Enviar
          </motion.button>
        </form>
      )}
    </div>
  );
};

export default Interactions;