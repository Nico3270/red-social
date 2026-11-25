import { insertFixtures } from "../public-ui-pg/fixtures";
import prisma from "../../src/lib/prisma";
import { initialData } from "../../src/seed/seed";
import bcrypt from "bcryptjs";
import { writeFileSync } from "node:fs";
async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    url.hostname !== "127.0.0.1" ||
    url.port !== "55441" ||
    url.pathname !== "/myckeo_owner_audit"
  )
    throw new Error("Wrong isolated database");
  const [database] = await prisma.$queryRaw<
    { name: string; version: string }[]
  >`SELECT current_database() AS name, version() AS version`;
  if (database.name !== "myckeo_owner_audit") throw new Error("Wrong database");
  for (const category of initialData.categorias)
    await prisma.category.upsert({
      where: { id: category.id },
      update: {},
      create: { ...category },
    });
  for (const section of initialData.secciones.filter(
    (section) => section.id === "s8",
  )) {
    const { categorySlug } = section;
    const { id, nombre, slug, iconName, order, isActive } = section;
    const fields = { id, nombre, slug, iconName, order, isActive };
    const category = initialData.categorias.find(
      (c) => c.slug === categorySlug,
    );
    await prisma.section.upsert({
      where: { id: section.id },
      update: {},
      create: { ...fields, categoryId: category?.id },
    });
  }
  for (const [id, complete] of [
    ["existing-personal", true],
    ["incomplete-personal", false],
  ] as const)
    await prisma.usuario.upsert({
      where: { id },
      update: {username: id.replace(/-/g,"_")},
      create: {
        id,
        nombre: "Auditoría",
        apellido: "Negocio",
        username: id.replace(/-/g,"_"),
        email: id + "@business-audit.invalid",
        contraseña: bcrypt.hashSync("AuditLocal123!", 10),
        genero: "otro",
        fechaNacimiento: new Date("1990-01-01"),
        ciudad: "Tunja",
        departamento: "Boyacá",
        perfilCompleto: complete,
        isPlaceholder: false,
        role: "user",
      },
    });
  if (
    !(await prisma.product.findUnique({ where: { id: "products-local-00" } }))
  )
    await insertFixtures("products", { local: 1, dept: 0, national: 0 }, false);
  writeFileSync(
    "docs/audits/business-entry-evidence/database.json",
    JSON.stringify(
      {
        database,
        prisma: (await import("@prisma/client")).Prisma.prismaVersion.client,
      },
      null,
      2,
    ),
  );
  console.log("Isolated reference data and two synthetic users ready");
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
