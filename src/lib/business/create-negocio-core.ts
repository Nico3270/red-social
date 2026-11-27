import "server-only";

import prisma from "@/lib/prisma";
import { EstadoNegocio, Prisma, Role } from "@prisma/client";

type PublicOpeningHours = {
  timezone: string | null;
  days: Array<{
    day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    closed: boolean;
    intervals: Array<{
      opensAt: string;
      closesAt: string;
      closesNextDay: boolean;
    }>;
  }>;
};

export type CreateNegocioCoreInput = {
  usuarioId: string;
  prepararOculto?: boolean;
  nombre: string;
  descripcion: string;
  ciudad: string;
  departamento: string;
  direccion: string;
  telefonoContacto: string | null;
  categoriaIds: string[];
  seccionIds: string[];
  sitioWeb?: string | null;
  horarios?: PublicOpeningHours | null;
};

type NegocioIdentity = {
  id: string;
  slug: string;
  usuarioId: string;
};

export type CreateNegocioCoreResult = {
  message: string;
  negocioId: string;
  slugNegocio: string;
} & (
  | {
      ok: true;
      status: "CREATED" | "ALREADY_CREATED";
      negocio: NegocioIdentity;
    }
  | { ok: false }
);

const failure = (message: string): CreateNegocioCoreResult => ({
  ok: false,
  message,
  negocioId: "",
  slugNegocio: "",
});

function success(
  status: "CREATED" | "ALREADY_CREATED",
  negocio: NegocioIdentity,
): CreateNegocioCoreResult {
  return {
    ok: true,
    status,
    negocio: {
      id: negocio.id,
      slug: negocio.slug,
      usuarioId: negocio.usuarioId,
    },
    message:
      status === "CREATED"
        ? "Negocio creado exitosamente."
        : "El usuario ya tiene un negocio asociado.",
    negocioId: negocio.id,
    slugNegocio: negocio.slug,
  };
}

function isUsuarioIdUniqueConflict(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }
  if (error.meta?.modelName && error.meta.modelName !== "Negocio") {
    return false;
  }

  const target = error.meta?.target ?? error.meta?.constraint;
  return Array.isArray(target)
    ? target.length === 1 && target[0] === "usuarioId"
    : target === "usuarioId" || target === "Negocio_usuarioId_key";
}

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
      sitioWeb,
      horarios,
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

    if (input.prepararOculto && !usuarioExistente.isPlaceholder)
      return failure("Requiere usuario provisional.");

    if (negocioExistente) {
      if (
        input.prepararOculto &&
        negocioExistente.estado !== EstadoNegocio.suspendido
      )
        return failure(
          "El negocio existente requiere revisión administrativa.",
        );
      return success("ALREADY_CREATED", negocioExistente);
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

    if (
      input.prepararOculto &&
      (categoriasExistentes.some((c) => !c.isActive) ||
        seccionesExistentes.some(
          (s) =>
            !s.isActive ||
            (s.categoryId && !categoriaIds.includes(s.categoryId)),
        ))
    ) {
      return failure("Selecciona categorías y secciones activas compatibles.");
    }
    const slug = await generateSlug(nombre, ciudad);

    let nuevoNegocio: NegocioIdentity;
    try {
      nuevoNegocio = await prisma.$transaction(async (tx) => {
        if (input.prepararOculto) {
          await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${usuarioId} FOR UPDATE`;
          const current = await tx.usuario.findUnique({
            where: { id: usuarioId },
            select: { isPlaceholder: true, estado: true },
          });
          if (!current?.isPlaceholder || current.estado !== "activo")
            throw new Error("El usuario provisional cambió.");
        }
        const negocio = await tx.negocio.create({
          data: {
            nombre,
            slug,
            descripcion,
            ciudad,
            departamento,
            sitioWeb,
            horarios: horarios === null ? Prisma.DbNull : horarios,
            direccion,
            telefonoContacto: telefonoContacto || undefined,
            estado: input.prepararOculto
              ? EstadoNegocio.suspendido
              : EstadoNegocio.activo,
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
    } catch (error) {
      if (!isUsuarioIdUniqueConflict(error)) throw error;

      // La transacción fallida ya terminó: recuperar al ganador fuera de ella.
      const existente = await prisma.negocio.findUnique({
        where: { usuarioId },
      });
      if (!existente || existente.usuarioId !== usuarioId) throw error;
      if (input.prepararOculto && existente.estado !== EstadoNegocio.suspendido)
        return failure(
          "El negocio existente requiere revisión administrativa.",
        );
      return success("ALREADY_CREATED", existente);
    }

    return success("CREATED", nuevoNegocio);
  } catch {
    return failure("Error al crear el negocio.");
  }
}
