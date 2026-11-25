import prisma from "../../src/lib/prisma";
async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    url.hostname !== "127.0.0.1" ||
    url.port !== "55441" ||
    url.pathname !== "/myckeo_owner_audit"
  )
    throw new Error("Not isolated");
  const owner = await prisma.usuario.findUnique({
    where: { email: "new-owner@business-audit.invalid" },
  });
  if (owner) {
    await prisma.negocio.deleteMany({ where: { usuarioId: owner.id } });
    await prisma.usuario.delete({ where: { id: owner.id } });
  }
  await prisma.usuario.update({
    where: { id: "incomplete-personal" },
    data: { perfilCompleto: false },
  });
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
