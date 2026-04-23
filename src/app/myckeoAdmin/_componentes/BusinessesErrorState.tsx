type BusinessesErrorStateProps = {
  title?: string;
  description?: string;
  error?: string | null;
};

export default function BusinessesErrorState({
  title = "Negocios de Myckeo",
  description = "No fue posible cargar los negocios.",
  error,
}: BusinessesErrorStateProps) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-rose-200 bg-white shadow-[0_18px_42px_-28px_rgba(244,63,94,0.18)]">
      <div className="border-b border-rose-100 bg-rose-50/80 px-6 py-5">
        <span className="inline-flex rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
          Error
        </span>
        <h1 className="mt-3 text-xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      <div className="px-6 py-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error || "Ocurrió un error inesperado."}
        </div>
      </div>
    </section>
  );
}
