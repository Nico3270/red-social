import Link from "next/link";
import { getBusinessRestrictionLabel } from "@/lib/business/businessSessionState";

interface ArchivedBusinessDashboardStateProps {
  businessName?: string | null;
  reason?: string | null;
  archivedAt?: string | null;
  compact?: boolean;
}

function formatArchivedDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
}

export default function ArchivedBusinessDashboardState({
  businessName,
  reason,
  archivedAt,
  compact = false,
}: ArchivedBusinessDashboardStateProps) {
  const formattedDate = formatArchivedDate(archivedAt);
  const reasonLabel = getBusinessRestrictionLabel(reason);

  return (
    <div
      className={
        compact
          ? "rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-slate-800 shadow-sm"
          : "mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white p-8 shadow-sm"
      }
    >
      <div className="space-y-4">
        <div className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          Negocio no operable
        </div>

        <div className="space-y-2">
          <h1 className={compact ? "text-lg font-semibold" : "text-3xl font-semibold text-slate-900"}>
            {businessName
              ? `${businessName} ya no está disponible para operación interna`
              : "Tu negocio ya no está disponible para operación interna"}
          </h1>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            Mantuvimos tu cuenta activa, pero el contexto operativo del negocio se deshabilitó
            porque el negocio está {reasonLabel}. Mientras siga así, no podrás administrar
            productos, pedidos, reservas, servicios ni publicaciones desde el dashboard.
          </p>
        </div>

        {formattedDate ? (
          <p className="text-sm text-slate-500">
            Fecha registrada del cambio: {formattedDate}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/dashboard/editar-usuario"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Editar usuario
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Volver al inicio
          </Link>
          <a
            href="https://wa.me/573132492256?text=Hola,%20necesito%20ayuda%20con%20mi%20negocio%20archivado%20en%20Myckeo"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
          >
            Contactar soporte
          </a>
        </div>
      </div>
    </div>
  );
}
