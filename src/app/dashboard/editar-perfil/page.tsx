import { editarPerfilNegocio } from "@/actions/auth/editarPerfilNegocio";
import { auth } from "@/auth.config";
import { CompletePerfil } from "@/ui/components/dashboard/perfil/CompletePerfil";



export default async function EditarPerfilPage() {
    const session = await auth();
    const informacionPerfil = await editarPerfilNegocio(session?.user.id || "");
    if (!session ) {
        return (
            <div>
                <h1>Debes iniciar sesión para editar tu perfil</h1>
            </div>
        );
        }
  return (
    <div>
       <CompletePerfil informacionNegocio={informacionPerfil.negocio} />
    </div>
  );
}