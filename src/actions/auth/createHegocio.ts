// /ui/actions/productos/getProductById.ts
"use server";

import prisma from "@/lib/prisma";
import { EstadoNegocio, ProductStatus, Role } from "@prisma/client";


interface CreacionNegocio {
    ok: boolean;
    message: string;
    negocioId: string;
    slugNegocio: string;
}

// Generar slug automático
const generateSlug = async (nombre: string, ciudad: string): Promise<string> => {
    const randomId = Math.random().toString(36).substring(2, 6);
    const baseSlug = nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
    let ciudadBase = ciudad
    .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
    let slug = `${baseSlug}-${ciudadBase}-${randomId}`;

    // Verificar unicidad del slug
    let counter = 1;
    while (await prisma.negocio.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${ciudadBase}-${randomId}-${counter}`;
        counter++;
    }

    return slug;
};


export async function createNegocio(formData: FormData): Promise<CreacionNegocio> {

    console.log("Extracción de datos del formulario...");
    try {
        const nombre = formData.get("nombre") as string;
        const descripcion = formData.get("descripcion") as string;
        const ciudad = formData.get("ciudad") as string;
        const departamento = formData.get("departamento") as string;
        const direccion = formData.get("direccion") as string;
        const telefonoContacto = formData.get("telefonoContacto") as string | null;
        const usuarioId = formData.get("usuarioId") as string;
        const categoriaIds = formData.getAll("categoriaIds") as string[];
        const seccionesIds = formData.getAll("seccionIds") as string[];

        // Validaciones
        console.log("Validando datos obligatorios...");
        console.log({ nombre, descripcion, ciudad, categoriaIds, seccionesIds, departamento, direccion, telefonoContacto, usuarioId });
        if (!nombre || !descripcion || !ciudad || categoriaIds.length === 0 || seccionesIds.length === 0 || !departamento ) {
            return { ok: false, message: "Faltan datos obligatorios.", negocioId: "", slugNegocio: "" };
        }

        console.log("Validación de ID de usuario...");

        if (!usuarioId) {
            return { ok: false, message: "El ID del usuario es obligatorio.", negocioId: "", slugNegocio: "" };
        }

        console.log("Validando usuario...");
        // Validar que el usuario existe
        const usuarioExists = await prisma.usuario.findUnique({
            where: { id: usuarioId },
        });
        if (!usuarioExists) {
            return { ok: false, message: "El usuario especificado no existe.", negocioId: "", slugNegocio: "" };
        }

        // Validar que el usuario no tenga un negocio asociado
        const negocioExistente = await prisma.negocio.findUnique({
            where: { usuarioId },
        });
        if (negocioExistente) {
            return { ok: false, message: "El usuario ya tiene un negocio asociado.", negocioId: "", slugNegocio: "" };
        }

        // Validar que las categorías existen
        const categoriasValidas = await prisma.category.findMany({
            where: { id: { in: categoriaIds } },
        });
        if (categoriasValidas.length !== categoriaIds.length) {
            return { ok: false, message: "Una o más categorías no existen.", negocioId: "", slugNegocio: "" };
        }

        // Validar que las secciones existen
        const seccionesValidas = await prisma.section.findMany({
            where: { id: { in: seccionesIds } },
        });
        if (seccionesValidas.length !== seccionesIds.length) {
            return { ok: false, message: "Una o más secciones no existen.", negocioId: "", slugNegocio: "" };
        }

        // Generar slug personalizado
        const slugPersonalizado = await generateSlug(nombre, ciudad);

        // Crear el negocio, asociarlo al usuario, cambiar el rol y asociar categorías/secciones en una transacción
        const negocio = await prisma.$transaction(async (tx) => {
            // Crear el negocio
            const nuevoNegocio = await tx.negocio.create({
                data: {
                    nombre,
                    slug: slugPersonalizado,
                    descripcion,
                    ciudad,
                    departamento,
                    direccion,
                    telefonoContacto: telefonoContacto || undefined,
                    estado: EstadoNegocio.activo,
                    usuarioId,
                    imagenes: [], // Inicializar como array vacío
                },
            });

            // Actualizar el rol del usuario a 'negocio'
            await tx.usuario.update({
                where: { id: usuarioId },
                data: { role: Role.negocio },
            });

            // Asociar categorías
            const negocioCategorias = categoriaIds.map((categoryId) => ({
                negocioId: nuevoNegocio.id,
                categoryId,
            }));
            await tx.negocioCategory.createMany({
                data: negocioCategorias,
            });

            // Asociar secciones
            const negocioSecciones = seccionesIds.map((sectionId) => ({
                negocioId: nuevoNegocio.id,
                sectionId,
                prioridad: 0, // Puedes ajustar la prioridad si es necesario
            }));
            await tx.negocioSection.createMany({
                data: negocioSecciones,
            });

            return nuevoNegocio;
        });

        console.log("Negocio creado exitosamente:", negocio);
        return {
            ok: true,
            message: "Negocio creado exitosamente.",
            negocioId: negocio.id,
            slugNegocio: slugPersonalizado,
        };

    } catch (error) {
        console.error("Error al crear negocio", error);
        return { ok: false, message: "Error al crear el negocio.", negocioId: "", slugNegocio: "" };
    }
}