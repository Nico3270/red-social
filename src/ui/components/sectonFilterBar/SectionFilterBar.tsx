'use client';

import React, { useState, useMemo } from 'react';
import { ProductRedSocial } from '@/interfaces/productRedSocial.interface';
import { IconType } from 'react-icons';
import * as FaIcons from 'react-icons/fa';
import * as RiIcons from 'react-icons/ri';
import * as GiIcons from 'react-icons/gi';
import clsx from 'clsx';
import { initialData } from '@/seed/seed';
import { ProductGridProduct } from '../productos/ProductGridProduct';

interface Props {
  products: ProductRedSocial[];
}

export const ProductGridWithSectionFilter = ({ products }: Props) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Obtener todas las secciones que aparecen en los productos
  const seccionesConProductos = useMemo(() => {
    const sectionIds = new Set(products.flatMap(p => p.sections));
    return initialData.secciones
      .filter(sec => sectionIds.has(sec.id))
      .sort((a, b) => a.order - b.order);
  }, [products]);

  const getIconComponent = (iconName: string): IconType | null => {
    return (FaIcons as any)[iconName] || (RiIcons as any)[iconName] || (GiIcons as any)[iconName] || null;
  };

  const productosFiltrados = useMemo(() => {
    if (!selectedSectionId) return products;
    return products.filter(p => p.sections.includes(selectedSectionId));
  }, [products, selectedSectionId]);

  return (
    <div className="w-full sp:mb-0 mb-20">
      <div className="flex overflow-x-auto justify-around gap-4 p-2 bg-white shadow rounded-xl mb-2">
        {seccionesConProductos.map((sec) => {
          const Icon = getIconComponent(sec.iconName);
          const isSelected = selectedSectionId === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setSelectedSectionId(isSelected ? null : sec.id)}
              className={clsx(
                'flex flex-col items-center justify-center px-3 py-0 rounded-xl transition-colors',
                isSelected ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
              )}
            >
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xl mb-1',
                  isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200'
                )}
              >
                {Icon && <Icon />}
              </div>
              <span className="text-xs font-medium text-center">{sec.nombre}</span>
            </button>
          );
        })}
      </div>

      <ProductGridProduct products={productosFiltrados} />
    </div>
  );
};
