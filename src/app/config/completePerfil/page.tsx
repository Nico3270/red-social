import { CompletePerfilInformation } from "@/app/auth/login/ui/CompletePerfilInformation";
import { auth } from "@/auth.config";
import { redirect } from "next/navigation";


export default async function CompletePerfilPage() {
    const session = await auth();
    if (!session?.user) {
        // Si no hay sesión, redirigir a la página de inicio de sesión
        redirect("/auth/login");
    }
  return (
    <div className="sm_mt-40 p-4">
      <CompletePerfilInformation userId={session.user.id } />;
    </div>
  );
}