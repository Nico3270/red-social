"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  previewDeleteBusinessAction,
  type PreviewDeleteBusinessActionResult,
} from "@/actions/myckeoAdmin/previewDeleteBusinessAction";
import { purgeTestBusinessAction } from "@/actions/myckeoAdmin/purgeTestBusinessAction";
import BusinessArchivedBadge from "./BusinessArchivedBadge";
import BusinessStatusBadge from "./BusinessStatusBadge";
import BusinessTypeBadge from "./BusinessTypeBadge";
import { formatAdminDate } from "./businessesShared";

type BusinessDeletePreviewDialogProps = {
  business: {
    id: string;
    nombre: string;
    slug: string | null;
    estado: string;
    isTestData: boolean;
    archivedAt: Date | string | null;
  };
  open: boolean;
  onClose: () => void;
};

type PreviewState =
  | { status: "idle"; result: null; error: null }
  | { status: "loading"; result: null; error: null }
  | { status: "success"; result: NonNullable<PreviewDeleteBusinessActionResult["data"]>; error: null }
  | { status: "error"; result: null; error: string };

function getClassificationClasses(classification: string) {
  switch (classification) {
    case "delete":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    case "set_null":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "manual_review":
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case "preserve":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border border-slate-200 bg-slate-50 text-slate-600";
  }
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.28)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={`mt-3 text-2xl font-semibold tracking-tight ${accent}`}>{value}</p>
    </div>
  );
}

function NoticeBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "danger" | "warning" | "neutral";
}) {
  if (items.length === 0) return null;

  const classes =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <section className={`rounded-[28px] border px-5 py-4 ${classes}`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function BusinessDeletePreviewDialog({
  business,
  open,
  onClose,
}: BusinessDeletePreviewDialogProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<PreviewState>({
    status: "idle",
    result: null,
    error: null,
  });
  const [isPreviewPending, startTransition] = useTransition();
  const [isPurging, startPurgeTransition] = useTransition();
  const [purgeFeedback, setPurgeFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [confirmationValue, setConfirmationValue] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPurging) onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPurging, open, onClose]);

  const loadPreview = () => {
    setPurgeFeedback(null);
    setConfirmationValue("");
    setState({
      status: "loading",
      result: null,
      error: null,
    });

    startTransition(async () => {
      try {
        const result = await previewDeleteBusinessAction({
          businessId: business.id,
        });

        if (!result.ok || !result.data) {
          setState({
            status: "error",
            result: null,
            error: result.error || result.message || "No fue posible cargar el preview.",
          });
          return;
        }

        setState({
          status: "success",
          result: result.data,
          error: null,
        });
      } catch {
        setState({
          status: "error",
          result: null,
          error: "Ocurrió un error inesperado al consultar el impacto del borrado.",
        });
      }
    });
  };

  const handlePurge = () => {
    if (state.status !== "success" || isPurging) return;

    const preview = state.result;
    const normalizedExpectedName = preview.business.nombre.trim();
    const normalizedConfirmationValue = confirmationValue.trim();

    if (!preview.canDelete) {
      setPurgeFeedback({
        type: "error",
        message:
          preview.blockers[0] ||
          "Este negocio todavía no cumple las condiciones de seguridad para una purge profunda.",
      });
      return;
    }

    if (normalizedConfirmationValue !== normalizedExpectedName) {
      setPurgeFeedback({
        type: "error",
        message:
          "Para habilitar una acción irreversible, escribe exactamente el nombre del negocio tal como aparece en el preview.",
      });
      return;
    }

    setPurgeFeedback(null);

    startPurgeTransition(async () => {
      try {
        const result = await purgeTestBusinessAction({
          businessId: preview.business.id,
        });

        if (!result.ok || !result.data) {
          setPurgeFeedback({
            type: "error",
            message:
              result.error ||
              result.message ||
              "No fue posible completar la purge profunda.",
          });
          return;
        }

        const totalDeleted = Object.values(result.data.deletedCounts).reduce(
          (sum, count) => sum + count,
          0
        );

        setPurgeFeedback({
          type: "success",
          message: [
            totalDeleted > 0
              ? `Purge completada. Se eliminaron ${result.data.totalExplicitDeleted} registros de forma explícita y se estiman ${result.data.totalCascadeEstimated} adicionales por cascada.`
              : "Purge completada correctamente.",
            `Assets remotos: ${result.data.assetCleanup.deleted} borrados, ${result.data.assetCleanup.alreadyMissing} ya ausentes, ${result.data.assetCleanup.failed} con fallo y ${result.data.assetCleanup.unresolved} sin metadata confiable.`,
          ].join(" "),
        });

        router.refresh();

        window.setTimeout(() => {
          onClose();
        }, 900);
      } catch {
        setPurgeFeedback({
          type: "error",
          message: "Ocurrió un error inesperado al ejecutar la purge profunda.",
        });
      }
    });
  };

  useEffect(() => {
    if (!open) return;
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, business.id]);

  let content: ReactNode;
  const confirmationMatches =
    state.status === "success" &&
    confirmationValue.trim() === state.result.business.nombre.trim();

  if (state.status === "loading" || state.status === "idle") {
    content = (
      <div className="space-y-6 px-6 py-8 sm:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((key) => (
            <div
              key={key}
              className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>

        <div className="space-y-3">
          <div className="h-5 w-44 animate-pulse rounded-full bg-slate-100" />
          <div className="h-24 animate-pulse rounded-[28px] border border-slate-200 bg-slate-100" />
          <div className="h-24 animate-pulse rounded-[28px] border border-slate-200 bg-slate-100" />
        </div>
      </div>
    );
  } else if (state.status === "error") {
    content = (
      <div className="px-6 py-8 sm:px-8">
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-5">
          <h3 className="text-sm font-semibold text-rose-700">
            No se pudo cargar el preview
          </h3>
          <p className="mt-2 text-sm leading-6 text-rose-700/90">{state.error}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadPreview}
              disabled={isPreviewPending}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    const preview = state.result;

    content = (
      <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] px-5 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Negocio analizado
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                {preview.business.nombre}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Slug: {preview.business.slug || "—"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Usuario dueño: {preview.business.usuarioId}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <BusinessStatusBadge estado={preview.business.estado} />
              <BusinessTypeBadge isTestData={preview.business.isTestData} />
              <BusinessArchivedBadge archivedAt={preview.business.archivedAt} />
            </div>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <p>
              <span className="font-medium text-slate-900">Creado:</span>{" "}
              {formatAdminDate(preview.business.createdAt)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Actualizado:</span>{" "}
              {formatAdminDate(preview.business.updatedAt)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Archivado en:</span>{" "}
              {formatAdminDate(preview.business.archivedAt)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Teléfono:</span>{" "}
              {preview.business.telefonoContacto || "—"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Cascade / delete"
            value={preview.summary.directDeleteCandidates}
            accent="text-rose-600"
          />
          <SummaryCard
            label="Set null"
            value={preview.summary.setNullCandidates}
            accent="text-amber-600"
          />
          <SummaryCard
            label="Revisión manual"
            value={preview.summary.manualReviewCandidates}
            accent="text-sky-600"
          />
          <SummaryCard
            label="Registros relacionados"
            value={preview.summary.totalRelatedRecords}
            accent="text-slate-950"
          />
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-950">
                Resultado del análisis
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Este preview clasifica relaciones seguras, dependencias históricas y zonas que requieren criterio manual.
              </p>
            </div>

            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                preview.canDelete
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {preview.canDelete
                ? "Elegible para purge"
                : "No elegible todavía"}
            </span>
          </div>
        </div>

        <NoticeBlock title="Blockers" items={preview.blockers} tone="danger" />
        <NoticeBlock title="Warnings" items={preview.warnings} tone="warning" />
        <NoticeBlock title="Notas del preview" items={preview.notes} tone="neutral" />

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h3 className="text-base font-semibold text-slate-950">
                Confirmación irreversible
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Para ejecutar la purge profunda, escribe exactamente{" "}
                <span className="font-semibold text-slate-900">
                  {preview.business.nombre}
                </span>
                . Esta verificación evita ejecuciones accidentales sobre un negocio equivocado.
              </p>
            </div>

            <div className="w-full lg:max-w-md">
              <label
                htmlFor="business-purge-confirmation"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
              >
                Escribe el nombre del negocio
              </label>
              <input
                id="business-purge-confirmation"
                type="text"
                value={confirmationValue}
                onChange={(event) => {
                  setConfirmationValue(event.target.value);
                  if (purgeFeedback?.type === "error") {
                    setPurgeFeedback(null);
                  }
                }}
                disabled={!preview.canDelete || isPurging}
                placeholder={preview.business.nombre}
                autoComplete="off"
                spellCheck={false}
                className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
                  confirmationValue.length === 0
                    ? "border-slate-200 focus:border-slate-300"
                    : confirmationMatches
                      ? "border-emerald-300 ring-4 ring-emerald-100"
                      : "border-rose-300 ring-4 ring-rose-100"
                } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`}
              />
            </div>
          </div>
        </section>

        {purgeFeedback && (
          <section
            className={`rounded-[28px] border px-5 py-4 ${
              purgeFeedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <h3 className="text-sm font-semibold">
              {purgeFeedback.type === "success"
                ? "Purge ejecutada"
                : "No se pudo ejecutar la purge"}
            </h3>
            <p className="mt-2 text-sm leading-6">{purgeFeedback.message}</p>
          </section>
        )}

        <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_34px_-24px_rgba(15,23,42,0.25)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-950">
              Impacto detectado
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Solo se listan relaciones con conteo mayor a cero.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {preview.impacts.map((impact) => (
              <div
                key={impact.key}
                className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">
                      {impact.label}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getClassificationClasses(
                        impact.classification
                      )}`}
                    >
                      {impact.classification.replace("_", " ")}
                    </span>
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
                      {impact.relationKind}
                    </span>
                  </div>

                  <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                    {impact.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:min-w-[120px] lg:flex-col lg:items-end">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Registros
                  </span>
                  <span className="text-2xl font-semibold tracking-tight text-slate-950">
                    {impact.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      <div
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={() => {
          if (!isPurging) onClose();
        }}
      />

      <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center p-3 sm:p-6">
        <div
          className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_40px_120px_-40px_rgba(15,23,42,0.45)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="business-delete-preview-title"
        >
          <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.10),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(125,211,252,0.12),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] px-6 py-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                  Preview de eliminación
                </span>
                <h2
                  id="business-delete-preview-title"
                  className="mt-3 text-2xl font-semibold tracking-tight text-slate-950"
                >
                  Revisar impacto antes de purge
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Este modal muestra el impacto estimado y, si el negocio cumple las reglas de seguridad, permite ejecutar una purge profunda solo para datos de prueba.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isPurging}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label="Cerrar preview"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>

          <div className="border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                La purge profunda solo se habilita para negocios test archivados y sigue dejando pendiente el cleanup de assets remotos.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPurging}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handlePurge}
                  disabled={
                    state.status !== "success" ||
                    !state.result.canDelete ||
                    !confirmationMatches ||
                    isPurging
                  }
                  className={`inline-flex h-11 items-center justify-center rounded-2xl border px-5 text-sm font-medium transition ${
                    state.status === "success" &&
                    state.result.canDelete &&
                    confirmationMatches &&
                    !isPurging
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                      : "border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                  title={
                    state.status === "success" &&
                    state.result.canDelete &&
                    confirmationMatches
                      ? "Ejecutar purge profunda para negocio de prueba archivado"
                      : "La purge solo se habilita cuando el negocio es test, está archivado, no tiene blockers y confirmas el nombre exacto"
                  }
                >
                  {isPurging ? "Ejecutando purge..." : "Ejecutar purge profunda"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
