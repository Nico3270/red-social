// app/dashboard/editar-usuario/page.tsx
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
    redirect("/auth/login?callbackUrl=/dashboard/editar-usuario");
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#fff7f7_100%)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <EditarUsuarioForm
          usuario={usuario}
          esModoObligatorio={esModoObligatorio}
        />
      </div>
    </main>
  );
}