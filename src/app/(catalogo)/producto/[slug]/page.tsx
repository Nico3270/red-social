"use client"; // 💡 Asegura que este código solo se ejecute en el cliente

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ProductGridProduct } from "@/producto/components/ProductGridProduct";
import { ResponsiveSlideShow } from "@/producto/components/ResonsiveSlideShow";
import { AddToCart } from "@/producto/components/AddToCart";
import { getProductBySlug } from "@/producto/actions/getProductBySlug";
import { getProductsFromDB } from "@/lib/indexedDB"; // 🆕 Obtener productos desde IndexedDB
import { SeccionesFont } from "@/config/fonts";
import Head from "next/head";  // Importar Head para insertar el JSON-LD
import { InfoEmpresa } from "@/config/config";
import { Product } from "@/interfaces/product.interface";
import { useParams } from "next/navigation";
import { Divider } from "@mui/material";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché

// Página principal del producto
export default function ProductPage() {
  const params = useParams(); // ✅ Obtiene params en un Componente Cliente
  const slug = params?.slug as string; // ✅ Obtiene el slug de forma segura
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // ✅ Estado para mostrar carga
  // const [source, setSource] = useState<string>("");
  const [hydrated, setHydrated] = useState<boolean>(false); // ✅ Evita errores de hidratación

  useEffect(() => {
    setHydrated(true);
    const fetchProductData = async () => {
      try {
        setLoading(true);
        const products = await getProductsFromDB();
        const foundProduct = products.find((p) => p.slug === slug);
  
        if (foundProduct) {
          setProduct(foundProduct);
          // setSource("IndexedDB");
          const similar = products
            .filter((p) => p.id !== foundProduct.id && p.seccionIds.some(id => foundProduct.seccionIds.includes(id)))
            .slice(0, 8);
          setSimilarProducts(similar);
        } else {
          const { product: serverProduct, similarProducts } = await getProductBySlug(slug);
          if (serverProduct) {
            setProduct(serverProduct);
            setSimilarProducts(similarProducts ?? []);
            // setSource("server");
          } else {
            notFound();
          }
        }
      } catch (error) {
        console.error("❌ Error al obtener producto:", error);
        notFound();
      } finally {
        setLoading(false);
      }
    };
  
    if (slug) {
      fetchProductData();
    }
  }, [slug]);

  // ✅ Evita el error de hidratación mostrando un "loading" hasta que el cliente esté listo
  if (!hydrated) {
    return <div className="text-center p-6">Cargando...</div>;
  }

  // ✅ Mostrar un mensaje de carga mientras se obtiene el producto
  if (loading) {
    return <div className="text-center p-6">Cargando producto...</div>;
  }

  if (!product) {
    return <div className="text-center p-6 text-red-600">Producto no encontrado.</div>;
  }

  // console.log(`📢 Producto cargado desde IndexedDB o Servidor`)
  // Generar JSON-LD dinámico para el producto
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.nombre,
    "description": product.descripcion || "",
    "image": product.imagenes,
    "brand": {
      "@type": "Brand",
      "name": InfoEmpresa.descripcion
    },
    "sku": product.id,
    "keywords": product.tags || [], // ✅ Agregamos los tags aquí
    "offers": {
      "@type": "Offer",
      "url": `${InfoEmpresa.linkWebProduccion}/producto/${product.slug}`,
      "priceCurrency": "COP",
      "price": product.precio,
    }
  };


  return (
    <div className="container  p-2 px-2 ml-2 ">

      {/* Incrustar el JSON-LD en el head */}
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      </Head>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Carrusel de imágenes */}
        <div className="flex justify-center">
          <div className="w-full h-[400px] md:h-[500px]">
            <ResponsiveSlideShow images={product.imagenes} title={product.nombre} />
          </div>
        </div>

        {/* Detalles del producto */}
        <div className="flex flex-col space-y-6 md:space-y-4 md:flex-grow">
          <AddToCart product={product} />
        </div>
      </div>
      <Divider />
      {/* Productos similares */}
      <div className="mt-8">
        <h2 className={`text-2xl font-bold mb-4 ${SeccionesFont.className} color-secundario`}>Productos Similares</h2>
        <ProductGridProduct products={similarProducts ?? []} />
      </div>
    </div>
  );
}
