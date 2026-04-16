export const dynamic = "force-dynamic";
import { ProductsInCart } from "@/carro/componentes/ProductsInCart";
import { titulosPrincipales } from "@/config/fonts";

export default function CarroPage() {
  return (
    <section className="w-full px-4 pb-20 pt-0 sm:mt-48">
      <div className="mx-auto max-w-7xl">
        <h1
          className={`text-3xl font-bold my-4 text-center pt-2 ${titulosPrincipales.className} text-gray-800`}
        >
          Tu Carrito de Compras
        </h1>
        <p className="mx-auto mb-6 max-w-3xl text-center text-sm text-gray-500 sm:text-base">
          Revisa las cantidades, los precios y la variante elegida. Luego puedes seguir
          con todo el pedido o avanzar negocio por negocio.
        </p>
        <ProductsInCart />
      </div>
    </section>
  );
}
