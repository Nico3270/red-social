"use client";

import { useMemo, useState } from "react";
import {
  createAdminProductForBusinessAction,
  type CreateAdminProductForBusinessActionInput,
} from "@/actions/myckeoAdmin/createAdminProductForBusinessAction";
import {
  generateAdminProductBatchDraftAction,
  type AdminBatchProductDraft,
  type AdminProductBatchContextSummary,
} from "@/actions/myckeoAdmin/generateAdminProductBatchDraftAction";
import {
  getAdminBatchProductsReadinessAction,
  type AdminBatchProductReadiness,
} from "@/actions/myckeoAdmin/getAdminBatchProductsReadinessAction";
import type { AdminProductCreationBusiness } from "@/actions/myckeoAdmin/getBusinessesForProductCreationAction";
import { publishAdminProductAction } from "@/actions/myckeoAdmin/publishAdminProductAction";

type AdminProductBatchCreationPanelProps = {
  selectedBusiness: AdminProductCreationBusiness | null;
};

type BatchDraftFormState = {
  id: string;
  accepted: boolean;
  nombre: string;
  slugSugerido: string;
  precioSugerido: string;
  descripcionCorta: string;
  descripcion: string;
  tagsCsv: string;
  componentesCsv: string;
  categoriaSugerida: AdminBatchProductDraft["categoriaSugerida"];
  seccionSugerida: AdminBatchProductDraft["seccionSugerida"];
  catalogGroupsSugeridos: AdminBatchProductDraft["catalogGroupsSugeridos"];
  etiquetaEspecialSugerida: AdminBatchProductDraft["etiquetaEspecialSugerida"];
  usaVariantesSugerido: boolean;
  variantesSugeridas: AdminBatchProductDraft["variantesSugeridas"];
  promptsImagen: AdminBatchProductDraft["promptsImagen"];
  fuenteTexto: string;
};

type BatchSaveResult = {
  ok: boolean;
  message: string;
  warnings?: string[];
  product?: {
    id: string;
    slug: string;
    status: string;
  };
};

type BatchPublishResult = {
  ok: boolean;
  message: string;
};

const inputClasses =
  "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100";

const labelClasses =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

function cleanCsv(value: string) {
  const seen = new Set<string>();
  const result: string[] = [];

  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(item);
    });

  return result;
}

function buildDraftId(index: number, draft: AdminBatchProductDraft) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${draft.slugSugerido}-${index}-${Date.now()}`;
}

function toBatchFormState(
  draft: AdminBatchProductDraft,
  index: number,
): BatchDraftFormState {
  return {
    id: buildDraftId(index, draft),
    accepted: true,
    nombre: draft.nombre,
    slugSugerido: draft.slugSugerido,
    precioSugerido:
      draft.precioSugerido === null || draft.precioSugerido === undefined
        ? ""
        : String(draft.precioSugerido),
    descripcionCorta: draft.descripcionCorta,
    descripcion: draft.descripcion,
    tagsCsv: draft.tags.join(", "),
    componentesCsv: draft.componentes.join(", "),
    categoriaSugerida: draft.categoriaSugerida,
    seccionSugerida: draft.seccionSugerida,
    catalogGroupsSugeridos: draft.catalogGroupsSugeridos,
    etiquetaEspecialSugerida: draft.etiquetaEspecialSugerida,
    usaVariantesSugerido: draft.usaVariantesSugerido,
    variantesSugeridas: draft.variantesSugeridas,
    promptsImagen: draft.promptsImagen,
    fuenteTexto: draft.fuenteTexto,
  };
}

function normalizeSuggestedOption(
  option: AdminBatchProductDraft["categoriaSugerida"],
) {
  return {
    id: option.id ?? "",
    nombre: option.nombre,
    slug: option.slug ?? "",
    razon: option.razon ?? "",
  };
}

function toCreateProductDraft(
  draft: BatchDraftFormState,
): CreateAdminProductForBusinessActionInput["draft"] {
  return {
    nombre: draft.nombre,
    slugSugerido: draft.slugSugerido,
    precioBase: draft.precioSugerido,
    descripcionCorta: draft.descripcionCorta,
    descripcion: draft.descripcion,
    tags: cleanCsv(draft.tagsCsv),
    componentes: cleanCsv(draft.componentesCsv),
    categoriaSugerida: normalizeSuggestedOption(draft.categoriaSugerida),
    seccionSugerida: normalizeSuggestedOption(draft.seccionSugerida),
    catalogGroupsSugeridos: draft.catalogGroupsSugeridos.map(
      normalizeSuggestedOption,
    ),
    etiquetaEspecialSugerida: draft.etiquetaEspecialSugerida,
    usaVariantesSugerido: draft.usaVariantesSugerido,
    variantesSugeridas: draft.variantesSugeridas,
    promptsImagen: draft.promptsImagen,
  };
}

function summarizeContext(summary: AdminProductBatchContextSummary | null) {
  if (!summary) return null;

  return [
    `${summary.productsAnalyzed} productos históricos analizados`,
    `${summary.categorySignals.length} señales de categoría`,
    `${summary.catalogGroupSignals.length} grupos detectados`,
  ].join(" · ");
}

function renderReadinessBadge(signal: string) {
  const isGood = signal === "listo para publicar" || signal === "ya publicado";
  const isWarning =
    signal === "sin imagen" ||
    signal === "sin sección resuelta" ||
    signal === "sin groups" ||
    signal === "requiere revisión";

  return (
    <span
      key={signal}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
        isGood
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : isWarning
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {signal}
    </span>
  );
}

export default function AdminProductBatchCreationPanel({
  selectedBusiness,
}: AdminProductBatchCreationPanelProps) {
  const [sourceText, setSourceText] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [drafts, setDrafts] = useState<BatchDraftFormState[]>([]);
  const [contextSummary, setContextSummary] =
    useState<AdminProductBatchContextSummary | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationValidationErrors, setGenerationValidationErrors] = useState<
    string[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveResults, setSaveResults] = useState<
    Record<string, BatchSaveResult>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [readinessProducts, setReadinessProducts] = useState<
    AdminBatchProductReadiness[]
  >([]);
  const [missingProductIds, setMissingProductIds] = useState<string[]>([]);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [isRefreshingReadiness, setIsRefreshingReadiness] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [publishResults, setPublishResults] = useState<
    Record<string, BatchPublishResult>
  >({});
  const [isPublishingSelected, setIsPublishingSelected] = useState(false);

  const acceptedDrafts = useMemo(
    () => drafts.filter((draft) => draft.accepted),
    [drafts],
  );

  const savedCount = useMemo(
    () => Object.values(saveResults).filter((result) => result.ok).length,
    [saveResults],
  );

  const createdProductIds = useMemo(
    () =>
      Object.values(saveResults)
        .map((result) => result.product?.id)
        .filter((id): id is string => Boolean(id)),
    [saveResults],
  );

  const selectedReadyProducts = useMemo(
    () =>
      readinessProducts.filter(
        (product) =>
          selectedProductIds.has(product.id) && product.readyToPublish,
      ),
    [readinessProducts, selectedProductIds],
  );

  const readyCount = useMemo(
    () => readinessProducts.filter((product) => product.readyToPublish).length,
    [readinessProducts],
  );

  const canGenerate =
    Boolean(selectedBusiness) &&
    sourceText.trim().length >= 20 &&
    !isGenerating;

  const updateDraft = (
    draftId: string,
    updater: (draft: BatchDraftFormState) => BatchDraftFormState,
  ) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === draftId ? updater(draft) : draft)),
    );
    setSaveResults((current) => {
      const next = { ...current };
      delete next[draftId];
      return next;
    });
  };

  const refreshReadiness = async (productIds = createdProductIds) => {
    if (!selectedBusiness || productIds.length === 0) return;

    setIsRefreshingReadiness(true);
    setReadinessError(null);

    try {
      const result = await getAdminBatchProductsReadinessAction({
        businessId: selectedBusiness.id,
        productIds,
      });

      if (!result.ok || !result.data) {
        setReadinessError(
          result.error || "No fue posible consultar el estado post-batch.",
        );
        return;
      }

      const readinessData = result.data;

      setReadinessProducts(readinessData.products);
      setMissingProductIds(readinessData.missingProductIds);
      setSelectedProductIds((current) => {
        const availableIds = new Set(
          readinessData.products.map((product) => product.id),
        );
        const keptSelection = Array.from(current).filter((id) =>
          availableIds.has(id),
        );

        if (keptSelection.length > 0) return new Set(keptSelection);

        return new Set(
          readinessData.products
            .filter((product) => product.readyToPublish)
            .map((product) => product.id),
        );
      });
    } catch (error) {
      setReadinessError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al consultar el estado post-batch.",
      );
    } finally {
      setIsRefreshingReadiness(false);
    }
  };

  const toggleSelectedProduct = (productId: string) => {
    setSelectedProductIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handlePublishSelected = async () => {
    if (!selectedBusiness || selectedReadyProducts.length === 0) return;

    setIsPublishingSelected(true);
    const nextResults = { ...publishResults };

    for (const product of selectedReadyProducts) {
      const result = await publishAdminProductAction({
        businessId: selectedBusiness.id,
        productId: product.id,
      });

      nextResults[product.id] = {
        ok: result.ok,
        message:
          result.error ||
          result.validationErrors?.join(" · ") ||
          (result.ok ? "Producto publicado." : "No fue posible publicar."),
      };

      setPublishResults({ ...nextResults });
    }

    setIsPublishingSelected(false);
    await refreshReadiness(createdProductIds);
  };

  const handleGenerateBatch = async () => {
    if (!selectedBusiness || !canGenerate) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationValidationErrors([]);
    setSaveResults({});
    setReadinessProducts([]);
    setMissingProductIds([]);
    setReadinessError(null);
    setSelectedProductIds(new Set());
    setPublishResults({});

    try {
      const result = await generateAdminProductBatchDraftAction({
        businessId: selectedBusiness.id,
        sourceText,
        additionalInstructions,
      });

      if (!result.ok || !result.data) {
        setGenerationError(
          result.error || "No fue posible generar el batch de productos.",
        );
        setGenerationValidationErrors(result.validationErrors ?? []);
        return;
      }

      setDrafts(result.data.drafts.map(toBatchFormState));
      setContextSummary(result.data.contextSummary);
      setModel(result.data.model);
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al generar el batch.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAcceptedDrafts = async () => {
    if (!selectedBusiness || acceptedDrafts.length === 0) return;

    setIsSaving(true);
    const nextResults = { ...saveResults };

    for (const draft of acceptedDrafts) {
      if (nextResults[draft.id]?.ok) continue;

      if (!draft.precioSugerido.trim()) {
        nextResults[draft.id] = {
          ok: false,
          message: "Agrega un precio antes de guardar este producto.",
        };
        setSaveResults({ ...nextResults });
        continue;
      }

      const result = await createAdminProductForBusinessAction({
        businessId: selectedBusiness.id,
        draft: toCreateProductDraft(draft),
      });

      if (!result.ok || !result.data) {
        nextResults[draft.id] = {
          ok: false,
          message:
            result.error ||
            result.validationErrors?.join(" · ") ||
            "No fue posible guardar este producto.",
        };
      } else {
        nextResults[draft.id] = {
          ok: true,
          message: "Producto guardado como oculto.",
          warnings: result.data.warnings,
          product: {
            id: result.data.product.id,
            slug: result.data.product.slug,
            status: result.data.product.status,
          },
        };
      }

      setSaveResults({ ...nextResults });
    }

    setIsSaving(false);

    const createdIds = Object.values(nextResults)
      .map((result) => result.product?.id)
      .filter((id): id is string => Boolean(id));

    if (createdIds.length > 0) {
      await refreshReadiness(createdIds);
    }
  };

  return (
    <section className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.3)]">
        <div className="border-b border-slate-100 px-6 py-5">
          <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Batch V1
          </span>
          <h2 className="mt-3 text-lg font-semibold text-slate-950">
            Crear varios productos desde texto
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Pega una carta, lista o texto extraído manualmente. La IA propone
            drafts; tú decides qué guardar como oculto.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Negocio destino
            </p>
            {selectedBusiness ? (
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {selectedBusiness.nombre} ·{" "}
                {selectedBusiness.slug || "sin-slug"}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Selecciona un negocio para habilitar el modo batch.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="batch-source-text" className={labelClasses}>
              Carta o lista de productos
            </label>
            <textarea
              id="batch-source-text"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              rows={12}
              placeholder="Ej: Hamburguesa clásica $28.000 - carne artesanal, queso, vegetales..."
              className={inputClasses}
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              PDF/OCR queda fuera de esta fase: por ahora pega texto ya
              extraído.
            </p>
          </div>

          <div>
            <label htmlFor="batch-instructions" className={labelClasses}>
              Instrucciones adicionales
            </label>
            <textarea
              id="batch-instructions"
              value={additionalInstructions}
              onChange={(event) =>
                setAdditionalInstructions(event.target.value)
              }
              rows={3}
              placeholder="Ej: respeta precios, conserva nombres de la carta, no inventes combos."
              className={inputClasses}
            />
          </div>

          {generationError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700">
              <p className="font-semibold">{generationError}</p>
              {generationValidationErrors.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {generationValidationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            disabled={!canGenerate}
            onClick={handleGenerateBatch}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
          >
            {isGenerating
              ? "Interpretando texto..."
              : "Generar productos desde texto"}
          </button>
        </div>
      </section>

      {drafts.length > 0 ? (
        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.3)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Revisión
            </span>
            <h2 className="mt-3 text-lg font-semibold text-slate-950">
              Productos sugeridos
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {drafts.length} drafts generados
              {model ? ` con ${model}` : ""}. {summarizeContext(contextSummary)}
            </p>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-700">
              <p>
                Aceptados: {acceptedDrafts.length} · guardados como ocultos:{" "}
                {savedCount}
              </p>
              <p className="text-xs text-slate-500">
                No se publican productos ni se asocian imágenes en batch V1.
              </p>
            </div>

            {drafts.map((draft, index) => {
              const result = saveResults[draft.id];

              return (
                <article
                  key={draft.id}
                  className={`rounded-3xl border px-5 py-5 ${
                    draft.accepted
                      ? "border-slate-200 bg-white"
                      : "border-slate-200 bg-slate-50 opacity-75"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Producto {index + 1}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-950">
                        {draft.nombre || "Sin nombre"}
                      </h3>
                      {draft.fuenteTexto ? (
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Fuente: {draft.fuenteTexto}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft(draft.id, (current) => ({
                          ...current,
                          accepted: !current.accepted,
                        }))
                      }
                      className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                        draft.accepted
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {draft.accepted ? "Aceptado" : "Rechazado"}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className={labelClasses}>Nombre</label>
                      <input
                        value={draft.nombre}
                        onChange={(event) =>
                          updateDraft(draft.id, (current) => ({
                            ...current,
                            nombre: event.target.value,
                          }))
                        }
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Precio</label>
                      <input
                        value={draft.precioSugerido}
                        onChange={(event) =>
                          updateDraft(draft.id, (current) => ({
                            ...current,
                            precioSugerido: event.target.value,
                          }))
                        }
                        inputMode="numeric"
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Slug</label>
                      <input
                        value={draft.slugSugerido}
                        onChange={(event) =>
                          updateDraft(draft.id, (current) => ({
                            ...current,
                            slugSugerido: event.target.value,
                          }))
                        }
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Categoría sugerida</label>
                      <input
                        value={draft.categoriaSugerida.nombre}
                        onChange={(event) =>
                          updateDraft(draft.id, (current) => ({
                            ...current,
                            categoriaSugerida: {
                              ...current.categoriaSugerida,
                              nombre: event.target.value,
                            },
                          }))
                        }
                        className={inputClasses}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClasses}>Descripción corta</label>
                      <textarea
                        value={draft.descripcionCorta}
                        onChange={(event) =>
                          updateDraft(draft.id, (current) => ({
                            ...current,
                            descripcionCorta: event.target.value,
                          }))
                        }
                        rows={2}
                        className={inputClasses}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClasses}>Descripción</label>
                      <textarea
                        value={draft.descripcion}
                        onChange={(event) =>
                          updateDraft(draft.id, (current) => ({
                            ...current,
                            descripcion: event.target.value,
                          }))
                        }
                        rows={4}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Tags</label>
                      <input
                        value={draft.tagsCsv}
                        onChange={(event) =>
                          updateDraft(draft.id, (current) => ({
                            ...current,
                            tagsCsv: event.target.value,
                          }))
                        }
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Componentes</label>
                      <input
                        value={draft.componentesCsv}
                        onChange={(event) =>
                          updateDraft(draft.id, (current) => ({
                            ...current,
                            componentesCsv: event.target.value,
                          }))
                        }
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                      Ver clasificación y prompts generados
                    </summary>
                    <div className="mt-3 grid grid-cols-1 gap-3 text-sm leading-6 text-slate-700 lg:grid-cols-2">
                      <p>
                        Sección:{" "}
                        {draft.seccionSugerida.nombre || "sin sugerencia"}
                      </p>
                      <p>
                        Grupos:{" "}
                        {draft.catalogGroupsSugeridos
                          .map((group) => group.nombre)
                          .filter(Boolean)
                          .join(", ") || "sin sugerencias"}
                      </p>
                      <p className="lg:col-span-2">
                        Prompt catálogo: {draft.promptsImagen.promptCatalogo}
                      </p>
                    </div>
                  </details>

                  {result ? (
                    <div
                      className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                        result.ok
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      <p className="font-semibold">{result.message}</p>
                      {result.product ? (
                        <p>
                          ID:{" "}
                          <span className="font-mono">{result.product.id}</span>{" "}
                          · estado: {result.product.status} · slug final:{" "}
                          <span className="font-mono">
                            {result.product.slug}
                          </span>
                        </p>
                      ) : null}
                      {result.warnings && result.warnings.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-amber-700">
                          {result.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}

            <button
              type="button"
              disabled={acceptedDrafts.length === 0 || isSaving}
              onClick={handleSaveAcceptedDrafts}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-900 bg-emerald-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 sm:w-auto"
            >
              {isSaving
                ? "Guardando aceptados..."
                : "Guardar aceptados como ocultos"}
            </button>

            {createdProductIds.length > 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Resultado post-batch
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">
                      Productos creados y preparación de publicación
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Creados: {createdProductIds.length} · fallidos:{" "}
                      {
                        Object.values(saveResults).filter(
                          (result) => !result.ok,
                        ).length
                      }{" "}
                      · listos para publicar: {readyCount} · seleccionados
                      listos: {selectedReadyProducts.length}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={isRefreshingReadiness}
                      onClick={() => refreshReadiness(createdProductIds)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-200"
                    >
                      {isRefreshingReadiness
                        ? "Actualizando..."
                        : "Actualizar estado"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedProductIds(
                          new Set(
                            readinessProducts
                              .filter((product) => product.readyToPublish)
                              .map((product) => product.id),
                          ),
                        )
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Seleccionar listos
                    </button>
                    <button
                      type="button"
                      disabled={
                        selectedReadyProducts.length === 0 ||
                        isPublishingSelected
                      }
                      onClick={handlePublishSelected}
                      className="rounded-2xl border border-emerald-900 bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
                    >
                      {isPublishingSelected
                        ? "Publicando..."
                        : "Publicar seleccionados listos"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  La publicación por lote está controlada: solo intenta publicar
                  productos seleccionados que ya tengan imagen guardada, negocio
                  activo, nombre y precio válido. Los productos sin imagen
                  quedan marcados para media.
                </div>

                {readinessError ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                    {readinessError}
                  </div>
                ) : null}

                {missingProductIds.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm leading-6 text-amber-700">
                    No se encontraron estos productos en el negocio
                    seleccionado: {missingProductIds.join(", ")}
                  </div>
                ) : null}

                {readinessProducts.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {readinessProducts.map((product) => {
                      const saveResult = Object.values(saveResults).find(
                        (result) => result.product?.id === product.id,
                      );
                      const publishResult = publishResults[product.id];

                      return (
                        <div
                          key={product.id}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <label className="flex gap-3">
                              <input
                                type="checkbox"
                                checked={selectedProductIds.has(product.id)}
                                onChange={() =>
                                  toggleSelectedProduct(product.id)
                                }
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200"
                              />
                              <span>
                                <span className="block text-sm font-semibold text-slate-950">
                                  {product.nombre}
                                </span>
                                <span className="mt-1 block break-all text-xs text-slate-500">
                                  ID: {product.id} · slug: {product.slug} ·
                                  negocio: {product.negocioNombre}
                                </span>
                                <span className="mt-1 block text-xs text-slate-500">
                                  Estado: {product.status} · precio:{" "}
                                  {product.precio} · categoría:{" "}
                                  {product.categoryName}
                                </span>
                              </span>
                            </label>

                            <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
                              <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                                Imágenes
                                <strong className="block text-slate-950">
                                  {product.imageCount}
                                </strong>
                              </span>
                              <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                                Secciones
                                <strong className="block text-slate-950">
                                  {product.sectionCount}
                                </strong>
                              </span>
                              <span className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                                Groups
                                <strong className="block text-slate-950">
                                  {product.catalogGroupCount}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {product.signals.map(renderReadinessBadge)}
                          </div>

                          {product.blockers.length > 0 ? (
                            <ul className="mt-3 space-y-1 text-sm text-amber-700">
                              {product.blockers.map((blocker) => (
                                <li key={blocker}>{blocker}</li>
                              ))}
                            </ul>
                          ) : null}

                          {saveResult?.warnings &&
                          saveResult.warnings.length > 0 ? (
                            <ul className="mt-3 space-y-1 text-sm text-amber-700">
                              {saveResult.warnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                              ))}
                            </ul>
                          ) : null}

                          {publishResult ? (
                            <div
                              className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                                publishResult.ok
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-rose-200 bg-rose-50 text-rose-700"
                              }`}
                            >
                              {publishResult.message}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-600">
                    Guarda productos o actualiza el estado para ver señales de
                    calidad post-batch.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}
