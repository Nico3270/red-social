import { editarPerfilNegocio } from "@/actions/auth/editarPerfilNegocio";
import { auth } from "@/auth.config";
import { CompletePerfil } from "@/ui/components/dashboard/perfil/CompletePerfil";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EditarPerfilPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/dashboard/editar-perfil");
  }

  const result = await editarPerfilNegocio(session.user.id);

  if (!result.ok || !result.negocio) {
    return (
      <main className="min-h-[60vh] px-6 py-12">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Edición de perfil
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">
            No pudimos cargar la información del negocio.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {result.message || "Intenta nuevamente en unos minutos."}
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Volver al dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div>
      <CompletePerfil informacionNegocio={result.negocio} />
    </div>
  );
}
