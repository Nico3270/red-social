"use server"

import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import prisma from "@/lib/prisma";


interface ProductosNegocioBySlug {
    ok: boolean;
    products?: ProductRedSocial[];
    message?: string;
}

export const getNegocioProductsBySlug = async (slug:string): Promise<ProductosNegocioBySlug> => {
    try {
        console.log("Iniciando getNegocioProductsBySlug con slug:", slug);

        if (!slug) {
            return { ok: false, message: "El slug del negocio es obligatorio." };
        }
        console.log("slug del negocio", {slug});

        const products = await prisma.product.findMany({
            where: { negocio: { slug } },
            select: {
                id: true,
                nombre: true,
                precio: true,
                slug: true,
                status: true,
                descripcion: true,
                descripcionCorta: true,
                prioridad: true,
                tags: true,
                categoryId: true,
                componentes: true,
                category: {
                    select: {
                        nombre: true,
                        slug: true,
                    },
                },
                secciones: {
                    select: {
                        section: {
                            select: {
                                nombre: true,
                                slug: true,
                                id: true,
                            },
                        },
                    },
                },
                negocio: {
                    select: {
                        id: true,
                        nombre: true,
                        slug: true,
                        telefonoContacto: true,
                    }
                },
                imagenes: {
                    select: {
                        url: true,
                    }
                },
            },
        });
        console.log({products});

        if (!products || products.length === 0) {
            return { ok: false, message: "No se encontraron productos para este negocio." };
        }
        const formattedProducts: ProductRedSocial[] = products.map(product => ({
            id: product.id,
            nombre: product.nombre,
            precio: product.precio,
            descripcion: product.descripcion || "",
            descripcionCorta: product.descripcionCorta || "",
            slug: product.slug,
            prioridad: product.prioridad || 1,
            status: product.status,
            tags: product.tags,
            categoriaId: product.categoryId,
            imagenes: product.imagenes.map(img => img.url),
            componentes: product.componentes,
            sections: product.secciones.map((s) => s.section.id),
            slugNegocio: product.negocio.slug,
            nombreNegocio: product.negocio.nombre,
            telefonoContacto: product.negocio.telefonoContacto || "",
        }));

        return { ok: true, products: formattedProducts, message:"productos obtenidos exitosamente" };
    } catch (error) {
        console.error("Error en getNegocioProductsBySlug:", error);
        return { ok: false, message: "Error al obtener los productos del negocio." };
    }
}

