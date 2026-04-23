import Link from "next/link";
import type { ReactNode } from "react";
import { buildAdminBusinessesQueryString, type AdminBusinessesQueryState } from "./businessesShared";

type BusinessesPaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  currentCount: number;
  basePath: string;
  query: AdminBusinessesQueryState;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const classes = disabled
    ? "cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-400"
    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium ${classes}`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium transition ${classes}`}
    >
      {children}
    </Link>
  );
}

export default function BusinessesPagination({
  page,
  totalPages,
  totalItems,
  currentCount,
  basePath,
  query,
  hasNextPage,
  hasPreviousPage,
}: BusinessesPaginationProps) {
  const previousHref = `${basePath}?${buildAdminBusinessesQueryString(query, {
    page: page - 1,
  })}`;
  const nextHref = `${basePath}?${buildAdminBusinessesQueryString(query, {
    page: page + 1,
  })}`;

  return (
    <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-6 text-slate-600">
        Mostrando <span className="font-semibold text-slate-950">{currentCount}</span> de{" "}
        <span className="font-semibold text-slate-950">{totalItems}</span> negocios.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
          Página {page} de {totalPages}
        </span>

        <div className="flex items-center gap-2">
          <PaginationLink href={previousHref} disabled={!hasPreviousPage}>
            Anterior
          </PaginationLink>
          <PaginationLink href={nextHref} disabled={!hasNextPage}>
            Siguiente
          </PaginationLink>
        </div>
      </div>
    </div>
  );
}
