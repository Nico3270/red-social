"use client";

import { useEffect, useState } from "react";
import {
  saveProducts,
  saveCards,
  saveLastUpdate,
  shouldUpdateProducts,
  shouldUpdateCards,
} from "@/lib/indexedDB";
import { getProductsToBlog } from "@/inicio/actions/getProductsToBlog";
import { getTarjetas } from "./getTarjetas";

// Aseguramos que la interfaz Product sea idéntica a la de indexedDB.ts
interface Product {
  id: string;
  nombre: string;
  precio: number;
  imagenes: string[];
  descripcion: string;
  seccionIds: string[];
  sectionPriorities: { [key: string]: number | null };
  descripcionCorta?: string;
  componentes?: string[];
  slug: string;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
  status: "available" | "out_of_stock" | "discontinued";
  enlace?: string;
}

interface Tarjeta {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function ClientWrapper({ onProductsLoaded }: { onProductsLoaded: () => void }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      console.log("⚡ Verificando si es necesario actualizar productos y tarjetas en IndexedDB...");

      // 🛒 **ACTUALIZAR PRODUCTOS SI ES NECESARIO**
      if (await shouldUpdateProducts()) {
        console.warn("⚠️ Actualizando productos en IndexedDB desde el servidor...");
        try {
          const freshProductsFromServer = await getProductsToBlog("");
          if (freshProductsFromServer?.length > 0) {
            const freshProducts: Product[] = freshProductsFromServer.map((product) => ({
              id: product.id,
              nombre: product.nombre,
              precio: product.precio ?? 0,
              imagenes: product.imagenes || [],
              descripcion: product.descripcion,
              seccionIds: product.seccionIds || [], // Usamos seccionIds directamente
              sectionPriorities: product.sectionPriorities || {}, // Aseguramos que sectionPriorities siempre sea un objeto
              descripcionCorta: product.descripcionCorta || "",
              slug: product.slug,
              tags: product.tags || [],
              createdAt: product.createdAt ? new Date(product.createdAt) : undefined,
              updatedAt: product.updatedAt ? new Date(product.updatedAt) : undefined,
              componentes: product.componentes || [],
              status: ["available", "out_of_stock", "discontinued"].includes(product.status)
                ? (product.status as "available" | "out_of_stock" | "discontinued")
                : "available",
              
            }));

            console.log(`✅ Se han obtenido ${freshProducts.length} productos desde el servidor.`);
            await saveProducts(freshProducts);
            await saveLastUpdate("productos", new Date());
            console.log("✅ Productos guardados correctamente en IndexedDB.");
          } else {
            console.warn("⚠️ No se obtuvieron productos válidos desde el servidor.");
          }
        } catch (error) {
          console.error("❌ Error al obtener productos desde el servidor:", error);
        }
      }

      // 🃏 **ACTUALIZAR TARJETAS SOLO SI HAN PASADO 2 DÍAS**
      if (await shouldUpdateCards()) {
        console.warn("⚠️ Actualizando tarjetas en IndexedDB desde el servidor...");
        try {
          console.log("🔎 Llamando a getTarjetas()...");
          const freshCardsFromServer = await getTarjetas();
          if (freshCardsFromServer?.length > 0) {
            const freshCards: Tarjeta[] = freshCardsFromServer.map((card) => ({
              id: card.id,
              titulo: card.titulo,
              descripcion: card.descripcion,
              imagen: card.imagen,
              createdAt: card.createdAt ? new Date(card.createdAt) : undefined,
              updatedAt: card.updatedAt ? new Date(card.updatedAt) : undefined,
            }));

            await saveCards(freshCards);
            await saveLastUpdate("tarjetas", new Date());
            console.log("✅ Tarjetas guardadas correctamente en IndexedDB.");
          } else {
            console.warn("⚠️ No se obtuvieron tarjetas válidas desde el servidor.");
          }
        } catch (error) {
          console.error("❌ Error al obtener tarjetas desde el servidor:", error);
        }
      }

      setIsLoading(false);
      onProductsLoaded(); // ✅ Notificar que los datos están listos
    };

    loadData();
  }, [onProductsLoaded]);

  return isLoading ? (
    <div className="flex justify-center items-center min-h-[100px]">
      {/* Aquí puedes poner un loader si quieres */}
    </div>
  ) : null;
}