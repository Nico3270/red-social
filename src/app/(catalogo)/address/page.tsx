import AddressNegocioTotal from "@/address/componentes/AddressNegocioTotal";

// src/app/cart/page.tsx
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché





export default async function CarroPage() {
    
  return (
    <div className="w-full mx-auto p-4 sm:mt-40">
        <AddressNegocioTotal />     
    </div>
  );
}
