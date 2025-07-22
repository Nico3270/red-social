"use server";


import { v2 as cloudinary } from "cloudinary";
import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { Prisma, Product, ProductStatus } from "@prisma/client";
import { auth } from "@/auth.config";

if (!process.env.CLOUDINARY_URL) {
    throw new Error("CLOUDINARY_URL no está configurado en las variables de entorno.");
}
cloudinary.config(process.env.CLOUDINARY_URL || "");

interface CreacionProduct {
    ok: boolean;
    message: string;
    product?: Product
}

export async function createProduct(formData: FormData): Promise<CreacionProduct> {
    const session = await auth();
    if (!session || !session.user) {
        return { ok: false, message: "No estás autenticado. Por favor, inicia sesión." };
    }

    try {
        const usuarioId = session.user.id; // Usar session.user.id directamente

        const negocio = await prisma.negocio.findUnique({
            where: { usuarioId },
            select: { id: true },
        });
        if (!negocio) {
            return { ok: false, message: "El usuario no tiene un negocio asociado." };
        }


        console.log("Extrayendo datos del formData...");
        const nombre = formData.get("nombre") as string;
        const precio = parseFloat(formData.get("precio") as string);
        const descripcion = formData.get("descripcion") as string;
        const descripcionCorta = formData.get("descripcionCorta") as string | null;
        const slug = formData.get("slug") as string;
        const prioridad = formData.get("prioridad") ? parseInt(formData.get("prioridad") as string) : null;
        const status = formData.get("status") as ProductStatus;
        const tags = (formData.get("tags") as string)?.split(",").map((tag) => tag.trim()).filter(Boolean) || [];
        const seccionIds = formData.getAll("seccionIds") as string[];
        const imageUrls = formData.getAll("imageUrls") as string[];
        const componentes = formData.getAll("componentes") as string[];
        const categoryId = formData.get("categoriaId") as string;

        console.log("Datos extraídos:", {
            nombre,
            precio,
            descripcion,
            descripcionCorta,
            slug,
            prioridad,
            status,
            tags,
            seccionIds,
            imageUrls,
            componentes,
            categoryId,
            usuarioId,
        });

        // Validaciones
        if (!nombre || !descripcion || isNaN(precio) || imageUrls.length === 0 || !categoryId) {
            return { ok: false, message: "Faltan datos obligatorios: nombre, descripción, precio, imágenes o categoría." };
        }

        if (prioridad !== null && isNaN(prioridad)) {
            return { ok: false, message: "La prioridad debe ser un número válido o estar vacía." };
        }

        const validStatuses = Object.values(ProductStatus);
        if (!validStatuses.includes(status)) {
            return { ok: false, message: `El estado '${status}' no es válido. Usa: ${validStatuses.join(", ")}.` };
        }

        const categoryExists = await prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!categoryExists) {
            return { ok: false, message: "La categoría especificada no existe." };
        }

        const existingProduct = await prisma.product.findUnique({
            where: { slug },
        });
        if (existingProduct) {
            return { ok: false, message: "El slug ya está en uso. Por favor, genera un nuevo slug." };
        }

        const cloudinaryUrlPattern = /^https:\/\/res\.cloudinary\.com\//;
        if (!imageUrls.every((url) => cloudinaryUrlPattern.test(url))) {
            return { ok: false, message: "Una o más URLs de imágenes no son válidas." };
        }

        // Validar secciones antes de la transacción
        if (seccionIds.length > 0) {
            const sectionsExist = await prisma.section.findMany({
                where: { id: { in: seccionIds } },
            });
            if (sectionsExist.length !== seccionIds.length) {
                return { ok: false, message: "Una o más secciones especificadas no existen." };
            }
        }

        console.log("Datos enviados a tx.product.create:", {
            nombre,
            precio,
            descripcion,
            descripcionCorta: descripcionCorta || undefined,
            slug,
            prioridad,
            status,
            componentes,
            negocioId: negocio.id,
            categoryId,
            imagenes: imageUrls.map((url) => ({ url })),
            tags,
        });
        const product = await prisma.$transaction(async (tx) => {
            const newProduct = await tx.product.create({
                data: {
                    nombre,
                    precio,
                    descripcion,
                    descripcionCorta: descripcionCorta || undefined, // Convertir "" a undefined
                    slug,
                    prioridad,
                    status,
                    componentes,
                    negocioId: negocio.id,
                    categoryId,
                    imagenes: {
                        create: imageUrls.map((url) => ({ url })),
                    },
                    tags,
                },
            });
            console.log("Validando secciones...");
            // Relacionar el producto con las secciones si existen
            if (seccionIds.length > 0) {
                const sectionsExist = await tx.section.findMany({
                    where: { id: { in: seccionIds } },
                });
                if (sectionsExist.length !== seccionIds.length) {
                    throw new Error("Una o más secciones especificadas no existen.");
                }

                console.log("Creando relaciones con secciones...");
                await tx.productSection.createMany({
                    data: seccionIds.map((sectionId) => ({
                        productId: newProduct.id,
                        sectionId,
                    })),
                });
            }

            return newProduct;
        });
        console.log("Producto creado exitosamente:", product);
        return { ok: true, product, message: "Producto creado exitosamente." };
    } catch (error) {
        // Verificar si el error es de Prisma
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.log("Error capturado en createProduct:", error);
            if (error.code === "P2002") {
                return { ok: false, message: "El slug ya está en uso." };
            }
            if (error.code === "P2003") {
                return { ok: false, message: "Error de integridad: usuario o categoría no válidos." };
            }
        }
        // Manejar otros errores
        console.error("Error al crear producto:", error);
        // Asegurarse de que error.message sea accesible
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        return { ok: false, message: `Error inesperado al crear el producto: ${errorMessage}` };
    }
}



// Server action para generar la descripción del producto

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Usa la API Key de OpenAI
});

export async function generateDescriptionFromText(
    nombreProducto: string,
    caracteristicas: string,
    componentes: string[]
) {
    try {
        if (!nombreProducto.trim() || !caracteristicas.trim() || componentes.length === 0) {
            return {
                ok: false,
                message: "Se requieren el título del producto, características generales y los componentes para generar la descripción.",
            };
        }

        // Convertir los componentes en una lista formateada
        const componentesTexto = componentes.join(", ");

        // Llamada a OpenAI para generar la descripción optimizada
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content:
                        "Eres un experto en ecommerce y SEO. Basado en el título, la descripción general y la lista de componentes del producto, genera:\n\
            - Una **Descripción Detallada** clara y profesional, sin exageraciones de ventas.\n\
            - Una **Descripción Corta** de máximo 20 palabras, mencionando los elementos principales.\n\
            - Una lista de **Palabras Clave (Tags)** optimizadas para SEO, separadas por comas.",
                },
                {
                    role: "user",
                    content: `Título del producto: "${nombreProducto}".\n\
                    Descripción general: "${caracteristicas}".\n\
                    Componentes incluidos: "${componentesTexto}".\n\
                    Genera una descripción detallada, una descripción corta y palabras clave SEO. No agregues encabezados ni numeración.`,
                },
            ],
            max_tokens: 400,
            temperature: 0.6,
        });

        const responseText = response.choices[0]?.message?.content || "";

        // Separar la respuesta en líneas y filtrar vacíos
        const sections = responseText.split("\n").filter((line) => line.trim() !== "");

        return {
            ok: true,
            description: sections[0] || "No se pudo generar una descripción detallada.",
            shortDescription: sections[1] || "No se pudo generar una descripción corta.",
            tags: sections[2] ? sections[2].split(",").map((tag) => tag.trim()) : [],
        };
    } catch (error) {
        console.error("Error al generar contenido con OpenAI:", error);
        return { ok: false, message: "Error al generar la descripción y tags con OpenAI." };
    }
}

