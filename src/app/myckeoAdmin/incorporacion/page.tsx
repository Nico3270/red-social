import prisma from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/business/productAccess";
import AssistedOnboardingClient from "./AssistedOnboardingClient";

export const dynamic = "force-dynamic";
export default async function AssistedOnboardingPage() {
  await requireSuperAdmin();
  const [businesses, categories, sections] = await Promise.all([
    prisma.negocio.findMany({
      where: {
        usuario: { is: { placeholderProvisioningKeyHash: { not: null } } },
        archivedAt: null,
        estado: { not: "eliminado" },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        nombre: true,
        slug: true,
        ciudad: true,
        estado: true,
        usuario: { select: { isPlaceholder: true, perfilCompleto: true } },
        Product: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            nombre: true,
            precio: true,
            status: true,
            _count: { select: { imagenes: true } },
          },
        },
        demoLinks: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true },
          take: 1,
        },
      },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.section.findMany({
      where: { isActive: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, categoryId: true },
    }),
  ]);
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <h1 className="text-3xl font-bold">Incorporación asistida</h1>
      <p className="text-slate-600">
        Prepara el perfil suspendido, revisa el catálogo y entrega el control al
        propietario. La demo y la publicación requieren autorización.
      </p>
      <AssistedOnboardingClient
        businesses={businesses.map((b) => ({
          id: b.id,
          nombre: b.nombre,
          slug: b.slug,
          ciudad: b.ciudad,
          estado: b.estado,
          activated: !b.usuario.isPlaceholder && b.usuario.perfilCompleto,
          products: b.Product.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            precio: p.precio,
            status: p.status,
            imageCount: p._count.imagenes,
          })),
          hasDemo: b.demoLinks.length > 0,
        }))}
        categories={categories}
        sections={sections}
      />
    </main>
  );
}
