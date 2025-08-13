import { auth } from "@/auth.config"; // o getServerSession
import prisma from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";

export async function GET() {
    const session = await auth(); // Esto se ejecuta en el servidor
    if (!session?.user) {
        return new Response("No autorizado", { status: 401 });
    }
    // Asegúrate de que el usuario tenga un negocio asociado
    if (!session.user.negocioId) {
        return new Response("El usuario no cuenta con un negocio", { status: 401 });
    }


    const productos = await prisma.product.findMany({
        where: {
            negocioId: session.user.negocioId,
            status: ProductStatus.disponible, // Solo productos disponibles para autocomplete
        },
        select: {
            id: true,
            nombre: true,
            precio: true,
        },
        orderBy: {
            nombre: "asc", // Ordenar alfabéticamente para mejor UX en autocomplete
        },
    });

    return Response.json(productos);
}