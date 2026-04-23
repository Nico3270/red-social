import type { AdminBusinessListItem } from "@/actions/myckeoAdmin/getAdminBusinessesAction";
import BusinessActionsCell from "../_componentes/BusinessActionsCell";
import BusinessArchivedBadge from "./BusinessArchivedBadge";
import BusinessStatusBadge from "./BusinessStatusBadge";
import BusinessTypeBadge from "./BusinessTypeBadge";
import { formatAdminDate } from "./businessesShared";

type BusinessesMobileListProps = {
  items: AdminBusinessListItem[];
};

export default function BusinessesMobileList({
  items,
}: BusinessesMobileListProps) {
  return (
    <div className="grid gap-4 p-4 xl:hidden">
      {items.map((business) => (
        <article
          key={business.id}
          className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_42px_-30px_rgba(15,23,42,0.35)]"
        >
          <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.96))] px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-950">
                  {business.nombre}
                </h3>
                <p className="mt-1 truncate text-xs text-slate-500">
                  Slug: {business.slug || "—"}
                </p>
              </div>

              <BusinessStatusBadge estado={business.estado} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <BusinessTypeBadge isTestData={business.isTestData} />
              <BusinessArchivedBadge archivedAt={business.archivedAt} />
            </div>
          </div>

          <div className="space-y-4 px-5 py-4">
            <dl className="grid gap-3 text-sm text-slate-700">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  ID
                </dt>
                <dd className="mt-1 break-all">{business.id}</dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Usuario
                </dt>
                <dd className="mt-1 break-all">{business.usuarioId}</dd>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Creado
                  </dt>
                  <dd className="mt-1">{formatAdminDate(business.createdAt)}</dd>
                </div>

                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Actualizado
                  </dt>
                  <dd className="mt-1">{formatAdminDate(business.updatedAt)}</dd>
                </div>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Archivado en
                </dt>
                <dd className="mt-1">{formatAdminDate(business.archivedAt)}</dd>
              </div>
            </dl>

            <BusinessActionsCell business={business} compact />
          </div>
        </article>
      ))}
    </div>
  );
}
