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
import { ServicioData } from "@/servicios/interfaces/servicios.interface";
import { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const slugs = await prisma.negocio.findMany({
    select: { slug: true },
    take: 100,
  });
  return slugs.map((negocio) => ({ slug: negocio.slug }));
}

export default async function NegocioPage({ params }: Props) {
  const { slug } = await params;

  // Obtener sesión dinámica
  const session = await auth();
  const userId = session?.user?.id || null;

  // Cache para productos
  const getCachedProducts = unstable_cache(
    async (slug: string, take: number) => getNegocioProductsBySlug(slug, take),
    ["negocio-products"],
    { revalidate: 3600, tags: [`negocio-products-${slug}`] }
  );

  // Cache para publicaciones
  const getCachedPublications = unstable_cache(
    async (slug: string, take: number, userId: string | null) =>
      getPublicacionesNegocio({ slug, take, userId }),
    ["negocio-publications"],
    { revalidate: 60, tags: [`negocio-publications-${slug}`] }
  );

  // Cache para perfil
  const getCachedProfile = unstable_cache(
    async (slug: string) => getInfoPerfilBySlugNegocio(slug),
    ["negocio-profile"],
    { revalidate: 3600, tags: [`negocio-profile-${slug}`] }
  );

  // Llamadas cacheadas
  const result = await getCachedProducts(slug, 20);
  const { negocio } = await getCachedProfile(slug);
  const publicacionesIniciales = await getCachedPublications(slug, 20, userId);

  // Obtener conteos de secciones (servicios, reseñas, publicaciones, productos)
  const conteos = await getConteosSecciones(slug);

  // Verificar errores
  if (!result.ok) {
    return <div className="error-container">Error al cargar productos: {result.message}</div>;
  }
  if (!negocio) {
    return <div className="error-container">Error al cargar el perfil del negocio</div>;
  }
  if (!conteos.ok) {
    return <div className="error-container">Error al cargar conteos: {conteos.message}</div>;
  }

  // Construir resumenPerfil
  const resumenPerfil = {
    productos: conteos.productos,
    publicaciones: conteos.publicaciones,
    servicios: conteos.servicios,
    reseñas: conteos.resenas,
  };

  // Listas vacías para servicios y reseñas (se llenarán dinámicamente en PerfilUsuarioHeader)
  const servicios: ServicioData[] = [];
  const resenas: EnhancedPublicacion[] = [];

  return (
    <div className="sm:mt-40 mb-20">
      <Suspense fallback={<div className="loading-skeleton">Cargando perfil...</div>}>
        <PerfilUsuarioHeader
          activeTabComponent="Inicio" // Cambiar a "Inicio" por defecto
          productos={result.products || []}
          publicaciones={publicacionesIniciales.publicaciones || []}
          informacionNegocio={negocio}
          resumenPerfil={resumenPerfil} // Nueva prop
          resenas={resenas} // Lista vacía inicial
          servicios={servicios} // Lista vacía inicial
        />
      </Suspense>
    </div>
  );
}

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const getCachedProfile = unstable_cache(
    async (slug: string) => getInfoPerfilBySlugNegocio(slug),
    ["negocio-profile"],
    { revalidate: 3600, tags: [`negocio-profile-${slug}`] }
  );
  const { negocio } = await getCachedProfile(slug);

  return {
    title: negocio ? `${negocio.nombreNegocio} - Perfil` : "Perfil de Negocio",
    description: negocio ? negocio.descripcionNegocio || "Explora el perfil de este negocio." : "Perfil de un negocio.",
    openGraph: {
      title: negocio ? `${negocio.nombreNegocio} - Perfil` : "Perfil de Negocio",
      description: negocio ? negocio.descripcionNegocio || "Explora el perfil de este negocio." : "Perfil de un negocio.",
      images: negocio && negocio.imagenPortada ? [negocio.imagenPortada] : ["/default-og-image.jpg"],
      url: `https://tu-dominio.com/perfil/${slug}`,
      siteName: "Tu Red Social",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: negocio ? `${negocio.nombreNegocio} - Perfil de Negocio` : "Perfil de Negocio",
      description: negocio ? negocio.descripcionNegocio || "Explora el perfil de este negocio." : "Perfil de un negocio.",
      images: negocio && negocio.imagenPortada ? [negocio.imagenPortada] : ["/default-og-image.jpg"],
    },
  };
}