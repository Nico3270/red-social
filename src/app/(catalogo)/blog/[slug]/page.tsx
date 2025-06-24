export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
import { getArticuloInformationBySlug } from "@/blog/actions/getArticuloInformationBySlug";
import ShowBlogArticle from "@/blog/componentes/ShowBlogArticle";
import { InfoEmpresa } from "@/config/config";
import { Metadata } from "next";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; // Asegúrate de await params
  const blogData = await getArticuloInformationBySlug(slug);

  if (!blogData) {
    return {
      title: "Blog no encontrado | Landscape Blog",
      description: "El artículo que buscas no existe.",
    };
  }

  return {
    title: `${blogData.titulo} | Landscape Blog`,
    description: blogData.descripcion.slice(0, 160), // Limita a 160 caracteres
    keywords: blogData.titulo.split(" ").concat(["blog", "artículo"]).join(", "), // Genera palabras clave
    openGraph: {
      title: blogData.titulo,
      description: blogData.descripcion,
      url: `${InfoEmpresa.linkWebProduccion}/blog/${blogData.slug}`,
      images: blogData.imagen ? [{ url: blogData.imagen, width: 1200, height: 630 }] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: blogData.titulo,
      description: blogData.descripcion,
      images: blogData.imagen ? [blogData.imagen] : [],
    },
  };
}

export default async function ArticuloPage({ params }: Props) {
  const { slug } = await params;
  const blogData = await getArticuloInformationBySlug(slug);

  // ✅ Si el blog no existe, mostramos un mensaje de error
  if (!blogData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <h2 className="text-2xl font-bold text-gray-700">❌ Blog no encontrado</h2>
      </div>
    );
  }

  // ✅ Transformamos los datos para que coincidan con los tipos esperados en `ShowBlogArticle`
  const formattedBlog = {
    titulo: blogData.titulo,
    descripcion: blogData.descripcion,
    autor: blogData.autor,
    imagen: blogData.imagen,
    imagenes: blogData.imagenes || [],
    orden: blogData.orden,
    secciones: blogData.secciones.map(({ section }) => ({
      section: { id: section.id, nombre: section.nombre }, // ✅ Ahora tiene `section`
    })),
    products: blogData.products.map(({ product }) => ({
      product: { id: product.id, nombre: product.nombre, slug: product.slug }, // ✅ Ahora tiene `product`
    })),
    temas: blogData.temas.map((tema) => ({
      titulo: tema.titulo,
      imagen: tema.imagen ?? "", // ✅ Convierte `null` en cadena vacía
      parrafos: tema.parrafos,
    })),
  };

  return <div className="mt-6">
    <ShowBlogArticle blog={formattedBlog} />;
  </div>
}