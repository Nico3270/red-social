// app/dashboard/editarUsuario/page.tsx
import { EditarUsuarioForm } from "@/app/auth/login/ui/EditarUsuarioForm";
import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";


export const metadata = {
  title: "Editar Perfil | Myckeo",
  description: "Actualiza tu información personal en Myckeo",
};

export default async function EditarUsuarioPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/dashboard/editarUsuario");
  }

  const userId = session.user.id;

  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      username: true,
      ciudad: true,
      departamento: true,
      fechaNacimiento: true,
      genero: true,
      fotoPerfil: true,
      biografia: true,
      isPlaceholder: true,
      perfilCompleto: true,
    },
  });

  if (!usuario) {
    notFound();
  }

  // Si es placeholder, forzamos que complete el perfil
  const esModoObligatorio = usuario.isPlaceholder;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            {esModoObligatorio ? "¡Completa tu perfil!" : "Editar Perfil"}
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {esModoObligatorio
              ? "Para comenzar a usar Myckeo, necesitamos tus datos reales"
              : "Mantén tu información actualizada"}
          </p>
        </div>

        {/* Tarjeta principal */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
    
          
          <div className="relative p-6">
            {/* Foto de perfil (placeholder) */}
            

            {/* Formulario */}
            <div className="mt-4">
              <EditarUsuarioForm 
                usuario={usuario} 
                esModoObligatorio={esModoObligatorio} 
              />
            </div>
          </div>
        </div>

        {/* Nota para placeholders */}
        {esModoObligatorio && (
          <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-amber-800 font-medium">
              Este es tu perfil temporal. Una vez completes tus datos, podrás gestionar tu negocio completamente
            </p>
          </div>
        )}
      </div>
    </div>
  );
}