"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { ShowTestimonioPublicacion } from "@/publicaciones/componentes/ShowTestimonioPublicacion";
import { SocialMediaCarousel } from "@/publicaciones/componentes/SocialMediaPublicacion";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import { usePublicacionModalStore } from "@/store/publicacionModal/publicacionModalStore";

interface PublicationModalProps {
  isOpen: boolean;
  publication: EnhancedPublicacion | null;
  onClose: () => void;
}

const componentMap: Record<string, React.FC<{ publicacion: EnhancedPublicacion }>> = {
  TESTIMONIO: ShowTestimonioPublicacion,
  CARRUSEL_IMAGENES: SocialMediaCarousel,
};

const PublicationModal: React.FC<PublicationModalProps> = ({ isOpen, publication, onClose }) => {
  const { closeModal, updatedComments } = usePublicacionModalStore();

  const handleClose = useCallback(() => {
    onClose();
    closeModal();
  }, [onClose, closeModal]);

  // Combinar comentarios de la publicación con los actualizados del store
  const allComments = useMemo(() => {
    if (!publication) return [];
    const commentsFromStore = updatedComments[publication.id] || [];
    const initialComments = publication.comments || [];
    // Combinar y eliminar duplicados por id
    const combined = [...commentsFromStore, ...initialComments];
    const uniqueComments = Array.from(new Map(combined.map((c) => [c.id, c])).values());
    // Ordenar por createdAt descendente
    return uniqueComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [publication, updatedComments]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, handleClose]);

  if (!isOpen || !publication) return null;

  const Component = componentMap[publication.tipo] || ShowTestimonioPublicacion;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200 z-10"
              aria-label="Cerrar modal"
            >
              <FaTimes size={20} />
            </button>
            <div className="p-6 max-h-[80vh] overflow-y-auto modal-content">
              <h2 className="text-xl font-bold mb-4">{publication.titulo || "Publicación"}</h2>
              <Component publicacion={{ ...publication, comments: allComments }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.getElementById("modal-root") || document.body
  );
};

export default PublicationModal;