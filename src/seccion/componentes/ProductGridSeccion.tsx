
import React from 'react'

import { Product } from '@/interfaces/product.interface';
import { ProductCard } from './ProductCard';


interface Props {
  products: Product[];
}

export const ProductGrid = ({ products }: Props) => {
    return (
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-4">
        {
            products.map( product => (
                <ProductCard key={product.slug} product={product} />
            ))
        }
      </div>
    );
  };

