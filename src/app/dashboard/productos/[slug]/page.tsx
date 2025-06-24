"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ModifyProduct from "@/productos/components/ModifyProduct";
import { getProductBySlug } from "@/productos/actions/getProductBySlug";
import { getSections } from "@/productos/actions/getSections";
import { Product } from "@/lib/indexedDB";

interface ProductFormData {
    id?: string;
    nombre: string;
    precio: number;
    descripcion: string;
    descripcionCorta: string;
    slug: string;
    prioridad: number;
    status: "available" | "out_of_stock" | "discontinued"; // ✅ Se agrega "discontinued"
    tags: string;
    imagenes?: string[];
    componentes?: string[];
    seccionIds?: string[];
  }
  

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      try {
        const [fetchedProduct, fetchedSections] = await Promise.all([
          getProductBySlug(slug as string),
          getSections(), // ✅ Ahora llamamos las secciones dentro de useEffect
        ]);
        
        if (!fetchedProduct) {
            console.error("❌ Producto no encontrado");
            return;
        }
        console.log({fetchedProduct});
        console.log({fetchedSections});

        setProduct(fetchedProduct as Product);
        setSections(fetchedSections);
      } catch (error) {
        console.error("❌ Error al obtener los datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const productWithDefaults: ProductFormData | null = product
  ? {
      ...product,
      descripcionCorta: product.descripcionCorta ?? "",
      nombre: product.nombre ?? "",
      precio: product.precio ?? 0,
      prioridad: product.prioridad ?? 0,
      status: (["available", "out_of_stock", "discontinued"].includes(product.status) 
                ? product.status 
                : "available") as "available" | "out_of_stock" | "discontinued", // ✅ Se asegura de que el valor sea válido
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : "", // ✅ Convierte `tags` en un string separado por comas
      imagenes: product.imagenes ?? [],
      componentes: product.componentes ?? [],
      seccionIds: product.seccionIds ?? [],
    }
  : null;


  
  if (!productWithDefaults) {
    return <div className="p-6 text-red-500">❌ Producto no encontrado.</div>;
  }
  

  if (loading) {
    return <div className="p-6 text-gray-500">⏳ Cargando datos...</div>;
  }

  if (!product) {
    return <div className="p-6 text-red-500">❌ Producto no encontrado.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Editar Producto</h1>
      <ModifyProduct product={productWithDefaults} allSections={sections} />
    </div>
  );
}
