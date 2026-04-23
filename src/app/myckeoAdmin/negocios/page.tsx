import { getAdminBusinessesAction } from "@/actions/myckeoAdmin/getAdminBusinessesAction";
import BusinessesEmptyState from "../_componentes/BusinessesEmptyState";
import BusinessesErrorState from "../_componentes/BusinessesErrorState";
import BusinessesFiltersBar from "../_componentes/BusinessesFiltersBar";
import BusinessesMobileList from "../_componentes/BusinessesMobileList";
import BusinessesPagination from "../_componentes/BusinessesPagination";
import BusinessesTable from "../_componentes/BusinessesTable";
import MyckeoAdminSectionHeader from "../_componentes/MyckeoAdminSectionHeader";

type SearchParams = Promise<{
  page?: string;
  search?: string;
  status?: string;
  kind?: string;
  archived?: string;
  sortBy?: string;
  sortDirection?: string;
}>;

function parsePositiveInt(value?: string, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export default async function MyckeoAdminNegociosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;

  const page = parsePositiveInt(resolvedSearchParams.page, 1);
  const search = resolvedSearchParams.search?.trim() ?? "";
  const status = resolvedSearchParams.status ?? "all";
  const kind = resolvedSearchParams.kind ?? "all";
  const archived = resolvedSearchParams.archived ?? "all";
  const sortBy = resolvedSearchParams.sortBy ?? "createdAt";
  const sortDirection = resolvedSearchParams.sortDirection ?? "desc";

  const result = await getAdminBusinessesAction({
    page,
    pageSize: 20,
    search,
    status: status as "all" | "activo" | "suspendido" | "eliminado",
    kind: kind as "all" | "real" | "test",
    archived: archived as "all" | "archived" | "not_archived",
    sortBy: sortBy as "createdAt" | "updatedAt" | "nombre" | "slug",
    sortDirection: sortDirection as "asc" | "desc",
  });

  const currentQuery = {
    search,
    status,
    kind,
    archived,
    sortBy,
    sortDirection,
  };

  if (!result.ok || !result.data) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <BusinessesErrorState
            title="Negocios de Myckeo"
            description="No fue posible cargar el módulo administrativo de negocios."
            error={result.error}
          />
        </section>
      </main>
    );
  }

  const { items, pagination, filters } = result.data;

  const rightContent = (
    <>
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-4 text-sm text-slate-700 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.28)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Total visible
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          {pagination.totalItems}
        </p>
        <p className="mt-1 text-xs text-slate-500">negocios encontrados</p>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-4 text-sm text-slate-700 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.24)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Vista actual
        </p>
        <p className="mt-2 font-semibold text-slate-950">
          Página {pagination.page} de {pagination.totalPages}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Preparado para futuras acciones masivas y filtros avanzados.
        </p>
      </div>
    </>
  );

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Administra negocios reales vs test y prepara el terreno para archivado controlado y limpieza futura.
      </p>

      <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
        Próximamente: preview de purge y acciones masivas
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <MyckeoAdminSectionHeader
          title="Negocios"
          description="Administra los negocios de la plataforma, identifica datos de prueba y controla el archivado sin romper la operación actual."
          rightContent={rightContent}
          footer={footer}
        />

        <BusinessesFiltersBar
          action="/myckeoAdmin/negocios"
          filters={filters}
        />

        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.3)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Listado de negocios
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Vista operativa inicial para supervisión interna del ecosistema.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                Página {pagination.page} de {pagination.totalPages}
              </span>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {items.length} visibles en esta vista
              </span>
            </div>
          </div>

          {items.length === 0 ? (
            <BusinessesEmptyState />
          ) : (
            <>
              <BusinessesTable items={items} />
              <BusinessesMobileList items={items} />
              <BusinessesPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                currentCount={items.length}
                basePath="/myckeoAdmin/negocios"
                query={currentQuery}
                hasNextPage={pagination.hasNextPage}
                hasPreviousPage={pagination.hasPreviousPage}
              />
            </>
          )}
        </section>

        {/*
          Más adelante:
          <BusinessPreviewDeleteDrawer />
          <BusinessesBulkActions />
          <BusinessesInsightsPanel />
        */}
      </section>
    </main>
  );
}
