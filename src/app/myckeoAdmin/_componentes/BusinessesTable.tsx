import type { AdminBusinessListItem } from "@/actions/myckeoAdmin/getAdminBusinessesAction";
import BusinessActionsCell from "../_componentes/BusinessActionsCell";
import BusinessArchivedBadge from "./BusinessArchivedBadge";
import BusinessStatusBadge from "./BusinessStatusBadge";
import BusinessTypeBadge from "./BusinessTypeBadge";
import { formatAdminDate } from "./businessesShared";

type BusinessesTableProps = {
  items: AdminBusinessListItem[];
};

export default function BusinessesTable({ items }: BusinessesTableProps) {
  return (
    <div className="hidden overflow-x-auto xl:block">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50/80">
          <tr>
            <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Negocio
            </th>
            <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Estado
            </th>
            <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tipo
            </th>
            <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Archivado
            </th>
            <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Usuario
            </th>
            <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Fechas
            </th>
            <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Acciones
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((business) => (
            <tr key={business.id} className="align-top transition hover:bg-slate-50/70">
              <td className="px-6 py-5">
                <div className="max-w-[300px]">
                  <p className="text-sm font-semibold text-slate-950">{business.nombre}</p>
                  <p className="mt-1 text-xs text-slate-500">Slug: {business.slug || "—"}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">ID: {business.id}</p>
                </div>
              </td>

              <td className="px-6 py-5">
                <BusinessStatusBadge estado={business.estado} />
              </td>

              <td className="px-6 py-5">
                <BusinessTypeBadge isTestData={business.isTestData} />
              </td>

              <td className="px-6 py-5">
                <BusinessArchivedBadge archivedAt={business.archivedAt} showDate />
              </td>

              <td className="px-6 py-5">
                <p className="max-w-[220px] break-all text-sm text-slate-700">
                  {business.usuarioId}
                </p>
              </td>

              <td className="px-6 py-5">
                <div className="space-y-1 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">Creado:</span>{" "}
                    {formatAdminDate(business.createdAt)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Actualizado:</span>{" "}
                    {formatAdminDate(business.updatedAt)}
                  </p>
                </div>
              </td>

              <td className="px-6 py-5">
                <BusinessActionsCell business={business} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
