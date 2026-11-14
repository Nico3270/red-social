import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

export async function getCloudinaryActor() {
  const session = await auth();
  const id = session?.user?.id;
  if (typeof id !== "string" || !id.trim()) return null;
  const user = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, estado: true },
  });
  return user?.id === id && user.estado === "activo" ? { id: user.id } : null;
}
export function isSameOriginCloudinaryRequest(req: Request) {
  const origin = req.headers.get("origin");
  return (
    req.headers.get("sec-fetch-site") !== "cross-site" &&
    (!origin || origin === new URL(req.url).origin)
  );
}
