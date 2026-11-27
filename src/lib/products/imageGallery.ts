import "server-only";
import type { Prisma } from "@prisma/client";

export async function lockProduct(
  tx: Prisma.TransactionClient,
  productId: string,
) {
  await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
}
export async function replaceGallery(
  tx: Prisma.TransactionClient,
  productId: string,
  urls: string[],
  expected?: string[],
) {
  await lockProduct(tx, productId);
  const current = await tx.image.findMany({
    where: { productId },
    select: { id: true, url: true },
  });
  const sorted = (list: string[]) => JSON.stringify([...new Set(list)].sort());
  if (expected && sorted(current.map((i) => i.url)) !== sorted(expected))
    throw new Error(
      "La galería cambió. Recarga las imágenes antes de guardar.",
    );
  const desired = [...new Set(urls)];
  const removed = current
    .filter((i) => !desired.includes(i.url))
    .map((i) => i.id);
  if (removed.length)
    await tx.image.deleteMany({ where: { id: { in: removed }, productId } });
  const existing = new Set(current.map((i) => i.url));
  const added = desired.filter((url) => !existing.has(url));
  if (added.length)
    await tx.image.createMany({
      data: added.map((url) => ({ productId, url })),
    });
  return tx.image.findMany({
    where: { productId },
    select: { id: true, url: true },
  });
}
