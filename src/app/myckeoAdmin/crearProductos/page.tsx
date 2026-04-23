import { getBusinessesForProductCreationAction } from "@/actions/myckeoAdmin/getBusinessesForProductCreationAction";
import BusinessesErrorState from "../_componentes/BusinessesErrorState";
import MyckeoAdminSectionHeader from "../_componentes/MyckeoAdminSectionHeader";
import AssistedProductCreationClient from "./_componentes/AssistedProductCreationClient";

export const dynamic = "force-dynamic";

export default async function MyckeoAdminCrearProductosPage() {
  const result = await getBusinessesForProductCreationAction({
    limit: 300,
  });

  if (!result.ok || !result.data) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <BusinessesErrorState
            title="Crear productos asistidos"
            description="No fue posible cargar los negocios disponibles para este flujo."
            error={result.error}
          />
        </section>
      </main>
    );
  }

  const { items, truncated, totalReturned } = result.data;

  const rightContent = (
    <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-4 text-sm text-slate-700 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.28)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Negocios cargados
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {totalReturned}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {truncated
          ? "Lista limitada para esta primera fase."
          : "Disponibles para selección local."}
      </p>
    </div>
  );

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Selecciona negocio, genera draft IA, guarda como oculto, adjunta imágenes y publica con revalidación del catálogo.
      </p>
      <span className="inline-flex w-fit items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">
        Flujo admin completo
      </span>
    </div>
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <MyckeoAdminSectionHeader
          title="Crear productos asistidos"
          description="Flujo administrativo para preparar productos con IA y vincularlos explícitamente al negocio seleccionado."
          rightContent={rightContent}
          footer={footer}
        />

        <AssistedProductCreationClient businesses={items} truncated={truncated} />
      </section>
    </main>
  );
}
