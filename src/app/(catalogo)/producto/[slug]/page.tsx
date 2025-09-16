import { getProductBySlug } from "@/actions/productos/getProductBySlug";
import { titulosPrincipales } from "@/config/fonts";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import Divider from "@/ui/components/divider/Divider";
import { DetallesProducto } from "@/ui/components/productos/DetallesProducto";
import { ProductGridProduct } from "@/ui/components/productos/ProductGridProduct";
import { ResponsiveSlideShow } from "@/ui/components/slideShow/ResponsiveSlideShow";
import { Metadata } from "next";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(slug);

  if (!result.ok || !result.product) {
    return {
      title: "Producto no encontrado | Myckeo",
      description: "Lo sentimos, el producto solicitado no está disponible. Explora otros productos en nuestra plataforma.",
      robots: "noindex, nofollow",
    };
  }

  const { product, nombreNegocio } = result;
  const title = `${product.nombre} - ${nombreNegocio || "Negocio"} | Myckeo`;
  const description = product.descripcionCorta || product.descripcion?.slice(0, 150) || "Descubre este producto moderno y de alta calidad en nuestra plataforma social-comercial.";
  const image = product.imagenes[0] || "/placeholder-image.jpg"; // Fallback moderno
  const url = `https://tudominio.com/producto/${slug}`; // Reemplaza con tu dominio real
  const keywords = product.tags?.join(", ") || "producto, compra, moderno, " + product.nombre + product.nombreNegocio;

  return {
    title,
    description,
    keywords,
    openGraph: {
  title,
  description,
  url,
  siteName: product.nombreNegocio || "Negocio",
  images: [
    {
      url: image,
      width: 1200,
      height: 630,
      alt: product.nombre,
    },
  ],
  locale: "es_ES",
  type: "website", // ✅ permitido por Metadata
},
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: "index, follow",
    alternates: {
      canonical: url,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const result = await getProductBySlug(slug);

  if (!result.ok) {
    return (
      <div className="sm:mt-40">
        <h1>Se ha producido el siguiente Error: {result.message}</h1>
        <p>Por favor, verifica el slug del producto.</p>
        <p>Si el problema persiste, contacta al soporte.</p>
        <p>Negocio: {result.nombreNegocio}</p>
        <p>Teléfono: {result.telefonoNegocio}</p>
      </div>
    );
  }

  const { product, productosSimilares, telefonoNegocio, nombreNegocio } = result;

  if (!product) {
    return <h1>No hay producto</h1>;
  }

  const productosConvertidos: ProductRedSocial[] = (productosSimilares ?? []).map((producto) => ({
    id: producto.id,
    nombre: producto.nombre,
    precio: producto.precio,
    imagenes: producto.imagenes,
    descripcion: producto.descripcion,
    seccionIds: producto.sections,
    descripcionCorta: producto.descripcionCorta,
    slug: producto.slug,
    tags: producto.tags,
    componentes: producto.componentes,
    prioridad: producto.prioridad,
    status: producto.status,
    categoriaId: producto.categoriaId,
    sections: producto.sections,
    telefonoContacto: producto.telefonoContacto || "",
    slugNegocio: producto.slugNegocio || "",
    nombreNegocio: producto.nombreNegocio || "",
    negocioId: producto.negocioId,
    negocioFotoPerfil: producto.negocioFotoPerfil || "",
  }));

  // Structured Data para SEO (Schema.org/Product)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nombre,
    image: product.imagenes,
    description: product.descripcion,
    offers: {
      "@type": "Offer",
      priceCurrency: "COP", // Ajusta a tu moneda
      price: product.precio,
      availability: "https://schema.org/InStock", // Asume disponible; ajusta dinámicamente si es necesario
    },
    brand: {
      "@type": "Brand",
      name: nombreNegocio || "Negocio",
    },
    // Agrega reseñas si las tienes: aggregateRating, review
  };

  return (
    <div className="sm:mt-40 mb-20 p-2">
      {/* Structured Data Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Carrusel de imágenes */}
        <div className="flex justify-center">
          <div className="w-full h-[400px] md:h-[500px]">
            <ResponsiveSlideShow images={product.imagenes} title={product.nombre || ""} />
          </div>
        </div>

        {/* Detalles del producto */}
        <div className="flex flex-col mt-10 space-y-6 md:space-y-4 md:flex-grow">
          <DetallesProducto product={product} telefonoNegocio={telefonoNegocio} />
        </div>
      </div>
      <Divider />
      {/* Productos similares */}
      <div className="mt-2">
        {productosConvertidos.length > 0 ? (
          <h2 className={`text-2xl font-bold mb-2 ${titulosPrincipales.className} text-gray-800`}>
            Productos Similares
          </h2>
        ) : null}
        <ProductGridProduct products={productosConvertidos} />
      </div>
    </div>
  );
}