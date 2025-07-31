import { getInfoPerfilBySlugNegocio } from "@/actions/perfil/getInfoPerfilSlugNegocio";
import { getNegocioProductsBySlug } from "@/actions/productos/getNegocioProductsBySlug";
import prisma from "@/lib/prisma";
import { getPublicacionesNegocio } from "@/publicaciones/actions/getPublicaciones";
import PerfilUsuarioHeader from "@/ui/components/perfil-usuario-header/PerfilUsuarioHeader";
import { Suspense } from "react";

interface Props {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  // Genera rutas estáticas para los slugs conocidos (requiere consulta a Prisma)
  const slugs = await prisma.negocio.findMany({ select: { slug: true } }); // Asegúrate de que prisma esté disponible
  return slugs.map((negocio) => ({ slug: negocio.slug }));
}

export default async function NegocioPage({ params }: Props) {
  const { slug } = params;

  const result = await getNegocioProductsBySlug(slug);
  const { negocio } = await getInfoPerfilBySlugNegocio(slug);
  const publicacionesIniciales = await getPublicacionesNegocio({ slug, take: 5 });

  if (!result.ok || !negocio) {
    return <div>Error al cargar la página</div>;
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

// Metadatos para SEO
import type { Metadata } from "next";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params;
  const { negocio } = await getInfoPerfilBySlugNegocio(slug);

  return {
    title: negocio ? `${negocio.nombreNegocio} ` : "Perfil de Negocio",
    description: negocio ? negocio.descripcionNegocio || "Explora el perfil de este negocio." : "Perfil de un negocio.",
    openGraph: {
      title: negocio ? `${negocio.nombreNegocio} ` : "Perfil de Negocio",
      description: negocio ? negocio.descripcionNegocio || "Explora el perfil de este negocio." : "Perfil de un negocio.",
      images: negocio && negocio.imagenPortada ? [negocio.imagenPortada] : ["/default-og-image.jpg"], // Asegúrate de tener una imagen por defecto
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