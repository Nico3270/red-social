// src/app/cart/page.tsx
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
import { ProductsInCart } from "@/carro/componentes/ProductsInCart";
import { titulosPrincipales } from "@/config/fonts";



export default function CarroPage() {
  return (
    <div className="w-full p-4 sm:mt-40 mb-20">
      <h1
        className={`text-3xl font-bold my-4 text-center pt-2 ${titulosPrincipales.className} text-gray-800`}
      >
          Tu Carrito de Compras
      </h1>
      <ProductsInCart />
    </div>
  );
}
