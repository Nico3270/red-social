"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { FaHeart, FaComment, FaShare } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import Image from "next/image";
import { postInteraccionPublicacion } from "../actions/postInteraccionPublicacion";
import { Comment } from "../interfaces/publicaciones.interface";


interface PostInteractionsProps {
  publicacionId: string;
  slug: string;
  numLikes: number;
  numComentarios: number;
  numCompartidos: number;
  comentarios: Comment[];
  isLiked: boolean;
}

export const PostInteractions = ({
  publicacionId,
  slug,
  numLikes,
  numComentarios,
  numCompartidos,
  comentarios,
  isLiked: initialIsLiked,
}: PostInteractionsProps) => {
  const { data: session } = useSession();
  const [likes, setLikes] = useState(numLikes);
  const [numComments, setNumComments] = useState(numComentarios);
  const [shares, setShares] = useState(numCompartidos);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [commentsList, setCommentsList] = useState<Comment[]>(comentarios);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log({ publicacionId, slug });

  const handleLike = useCallback(async () => {
    if (!session?.user?.id) {
      setError("Debes iniciar sesión para dar like");
      return;
    }

    if (!publicacionId || !/^c[0-9a-z]{24}$/.test(publicacionId)) {
      setError("ID de publicación inválido o no tiene formato CUID");
      return;
    }

    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      setError("Slug de negocio inválido");
      return;
    }

    setIsLiking(true);
    const wasLiked = isLiked;
    setIsLiked(!isLiked);
    setLikes(wasLiked ? likes - 1 : likes + 1);

    try {
      const result = await postInteraccionPublicacion({
        publicacionId,
        slug,
        tipo: "REACCION",
        reaccionTipo: wasLiked ? null : "LIKE",
      });

      if (!result.ok) {
        throw new Error(result.message);
      }
      setError(null);
    } catch (error) {
      console.error("Error en like:", error);
      setIsLiked(wasLiked);
      setLikes(numLikes);
      setError(error instanceof Error ? error.message : "Error al procesar el like");
    } finally {
      setIsLiking(false);
    }
  }, [isLiked, likes, numLikes, publicacionId, slug, session]);

  const handleCommentSubmit = useCallback(async () => {
    if (!newComment.trim() || !session?.user?.id) {
      setError(!newComment.trim() ? "El comentario no puede estar vacío" : "Debes iniciar sesión para comentar");
      return;
    }

    if (!publicacionId || !/^c[0-9a-z]{24}$/.test(publicacionId)) {
      setError("ID de publicación inválido o no tiene formato CUID");
      return;
    }

    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      setError("Slug de negocio inválido");
      return;
    }

    setIsSubmitting(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      contenido: newComment,
      usuarioId: session.user.id,
      usuarioNombre: session.user.name,
      createdAt: new Date(),
      usuarioFotoPerfil: session.user.image ?? undefined,
    };

    setCommentsList([optimisticComment, ...commentsList]);
    setNumComments(numComments + 1);
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

      setCommentsList((prev) =>
        prev.map((comment) =>
          comment.id === tempId
            ? {
                ...comment,
                id: result.id!,
                createdAt: new Date(result.createdAt!),
                usuarioNombre: result.usuarioNombre!,
                usuarioFotoPerfil: result.usuarioFotoPerfil,
              }
            : comment
        )
      );
      setError(null);
    } catch (error) {
      console.error("Error en comentario:", error);
      setCommentsList((prev) => prev.filter((comment) => comment.id !== tempId));
      setNumComments(numComments);
      setError(error instanceof Error ? error.message : "Error al procesar el comentario");
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, numComments, commentsList, publicacionId, slug, session]);

  const handleShare = useCallback(async () => {
    if (!session?.user?.id) {
      setError("Debes iniciar sesión para compartir");
      return;
    }

    if (!publicacionId || !/^c[0-9a-z]{24}$/.test(publicacionId)) {
      setError("ID de publicación inválido o no tiene formato CUID");
      return;
    }

    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
      setError("Slug de negocio inválido");
      return;
    }

    const previousShares = shares;
    setShares(shares + 1);

    try {
      const result = await postInteraccionPublicacion({
        publicacionId,
        slug,
        tipo: "COMPARTIDO",
      });

      if (!result.ok) {
        throw new Error(result.message);
      }
      setError(null);
    } catch (error) {
      console.error("Error en compartir:", error);
      setShares(previousShares);
      setError(error instanceof Error ? error.message : "Error al compartir la publicación");
    }
  }, [shares, publicacionId, slug, session]);

  return (
    <div className="px-4 pt-2 pb-4 border-t border-gray-200">
      {/* Mostrar errores */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} className="mb-4">
          {error}
        </Alert>
      )}

      {/* Botones de interacción */}
      <div className="flex justify-between items-center mb-4">
        <IconButton
          onClick={handleLike}
          disabled={!session?.user?.id || isLiking}
          className={`text-red-500 hover:text-red-700 transition-colors ${isLiked ? "text-red-600" : ""}`}
        >
          {isLiking ? <CircularProgress size={20} /> : <FaHeart />}
          <span className="ml-2">{likes}</span>
        </IconButton>
        <IconButton className="text-blue-500 hover:text-blue-700 transition-colors">
          <FaComment />
          <span className="ml-2">{numComments}</span>
        </IconButton>
        <IconButton
          onClick={handleShare}
          disabled={!session?.user?.id}
          className="text-green-500 hover:text-green-700 transition-colors"
        >
          <FaShare />
          <span className="ml-2">{shares}</span>
        </IconButton>
      </div>

      {/* Lista de comentarios */}
      {commentsList.length > 0 && (
        <List className="mb-4">
          {commentsList.map((comment) => (
            <ListItem key={comment.id} className="py-1">
              <ListItemAvatar>
                <Avatar>
                  <Image
                    src={comment.usuarioFotoPerfil || "/default-avatar.png"}
                    alt={comment.usuarioNombre}
                    fill
                    className="object-cover"
                  />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="body2" className="font-semibold">
                    {comment.usuarioNombre}
                  </Typography>
                }
                secondaryTypographyProps={{ component: "span" }}
                secondary={
                  <>
                    <Typography component="span" variant="body2" className="text-gray-700">
                      {comment.contenido}
                    </Typography>
                    <Typography component="span" variant="caption" className="text-gray-500 block">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: es })}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Campo para nuevo comentario */}
      <div className="flex items-center gap-2">
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Escribe un comentario..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleCommentSubmit()}
          disabled={isSubmitting || !session?.user?.id}
          size="small"
        />
        {isSubmitting && <CircularProgress size={24} />}
      </div>
    </div>
  );
};