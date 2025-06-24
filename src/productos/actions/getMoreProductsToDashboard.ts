"use server";

import { Product } from "@/interfaces/product.interface";
import { getProductsToDashboard } from "./getProductsToDashboard";

export async function fetchMoreProducts({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}): Promise<Product[]> {
  const data = await getProductsToDashboard({ page, pageSize });
  
  // Si no hay productos en la página solicitada, devuelve un array vacío
  return data.products.length > 0 ? data.products : [];
}
