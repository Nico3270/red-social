"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Typography,
  Badge,
  Box,
  IconButton,
} from "@mui/material";
import { styled } from "@mui/system";
import { InfoOutlined as InfoIcon } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import { FaHandPointer } from "react-icons/fa";

interface Section {
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  url: string;
  habilitado: boolean;
  alertCount?: number;
}

interface Props {
  sections: Section[];
}

// Estilo de card premium: minimalista, como Apple (sombras suaves, bordes redondeados, fondo neutro)
const StyledCard = styled(Card)(() => ({
  borderRadius: "16px", // Bordes suaves y modernos
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)", // Sombra sutil para profundidad premium
  backgroundColor: "#FFFFFF", // Blanco puro para elegancia
  transition: "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), box-shadow 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)", // Transición fluida como iOS
  cursor: "pointer", // Indica interactividad
  overflow: "hidden", // Evita desbordes
  position: "relative", // Para posicionar el botón Info
  "&:hover": {
    transform: "translateY(-4px)", // Elevación ligera en hover para feedback táctil
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.08)", // Sombra más pronunciada en interacción
  },
  "&.disabled": {
    opacity: 0.65,
    pointerEvents: "none",
    boxShadow: "none",
    cursor: "default",
  },
}));

const DashboardSections: React.FC<Props> = ({ sections }) => {
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  const handleOpenModal = (section: Section, event: React.MouseEvent) => {
  event.preventDefault();   // Evita la navegación del Link
  event.stopPropagation();  // Evita que el click burbujee
  if (section.habilitado) {
    setSelectedSection(section);
  }
};

  const handleCloseModal = () => {
    setSelectedSection(null);
  };

  const handleCardClick = (section: Section) => {
    if (section.habilitado) {
      // La redirección se maneja vía Link, pero aquí podrías agregar lógica extra si es needed
    }
  };

  return (
    <>
      {/* Grid responsive: 2 cols mobile, 3 sm, 6 lg para compacto y escalable */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {sections.map((section, index) => (
          <Link key={index} href={section.habilitado ? section.url : "#"} passHref>
            <StyledCard
              className={section.habilitado ? "" : "disabled"}
              onClick={() => handleCardClick(section)} // Maneja click en card para redirección (Link lo hace automático)
            >
              {/* Botón Info en esquina superior derecha, con z-index elevado y mejoras de visibilidad */}
              <IconButton
                onClick={(e) => handleOpenModal(section, e)}
                disabled={!section.habilitado}
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 20, // Z-index más alto para prioridad absoluta sobre la card
                  backgroundColor: section.habilitado ? "rgba(76, 175, 80, 0.15)" : "rgba(0, 0, 0, 0.1)", // Fondo verde sutil semi-transparente para visibilidad
                  color: section.habilitado ? "#4CAF50" : "#9E9E9E", // Verde premium para icono
                  width: 36, // Agrandado ligeramente para mejor touch-target
                  height: 36,
                  fontSize: "1.1rem",
                  boxShadow: section.habilitado 
                    ? "0 2px 4px rgba(76, 175, 80, 0.25)" // Sombra sutil verde para efecto premium
                    : "none",
                  "&:hover": {
                    backgroundColor: "rgba(76, 175, 80, 0.25)", // Intensifica el verde en hover
                    transform: "scale(1.05)", // Escala ligera para feedback
                    boxShadow: "0 2px 4px rgba(76, 175, 80, 0.35)", // Sombra verde más pronunciada en interacción
                  },
                }}
                aria-label={`Información sobre ${section.titulo}`}
              >
                <InfoIcon fontSize="small" />
              </IconButton>

              {/* Contenido compacto: padding reducido, centrado perfecto */}
              <CardContent className="flex flex-col items-center justify-center text-center p-4 pb-6 space-y-2">
                <Badge
                  badgeContent={section.alertCount}
                  color="error"
                  invisible={!section.alertCount}
                  anchorOrigin={{ vertical: "top", horizontal: "left" }} // Badge en esquina opuesta para balance
                  sx={{
                    "& .MuiBadge-badge": {
                      top: 8,
                      left: 8,
                      fontSize: "0.65rem",
                      minWidth: 16,
                      height: 16,
                    },
                  }}
                >
                  {/* Icono escalable: más grande en lg, pero compacto */}
                  <Box className="text-4xl md:text-5xl mb-2" sx={{ color: section.habilitado ? "#333" : "#9E9E9E" }}>
                    {section.icono}
                  </Box>
                </Badge>

                <Typography
                  variant="subtitle2" // Más compacto que subtitle1
                  className="font-semibold tracking-tight"
                  color={section.habilitado ? "textPrimary" : "textSecondary"}
                >
                  {section.titulo}
                </Typography>

                {!section.habilitado && (
                  <Typography variant="caption" color="error" className="text-xs italic">
                    Deshabilitado
                  </Typography>
                )}
              </CardContent>
            </StyledCard>
          </Link>
        ))}
      </div>

      {/* Modal animado: sin cambios, como solicitaste */}
      <AnimatePresence>
        {selectedSection && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed inset-0 flex items-center justify-center z-50"
          >
            {/* Fondo semitransparente */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={handleCloseModal}
            />

            {/* Contenedor modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              {/* Botón cerrar */}
              <button
                onClick={handleCloseModal}
                className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-md"
              >
                ✕
              </button>

              {/* Título */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-center text-lg font-semibold text-gray-900">
                  {selectedSection.titulo}
                </h2>
              </div>

              {/* Contenido */}
              <div className="p-6 text-center text-gray-700 leading-relaxed">
                <p>{selectedSection.descripcion}</p>
              </div>

              {/* Botón acción */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-center">
                <Link href={selectedSection.url} passHref>
                  <button
                    onClick={handleCloseModal}
                    className="flex items-center gap-2 px-6 py-2 rounded-full bg-gray-900 text-white font-medium shadow hover:bg-gray-800 transition-transform transform hover:scale-105"
                  >
                    <span>Ir a la sección</span>
                    <FaHandPointer size={18} />
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardSections;