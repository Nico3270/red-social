// src/components/follow/FollowButton.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheck, FaTimes, FaUserPlus, FaUserCheck, FaUserTimes, FaSignInAlt } from "react-icons/fa";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import clsx from "clsx";
import { checkIsFollowing, toggleFollow } from "../actions/toggleFollow";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
  followedId: string; // ID del negocio o usuario a seguir
  type: "USER_TO_BUSINESS" | "BUSINESS_TO_USER" | "USER_TO_USER"; // Del enum
  className?: string;
  version?: 1 | 2; // Nueva prop opcional, default 1
}

export const FollowButton: React.FC<FollowButtonProps> = ({ followedId, type, className, version = 1 }) => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoverUnfollow, setHoverUnfollow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Query para verificar si el usuario sigue al target
  const { data: isFollowing = false, isLoading } = useQuery({
    queryKey: ['isFollowing', followedId, session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return false;
      return checkIsFollowing({ followerId: session.user.id, followedId, type });
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation para toggle follow (optimistic update)
  const mutation = useMutation({
    mutationFn: () => toggleFollow({ followedId, type }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['isFollowing', followedId, session?.user?.id] });
      const previous = isFollowing;
      queryClient.setQueryData(['isFollowing', followedId, session?.user?.id], !isFollowing);
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['isFollowing', followedId, session?.user?.id], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing', followedId, session?.user?.id] });
    },
  });

  const handleClick = () => {
    if (status !== "authenticated") {
      setIsModalOpen(true);
      return;
    }
    mutation.mutate();
  };

  // Soporte para touch en mobile (fallback para hover)
  const handleTouchStart = () => isFollowing && setHoverUnfollow(true);
  const handleTouchEnd = () => setHoverUnfollow(false);

  return (
    <>
      <button
        onClick={handleClick}
        onMouseEnter={() => isFollowing && setHoverUnfollow(true)}
        onMouseLeave={() => setHoverUnfollow(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={isLoading || mutation.isPending}
        className={clsx(
          "rounded-full font-medium text-sm transition-all duration-300 flex items-center justify-center shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          version === 1 ? "px-4 py-2 min-w-[120px]" : "p-2 w-8 h-8",
          isFollowing
            ? hoverUnfollow
              ? "bg-red-100 text-red-600 hover:bg-red-200"
              : "bg-green-500 text-white hover:bg-green-600"
            : "bg-blue-600 text-white hover:bg-blue-700",
          className
        )}
        aria-label={isFollowing ? (hoverUnfollow ? "Dejar de seguir" : "Siguiendo") : "Seguir"}
      >
        <AnimatePresence mode="wait">
          {version === 1 ? (
            // Versión 1: Con texto (tal como estaba)
            isFollowing ? (
              hoverUnfollow ? (
                <motion.span
                  key="unfollow"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1"
                >
                  <FaTimes size={14} /> Dejar de seguir
                </motion.span>
              ) : (
                <motion.span
                  key="following"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1"
                >
                  <FaCheck size={14} /> Siguiendo
                </motion.span>
              )
            ) : (
              <motion.span
                key="follow"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                Seguir
              </motion.span>
            )
          ) : (
            // Versión 2: Solo iconos (tu estilo implementado)
            <motion.span
              key={
                isFollowing
                  ? hoverUnfollow
                    ? "unfollow-icon"
                    : "following-icon"
                  : "follow-icon"
              }
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              {isFollowing ? (
                hoverUnfollow ? (
                  // 🔴 Estado hover unfollow → icono user con X
                  <FaUserTimes size={18} />
                ) : (
                  // 🟢 Estado siguiendo → icono user con check
                  <FaUserCheck size={18} />
                )
              ) : (
                // 🔵 Estado no siguiendo → icono user con +
                <FaUserPlus size={18} />
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Modal para no autenticados (mismo que antes, pero con estilos responsivos) */}
      {mounted && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold mb-4 text-gray-800 text-center">Inicia sesión para interactuar</h2>
                <p className="text-gray-800 mb-4">
                  Para seguir un perfil, debes estar autenticado. ¡Es un proceso sencillo y rápido!
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-red-800 text-gray-200 rounded-lg hover:bg-red-500 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => router.push(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  >
                    <FaSignInAlt />
                    Iniciar sesión
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};