import Link from "next/link";
import {
  getAdminBusinessProductsBySlugAction,
  type AdminBusinessProductsAuditFilters,
  type AdminBusinessProductsListItem,
  type AdminBusinessProductsStatusFilter,
} from "@/actions/myckeoAdmin/getAdminBusinessProductsBySlugAction";
import { ProductStatus } from "@prisma/client";
import BusinessArchivedBadge from "../../_componentes/BusinessArchivedBadge";
import AdminProductDeletePreviewAction from "../../_componentes/AdminProductDeletePreviewAction";
import AdminProductStatusAction from "../../_componentes/AdminProductStatusAction";
import BusinessStatusBadge from "../../_componentes/BusinessStatusBadge";
import BusinessTypeBadge from "../../_componentes/BusinessTypeBadge";
import MyckeoAdminSectionHeader from "../../_componentes/MyckeoAdminSectionHeader";
import { formatAdminDate } from "../../_componentes/businessesShared";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProductsQueryState = {
  search: string;
  status: AdminBusinessProductsStatusFilter;
  page: number;
  pageSize: number;
  filters: Required<AdminBusinessProductsAuditFilters>;
};

type ProductsQueryParams = {
  search?: string;
  status?: string;
  page?: string;
  pageSize?: string;
  withoutImages?: string;
  withoutSections?: string;
  withoutCatalogGroups?: string;
  zeroPrice?: string;
  usesVariantsWithoutActiveVariants?: string;
  needsReview?: string;
};

type AlertTone = "slate" | "sky" | "amber" | "emerald" | "rose" | "violet";

type ProductAlert = {
  label: string;
  tone: AlertTone;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const dynamic = "force-dynamic";

function readSingleQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return typeof value === "string" ? value.trim() : "";
}

function parseBooleanQuery(value?: string | string[]) {
  const normalized = readSingleQueryValue(value).toLowerCase();
  return ["1", "true", "on", "yes"].includes(normalized);
}

function parsePositiveInt(value?: string | string[], fallback = 1) {
  const parsed = Number(readSingleQueryValue(value));

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parsePageSize(value?: string | string[]) {
  const parsed = parsePositiveInt(value, DEFAULT_PAGE_SIZE);
  return Math.min(parsed, MAX_PAGE_SIZE);
}

function parseStatus(value?: string | string[]): AdminBusinessProductsStatusFilter {
  const normalized = readSingleQueryValue(value);

  if (normalized === "todos") {
    return normalized;
  }

  return Object.values(ProductStatus).includes(normalized as ProductStatus)
    ? (normalized as ProductStatus)
    : "todos";
}

function parseQueryState(
  rawSearchParams?: Record<string, string | string[] | undefined>,
): ProductsQueryState {
  return {
    search: readSingleQueryValue(rawSearchParams?.search),
    status: parseStatus(rawSearchParams?.status),
    page: parsePositiveInt(rawSearchParams?.page, DEFAULT_PAGE),
    pageSize: parsePageSize(rawSearchParams?.pageSize),
    filters: {
      withoutImages: parseBooleanQuery(rawSearchParams?.withoutImages),
      withoutSections: parseBooleanQuery(rawSearchParams?.withoutSections),
      withoutCatalogGroups: parseBooleanQuery(rawSearchParams?.withoutCatalogGroups),
      zeroPrice: parseBooleanQuery(rawSearchParams?.zeroPrice),
      usesVariantsWithoutActiveVariants: parseBooleanQuery(
        rawSearchParams?.usesVariantsWithoutActiveVariants,
      ),
      needsReview: parseBooleanQuery(rawSearchParams?.needsReview),
    },
  };
}

function buildQueryParams(state: ProductsQueryState): ProductsQueryParams {
  return {
    search: state.search || undefined,
    status: state.status !== "todos" ? state.status : undefined,
    page: state.page > 1 ? String(state.page) : undefined,
    pageSize: state.pageSize !== DEFAULT_PAGE_SIZE ? String(state.pageSize) : undefined,
    withoutImages: state.filters.withoutImages ? "1" : undefined,
    withoutSections: state.filters.withoutSections ? "1" : undefined,
    withoutCatalogGroups: state.filters.withoutCatalogGroups ? "1" : undefined,
    zeroPrice: state.filters.zeroPrice ? "1" : undefined,
    usesVariantsWithoutActiveVariants: state.filters.usesVariantsWithoutActiveVariants
      ? "1"
      : undefined,
    needsReview: state.filters.needsReview ? "1" : undefined,
  };
}

function buildQueryString(
  current: ProductsQueryParams,
  updates: Record<string, string | number | boolean | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (value !== undefined && value !== "") {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === "" || value === false) {
      params.delete(key);
      continue;
    }

    params.set(key, value === true ? "1" : String(value));
  }

  return params.toString();
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value.toLocaleString("es-CO")} ${currency}`;
  }
}

function getProductStatusBadgeClasses(status: ProductStatus) {
  switch (status) {
    case ProductStatus.disponible:
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case ProductStatus.agotado:
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case ProductStatus.oculto:
      return "border border-slate-200 bg-slate-100 text-slate-700";
    case ProductStatus.descontinuado:
      return "border border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getAlertClasses(tone: AlertTone) {
  switch (tone) {
    case "sky":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "emerald":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rose":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "violet":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "slate":
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function buildProductAlerts(product: AdminBusinessProductsListItem): ProductAlert[] {
  const alerts: ProductAlert[] = [];

  if (!product.hasImages) {
    alerts.push({ label: "Sin imagen", tone: "rose" });
  }

  if (!product.hasSections) {
    alerts.push({ label: "Sin secciones", tone: "amber" });
  }

  if (!product.hasCatalogGroups) {
    alerts.push({ label: "Sin grupos", tone: "sky" });
  }

  if (product.hasZeroOrInvalidPrice) {
    alerts.push({ label: "Precio 0", tone: "rose" });
  }

  if (product.isHidden) {
    alerts.push({ label: "Oculto", tone: "slate" });
  }

  if (product.isDiscontinued) {
    alerts.push({ label: "Descontinuado", tone: "rose" });
  }

  if (product.usesVariantsWithoutActiveVariants) {
    alerts.push({ label: "Variantes incompletas", tone: "violet" });
  }

  if (product.needsReview) {
    alerts.push({ label: "Revisar", tone: "amber" });
  }

  return alerts;
}

function formatStockLabel(product: AdminBusinessProductsListItem) {
  if (product.usaVariantes) {
    return `${product.activeVariantCount}/${product.variantCount} variantes activas`;
  }

  if (product.stockIlimitado) {
    return "Stock ilimitado";
  }

  if (typeof product.stock === "number") {
    return `${product.stock} unidades`;
  }

  return "Sin dato";
}

function hasActiveAuditFilters(state: ProductsQueryState) {
  return (
    Boolean(state.search) ||
    state.status !== "todos" ||
    Object.values(state.filters).some(Boolean)
  );
}

function DisabledAction({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled
      title="Disponible en una fase posterior"
      className={`inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-[11px] font-medium text-slate-400 sm:h-9 sm:px-3.5 ${className ?? ""}`}
    >
      {label}
    </button>
  );
}

function MetricCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: AlertTone;
}) {
  const classes = getAlertClasses(tone);

  return (
    <article className={`rounded-[22px] border px-3.5 py-3 ${classes}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] leading-4 opacity-80">
          {label}
        </p>
        <p className="text-2xl font-semibold leading-none tracking-tight sm:text-[28px]">
          {value}
        </p>
      </div>
    </article>
  );
}

function CountChip({
  label,
  value,
  title,
}: {
  label: string;
  value: number;
  title?: string;
}) {
  return (
    <span
      title={title ?? label}
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
    >
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </span>
  );
}

function ProductThumbnail({
  imageUrl,
  alt,
}: {
  imageUrl: string | null;
  alt: string;
}) {
  if (!imageUrl) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Sin imagen
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className="h-16 w-16 rounded-2xl border border-slate-200 bg-slate-100 bg-cover bg-center"
      style={{ backgroundImage: `url(${JSON.stringify(imageUrl).slice(1, -1)})` }}
    />
  );
}

function AdminErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <MyckeoAdminSectionHeader
          title="Productos del negocio"
          description="No fue posible abrir la vista administrativa de auditoría de productos para el negocio solicitado."
        />

        <section className="overflow-hidden rounded-[28px] border border-rose-200 bg-white shadow-[0_20px_48px_-32px_rgba(190,18,60,0.32)]">
          <div className="border-b border-rose-100 bg-rose-50 px-6 py-5">
            <p className="text-sm font-semibold text-rose-800">Vista no disponible</p>
            <p className="mt-1 text-sm text-rose-700">{message}</p>
          </div>

          <div className="px-6 py-5">
            <Link
              href="/myckeoAdmin/negocios"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Volver a negocios
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

export default async function MyckeoAdminProductosPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const queryState = parseQueryState(resolvedSearchParams);

  const result = await getAdminBusinessProductsBySlugAction({
    slug,
    search: queryState.search,
    status: queryState.status,
    filters: queryState.filters,
    page: queryState.page,
    pageSize: queryState.pageSize,
  });

  if (!result.ok) {
    return <AdminErrorState message={result.error} />;
  }

  const { business, products, stats, pagination } = result;
  const currentQuery = buildQueryParams(queryState);
  const currentPath = `/myckeoAdmin/productos/${encodeURIComponent(business.slug)}`;
  const firstVisibleItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const lastVisibleItem = pagination.total === 0 ? 0 : firstVisibleItem + products.length - 1;

  const rightContent = (
    <>
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-4 text-sm text-slate-700 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.28)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Estado del negocio
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <BusinessStatusBadge estado={business.estado} />
          <BusinessTypeBadge isTestData={business.isTestData} />
          <BusinessArchivedBadge archivedAt={business.archivedAt} />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-4 text-sm text-slate-700 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.22)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Coincidencias actuales
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          {pagination.total}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          slug: {business.slug}
        </p>
      </div>
    </>
  );

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-800">{business.nombre}</p>
        <p className="mt-1 text-sm text-slate-600">
          Creado: {formatAdminDate(business.createdAt)}. Última actualización: {formatAdminDate(business.updatedAt)}.
        </p>
      </div>

      <Link
        href="/myckeoAdmin/negocios"
        className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Volver a negocios
      </Link>
    </div>
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8 2xl:px-10">
        <MyckeoAdminSectionHeader
          title="Productos del negocio"
          description={`Audita el estado, integridad y organización de los productos de ${business.nombre} sin mutar datos en esta fase.`}
          rightContent={rightContent}
          footer={footer}
        />

        <section className="rounded-[28px] border border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,247,237,0.92))] px-4 py-4 sm:px-5 sm:py-5 shadow-[0_16px_34px_-26px_rgba(180,83,9,0.28)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
            Vista de auditoría
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-900 sm:text-[15px]">
            Vista de auditoría. El cambio de estado y la eliminación están protegidos por validaciones server-side estrictas; editar producto permanece deshabilitado.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
          <MetricCard label="Total productos" value={stats.totalProducts} tone="slate" />
          <MetricCard label="Disponibles" value={stats.totalDisponible} tone="emerald" />
          <MetricCard label="Agotados" value={stats.totalAgotado} tone="amber" />
          <MetricCard label="Ocultos" value={stats.totalOculto} tone="slate" />
          <MetricCard label="Descontinuados" value={stats.totalDescontinuado} tone="rose" />
          <MetricCard label="Sin imagen" value={stats.totalWithoutImages} tone="rose" />
          <MetricCard label="Sin secciones" value={stats.totalWithoutSections} tone="amber" />
          <MetricCard label="Sin grupos" value={stats.totalWithoutCatalogGroups} tone="sky" />
          <MetricCard label="Precio 0" value={stats.totalZeroPrice} tone="rose" />
          <MetricCard label="Revisión" value={stats.totalNeedsReview} tone="violet" />
        </section>

        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.3)]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Filtros de auditoría</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Usa query params simples para buscar productos y detectar problemas operativos sin tocar datos.
                </p>
              </div>

              <Link
                href={currentPath}
                className="inline-flex h-10 w-fit items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Limpiar filtros
              </Link>
            </div>
          </div>

          <form
            method="GET"
            className="grid gap-3.5 px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(210px,0.55fr)_minmax(170px,0.45fr)]"
          >
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Buscar por nombre o slug</span>
              <input
                type="search"
                name="search"
                defaultValue={queryState.search}
                placeholder="Ej. hamburguesa, combo, promo-finde"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Estado</span>
              <select
                name="status"
                defaultValue={queryState.status}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              >
                <option value="todos">Todos</option>
                <option value={ProductStatus.disponible}>Disponible</option>
                <option value={ProductStatus.agotado}>Agotado</option>
                <option value={ProductStatus.oculto}>Oculto</option>
                <option value={ProductStatus.descontinuado}>Descontinuado</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Tamaño de página</span>
              <select
                name="pageSize"
                defaultValue={String(queryState.pageSize)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              >
                <option value="20">20</option>
                <option value="40">40</option>
                <option value="60">60</option>
                <option value="100">100</option>
              </select>
            </label>

            <fieldset className="lg:col-span-3">
              <legend className="text-sm font-medium text-slate-900">Alertas y reglas</legend>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm leading-5 text-slate-700">
                  <input type="checkbox" name="withoutImages" value="1" defaultChecked={queryState.filters.withoutImages} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                  Sin imagen
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm leading-5 text-slate-700">
                  <input type="checkbox" name="withoutSections" value="1" defaultChecked={queryState.filters.withoutSections} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                  Sin secciones
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm leading-5 text-slate-700">
                  <input type="checkbox" name="withoutCatalogGroups" value="1" defaultChecked={queryState.filters.withoutCatalogGroups} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                  Sin grupos de catálogo
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm leading-5 text-slate-700">
                  <input type="checkbox" name="zeroPrice" value="1" defaultChecked={queryState.filters.zeroPrice} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                  Precio 0 o inválido
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm leading-5 text-slate-700">
                  <input type="checkbox" name="usesVariantsWithoutActiveVariants" value="1" defaultChecked={queryState.filters.usesVariantsWithoutActiveVariants} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                  Variantes sin variantes activas
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm leading-5 text-slate-700">
                  <input type="checkbox" name="needsReview" value="1" defaultChecked={queryState.filters.needsReview} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                  Requiere revisión
                </label>
              </div>
            </fieldset>

            <div className="lg:col-span-3 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                {hasActiveAuditFilters(queryState)
                  ? "Hay filtros activos aplicados sobre el negocio seleccionado."
                  : "Sin filtros activos. Se muestran todos los productos del negocio."}
              </div>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Aplicar filtros
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.3)]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Listado auditado</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Mostrando {firstVisibleItem}-{lastVisibleItem} de {pagination.total} producto(s) en esta vista.
                </p>
              </div>

              <div className="w-fit rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-600 sm:text-sm">
                Página {pagination.page} de {pagination.totalPages}
              </div>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="px-4 py-8 text-center sm:px-6 sm:py-10">
              <p className="text-base font-medium text-slate-900">No hay productos para esta combinación de filtros.</p>
              <p className="mt-2 text-sm text-slate-600">
                Ajusta la búsqueda o limpia filtros para ver más resultados.
              </p>
              <div className="mt-5 flex justify-center">
                <Link
                  href={currentPath}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Ver todos los productos del negocio
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="overflow-x-auto px-3 py-3 sm:px-4 sm:py-4">
                  <table className="min-w-[1320px] w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50/90">
                    <tr className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      <th className="px-6 py-4 font-semibold">Producto</th>
                      <th className="px-4 py-4 font-semibold">Estado</th>
                      <th className="px-4 py-4 font-semibold">Precio</th>
                      <th className="px-4 py-4 font-semibold">Inventario</th>
                      <th className="px-4 py-4 font-semibold">Conteos</th>
                      <th className="px-4 py-4 font-semibold">Alertas</th>
                      <th className="sticky right-0 z-20 border-l border-slate-200 bg-slate-50/95 px-4 py-4 font-semibold backdrop-blur">
                        <div className="flex min-w-[148px] justify-center">Acciones</div>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => {
                      const alerts = buildProductAlerts(product);

                      return (
                        <tr key={product.id} className="group align-top text-sm text-slate-700 hover:bg-slate-50/40">
                          <td className="px-6 py-5">
                            <div className="flex min-w-[340px] items-start gap-4">
                              <ProductThumbnail imageUrl={product.imageUrl} alt={product.nombre} />

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-950">{product.nombre}</p>
                                  {product.etiquetaEspecial && product.etiquetaEspecial !== "ninguna" ? (
                                    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">
                                      {product.etiquetaEspecial.replace(/_/g, " ")}
                                    </span>
                                  ) : null}
                                </div>

                                <p className="mt-1 break-all font-mono text-xs text-slate-500">
                                  /producto/{product.slug}
                                </p>

                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                                  {product.descripcionCorta?.trim() || product.descripcion}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                    Categoría: {product.category.nombre}
                                  </span>
                                  {!product.category.isActive ? (
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                                      Categoría inactiva
                                    </span>
                                  ) : null}
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                                    Actualizado: {formatAdminDate(product.updatedAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-5">
                            <div className="flex min-w-[145px] flex-col gap-2">
                              <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${getProductStatusBadgeClasses(product.status)}`}>
                                {product.status}
                              </span>
                              <span className="text-xs text-slate-500">
                                {product.usaVariantes ? "Usa variantes" : "Sin variantes"}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-5">
                            <div className="min-w-[135px]">
                              <p className="font-semibold text-slate-950">
                                {formatCurrency(product.precio, product.currency)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                prioridad {product.prioridad ?? "—"} · orden {product.orden}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-5">
                            <div className="flex min-w-[168px] space-y-1 text-sm text-slate-700">
                              <p>{formatStockLabel(product)}</p>
                              <p className="text-xs text-slate-500">
                                {product.stockIlimitado ? "Ilimitado" : `Stock base: ${product.stock ?? "—"}`}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-5">
                            <div className="flex min-w-[226px] flex-wrap gap-1.5">
                              <CountChip label="Imgs" value={product.imageCount} title="Imágenes" />
                              <CountChip label="Secc." value={product.sectionCount} title="Secciones" />
                              <CountChip label="Grupos" value={product.catalogGroupCount} title="Grupos de catálogo" />
                              <CountChip label="Vars." value={product.variantCount} title="Variantes" />
                              <CountChip label="Activas" value={product.activeVariantCount} title="Variantes activas" />
                              <CountChip label="Órdenes" value={product.orderItemCount} title="Items de orden" />
                              <CountChip label="Publ." value={product.publicationLinksCount} title="Publicaciones relacionadas" />
                            </div>
                          </td>

                          <td className="px-4 py-5">
                            <div className="flex min-w-[200px] flex-wrap gap-1.5">
                              {alerts.length > 0 ? (
                                alerts.map((alert) => (
                                  <span
                                    key={`${product.id}-${alert.label}`}
                                    className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-4 ${getAlertClasses(alert.tone)}`}
                                  >
                                    {alert.label}
                                  </span>
                                ))
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                  Sin alertas
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="sticky right-0 z-10 border-l border-slate-100 bg-white/95 px-4 py-5 shadow-[-14px_0_24px_-20px_rgba(15,23,42,0.35)] backdrop-blur group-hover:bg-slate-50/85">
                            <div className="grid min-w-[148px] gap-1.5">
                              <DisabledAction label="Editar" className="w-full justify-center rounded-lg px-2.5" />
                              <AdminProductStatusAction
                                businessId={business.id}
                                expectedSlug={business.slug}
                                productId={product.id}
                                productName={product.nombre}
                                currentStatus={product.status}
                                className="w-full"
                              />
                              <AdminProductDeletePreviewAction
                                businessId={business.id}
                                expectedSlug={business.slug}
                                productId={product.id}
                                productName={product.nombre}
                                className="w-full"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>

              <div className="grid gap-3 px-3 py-3 sm:px-4 sm:py-4 lg:hidden">
                {products.map((product) => {
                  const alerts = buildProductAlerts(product);

                  return (
                    <article
                      key={product.id}
                      className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.22)]"
                    >
                      <div className="flex items-start gap-3">
                        <ProductThumbnail imageUrl={product.imageUrl} alt={product.nombre} />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-950">{product.nombre}</h3>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${getProductStatusBadgeClasses(product.status)}`}>
                              {product.status}
                            </span>
                          </div>

                          <p className="mt-1 break-all font-mono text-xs text-slate-500">
                            /producto/{product.slug}
                          </p>

                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {formatCurrency(product.precio, product.currency)}
                          </p>

                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                            {product.descripcionCorta?.trim() || product.descripcion}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                          Categoría: {product.category.nombre}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          {formatStockLabel(product)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          {product.usaVariantes ? "Usa variantes" : "Sin variantes"}
                        </span>
                        {!product.category.isActive ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                            Categoría inactiva
                          </span>
                        ) : null}
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          Actualizado: {formatAdminDate(product.updatedAt)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <CountChip label="Imgs" value={product.imageCount} title="Imágenes" />
                        <CountChip label="Secc." value={product.sectionCount} title="Secciones" />
                        <CountChip label="Grupos" value={product.catalogGroupCount} title="Grupos de catálogo" />
                        <CountChip label="Vars." value={product.variantCount} title="Variantes" />
                        <CountChip label="Activas" value={product.activeVariantCount} title="Variantes activas" />
                        <CountChip label="Órdenes" value={product.orderItemCount} title="Items de orden" />
                        <CountChip label="Publ." value={product.publicationLinksCount} title="Publicaciones relacionadas" />
                      </div>

                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Acciones
                          </p>
                          <p className="text-[11px] font-medium text-slate-500">
                            Estado habilitado
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <DisabledAction label="Editar" />
                          <AdminProductStatusAction
                            businessId={business.id}
                            expectedSlug={business.slug}
                            productId={product.id}
                            productName={product.nombre}
                            currentStatus={product.status}
                            className="min-w-[190px] flex-1"
                          />
                          <AdminProductDeletePreviewAction
                            businessId={business.id}
                            expectedSlug={business.slug}
                            productId={product.id}
                            productName={product.nombre}
                            className="min-w-[190px] flex-1"
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {alerts.length > 0 ? (
                          alerts.map((alert) => (
                            <span
                              key={`${product.id}-${alert.label}`}
                              className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-4 ${getAlertClasses(alert.tone)}`}
                            >
                              {alert.label}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            Sin alertas
                          </span>
                        )}
                      </div>

                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:px-6 sm:py-5 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-slate-600 sm:text-sm">
                  Página {pagination.page} de {pagination.totalPages}. Mostrando {firstVisibleItem}-{lastVisibleItem} de {pagination.total} resultado(s).
                </div>

                <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap">
                  {pagination.hasPreviousPage ? (
                    <Link
                      href={`${currentPath}?${buildQueryString(currentQuery, { page: pagination.page - 1 })}`}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Anterior
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-400">
                      Anterior
                    </span>
                  )}

                  {pagination.hasNextPage ? (
                    <Link
                      href={`${currentPath}?${buildQueryString(currentQuery, { page: pagination.page + 1 })}`}
                      className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Siguiente
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-400">
                      Siguiente
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}