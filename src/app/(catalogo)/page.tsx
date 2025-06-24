"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { FaSearch } from "react-icons/fa";
import { getCardsFromDB, getProductsFromDB } from "@/lib/indexedDB";
import { useSectionStoreMagiSurprise } from "@/store/sections/sections-store";
import ProductCarousel from "@/producto/components/ProductCarrusel";
import QuienesSomos from "@/secondary/componentes/QuienesSomos";

interface Tarjeta {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;
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
  status: "available" | "out_of_stock" | "discontinued"; // Obligatorio
  sectionPriorities: { [key: string]: number | null }; // Obligatorio con valor por defecto
  enlace?: string;
}

interface SectionData {
  sectionName: string;
  sectionSlug: string;
  products: Product[];
}

export default function ProductsPage() {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { sections: allSections, fetchSections } = useSectionStoreMagiSurprise();

  // ✅ Obtener secciones si no están cargadas
  useEffect(() => {
    if (allSections.length === 0) {
      fetchSections();
    }
  }, [allSections, fetchSections]);

  // ✅ Cargar productos desde IndexedDB
  useEffect(() => {
    if (typeof window === "undefined") return;

    const fetchProducts = async () => {
      const products = await getProductsFromDB();
      const tarjetasFromDB = await getCardsFromDB();

      if (products.length > 0) {
        console.log(`✅ ${products.length} productos encontrados en IndexedDB.`);
        // Normalizamos los productos para que cumplan con la interfaz Product
        const normalizedProducts: Product[] = products.map((product) => ({
          ...product,
          status: product.status && ["available", "out_of_stock", "discontinued"].includes(product.status)
            ? product.status
            : "available", // Aseguramos que status sea válido
          sectionPriorities: product.sectionPriorities ?? {}, // Aseguramos que sectionPriorities siempre sea un objeto
          seccionIds: product.seccionIds ?? [], // Aseguramos que seccionIds sea un array
          imagenes: product.imagenes ?? [], // Aseguramos que imagenes sea un array
          tags: product.tags ?? [], // Aseguramos que tags sea un array
          precio: product.precio ?? 0, // Aseguramos que precio tenga un valor por defecto
          descripcion: product.descripcion ?? "", // Aseguramos que descripcion tenga un valor por defecto
          slug: product.slug ?? "", // Aseguramos que slug tenga un valor por defecto
          nombre: product.nombre ?? "", // Aseguramos que nombre tenga un valor por defecto
          id: product.id ?? "", // Aseguramos que id tenga un valor por defecto
        }));
        setAllProducts(normalizedProducts);
      } else {
        console.warn("⚠️ No hay productos en IndexedDB.");
      }

      if (tarjetasFromDB.length > 0) {
        console.log(`✅ ${tarjetasFromDB.length} tarjetas encontradas en IndexedDB.`);
        setTarjetas(tarjetasFromDB);
      } else {
        console.warn("⚠️ No hay tarjetas en IndexedDB.");
      }

      setIsLoading(false);
    };

    fetchProducts();
  }, []);

  // ✅ Agrupar productos por sección y ordenar por prioridad
  useEffect(() => {
    if (isLoading || allProducts.length === 0 || allSections.length === 0) return;

    const sectionMap = new Map<string, SectionData>();

    allProducts.forEach((product) => {
      product.seccionIds.forEach((sectionId) => {
        const sectionInfo = allSections.find((s) => s.id === sectionId);
        if (!sectionInfo) return;

        if (!sectionMap.has(sectionId)) {
          sectionMap.set(sectionId, {
            sectionName: sectionInfo.name,
            sectionSlug: sectionInfo.href,
            products: [],
          });
        }

        const section = sectionMap.get(sectionId);
        if (section && !section.products.some((p) => p.id === product.id)) {
          section.products.push(product);
        }
      });
    });

    // Ordenar los productos dentro de cada sección por prioridad
    const orderedSections = Array.from(sectionMap.values()).map((section) => {
      const sectionId = allSections.find((s) => s.name === section.sectionName)?.id;
      if (sectionId) {
        section.products.sort((a, b) => {
          const priorityA = a.sectionPriorities[sectionId] ?? Infinity; // Usamos sectionId en lugar de sectionInfo.id
          const priorityB = b.sectionPriorities[sectionId] ?? Infinity;
          return priorityA - priorityB || a.nombre.localeCompare(b.nombre); // Ordenar por nombre en caso de empate
        });
      }
      return section;
    }).sort((a, b) => {
      const sectionA = allSections.find((s) => s.name === a.sectionName);
      const sectionB = allSections.find((s) => s.name === b.sectionName);
      return (sectionA?.order ?? 0) - (sectionB?.order ?? 0);
    });

    setSections(orderedSections);
  }, [isLoading, allProducts, allSections]);

  // ✅ Optimizar búsqueda con `useMemo`
  const filteredProducts = useMemo(() => {
    if (searchTerm.trim() === "") return [];
    return allProducts.filter((product) =>
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allProducts]);

  return (
    <div className="w-full max-w-[1600px] z-40 mx-auto px-2 mt-6">
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <p className="text-xl font-semibold text-gray-600">Cargando productos...</p>
        </div>
      ) : (
        <>
          {/* Barra de búsqueda estilo Google */}
          <div className="relative w-full max-w-lg mx-auto my-2 pt-4 z-40">
            <div className="flex items-center bg-white rounded-full shadow-lg border border-gray-300 p-3">
              <FaSearch className="text-gray-500 ml-2" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent outline-none ml-3 text-gray-800"
              />
            </div>
            {filteredProducts.length > 0 && (
              <div className="absolute z-10 bg-white shadow-lg rounded-lg w-full mt-2 max-h-60 overflow-auto border border-gray-200">
                {filteredProducts.map((product) => (
                  <Link key={`${product.id}-${product.slug}`} href={`/producto/${product.slug}`}>
                    <div className="p-3 hover:bg-gray-100 cursor-pointer">{product.nombre}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Renderizar cada sección con su ProductCarousel */}
          {sections.map(({ sectionName, sectionSlug, products }, index) => (
            <div key={`${sectionSlug}-${index}`}>
              <ProductCarousel category={sectionName} products={products || []} />
              {index < sections.length - 1 && (
                <div className="my-4 w-full border-t-2 border-blue-200 mx-auto max-w-[60%] opacity-80"></div>
              )}
            </div>
          ))}
          <div className="my-4 w-full border-t-2 border-blue-200 mx-auto max-w-[60%] opacity-80"></div>
          <QuienesSomos tarjetas={tarjetas} />
        </>
      )}
    </div>
  );
}