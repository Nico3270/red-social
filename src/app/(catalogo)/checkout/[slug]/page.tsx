import CheckoutOrder from "@/address/componentes/CheckoutOrders";

// src/app/cart/page.tsx
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché



interface Props {
    params: Promise<
        { slug: string; }>
}

export default async function CarroPage({ params }: Props) {
    const { slug } = await params;
  return (
    <div className="w-full mx-auto p-4 sm:mt-40">
     <CheckoutOrder slug={slug} />
    </div>
  );
}
