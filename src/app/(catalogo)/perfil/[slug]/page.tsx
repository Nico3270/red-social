import { getInfoPerfilBySlugNegocio } from "@/actions/perfil/getInfoPerfilSlugNegocio";
import { getNegocioProductsBySlug } from "@/actions/productos/getNegocioProductsBySlug";
import prisma from "@/lib/prisma";
import { getPublicacionesNegocio } from "@/publicaciones/actions/getPublicaciones";
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

const getCachedProducts = unstable_cache(
  async (slug: string, take: number) => getNegocioProductsBySlug(slug, take),
  ["negocio-products"],
  { revalidate: 3600 } // Reducir a 60 segundos para pruebas
);

const getCachedProfile = unstable_cache(
  async (slug: string) => getInfoPerfilBySlugNegocio(slug),
  ["negocio-profile"],
  { revalidate: 3600 }
);

const getCachedPublications = unstable_cache(
  async (props: { slug: string; take: number }) => getPublicacionesNegocio(props),
  ["negocio-publications"],
  { revalidate: 60 }
);

export default async function NegocioPage({ params }: Props) {
  const { slug } = await params;

  const result = await getCachedProducts(slug, 20);
  const { negocio } = await getCachedProfile(slug);
  const publicacionesIniciales = await getCachedPublications({ slug, take: 20});

  if (!result.ok) {
    return <div>Error al cargar productos: {result.message}</div>;
  }
  if (!negocio) {
    return <div>Error al cargar el perfil del negocio</div>;
  }

  return (
    <div className="sm:mt-40">
      <Suspense fallback={<div>Cargando perfil...</div>}>
        <PerfilUsuarioHeader
          activeTabComponent="Productos"
          productos={result.products || []}
          informacionNegocio={negocio}
          publicaciones={publicacionesIniciales.publicaciones || []}
        />
      </Suspense>
    </div>
  );
}

export const revalidate = 60; // Reducir a 60 segundos para pruebas

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
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