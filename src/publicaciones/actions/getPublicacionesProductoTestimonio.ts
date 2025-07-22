import prisma from "@/lib/prisma";
import { MultimediaTipo } from "@prisma/client";



interface ResenaProductoTestimonio {
    descripcion?: string;
    usuarioNombre: string;
    mediaUrl?: string;
    mediaTipo: MultimediaTipo;
    fechaCreacion: Date
}

interface ResenasEncontradasProducto {
    ok: boolean;
    message: string,
    resenas?: ResenaProductoTestimonio[]
}




export const getResenasProductoTestimonio = async (productoId: string): Promise<ResenasEncontradasProducto> => {
    if (!productoId) {
        return { ok: false, message: "El Id del producto es obligatorio" }
    }
    // Busqueda del producto

    const producto = await prisma.product.findUnique(
        {
            where: { id: productoId }

        }
    );
    if (!producto) {
        return { ok: false, message: "El producto no existe" }
    }

    try {
        // Obtener publicaciones de tipo TESTIMONIO asociadas al producto
        const publicaciones = await prisma.publicacion.findMany({
            where: {
                tipo: "TESTIMONIO",
                
                productosEnPublicacion
                : {
                    some: {
                        productoId: productoId,
                    },
                },
            },
            include: {
                usuario: {
                    select: {
                        nombre: true, // Nombre del usuario que creó la publicación
                    },
                },
                multimedia: {
                    select: {
                        url: true, // URL del medio (imagen o video)
                        tipo: true, // Tipo de medio (IMAGEN o VIDEO)
                    },
                    orderBy: {
                        orden: "asc", // Tomar el primer medio si hay varios
                    },
                    take: 1, // Limitar a un solo medio por publicación
                },
            },
        });

        // Mapear los resultados al formato ResenaProductoTestimonio
        const resenas = publicaciones.map((publicacion) => ({
            descripcion: publicacion.descripcion ?? undefined,
            usuarioNombre: publicacion.usuario.nombre,
            mediaUrl: publicacion.multimedia[0]?.url || "", // URL del primer medio, vacía si no hay
            mediaTipo: publicacion.multimedia[0]?.tipo || MultimediaTipo.IMAGEN, // Tipo del primer medio, por defecto IMAGEN
            fechaCreacion: publicacion.createdAt,
        }));

        return {
            ok: true,
            message: resenas.length > 0 ? "Reseñas encontradas" : "No se encontraron reseñas para este producto",
            resenas: resenas.length > 0 ? resenas : undefined,
        };
    } catch (error) {
        console.error("Error al obtener reseñas:", error);
        return {
            ok: false,
            message: "Ocurrió un error al intentar obtener las reseñas del producto",
        };
    }
};