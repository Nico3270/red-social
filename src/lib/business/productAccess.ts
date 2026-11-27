import "server-only";
import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { buildPublishedBusinessWhere } from "./business-visibility-policy";
import type { Prisma } from "@prisma/client";

export async function productActor() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado.");
  const actor = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, estado: true },
  });
  if (!actor || actor.estado !== "activo") throw new Error("No autorizado.");
  return actor;
}
export async function requireSuperAdmin() {
  const actor = await productActor();
  if (actor.role !== "super_admin") throw new Error("No autorizado.");
  return actor;
}
export function privateProductScope(actor: {
  id: string;
  role: string;
}): Prisma.ProductWhereInput {
  return actor.role === "super_admin"
    ? {}
    : { negocio: { is: { usuarioId: actor.id } } };
}
export const publishableBusinessWhere = buildPublishedBusinessWhere;

export async function assertProductWriteBusiness(
  businessId: string,
  status: string,
) {
  const business = await prisma.negocio.findFirst({
    where: {
      id: businessId,
      archivedAt: null,
      estado: { in: ["activo", "suspendido"] },
    },
    select: { id: true },
  });
  if (!business) throw new Error("El negocio no admite cambios de productos.");
  if (
    status === "disponible" &&
    !(await prisma.negocio.findFirst({
      where: { id: businessId, ...publishableBusinessWhere() },
      select: { id: true },
    }))
  ) {
    throw new Error(
      "Activa la cuenta y aprueba la publicación del negocio antes de publicar productos.",
    );
  }
}

// Serialize product writes with suspension/publication. Always lock the business
// before locking a product, so gallery updates use the same lock order.
export async function lockWritableBusiness(
  tx: Prisma.TransactionClient,
  businessId: string,
  status: string,
) {
  await tx.$queryRaw`SELECT "id" FROM "Negocio" WHERE "id" = ${businessId} FOR UPDATE`;
  const where: Prisma.NegocioWhereInput =
    status === "disponible"
      ? { id: businessId, ...publishableBusinessWhere() }
      : {
          id: businessId,
          archivedAt: null,
          estado: { in: ["activo", "suspendido"] },
        };
  if (!(await tx.negocio.findFirst({ where, select: { id: true } }))) {
    throw new Error(
      "El negocio no admite esta operación. Activa la cuenta y aprueba el negocio antes de publicar.",
    );
  }
}
