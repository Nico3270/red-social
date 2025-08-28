
import React from 'react';
import { ProductCard } from './ProductCard';
import { ProductRedSocial } from '@/interfaces/productRedSocial.interface';


interface Props {
  products: ProductRedSocial[];
}

export const ProductGridProduct = ({ products }: Props) => {
   if (!products || products.length === 0) {return null}
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-4 w-full mb-20 ">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
};
