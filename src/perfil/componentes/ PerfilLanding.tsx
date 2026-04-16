// app/ui/components/landing-page/LandingPage.tsx

"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { InformacionInicialNegocio } from "@/ui/components/perfil-usuario-header/PerfilUsuarioHeader";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import { ServicioData } from "@/servicios/interfaces/servicios.interface";
import { ResumenPerfil } from "@/perfil/interfaces/resumenPerfil.interface";
import PublicacionesSection from "./PublicacionesSection";
import ProductosSection from "./ProductosSection";
import ServiciosSection from "./ServiciosSection";
import ResenasSection from "./ResenasSection";
import { BusinessGuideSection } from "./BusinessGuideSection";
import type { BusinessGuideResolvedPreset } from "@/perfil/guide/business-guide.types";

interface LandingPageProps {
  informacionNegocio: InformacionInicialNegocio;
  productos: ProductRedSocial[];
  publicaciones: EnhancedPublicacion[];
  resenas: EnhancedPublicacion[];
  servicios: ServicioData[];
  resumenPerfil: ResumenPerfil;
  onSelectTab: (tab: "Publicaciones" | "Productos" | "Negocio" | "Reseñas") => void;
  onExploreProducts: (selection: BusinessGuideResolvedPreset) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({
  informacionNegocio,
  productos = [],
  publicaciones = [],
  resenas = [],
  servicios = [],
  resumenPerfil,
  onSelectTab,
  onExploreProducts,
}) => {
  // Filtrar publicaciones para excluir reseñas (TESTIMONIO con producto)
  const publicacionesFiltradas = useMemo(() => {
    return publicaciones.filter(pub => !(pub.tipo === 'TESTIMONIO' && pub.producto));
  }, [publicaciones]);

  // Generar array dinámico de secciones con orden y isActive
  const sections = useMemo(() => {
    // Definir prioridades base para secciones
    const sectionPriorities: Record<string, number> = {
      servicios: (resumenPerfil.servicios ?? 0) > (resumenPerfil.productos ?? 0) ? 40 : 20,
      productos: (resumenPerfil.productos ?? 0) >= (resumenPerfil.servicios ?? 0) ? 30 : 10,
      resenas: 15,
      publicaciones: 5,
    };

    const sectionConfigs = [
      {
        id: "publicaciones",
        component: (
          <PublicacionesSection
            publicaciones={publicacionesFiltradas}
            onSelectTab={() => onSelectTab("Publicaciones")}
          />
        ),
        orden: (resumenPerfil.publicaciones ?? 0) + sectionPriorities.publicaciones,
        isActive: (resumenPerfil.publicaciones ?? 0) > 0,
      },
      {
        id: "productos",
        component: (
          <ProductosSection
            productos={productos}
            onSelectTab={() => onSelectTab("Productos")}
          />
        ),
        orden: (resumenPerfil.productos ?? 0) + sectionPriorities.productos,
        isActive: (resumenPerfil.productos ?? 0) > 0,
      },
      {
        id: "servicios",
        component: (
          <ServiciosSection
            servicios={servicios}
            onSelectTab={() => onSelectTab("Negocio")}
          />
        ),
        orden: (resumenPerfil.servicios ?? 0) + sectionPriorities.servicios,
        isActive: (resumenPerfil.servicios ?? 0) > 0,
      },
      {
        id: "resenas",
        component: (
          <ResenasSection
            resenas={resenas}
            onSelectTab={() => onSelectTab("Reseñas")}
          />
        ),
        orden: (resumenPerfil.reseñas ?? 0) + sectionPriorities.resenas,
        isActive: (resumenPerfil.reseñas ?? 0) > 0,
      },
    ];

    // Filtrar secciones activas y ordenar por orden descendente
    return sectionConfigs
      .filter((section) => section.isActive)
      .sort((a, b) => b.orden - a.orden);
  }, [resumenPerfil, productos, publicacionesFiltradas, servicios, resenas, onSelectTab]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full p-4 sm:p-6 space-y-6" // Apilado vertical con espaciado
    >
      <BusinessGuideSection
        business={informacionNegocio}
        products={productos}
        onExploreProducts={onExploreProducts}
      />

      {/* Secciones apiladas verticalmente, full width */}
      {sections.map((section, index) => (
        <motion.div
          key={section.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.2 }}
          className="w-full" // Máximo ancho, responsividad heredada
        >
          {section.component}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default LandingPage;
