import { getBusinessEntryDestination } from "@/lib/business/businessEntry";
import { auth } from "@/auth.config";
import { redirect } from "next/navigation";

export default async function CompletePerfilPage({ searchParams }: { searchParams: Promise<{ negocio?: string }> }) {
  const session = await auth();
  if ((await searchParams).negocio === "1") {
    redirect(getBusinessEntryDestination(session?.user));
  }

  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/config/completePerfil");
  }

  if (session.user.isPlaceholder === true) {
    redirect("/dashboard/editar-perfil");
  }

  if (session.user.perfilCompleto === false) {
    redirect("/dashboard/editar-usuario");
  }

  redirect("/dashboard");
}
