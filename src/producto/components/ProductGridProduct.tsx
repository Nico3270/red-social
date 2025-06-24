
import { Product } from '@/interfaces/product.interface';
import { ProductCard } from '@/seccion/componentes/ProductCard';
import React from 'react';


interface Props {
  products: Product[];
}

export const ProductGridProduct = ({ products }: Props) => {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-4 w-full ">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
};
