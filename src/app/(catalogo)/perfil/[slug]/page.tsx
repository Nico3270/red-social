import { getInfoPerfilBySlugNegocio } from "@/actions/perfil/getInfoPerfilSlugNegocio";
import { getNegocioProductsBySlug } from "@/actions/productos/getNegocioProductsBySlug";
import prisma from "@/lib/prisma";
import { getPublicacionesNegocio } from "@/publicaciones/actions/getPublicaciones";
import { auth } from "@/auth.config";  // Importa auth aquí para server-side
import PerfilUsuarioHeader from "@/ui/components/perfil-usuario-header/PerfilUsuarioHeader";
import { Metadata } from "next";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";

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

  // NUEVO: Obtén sesión DINÁMICA FUERA de cualquier cache (server-side seguro)
  const session = await auth();
  const userId = session?.user?.id || null;  // Null para guests/anónimos

  // Cache para productos (igual, pero opcional: pasa userId si la action lo necesita)
  const getCachedProducts = unstable_cache(
    async (slug: string, take: number) => getNegocioProductsBySlug(slug, take),
    ["negocio-products"],
    { revalidate: 3600, tags: [`negocio-products-${slug}`] }
  );

  // NUEVO: Cache para publicaciones, con userId como parámetro (dinámico pasado desde fuera)
  const getCachedPublications = unstable_cache(
    async (slug: string, take: number, userId: string | null) => 
      getPublicacionesNegocio({ slug, take, userId }),  // Pasa userId para personalizar userReaction
    ["negocio-publications"],  // Key estática por slug (cache global); userId se procesa en runtime
    { 
      revalidate: 60,  // 1min para frescura en feeds sociales
      tags: [`negocio-publications-${slug}`]  // Tag dinámico para invalidar por slug (e.g., en mutations)
    }
  );

  // Cache para perfil (igual)
  const getCachedProfile = unstable_cache(
    async (slug: string) => getInfoPerfilBySlugNegocio(slug),
    ["negocio-profile"],
    { revalidate: 3600, tags: [`negocio-profile-${slug}`] }
  );

  // Llamadas cacheadas (ahora con userId en publications)
  const result = await getCachedProducts(slug, 20);
  const { negocio } = await getCachedProfile(slug);
  const publicacionesIniciales = await getCachedPublications(slug, 20, userId);  // Pasa userId aquí

  if (!result.ok) {
    return <div className="error-container">Error al cargar productos: {result.message}</div>;  // UX elegante: clase para styling responsive
  }
  if (!negocio) {
    return <div className="error-container">Error al cargar el perfil del negocio</div>;
  }

  return (
    <div className="sm:mt-40">  {/* Tu contenedor responsive */}
      <Suspense fallback={<div className="loading-skeleton">Cargando perfil...</div>}>  {/* Skeleton moderno para loading */}
        <PerfilUsuarioHeader
          activeTabComponent="Productos"
          productos={result.products || []}
          informacionNegocio={negocio}
          publicaciones={publicacionesIniciales.publicaciones || []}  // Ahora con userReaction personalizada
        />
      </Suspense>
    </div>
  );
}

export const revalidate = 60;  // Global revalidate para pruebas; en prod, usa tags para granularidad

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Para metadata, obtén sesión si necesitas personalización (pero metadata suele ser estática)
  // Si no usas auth aquí, cachea sin problemas
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
      url: `https://tu-dominio.com/perfil/${slug}`,  // Ajusta tu dominio
      siteName: "Tu Red Social",  // Nombre de tu plataforma
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