import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { initialData } from "../../src/seed/seed";

// This suite must never bootstrap or clean a shared or production database.
export function isolatedPrisma() {
  const value = process.env.ASSISTED_TEST_DATABASE_URL;
  if (!value) throw new Error("ASSISTED_TEST_DATABASE_URL is required");
  const url = new URL(value);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/myckeo_onboarding_v1" ||
    url.port !== "15446"
  )
    throw new Error("Refusing a non-isolated database");
  return new PrismaClient({ datasourceUrl: value });
}
export const fixturePassword = "Fictitious-Only-2026";
export const fixtureEmail = "superadmin@onboarding.invalid";
export async function seedFixtures(prisma: PrismaClient) {
  for (const c of initialData.categorias)
    await prisma.category.upsert({
      where: { id: c.id },
      create: c,
      update: {},
    });
  for (const s of initialData.secciones) {
    const category = initialData.categorias.find(
      (c) => c.slug === s.categorySlug,
    );
    if (!category) continue;
    const { href, categorySlug, ...data } = s;
    if (!(await prisma.section.findUnique({ where: { slug: s.slug } })))
      await prisma.section.create({
        data: { ...data, categoryId: category.id },
      });
  }
  const contraseña = await bcrypt.hash(fixturePassword, 10);
  for (const [name, role] of [
    ["superadmin", "super_admin"],
    ["other-owner", "negocio"],
    ["admin", "admin"],
  ] as const) {
    await prisma.usuario.upsert({
      where: { email: `${name}@onboarding.invalid` },
      update: {},
      create: {
        nombre: "Ensayo",
        apellido: "Ficticio",
        email: `${name}@onboarding.invalid`,
        username: `onboarding_${name}`,
        contraseña,
        role,
        ciudad: "Bogotá",
        departamento: "Cundinamarca",
        genero: "otro",
        fechaNacimiento: new Date("1990-01-01"),
        perfilCompleto: true,
      },
    });
  }
  await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS pg_trgm");
}
