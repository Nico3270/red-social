import { formatAdminDate, getBusinessArchivedBadgeClasses } from "./businessesShared";

type BusinessArchivedBadgeProps = {
  archivedAt: Date | string | null;
  showDate?: boolean;
};

export default function BusinessArchivedBadge({
  archivedAt,
  showDate = false,
}: BusinessArchivedBadgeProps) {
  const isArchived = Boolean(archivedAt);

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${getBusinessArchivedBadgeClasses(
          isArchived
        )}`}
      >
        {isArchived ? "Archivado" : "Activo"}
      </span>

      {showDate && isArchived ? (
        <span className="text-xs text-slate-500">{formatAdminDate(archivedAt)}</span>
      ) : null}
    </div>
  );
}
