// src/app/cart/page.tsx
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
import AddresOrdenNegocio from "@/address/componentes/AddresOrdenNegocio";


export default async function CarroPage() {

  return (
    <div className="w-full mx-auto ">
     <AddresOrdenNegocio />
    </div>
  );
}
