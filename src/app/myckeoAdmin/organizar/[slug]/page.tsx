import Link from "next/link";
import { getAdminCatalogOrganizationBySlugAction } from "@/actions/myckeoAdmin/getAdminCatalogOrganizationBySlugAction";
import AdminCatalogGroupsManager from "../../_componentes/AdminCatalogGroupsManager";
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
          title="Organizar catálogo"
          description="No fue posible abrir la vista administrativa de organización para el negocio solicitado."
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

export default async function MyckeoAdminOrganizarCatalogoPage({
  params,
}: PageProps) {
  const { slug } = await params;
  const result = await getAdminCatalogOrganizationBySlugAction(slug);

  if (!result.ok) {
    return <AdminErrorState message={result.error} />;
  }

  const { business, catalog } = result;

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
          Grupos detectados
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          {catalog.stats.totalGroups}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          activos e inactivos incluidos
        </p>
      </div>
    </>
  );

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-800">
          Fase actual: organización de grupos y productos
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Ya puedes crear, editar, activar y reordenar grupos, además de
          organizar productos por lote. La eliminación, el drag and drop y el
          movimiento entre padres siguen fuera de esta fase.
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
          title="Organizar catálogo"
          description={`Administra la estructura básica de grupos del catálogo de ${business.nombre} con acciones seguras de super-admin, sin depender de la sesión del dueño.`}
          rightContent={rightContent}
          footer={footer}
        />

        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.3)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Resumen del catálogo
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Vista administrativa sin filtros por test, archivado o suspensión,
              con lectura segura del negocio y sus grupos actuales.
            </p>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Total grupos
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {catalog.stats.totalGroups}
                </p>
              </div>
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Activos
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {catalog.stats.activeGroups}
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-100/80 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Inactivos
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {catalog.stats.inactiveGroups}
                </p>
              </div>
              <div className="rounded-[24px] border border-blue-200 bg-blue-50/80 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Productos asignados
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  {catalog.stats.totalAssignedProducts}
                </p>
              </div>
            </div>

            <aside className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Contexto del negocio
              </p>

              <div className="mt-4 space-y-4 text-sm text-slate-700">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Nombre
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-950">
                    {business.nombre}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Slug
                  </p>
                  <p className="mt-1 break-all rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-700">
                    {business.slug}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Creado
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {formatAdminDate(business.createdAt)}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Actualizado
                    </p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {formatAdminDate(business.updatedAt)}
                    </p>
                  </div>
                </div>

                {business.archivedAt ? (
                  <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Archivado en
                    </p>
                    <p className="mt-2 font-semibold text-amber-900">
                      {formatAdminDate(business.archivedAt)}
                    </p>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </section>

        <AdminCatalogGroupsManager
          businessId={business.id}
          expectedSlug={business.slug}
          businessName={business.nombre}
          initialGroups={catalog.groups}
          stats={catalog.stats}
        />
      </section>
    </main>
  );
}
