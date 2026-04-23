import type { AdminBusinessListItem } from "@/actions/myckeoAdmin/getAdminBusinessesAction";

export type AdminBusinessesQueryState = {
  search?: string;
  status?: string;
  kind?: string;
  archived?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: string;
};

export type BusinessStatusValue = AdminBusinessListItem["estado"];

export function formatAdminDate(value: Date | string | null) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
}

export function buildAdminBusinessesQueryString(
  current: AdminBusinessesQueryState,
  updates: Record<string, string | number | undefined>
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (value !== undefined && value !== "") {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

export function getBusinessStatusBadgeClasses(estado: string) {
  switch (estado) {
    case "activo":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "suspendido":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "eliminado":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-700";
  }
}

export function getBusinessTypeBadgeClasses(isTestData: boolean) {
  return isTestData
    ? "border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
    : "border border-sky-200 bg-sky-50 text-sky-700";
}

export function getBusinessArchivedBadgeClasses(isArchived: boolean) {
  return isArchived
    ? "border border-amber-200 bg-amber-50 text-amber-700"
    : "border border-slate-200 bg-slate-50 text-slate-600";
}
