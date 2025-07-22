import { CreateNegocioForm } from "@/app/auth/new-account/ui/CrearNegocio";
import { auth } from "@/auth.config";

interface Props {
  params: Promise<{
    id: string;
  }>}

export default async function CrearNegociorPage({params}: Props ) 
{
  const session = await auth();
  if(!session?.user) {
    return <div>Error: No estás autenticado.</div>;
  }
  const { id } = await params;
  if (!id) {
    return <div>Error: ID de usuario no proporcionado.</div>;
  }
  
  if (session.user.id !== id) {
    return <div>Error: No tienes permiso para crear un perfil para este usuario.</div>;
  } 
  return (
    <div className="mt-0 sm:mt-40">
      {/* <h1>Hello Page vamos a crear un perfil de negocio para el usuario con id {id}</h1> */}
      <CreateNegocioForm id={id} />
    </div>
  );
}