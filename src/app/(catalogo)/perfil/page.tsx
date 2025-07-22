import { auth } from "@/auth.config";
import PerfilUsuarioHeader from "@/ui/components/perfil-usuario-header/PerfilUsuarioHeader";

export default async function PerfilPage() {
    const session = await auth();

    if (!session?.user) {
        return (
            <h1 className="mt-40">No estas autenticado</h1>
        )
    }
    return (
        <div className="mt-0 sm:mt-40 flex flex-col items-center justify-center">
            <pre>{JSON.stringify(session.user, null, 2)}</pre>
            <PerfilUsuarioHeader activeTabComponent="Productos"/>

        </div>
    );
}