import "server-only";

import prisma from "@/lib/prisma";
import { EstadoNegocio, Role } from "@prisma/client";

export type CreateNegocioCoreInput = {
  usuarioId: string;
  nombre: string;
  descripcion: string;
  ciudad: string;
  departamento: string;
  direccion: string;
  telefonoContacto: string | null;
  categoriaIds: string[];
  seccionIds: string[];
};

export type CreateNegocioCoreResult = {
  ok: boolean;
  message: string;
  negocioId: string;
  slugNegocio: string;
};

const failure = (message: string): CreateNegocioCoreResult => ({
  ok: false,
  message,
  negocioId: "",
  slugNegocio: "",
});

async function generateSlug(nombre: string, ciudad: string): Promise<string> {
  const randomId = Math.random().toString(36).substring(2, 6);
  const baseSlug = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const ciudadBase = ciudad
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  let slug = `${baseSlug}-${ciudadBase}-${randomId}`;
  let counter = 1;

  while (await prisma.negocio.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${ciudadBase}-${randomId}-${counter}`;
    counter++;
  }

  return slug;
}

export async function createNegocioCore(
  input: CreateNegocioCoreInput,
): Promise<CreateNegocioCoreResult> {
  try {
    const {
      usuarioId,
      nombre,
      descripcion,
      ciudad,
      departamento,
      direccion,
      telefonoContacto,
      categoriaIds,
      seccionIds,
    } = input;

    if (
      !nombre ||
      !descripcion ||
      !ciudad ||
      categoriaIds.length === 0 ||
      seccionIds.length === 0 ||
      !departamento
    ) {
      return failure("Faltan datos obligatorios.");
    }

    if (!usuarioId) {
      return failure("El ID del usuario es obligatorio.");
    }

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuarioExistente) {
      return failure("El usuario especificado no existe.");
    }

    const negocioExistente = await prisma.negocio.findUnique({
      where: { usuarioId },
    });

    if (negocioExistente) {
      return failure("El usuario ya tiene un negocio asociado.");
    }

    const categoriasExistentes = await prisma.category.findMany({
      where: { id: { in: categoriaIds } },
    });

    if (categoriasExistentes.length !== categoriaIds.length) {
      return failure("Una o más categorías no existen.");
    }

    const seccionesExistentes = await prisma.section.findMany({
      where: { id: { in: seccionIds } },
    });

    if (seccionesExistentes.length !== seccionIds.length) {
      return failure("Una o más secciones no existen.");
    }

    const slug = await generateSlug(nombre, ciudad);

    const nuevoNegocio = await prisma.$transaction(async (tx) => {
      const negocio = await tx.negocio.create({
        data: {
          nombre,
          slug,
          descripcion,
          ciudad,
          departamento,
          direccion,
          telefonoContacto: telefonoContacto || undefined,
          estado: EstadoNegocio.activo,
          usuarioId,
          imagenes: [],
        },
      });

      await tx.usuario.update({
        where: { id: usuarioId },
        data: { role: Role.negocio },
      });

      await tx.negocioCategory.createMany({
        data: categoriaIds.map((categoryId) => ({
          negocioId: negocio.id,
          categoryId,
        })),
      });

      await tx.negocioSection.createMany({
        data: seccionIds.map((sectionId) => ({
          negocioId: negocio.id,
          sectionId,
          prioridad: 0,
        })),
      });

      return negocio;
    });

    return {
      ok: true,
      message: "Negocio creado exitosamente.",
      negocioId: nuevoNegocio.id,
      slugNegocio: slug,
    };
  } catch {
    return failure("Error al crear el negocio.");
  }
}
