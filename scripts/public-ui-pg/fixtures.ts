import prisma from "../../src/lib/prisma";
import { Prisma } from "@prisma/client";
import type { FeedContentType } from "../../src/feed/feed-ids";
import { makeRows } from "../../e2e/geography-pagination/data.cjs";

export async function assertIsolatedDatabase() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    url.hostname !== "127.0.0.1" ||
    url.port !== "55439" ||
    url.pathname !== "/myckeo_public_audit"
  ) {
    throw new Error("Unsafe database target");
  }
  const [info] = await prisma.$queryRaw<
    { database: string; version: string }[]
  >`
    SELECT current_database() AS database, version() AS version`;
  if (info.database !== "myckeo_public_audit")
    throw new Error("Unexpected database");
  return info;
}

export async function resetFixtures() {
  await assertIsolatedDatabase();
  const usuario = { email: { endsWith: "@public-audit.invalid" } };
  await prisma.publicacion.deleteMany({ where: { usuario } });
  await prisma.negocio.deleteMany({ where: { usuario } });
  await prisma.usuario.deleteMany({ where: usuario });
  for (const category of [
    { id: "2", slug: "comida" },
    { id: "1", slug: "moda" },
  ]) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {},
      create: { ...category, nombre: category.slug },
    });
  }
}

export async function insertFixtures(
  type: FeedContentType,
  counts = { local: 27, dept: 3, national: 6 },
  excluded = true,
) {
  const rows = makeRows(type, counts, excluded);
  const businesses = rows.map((row) =>
    type === "businesses" ? row : row.negocio,
  );
  await prisma.usuario.createMany({
    data: businesses.map((b) => ({
      id: `u-${b.id}`,
      nombre: "Auditoría",
      apellido: "Sintética",
      username: `u-${b.id}`,
      email: `${b.id}@public-audit.invalid`,
      contraseña: "audit-unusable-no-login",
      ciudad: b.ciudad,
      departamento: b.departamento,
      genero: "otro" as const,
      fechaNacimiento: new Date("1990-01-01"),
      role: "negocio" as const,
      estado: "activo" as const,
      perfilCompleto: true,
      isPlaceholder: false,
      preferencias: [],
    })),
  });
  await prisma.negocio.createMany({
    data: businesses.map((b) => ({
      id: b.id,
      usuarioId: `u-${b.id}`,
      nombre: b.nombre,
      slug: b.slug,
      descripcion: b.descripcion,
      ciudad: b.ciudad,
      departamento: b.departamento,
      imagenes: [],
      telefonoContacto: "+573100000000",
      estado: "activo" as const,
      isTestData: b.isTestData,
      archivedAt: null,
      orden: b.orden,
      createdAt: b.createdAt,
      fotoPerfil: "/imgs/iconos/comidas.png",
      fotoPortada: "/imgs/iconos/comidas.png",
    })),
  });
  await prisma.negocioCategory.createMany({
    data: businesses.map((b) => ({
      negocioId: b.id,
      categoryId: b.categorias[0].category.slug === "comida" ? "2" : "1",
    })),
  });
  if (type === "products") {
    const data = rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      slug: row.slug,
      precio: row.precio,
      descripcion: row.descripcion,
      descripcionCorta: row.descripcionCorta,
      categoryId: row.categoryId,
      negocioId: row.negocio.id,
      status: row.status,
      tags: [],
      componentes: [],
      stock: 10,
      stockIlimitado: false,
      usaVariantes: false,
      orden: row.orden,
      createdAt: row.createdAt,
      prioridad: 0,
    })) as Prisma.ProductCreateManyInput[];
    await prisma.product.createMany({ data });
    await prisma.image.createMany({
      data: rows.map((row) => ({
        id: `image-${row.id}`,
        productId: row.id,
        url: "/imgs/iconos/comidas.png",
      })),
    });
  } else if (type === "services") {
    await prisma.servicio.createMany({
      data: rows.map((row) => ({
        id: row.id,
        titulo: row.titulo,
        slug: row.slug,
        descripcion: row.descripcion,
        negocioId: row.negocio.id,
        precio: row.precio,
        status: row.status,
        orden: row.orden,
        createdAt: row.createdAt,
        tags: [],
      })) as Prisma.ServicioCreateManyInput[],
    });
  } else if (type === "publications") {
    await prisma.publicacion.createMany({
      data: rows.map((row) => ({
        id: row.id,
        usuarioId: `u-${row.negocio.id}`,
        negocioId: row.negocio.id,
        titulo: row.titulo,
        descripcion: row.descripcion,
        tipo: row.tipo,
        visibilidad: row.visibilidad,
        orden: row.orden,
        createdAt: row.createdAt,
      })) as Prisma.PublicacionCreateManyInput[],
    });
  }
  return rows.map((row) => ({
    id: row.id,
    tier: row.negocio
      ? row.negocio.ciudad === "Tunja"
        ? 0
        : row.negocio.departamento === "Boyacá"
          ? 1
          : 2
      : row.ciudad === "Tunja"
        ? 0
        : row.departamento === "Boyacá"
          ? 1
          : 2,
  }));
}
