"use server"

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

// Server action para obtener productos de un negocio y retornarlos en un objeto con id y nombre
interface Productos {
    id: string; 
    nombre: string;
}

interface Response {
  ok: boolean;
  message: string;
  productos?: Productos[];
  negocioId: string;}

export const getProductosNegocio = async ():Promise<Response> => {
    const session = await auth();
    if (!session || !session.user) {
        return { ok: false, message: "No estás autenticado. Por favor, inicia sesión.", negocioId:""};
    }
    const negocio = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        select: { negocio: true }
    });
    if (!negocio || !negocio.negocio) {
        return { ok: false, message: "No se encontró un negocio asociado a este usuario.", negocioId:"" };
    }
    const productos = await prisma.product.findMany({
        where: { negocioId: negocio.negocio.id },
        select: {
            id: true,
            nombre: true
        }
    });
    if (!productos || productos.length === 0) {
        return { ok: false, message: "No se encontraron productos para este negocio.", negocioId:"" };
    }
    return {
        ok: true,
        message: "Productos obtenidos correctamente.",
        negocioId: negocio.negocio.id,
        productos: productos.map(producto => ({
            id: producto.id,
            nombre: producto.nombre
        }))
    };   
}
