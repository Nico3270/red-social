// src/app/cart/page.tsx
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
import AddressNegocio from "@/address/componentes/AddressForm";


interface Props {
    params: Promise<
        { slug: string; }>
}

export default async function CarroPage({ params }: Props) {
    const { slug } = await params;
  return (
    <div className="w-full mx-auto p-0 sm:mt-60">
     <AddressNegocio slug={slug}/>
    </div>
  );
}
