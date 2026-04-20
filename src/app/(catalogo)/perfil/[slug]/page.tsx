// app/perfil/[slug]/page.tsx

import { getInfoPerfilBySlugNegocio } from "@/actions/perfil/getInfoPerfilSlugNegocio";
import { getNegocioProductsBySlug } from "@/actions/productos/getNegocioProductsBySlug";
import { getPublicacionesNegocio } from "@/publicaciones/actions/getPublicaciones";
import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import PerfilUsuarioHeader from "@/ui/components/perfil-usuario-header/PerfilUsuarioHeader";
import { Metadata } from "next";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { getConteosSecciones } from "@/perfil/actions/getConteosSecciones";
import { preloadProfileCatalogData } from "@/actions/catalogGroups/preloadProfileCatalog";
import { ServicioData } from "@/servicios/interfaces/servicios.interface";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import {
  PLACEHOLDER_BUSINESS_IMAGE,
  resolveSafeImageSource,
} from "@/lib/media/resolveSafeImageSource";

interface Props {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    tab?: string;
    group?: string;
    section?: string;
  }>;
}

// Genera rutas estáticas iniciales
export async function generateStaticParams() {
  const slugs = await prisma.negocio.findMany({
    select: { slug: true },
    take: 100,
  });
  return slugs.map((negocio) => ({ slug: negocio.slug }));
}

// Página principal del perfil de negocio
export default async function NegocioPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tab, group, section } = await searchParams;

  // Sesión del usuario autenticado (si existe)
  const session = await auth();
  const userId = session?.user?.id || null;

  // === CACHE: mejora el rendimiento y evita consultas repetidas ===
  const getCachedPublications = unstable_cache(
    async (slug: string, take: number, userId: string | null) =>
      getPublicacionesNegocio({ slug, take, userId }),
    ["negocio-publications"],
    { revalidate: 60, tags: [`negocio-publications-${slug}`] }
  );

  const getCachedProfile = unstable_cache(
    async (slug: string) => getInfoPerfilBySlugNegocio(slug),
    ["negocio-profile"],
    { revalidate: 3600, tags: [`negocio-profile-${slug}`] }
  );

  const getCachedCatalogData = unstable_cache(
    async (slug: string) => preloadProfileCatalogData(slug),
    ["negocio-catalog"],
    { revalidate: 1800, tags: [`negocio-catalog-${slug}`] }
  );

  // === Llamadas cacheadas ===
  const result = await getNegocioProductsBySlug(slug, 20);
  const { negocio } = await getCachedProfile(slug);
  const publicacionesIniciales = await getCachedPublications(slug, 20, userId);
  const conteos = await getConteosSecciones(slug);
  const catalogData = await getCachedCatalogData(slug);

  // === Manejo de errores ===
  if (!result.ok) {
    return (
      <div className="error-container text-center sm:mt-40">
        Error al cargar productos: {result.message}
      </div>
    );
  }
  if (!negocio) {
    return (
      <div className="error-container text-center sm:mt-40">
        Error al cargar el perfil del negocio.
      </div>
    );
  }
  if (!conteos.ok) {
    return (
      <div className="error-container text-center sm:mt-40">
        Error al cargar conteos: {conteos.message}
      </div>
    );
  }

  // === Construcción del resumen del perfil ===
  const resumenPerfil = {
    productos: conteos.productos,
    publicaciones: conteos.publicaciones,
    servicios: conteos.servicios,
    reseñas: conteos.resenas,
  };

  // Listas vacías iniciales (se cargan dinámicamente después)
  const servicios: ServicioData[] = [];
  const resenas: EnhancedPublicacion[] = [];

  // === Render principal ===
  return (
    <div className="sm:mt-40 mb-20">
      <Suspense fallback={<div className="loading-skeleton">Cargando perfil...</div>}>
        <PerfilUsuarioHeader
          activeTabComponent="Inicio"
          productos={result.products || []}
          publicaciones={publicacionesIniciales.publicaciones || []}
          informacionNegocio={negocio}
          resumenPerfil={resumenPerfil}
          resenas={resenas}
          servicios={servicios}
          catalogPreloadData={catalogData}
          initialTab={tab}
          initialGroupSlug={group}
          initialSectionSlug={section}
        />
      </Suspense>
    </div>
  );
}

// Revalidación ISR (cada minuto)
export const revalidate = 60;

// === METADATOS DINÁMICOS (SEO) ===
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = (process.env.SITE_URL || "https://myckeo.com").replace(/\/$/, "");

  // Reutilizamos el cache del perfil
  const getCachedProfile = unstable_cache(
    async (slug: string) => getInfoPerfilBySlugNegocio(slug),
    ["negocio-profile"],
    { revalidate: 3600, tags: [`negocio-profile-${slug}`] }
  );

  const { negocio } = await getCachedProfile(slug);

  const title = negocio
    ? `${negocio.nombreNegocio} | Myckeo`
    : "Perfil de Negocio | Myckeo";

  const description =
    negocio?.descripcionNegocio ||
    "Descubre negocios locales y productos en Myckeo, la plataforma social-comercial.";

  const image =
    resolveSafeImageSource(
      negocio?.imagenPortada || negocio?.imagenPerfil,
      `${siteUrl}${PLACEHOLDER_BUSINESS_IMAGE}`
    );

  const canonicalUrl = `${siteUrl}/perfil/${slug}`;

  // === JSON-LD estructurado (para Google Rich Results) ===
  const structuredData = negocio
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: negocio.nombreNegocio,
        description: description,
        image: [image],
        url: canonicalUrl,
        address: {
          "@type": "PostalAddress",
          addressLocality: negocio.ciudadNegocio || "",
          addressRegion: negocio.departamentoNegocio || "",
          addressCountry: "CO",
        },
        telephone: negocio.telefonoNegocio || "",
        sameAs: negocio.facebook || negocio.instagram || [],
      }
    : null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Myckeo",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: negocio?.nombreNegocio || "Perfil de negocio",
        },
      ],
      locale: "es_ES",
      type: "website", // ✅ tipo válido según Next.js
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: "index, follow",
    alternates: {
      canonical: canonicalUrl,
    },
    other: structuredData
      ? {
          "script:ld+json": JSON.stringify(structuredData),
        }
      : undefined,
  };
}
