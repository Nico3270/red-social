import { CompletePerfilInformation } from "@/app/auth/login/ui/CompletePerfilInformation";
import { auth } from "@/auth.config";


export default async function CompletePerfilPage() {
    const session = await auth();
    if (!session?.user) {
        // Si no hay sesión, redirigir a la página de inicio de sesión
        throw new Error("No autorizado");
    }
  return (
    <div className="sm_mt-40 p-4">
      <CompletePerfilInformation userId={session.user.id } />;
    </div>
  );
}