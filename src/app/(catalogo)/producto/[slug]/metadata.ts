import type { Metadata } from "next";
import { getProductBySlug } from "@/producto/actions/getProductBySlug";
import { InfoEmpresa } from "@/config/config";

interface Props {
  params: {
    slug: string;
  };
}

// 📌 Generar metadatos dinámicos
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params;
  
  // Intentar obtener el producto desde la base de datos
  const { product } = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Producto no encontrado",
      description: "El producto que estás buscando no existe.",
      robots: { index: false },
    };
  }

  const imageUrl = product.imagenes[0];
  const keywords = product.tags?.join(", ") || ""; // ✅ Convertimos los tags en una string separada por comas

  return {
    title: product.nombre,
    description: product.descripcion || "",
    keywords, // ✅ Agregamos los tags como palabras clave
    openGraph: {
      title: product.nombre,
      description: product.descripcion || "",
      images: [imageUrl],
      url: `${InfoEmpresa.linkWebProduccion}/producto/${product.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: product.nombre,
      description: product.descripcion || "",
      images: [imageUrl],
    },
  };
}
