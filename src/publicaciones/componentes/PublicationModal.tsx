"use client";

import React, { useCallback, useEffect, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { PublicacionSencilla } from "../interfaces/publicacionSencilla.interface";

// Lazy imports para romper ciclos
const LazyShowTestimonioPublicacion = lazy(() => import("@/publicaciones/componentes/ShowTestimonioPublicacion"));
const LazySocialMediaCarousel = lazy(() => import("@/publicaciones/componentes/SocialMediaPublicacion"));

interface PublicationModalProps {
  isOpen: boolean;
  publication: PublicacionSencilla | null;
  onClose: () => void;
}

const PublicationModal: React.FC<PublicationModalProps> = ({ isOpen, publication, onClose }) => {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

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

  // componentMap con lazy components
  const componentMap: Record<string, React.LazyExoticComponent<React.FC<{ publicacion: PublicacionSencilla; isInModal?: boolean }>>> = {
    TESTIMONIO: LazyShowTestimonioPublicacion,
    CARRUSEL_IMAGENES: LazySocialMediaCarousel,
  };

  const Component = componentMap[publication.tipo] || LazyShowTestimonioPublicacion;

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
            className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 md:max-w-4xl" // Responsive: wider en desktop
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
              <Suspense fallback={<div className="flex justify-center items-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}>
                <Component publicacion={publication} isInModal={true} /> {/* Pasa isInModal=true */}
              </Suspense>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.getElementById("modal-root") || document.body
  );
};

export default PublicationModal;