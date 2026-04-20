/**
 * RestaurantMenuSection
 *
 * Sección de un grupo en modo restaurante premium
 * Agrupa items de menú de forma elegante y legible
 */

"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { RestaurantMenuItem } from "./RestaurantMenuItem";

interface RestaurantMenuSectionProps {
  groupId?: string;
  groupName: string;
  groupSlug?: string;
  products: ProductRedSocial[];
  isLoading?: boolean;
  negocioSlug?: string;
  onOpenProductDetail?: (product: ProductRedSocial) => void;
  onAddToCart?: (product: ProductRedSocial, quantity: number) => void;
}

export const RestaurantMenuSection: React.FC<RestaurantMenuSectionProps> = ({
  groupId,
  groupName,
  groupSlug,
  products,
  isLoading = false,
  negocioSlug = "",
  onOpenProductDetail,
  onAddToCart,
}) => {
  // Separar featured de no-featured
  const { featured, regular } = useMemo(() => {
    const featured = products.filter((product) => product.isFeatured);
    const regular = products.filter((product) => !product.isFeatured);
    return { featured, regular };
  }, [products]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      viewport={{ once: true }}
      data-testid="restaurant-menu-section"
      className="space-y-6"
    >
      {/* TÍTULO DE SECCIÓN */}
      <div className="space-y-2 pb-4 border-b-2 border-amber-200">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {groupName}
        </h2>
        <p className="text-sm text-gray-600">
          {products.length} {products.length === 1 ? "opción" : "opciones"}
        </p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-12 text-center">
          <p className="text-base text-gray-700">
            No hay productos visibles en esta sección por ahora.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Prueba otra categoría del menú o vuelve al inicio para explorar secciones destacadas.
          </p>
        </div>
      ) : (
        <>
          {/* FEATURED ITEMS (si hay) */}
          {featured.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wider">
                Destacados
              </h3>
              <div className="grid gap-4 grid-cols-1">
                {featured.map((product, idx) => (
                  <RestaurantMenuItem
                    key={product.id || idx}
                    product={product}
                    isFeatured={true}
                    negocioSlug={negocioSlug}
                    groupId={groupId}
                    groupSlug={groupSlug}
                    onOpenDetail={onOpenProductDetail}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            </div>
          )}

          {/* REGULAR ITEMS */}
          {regular.length > 0 && (
            <div className="space-y-3">
              {featured.length > 0 && (
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mt-8 pt-4">
                  Más opciones
                </h3>
              )}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {regular.map((product, idx) => (
                  <RestaurantMenuItem
                    key={product.id || idx}
                    product={product}
                    isFeatured={false}
                    negocioSlug={negocioSlug}
                    groupId={groupId}
                    groupSlug={groupSlug}
                    onOpenDetail={onOpenProductDetail}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};
