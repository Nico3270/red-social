"use client";
import { useEffect, useState } from "react";
import { inter, TextosFont } from "@/config/fonts";
import Head from "next/head";
import Image from "next/image";
import { initDB } from "@/lib/indexedDB";
import { InfoEmpresa } from "@/config/config";
import ProductCarousel from "./ProductCarrousel";

interface BlogProps {
  blog: {
    titulo: string;
    descripcion: string;
    autor: string;
    imagen: string;
    imagenes: string[];
    orden: number;
    secciones: { section: { id: string; nombre: string } }[];
    products: { product: { id: string; nombre: string; slug: string } }[];
    temas: { titulo: string; imagen: string; parrafos: string[] }[];
  };
}

interface Product {
  id: string;
  nombre: string;
  precio: number;
  imagenes: string[];
  descripcion: string;
  seccionIds: string[];
  descripcionCorta?: string;
  slug: string;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
  prioridad?: number;
  status?: "available" | "out_of_stock" | "discontinued";
  enlace?: string;
}

export default function ShowBlogArticle({ blog }: BlogProps) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      const db = await initDB();
      if (!db) {
        console.error("❌ No se pudo inicializar IndexedDB.");
        return;
      }

      const transaction = db.transaction("products", "readonly");
      const store = transaction.objectStore("products");

      const allProducts = await store.getAll();
      if (allProducts.length === 0) {
        console.warn("⚠️ No hay productos en IndexedDB.");
        return;
      }

      const sectionIds = blog.secciones.map((s) => s.section.id);
      const sectionProducts = allProducts.filter((product: Product) =>
        product.seccionIds.some((id) => sectionIds.includes(id))
      );

      const productIds = blog.products.map((p) => p.product.id);
      const specificProducts = await getProductsFromIndexedDB(productIds);

      const uniqueProducts = Array.from(
        new Map(
          [...sectionProducts, ...specificProducts].map((p) => [p.id, p])
        ).values()
      );

      // if (uniqueProducts.length === 0) {
      //   console.warn("⚠️ No se encontraron productos relacionados.");
      // } else {
      //   console.log("✅ Productos encontrados:", uniqueProducts);
      // }

      setProducts(uniqueProducts);
    }

    fetchProducts();
  }, [blog.secciones, blog.products]);

  return (
    <div className="w-full sm:mt-32 md:mt-0">
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": blog.titulo,
              "description": blog.descripcion,
              "author": { "@type": "Person", "name": blog.autor },
              "image": blog.imagen,
              "url": `/blog/${blog.titulo.replace(/\s+/g, "-").toLowerCase()}`,
              "datePublished": new Date().toISOString(),
              "dateModified": new Date().toISOString(),
              "publisher": {
                "@type": "Organization",
                "name": "MagiSurprise Blog",
                "logo": {
                  "@type": "ImageObject",
                  "url": InfoEmpresa.imagenesPlaceholder.imagenRepresentativa,
                },
              },
            }),
          }}
        />
      </Head>

      {/* ✅ Hero Section */}
      <section className="relative w-full h-[600px] md:h-[600px] lg:h-[700px] flex items-center justify-center">
        <div className="absolute inset-0">
          <Image
            src={blog.imagen}
            alt={`Imagen principal del blog: ${blog.titulo}`}
            fill
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        </div>

        <div className="relative bg-white/80 text-center p-6 rounded-lg shadow-lg max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900">{blog.titulo}</h1>
          <p className="mt-4 text-lg md:text-xl text-gray-700">{blog.descripcion}</p>
          <p className="text-sm text-gray-500 mt-2">✍️ Autor: {blog.autor}</p>
        </div>
      </section>

      {/* ✅ Contenido del Blog */}
      <div className="w-full px-4 sm:px-10 mx-auto p-2 bg-white shadow-lg rounded-lg mt-2">
        {blog.temas.length > 0 && (
          <div className="mt-6">
            {blog.temas.map((tema, index) => (
              <div key={index}>
                <div
                  className={`mt-10 flex flex-col lg:flex-row items-stretch gap-8 ${
                    index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                  }`}
                >
                  {tema.imagen && (
                    <div className="w-full lg:w-1/2 h-full flex items-center justify-center">
                      <Image
                        src={tema.imagen}
                        alt={tema.titulo}
                        width={600}
                        height={300}
                        className="rounded-md shadow-md w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="w-full lg:w-1/2 min-h-[300px] flex flex-col justify-center">
                    <h2
                      className={`text-4xl font-semibold text-gray-700 text-center lg:text-left mb-4 ${inter.className}`}
                    >
                      {tema.titulo}
                    </h2>
                    <p
                      className={`text-gray-700 mt-4 text-lg leading-relaxed whitespace-pre-line ${TextosFont.className}`}
                    >
                      {tema.parrafos.join("\n")}
                    </p>
                  </div>
                </div>

                {index < blog.temas.length - 1 && (
                  <div className="mt-10 mb-10">
                    <hr className="border-t border-gray-300 opacity-50 w-3/4 mx-auto" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ Productos Relacionados */}
      <div className="w-full px-4 sm:px-10 mx-auto p-2 bg-white shadow-lg rounded-lg mt-2">
        <ProductCarousel category="🛒 Productos relacionados" products={products} />
      </div>
    </div>
  );
}

async function getProductsFromIndexedDB(productIds: string[]): Promise<Product[]> {
  const db = await initDB();
  if (!db) {
    console.error("❌ No se pudo abrir IndexedDB.");
    return [];
  }

  const transaction = db.transaction("products", "readonly");
  const store = transaction.objectStore("products");

  const products: Product[] = [];

  for (const id of productIds) {
    try {
      const product = await store.get(id);
      if (product) {
        products.push(product as Product);
      } else {
        console.warn(`⚠️ Producto con ID ${id} no encontrado en IndexedDB.`);
      }
    } catch (error) {
      console.error(`❌ Error al obtener producto con ID ${id}:`, error);
    }
  }

  return products;
}