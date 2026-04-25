// app/ui/components/landing-page/LandingPage.tsx

"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { InformacionInicialNegocio } from "@/ui/components/perfil-usuario-header/PerfilUsuarioHeader";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import { ServicioData } from "@/servicios/interfaces/servicios.interface";
import { ResumenPerfil } from "@/perfil/interfaces/resumenPerfil.interface";
import PublicacionesSection from "./PublicacionesSection";
import ServiciosSection from "./ServiciosSection";
import ResenasSection from "./ResenasSection";
import CatalogGroupsPreviewSection from "./CatalogGroupsPreviewSection";
import { BusinessGuideSection } from "./BusinessGuideSection";
import type { BusinessGuideResolvedPreset } from "@/perfil/guide/business-guide.types";
import type { ProfileCatalogPreloadData } from "@/actions/catalogGroups/preloadProfileCatalog";

interface LandingPageProps {
  informacionNegocio: InformacionInicialNegocio;
  productos: ProductRedSocial[];
  publicaciones: EnhancedPublicacion[];
  resenas: EnhancedPublicacion[];
  servicios: ServicioData[];
  resumenPerfil: ResumenPerfil;
  onSelectTab: (tab: "Publicaciones" | "Productos" | "Negocio" | "Reseñas") => void;
  onExploreProducts: (selection: BusinessGuideResolvedPreset) => void;
  onSelectGroupFromNav?: (groupId: string) => void;
  catalogPreloadData?: ProfileCatalogPreloadData;
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
  onSelectGroupFromNav,
  catalogPreloadData,
}) => {
  const [isCommercialGuideOpen, setIsCommercialGuideOpen] = useState(false);
  // Filtrar publicaciones para excluir reseñas (TESTIMONIO con producto)
  const publicacionesFiltradas = useMemo(() => {
    return publicaciones.filter(pub => !(pub.tipo === 'TESTIMONIO' && pub.producto));
  }, [publicaciones]);
  const featuredPublication = useMemo(
    () =>
      publicacionesFiltradas.find(
        (publication) =>
          Boolean(
            publication.titulo?.trim() ||
              publication.descripcion?.trim() ||
              publication.multimedia?.length
          )
      ) ?? null,
    [publicacionesFiltradas]
  );
  const isCatalogFirstBusiness = useMemo(() => {
    const productCount = resumenPerfil.productos ?? productos.length ?? 0;
    const publicationCount = resumenPerfil.publicaciones ?? 0;
    const serviceCount = resumenPerfil.servicios ?? 0;
    const reviewCount = resumenPerfil.reseñas ?? 0;
    const maxNonProductCount = Math.max(publicationCount, serviceCount, reviewCount);

    return Boolean(
      catalogPreloadData?.hasCatalogGroups ||
        catalogPreloadData?.isRestaurantMenuMode ||
        (productCount >= 12 && productCount >= Math.max(1, maxNonProductCount) * 2)
    );
  }, [
    catalogPreloadData?.hasCatalogGroups,
    catalogPreloadData?.isRestaurantMenuMode,
    productos.length,
    resumenPerfil.productos,
    resumenPerfil.publicaciones,
    resumenPerfil.reseñas,
    resumenPerfil.servicios,
  ]);

  // Generar array dinámico de secciones con orden y isActive
  const sections = useMemo(() => {
    // Definir prioridades base para secciones
    const sectionPriorities: Record<string, number> = {
      servicios: (resumenPerfil.servicios ?? 0) > (resumenPerfil.productos ?? 0) ? 40 : 20,
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

    const activeSections = sectionConfigs
      .filter((section) => section.isActive)
      .sort((a, b) => b.orden - a.orden);

    return isCatalogFirstBusiness ? activeSections.slice(0, 2) : activeSections;
  }, [isCatalogFirstBusiness, publicacionesFiltradas, resenas, resumenPerfil, servicios, onSelectTab]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4 px-4 py-3 sm:space-y-5 sm:p-6"
    >
      <BusinessGuideSection
        business={informacionNegocio}
        products={productos}
        onExploreProducts={onExploreProducts}
        onViewCatalog={() => onSelectTab("Productos")}
        onViewBusiness={() => onSelectTab("Negocio")}
        onViewPublications={() => onSelectTab("Publicaciones")}
        serviceCount={Math.max(resumenPerfil.servicios ?? 0, servicios.length)}
        publicationCount={publicacionesFiltradas.length}
        recentPublication={featuredPublication}
        isCommercialGuideOpen={isCommercialGuideOpen}
        onOpenCommercialGuide={() => setIsCommercialGuideOpen(true)}
        onCloseCommercialGuide={() => setIsCommercialGuideOpen(false)}
        catalogPreloadData={catalogPreloadData}
      />

      {/* Mostrar preview de grupos si el negocio usa CatalogGroups */}
      {isCommercialGuideOpen && catalogPreloadData?.hasCatalogGroups && catalogPreloadData?.rootGroups && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full"
        >
          <CatalogGroupsPreviewSection
            groups={catalogPreloadData.rootGroups}
            negocioSlug={informacionNegocio.slugNegocio}
            title={catalogPreloadData.isRestaurantMenuMode ? "Explora el menu por categorias" : undefined}
            subtitle={
              catalogPreloadData.isRestaurantMenuMode
                ? "Platos, bebidas y otras rutas utiles para entrar directo a lo que buscas."
                : undefined
            }
            viewAllLabel={catalogPreloadData.isRestaurantMenuMode ? "Ver menu" : undefined}
            onNavigateToGroup={(groupId: string) => onSelectGroupFromNav?.(groupId)}
            onViewAll={() => onSelectTab("Productos")}
          />
        </motion.div>
      )}

      {/* Inicio ahora evita duplicar el catálogo; deja solo contenido complementario. */}
      {sections.map((section, index) => (
        <motion.div
          key={section.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: (catalogPreloadData?.hasCatalogGroups ? 0.15 : 0) + index * 0.2 }}
          className="w-full" // Máximo ancho, responsividad heredada
        >
          {section.component}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default LandingPage;
