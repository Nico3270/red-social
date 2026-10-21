import { auth } from "@/auth.config";
import { redirect } from "next/navigation";

export default async function CompletePerfilPage() {
  const session = await auth();

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
