// src/app/cart/page.tsx
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
import { OrderSummaryWithActions } from "@/carro/componentes/OrderSummaryWithActions";
import { ProductsInCart } from "@/carro/componentes/ProductsInCart";
import {  titulosPrincipales } from "@/config/fonts";



export default function CaroPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className={`text-3xl font-bold mb-2 text-center color-titulos pt-4 ${titulosPrincipales.className}`}>
        Tu Carrito de Compras
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Columna principal para los productos */}
        <div className="w-full lg:w-2/3">
          <ProductsInCart />
        </div>

        {/* Resumen de la orden */}
        <div className="w-full lg:w-1/3 bg-white p-4 shadow-md rounded-lg lg:sticky lg:top-24 pb-20">
          <OrderSummaryWithActions />
        </div>
      </div>
    </div>
  );
}
