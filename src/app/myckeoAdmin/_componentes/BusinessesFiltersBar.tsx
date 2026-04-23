import Link from "next/link";
import type { GetAdminBusinessesActionResult } from "@/actions/myckeoAdmin/getAdminBusinessesAction";

type BusinessesFiltersBarProps = {
  action: string;
  filters: NonNullable<GetAdminBusinessesActionResult["data"]>["filters"];
};

const inputClasses =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100";

const labelClasses =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

export default function BusinessesFiltersBar({
  action,
  filters,
}: BusinessesFiltersBarProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.3)]">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Filtros y orden
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Busca negocios, separa datos de prueba y navega el listado con una vista más precisa.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            Mantiene compatibilidad con query params existentes
          </div>
        </div>
      </div>

      <form action={action} className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <label htmlFor="search" className={labelClasses}>
            Buscar
          </label>
          <input
            id="search"
            name="search"
            defaultValue={filters.search}
            placeholder="Nombre, slug, id o usuarioId"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="status" className={labelClasses}>
            Estado
          </label>
          <select id="status" name="status" defaultValue={filters.status} className={inputClasses}>
            <option value="all">Todos</option>
            <option value="activo">Activo</option>
            <option value="suspendido">Suspendido</option>
            <option value="eliminado">Eliminado</option>
          </select>
        </div>

        <div>
          <label htmlFor="kind" className={labelClasses}>
            Tipo
          </label>
          <select id="kind" name="kind" defaultValue={filters.kind} className={inputClasses}>
            <option value="all">Todos</option>
            <option value="real">Real</option>
            <option value="test">Test</option>
          </select>
        </div>

        <div>
          <label htmlFor="archived" className={labelClasses}>
            Archivado
          </label>
          <select
            id="archived"
            name="archived"
            defaultValue={filters.archived}
            className={inputClasses}
          >
            <option value="all">Todos</option>
            <option value="not_archived">No archivados</option>
            <option value="archived">Archivados</option>
          </select>
        </div>

        <div>
          <label htmlFor="sortBy" className={labelClasses}>
            Ordenar por
          </label>
          <select id="sortBy" name="sortBy" defaultValue={filters.sortBy} className={inputClasses}>
            <option value="createdAt">Creación</option>
            <option value="updatedAt">Actualización</option>
            <option value="nombre">Nombre</option>
            <option value="slug">Slug</option>
          </select>
        </div>

        <div>
          <label htmlFor="sortDirection" className={labelClasses}>
            Dirección
          </label>
          <select
            id="sortDirection"
            name="sortDirection"
            defaultValue={filters.sortDirection}
            className={inputClasses}
          >
            <option value="desc">Descendente</option>
            <option value="asc">Ascendente</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-6 xl:flex-row xl:items-center xl:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            Más adelante podemos agregar filtros avanzados, acciones masivas y presets de vista sin tocar el contrato actual.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Aplicar filtros
            </button>

            <Link
              href="/myckeoAdmin/negocios"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>
    </section>
  );
}
