import Head from 'next/head';
import { ProductGrid } from "@/seccion/componentes/ProductGridSeccion";
import { getProductsBySection } from "@/seccion/actions/getProductsBySection";
import { InfoEmpresa } from '@/config/config';
import { titulosPrincipales } from '@/config/fonts';
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function SectionPage({ params }: Props) {
  const { id: sectionSlug } = await params;
  const { productos, sectionName } = await getProductsBySection(sectionSlug);

  if (!sectionName) {
    return (
      <div className="text-center text-xl text-red-500 font-bold mt-8">
        Sección no encontrada
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="text-center text-xl text-red-500 font-bold mt-8">
        No se encontraron productos en la sección {sectionName}.
      </div>
    );
  }

  // Generar JSON-LD para la sección con productos
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": sectionName,
    "description": `Explora la selección de productos en ${sectionName}.`,
    "url": `${InfoEmpresa.linkWebProduccion}/seccion/${sectionSlug}`,
    "hasPart": productos.map((producto) => ({
      "@type": "Product",
      "name": producto.nombre,
      "description": producto.descripcion || "",
      "image": producto.imagenes[0],
      "url": `${InfoEmpresa.linkWebProduccion}/producto/${producto.slug}`,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "COP",
        "price": producto.precio,
       
      }
    }))
  };

  return (
    <>
      {/* Modificar el <head> correctamente con next/head */}
      <Head>
        <title>{`Explora ${sectionName} | Detalles, Sorpresas y Regalos`}</title>
        <meta name="description" content={`Descubre los mejores productos en la sección ${sectionName}.`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      </Head>

      <div className="container mx-auto p-4">
        {/* Título dinámico */}
        <div className="text-center my-8">
          <h1 className={`text-4xl font-bold color-titulos ${titulosPrincipales.className}`}>
            Explora nuestra selección en <span>{sectionName}</span>
          </h1>
        </div>

        {/* Renderizar productos */}
        <ProductGrid products={productos} />
      </div>
    </>
  );
}
