type BusinessesEmptyStateProps = {
  title?: string;
  description?: string;
};

export default function BusinessesEmptyState({
  title = "No se encontraron negocios",
  description = "Ajusta los filtros o la búsqueda para intentar de nuevo.",
}: BusinessesEmptyStateProps) {
  return (
    <div className="px-6 py-14">
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.95))] px-6 py-12 text-center">
        <div className="mx-auto max-w-md">
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Estado vacío
          </span>
          <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}
