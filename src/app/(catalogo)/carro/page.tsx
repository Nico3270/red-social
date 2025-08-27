// src/app/cart/page.tsx
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
import { ProductsInCart } from "@/carro/componentes/ProductsInCart";
import { titulosPrincipales } from "@/config/fonts";



export default function CarroPage() {
  return (
    <div className="container mx-auto p-4">
      <h1
        className={`text-3xl font-bold mb-4 text-center pt-2 ${titulosPrincipales.className} text-gray-800`}
      >
        <span className="  pb-1 drop-shadow-sm">
          Tu Carrito de Compras
        </span>
      </h1>


      <div className="flex flex-col lg:flex-row gap-8">
        {/* Columna principal para los productos */}
        <div className="w-full sm:mt-40 mb-20 sm:mb-0">
          <ProductsInCart />
        </div>
      </div>
    </div>
  );
}
