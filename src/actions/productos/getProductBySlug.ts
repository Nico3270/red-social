"use server"


import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import prisma from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";




interface GetProductBySlug {
    ok: boolean;
    product?: ProductRedSocial;
    message?: string;
    userId: string;
    productosSimilares?: ProductRedSocial[];
    telefonoNegocio?: string;
    nombreNegocio?: string;
}

// Esta server action obtiene un producto por su slug y devuelve información adicional como productos similares y datos del negocio.
// Se utiliza para mostrar detalles del producto en la página de producto. Se muestran productos similares del mismo negocio y categoría, limitando a 4 productos similares.
// También incluye información del negocio como nombre y teléfono de contacto. Para que cada card de un producto tenga un botón de whatsapp y se pueda crear un link personalizado para contactar al negocio directamente desde la página del producto.

export const getProductBySlug = async (slug: string): Promise<GetProductBySlug> => {
    try {
        if (!slug) {
            return { ok: false, message: "El slug del producto es obligatorio.", userId: "Error", productosSimilares: [], telefonoNegocio: "", nombreNegocio: "" };
        }
        const product = await prisma.product.findUnique({
            where: { slug },
            select: {
                id: true,
                nombre: true,
                precio: true,
                descripcion: true,
                descripcionCorta: true,
                slug: true,
                prioridad: true,
                status: true,
                tags: true,
                categoryId: true,
                componentes: true,
                negocioId: true,
                imagenes: {
                    select: {
                        url: true,
                    },
                },
                secciones: {
                    select: {
                        section: {
                            select: {
                                id: true,
                                slug: true,
                            },
                        },
                    },
                },
            },
        });
        if (!product) {
            return { ok: false, message: "Producto no encontrado.", userId: "", productosSimilares: [], telefonoNegocio: "", nombreNegocio: "" };
        }
        console.log("Producto encontrado:", product.id);



        // Búsqueda de datos del negocio
        const negocio = await prisma.negocio.findUnique({
            where: { id: product.negocioId },
            select: {

                nombre: true,
                telefonoContacto: true,
                slug: true,
               
            },
        });

        const productFormatted: ProductRedSocial = {
            id: product.id,
            nombre: product.nombre,
            precio: product.precio,
            descripcion: product.descripcion,
            descripcionCorta: product.descripcionCorta || "",
            slug: product.slug,
            prioridad: product.prioridad || 1,
            status: product.status,
            tags: product.tags,
            categoriaId: product.categoryId,
            componentes: product.componentes,
            imagenes: product.imagenes.map((img) => img.url),
            sections: product.secciones.map((seccion) => seccion.section.id),
            slugNegocio: negocio?.slug || "",
            nombreNegocio: negocio?.nombre || "",
            telefonoContacto: negocio?.telefonoContacto || "",
        }

        if (!negocio) {
            return { ok: true, message: "Negocio no encontrado.", userId: product.negocioId, productosSimilares: [], telefonoNegocio: "", nombreNegocio: "", product: productFormatted };
        }

        //Busqueda de productos similares por negocio



        console.log("Consultando productos similares...");
        const productosSimilares = await prisma.product.findMany({
            where: {
                negocioId: product.negocioId,
                categoryId: product.categoryId,
                id: { not: product.id }, // Exclude the current product
                status: ProductStatus.disponible, // Only include available products
            },
            select: {
                id: true,
                nombre: true,
                precio: true,
                descripcion: true,
                descripcionCorta: true,
                slug: true,
                prioridad: true,
                status: true,
                tags: true,
                categoryId: true,
                componentes: true,
                negocioId: true,
                imagenes: {
                    select: {
                        id: true,
                        url: true,
                    },
                },
                secciones: {
                    select: {
                        section: {
                            select: {
                                id: true,
                                slug: true,
                            },
                        },
                    },
                },
            },

            take: 4, // Limit to 4 similar products
            orderBy: { prioridad: "desc" }, // Sort by priority
        })

        if (!productosSimilares) {
            return { ok: true, message: "Sin productos similares", userId: product.negocioId, productosSimilares: [], telefonoNegocio: negocio.telefonoContacto || "", nombreNegocio: negocio.nombre, product: productFormatted };
        }
        console.log("Productos similares encontrados:", productosSimilares.length);

        const formattedProductosSimilares: ProductRedSocial[] = productosSimilares.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            precio: p.precio,
            descripcion: p.descripcion,
            descripcionCorta: p.descripcionCorta || "",
            seccionIds: p.secciones.map((s) => s.section.id),
            slug: p.slug,
            prioridad: p.prioridad || 1,
            status: p.status,
            tags: p.tags,
            categoriaId: p.categoryId,
            componentes: p.componentes,
            imagenes: p.imagenes.map((img) => img.url),
            sections: p.secciones.map((seccion) => seccion.section.id),
            telefonoContacto: negocio.telefonoContacto || "",
            slugNegocio: negocio.slug || "",
            nombreNegocio: negocio.nombre || "",    
        }));


        return {
            ok: true,
            product: productFormatted,
            userId: product.negocioId,
            productosSimilares: formattedProductosSimilares,
            telefonoNegocio: negocio.telefonoContacto || "",
            nombreNegocio: negocio.nombre || "",
        };
    } catch (error) {
        console.error("Error al obtener el producto:", error);
        return {
            ok: false,
            message: "Error al obtener el producto.",
            userId: "",
            productosSimilares: [],
            telefonoNegocio: "",
            nombreNegocio: "",
        };
    }
}