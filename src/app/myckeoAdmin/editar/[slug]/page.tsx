import Link from "next/link";
import { getAdminBusinessProfileBySlugAction } from "@/actions/myckeoAdmin/getAdminBusinessProfileBySlugAction";
import AdminBusinessProfileForm from "../../_componentes/AdminBusinessProfileForm";
import BusinessArchivedBadge from "../../_componentes/BusinessArchivedBadge";
import BusinessStatusBadge from "../../_componentes/BusinessStatusBadge";
import BusinessTypeBadge from "../../_componentes/BusinessTypeBadge";
import MyckeoAdminSectionHeader from "../../_componentes/MyckeoAdminSectionHeader";
import { formatAdminDate } from "../../_componentes/businessesShared";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

function AdminErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <MyckeoAdminSectionHeader
          title="Editar negocio"
          description="No fue posible abrir la vista administrativa del negocio solicitado."
        />

        <section className="overflow-hidden rounded-[28px] border border-rose-200 bg-white shadow-[0_20px_48px_-32px_rgba(190,18,60,0.32)]">
          <div className="border-b border-rose-100 bg-rose-50 px-6 py-5">
            <p className="text-sm font-semibold text-rose-800">
              Vista no disponible
            </p>
            <p className="mt-1 text-sm text-rose-700">{message}</p>
          </div>

          <div className="px-6 py-5">
            <Link
              href="/myckeoAdmin/negocios"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Volver a negocios
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

export default async function MyckeoAdminEditarNegocioPage({
  params,
}: PageProps) {
  const { slug } = await params;
  const result = await getAdminBusinessProfileBySlugAction(slug);

  if (!result.ok || !result.business || !result.options) {
    return (
      <AdminErrorState
        message={result.error || "No fue posible cargar este negocio."}
      />
    );
  }

  const business = result.business;

  const rightContent = (
    <>
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-4 text-sm text-slate-700 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.28)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Estado actual
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <BusinessStatusBadge estado={business.estado} />
          <BusinessTypeBadge isTestData={business.isTestData} />
          <BusinessArchivedBadge archivedAt={business.archivedAt} />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-4 text-sm text-slate-700 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.22)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Última actualización
        </p>
        <p className="mt-2 font-semibold text-slate-950">
          {formatAdminDate(business.updatedAt)}
        </p>
      </div>
    </>
  );

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-800">
          Editando como super-admin
        </p>
        <p className="mt-1 text-sm text-slate-600">
          La action admin actualiza por businessId y valida el slug esperado antes de guardar.
        </p>
      </div>
      <Link
        href="/myckeoAdmin/negocios"
        className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Volver a negocios
      </Link>
    </div>
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <MyckeoAdminSectionHeader
          title="Editar negocio"
          description={`Administra el perfil de ${business.nombre} sin depender de la sesión del dueño del negocio.`}
          rightContent={rightContent}
          footer={footer}
        />

        <AdminBusinessProfileForm
          business={business}
          options={result.options}
        />
      </section>
    </main>
  );
}
