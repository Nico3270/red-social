import { getProductById } from "@/actions/productos/getProductById";
import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import CreateOrUpdateProduct from "@/ui/components/productos/CreateOrUpdateProduct";
import { redirect } from "next/navigation";

interface Props {
    params: Promise<{
        id: string;
    }>;
}


export default async function ModificarProductoPage({ params }: Props) {
    const { id } = await params; 
    const session = await auth();
     if (!session?.user) {
        redirect("auth/login")
    };
    const userId = session.user.id;
    const negocioId = await prisma.negocio.findUnique({
        where: { usuarioId: userId },
        select: { id: true },
    });
    const result = await getProductById(id);
    if (!result.ok) {
        return(
            <h1>Ocurrió un error: {result.message}</h1>
        )
    };

    if( result.userId !== negocioId?.id) {
        return(
            <h1>No eres el propietario de este producto</h1>
        )
    }
  return (
    <CreateOrUpdateProduct product={result.product} />
  );
}