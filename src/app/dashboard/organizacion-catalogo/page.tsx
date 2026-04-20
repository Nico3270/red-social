import { auth } from "@/auth.config";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import CatalogGroupsAdmin from "@/ui/components/dashboard/catalogGroups/CatalogGroupsAdmin";

export const metadata = {
  title: "Organización del Catálogo - Myckeo",
};

export default async function OrganizacionCatalogPage() {
  const session = await auth();

  // Protección: debe estar autenticado
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  // Obtener negocio del usuario
  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { negocio: { select: { id: true } } },
  });

  // Protección: debe tener un negocio
  if (!usuario?.negocio) {
    redirect("/dashboard");
  }

  const negocioId = usuario.negocio.id;

  return (
    <div className="w-full">
      <CatalogGroupsAdmin negocioId={negocioId} />
    </div>
  );
}
