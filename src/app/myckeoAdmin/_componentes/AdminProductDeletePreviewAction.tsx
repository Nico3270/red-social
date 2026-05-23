"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  previewAdminDeleteProductAction,
  type PreviewAdminDeleteProductActionResult,
} from "@/actions/myckeoAdmin/previewAdminDeleteProductAction";
import { deleteAdminProductAction } from "@/actions/myckeoAdmin/deleteAdminProductAction";
import {
  forceDeleteAdminProductAction,
  type ForceDeleteAdminProductActionResult,
} from "@/actions/myckeoAdmin/forceDeleteAdminProductAction";

type AdminProductDeletePreviewActionProps = {
  businessId: string;
  expectedSlug: string;
  productId: string;
  productName: string;
  className?: string;
};

type PreviewState =
  | {
      status: "idle";
      data: null;
      error: null;
    }
  | {
      status: "success";
      data: Extract<PreviewAdminDeleteProductActionResult, { ok: true }>;
      error: null;
    }
  | {
      status: "error";
      data: null;
      error: string;
    };

function RecommendedMessage({
  value,
}: {
  value: "delete_allowed" | "hide_or_discontinue" | "blocked";
}) {
  if (value === "blocked") {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] leading-4 text-rose-700">
        Este producto no puede eliminarse. Usa ocultar o descontinuar.
      </p>
    );
  }

  if (value === "hide_or_discontinue") {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-4 text-amber-700">
        Este producto tiene relaciones. Se recomienda ocultar o descontinuar.
      </p>
    );
  }

  return (
    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] leading-4 text-emerald-700">
      Este producto no tiene relaciones detectadas. Aun así, esta acción no se puede deshacer.
    </p>
  );
}

function ImpactChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </span>
  );
}

export default function AdminProductDeletePreviewAction({
  businessId,
  expectedSlug,
  productId,
  productName,
  className,
}: AdminProductDeletePreviewActionProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isForceDeletePending, startForceDeleteTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<PreviewState>({
    status: "idle",
    data: null,
    error: null,
  });
  const [confirmText, setConfirmText] = useState("");
  const [confirmForceText, setConfirmForceText] = useState("");
  const [deleteOutcome, setDeleteOutcome] = useState<{
    status: "idle" | "success" | "error";
    message: string | null;
  }>({ status: "idle", message: null });
  const [forceDeleteOutcome, setForceDeleteOutcome] = useState<{
    status: "idle" | "success" | "error";
    message: string | null;
    cleanupSummary: Extract<ForceDeleteAdminProductActionResult, { ok: true }>[
      "cleanupSummary"
    ] | null;
  }>({ status: "idle", message: null, cleanupSummary: null });

  const isAnyPending = isPending || isDeletePending || isForceDeletePending;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setState({ status: "idle", data: null, error: null });
    setConfirmText("");
    setConfirmForceText("");
    setDeleteOutcome({ status: "idle", message: null });
    setForceDeleteOutcome({ status: "idle", message: null, cleanupSummary: null });
  }, [businessId, expectedSlug, productId]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isAnyPending) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, isAnyPending]);

  const counts = useMemo(() => {
    if (state.status !== "success") {
      return null;
    }

    return state.data.impact;
  }, [state]);

  const handleOpenPreview = () => {
    if (isAnyPending) {
      return;
    }

    setIsOpen(true);
    setState({ status: "idle", data: null, error: null });
    setConfirmText("");
    setConfirmForceText("");
    setDeleteOutcome({ status: "idle", message: null });
    setForceDeleteOutcome({ status: "idle", message: null, cleanupSummary: null });

    startTransition(async () => {
      const result = await previewAdminDeleteProductAction({
        businessId,
        expectedSlug,
        productId,
      });

      if (!result.ok) {
        setState({
          status: "error",
          data: null,
          error: result.error,
        });
        return;
      }

      setState({
        status: "success",
        data: result,
        error: null,
      });
    });
  };

  const closeDialog = () => {
    if (isAnyPending) return;
    setIsOpen(false);
  };

  const canShowDeleteSection =
    state.status === "success" &&
    state.data.recommendedAction === "delete_allowed" &&
    state.data.blockers.length === 0 &&
    deleteOutcome.status !== "success";

  const canShowForceDeleteSection =
    state.status === "success" &&
    state.data.cleanupPlan.canForceDelete === true &&
    state.data.cleanupPlan.strategy === "force_delete_without_orders" &&
    state.data.recommendedAction !== "delete_allowed";

  const isBlockedByOrders =
    state.status === "success" && state.data.cleanupPlan.strategy === "blocked_by_orders";

  const forceDeleteItemsWithCount =
    state.status === "success"
      ? state.data.cleanupPlan.dbCleanup.filter((item) => item.count > 0)
      : [];

  const canConfirmDelete =
    canShowDeleteSection &&
    confirmText === "ELIMINAR" &&
    !isAnyPending;

  const canConfirmForceDelete =
    canShowForceDeleteSection &&
    confirmForceText === "ELIMINAR FORZADO" &&
    state.status === "success" &&
    state.data.cleanupPlan.canForceDelete === true &&
    state.data.cleanupPlan.strategy === "force_delete_without_orders" &&
    !isAnyPending &&
    deleteOutcome.status !== "success" &&
    forceDeleteOutcome.status !== "success";

  const handleDelete = () => {
    if (!canConfirmDelete) return;

    startDeleteTransition(async () => {
      const result = await deleteAdminProductAction({
        businessId,
        expectedSlug,
        productId,
      });

      if (!result.ok) {
        setDeleteOutcome({ status: "error", message: result.error });
        return;
      }

      setDeleteOutcome({
        status: "success",
        message: `"${result.deletedProduct.nombre}" fue eliminado definitivamente.`,
      });
      router.refresh();
    });
  };

  const handleForceDelete = () => {
    if (!canConfirmForceDelete) return;

    startForceDeleteTransition(async () => {
      const result = await forceDeleteAdminProductAction({
        businessId,
        expectedSlug,
        productId,
      });

      if (!result.ok) {
        setForceDeleteOutcome({
          status: "error",
          message: result.error,
          cleanupSummary: null,
        });
        return;
      }

      setForceDeleteOutcome({
        status: "success",
        message: `"${result.deletedProduct.nombre}" fue eliminado forzadamente con limpieza segura.`,
        cleanupSummary: result.cleanupSummary,
      });
      router.refresh();
    });
  };

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-3 sm:p-6"
      onClick={closeDialog}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Preview de eliminación de ${productName}`}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_28px_60px_-26px_rgba(15,23,42,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Preview de eliminación
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
              {productName}
            </h3>
          </div>

          <button
            type="button"
            onClick={closeDialog}
            disabled={isAnyPending}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cerrar
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {state.status === "idle" && isPending ? (
            <p className="text-sm text-slate-600">Consultando impacto...</p>
          ) : null}

          {state.status === "error" ? (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <p className="font-semibold">No se pudo cargar el preview</p>
              <p className="mt-1">{state.error}</p>
            </section>
          ) : null}

          {state.status === "success" ? (
            <div className="space-y-3">
              <RecommendedMessage value={state.data.recommendedAction} />

              {counts ? (
                <div className="flex flex-wrap gap-1.5">
                  <ImpactChip label="Pedidos" value={counts.orderItemCount} />
                  <ImpactChip label="Variantes" value={counts.variantCount} />
                  <ImpactChip label="Imágenes" value={counts.imageCount} />
                  <ImpactChip label="Secciones" value={counts.sectionRelationCount} />
                  <ImpactChip label="Grupos" value={counts.catalogGroupRelationCount} />
                  <ImpactChip label="Publicaciones" value={counts.publicationLinkCount} />
                  <ImpactChip label="Generaciones" value={counts.generationCount} />
                </div>
              ) : null}

              {state.data.blockers.length > 0 ? (
                <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p className="font-semibold">Blockers</p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 sm:text-sm">
                    {state.data.blockers.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {state.data.warnings.length > 0 ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  <p className="font-semibold">Warnings</p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 sm:text-sm">
                    {state.data.warnings.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {canShowDeleteSection ? (
                <section className="space-y-2.5 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3">
                  <p className="text-xs font-semibold text-rose-800 sm:text-sm">
                    Eliminar definitivamente
                  </p>
                  <p className="text-xs leading-5 text-rose-700">
                    Esta acción es irreversible. Para confirmar, escribe{" "}
                    <span className="font-mono font-bold tracking-wide">ELIMINAR</span> en el
                    campo de abajo.
                  </p>

                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    disabled={isDeletePending}
                    placeholder="ELIMINAR"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 placeholder-rose-200 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  {deleteOutcome.status === "error" ? (
                    <p className="text-xs font-medium text-rose-700">{deleteOutcome.message}</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={!canConfirmDelete}
                    className="inline-flex h-9 w-full items-center justify-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-200 disabled:text-rose-400"
                  >
                    {isDeletePending ? "Eliminando..." : "Eliminar definitivamente"}
                  </button>
                </section>
              ) : null}

              {canShowForceDeleteSection ? (
                <section className="space-y-3 rounded-2xl border border-fuchsia-300 bg-fuchsia-50 px-4 py-3">
                  <p className="text-xs font-semibold text-fuchsia-900 sm:text-sm">
                    Eliminación forzada segura
                  </p>
                  <p className="text-xs leading-5 text-fuchsia-800">
                    Este producto no tiene pedidos asociados, pero sí tiene relaciones no
                    históricas. Se limpiarán relaciones internas antes de eliminar el producto.
                  </p>

                  <div className="space-y-2 rounded-xl border border-fuchsia-200 bg-white px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fuchsia-700">
                      Plan de limpieza
                    </p>
                    {forceDeleteItemsWithCount.length > 0 ? (
                      <ul className="space-y-2 text-xs text-slate-700">
                        {forceDeleteItemsWithCount.map((item) => (
                          <li key={item.label} className="rounded-lg border border-slate-200 px-2.5 py-2">
                            <p className="font-semibold text-slate-900">
                              {item.label}: {item.count}
                            </p>
                            <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                              acción: {item.action}
                            </p>
                            <p className="mt-1 text-[11px] leading-4 text-slate-600">
                              {item.description}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-600">
                        No se detectaron relaciones con conteo mayor a cero para limpiar.
                      </p>
                    )}
                  </div>

                  {state.data.cleanupPlan.cloudinaryCleanup.hasRemoteAssets ? (
                    <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                      Esta acción no elimina archivos remotos de Cloudinary. Puede quedar
                      limpieza pendiente de assets.
                    </p>
                  ) : null}

                  <p className="text-xs leading-5 text-fuchsia-800">
                    Para confirmar, escribe exactamente{" "}
                    <span className="font-mono font-bold tracking-wide">
                      ELIMINAR FORZADO
                    </span>
                    .
                  </p>

                  <input
                    type="text"
                    value={confirmForceText}
                    onChange={(e) => setConfirmForceText(e.target.value)}
                    disabled={isForceDeletePending}
                    placeholder="ELIMINAR FORZADO"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-lg border border-fuchsia-200 bg-white px-3 py-2 text-sm font-mono text-slate-900 placeholder-fuchsia-200 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  {forceDeleteOutcome.status === "error" ? (
                    <p className="text-xs font-medium text-rose-700">
                      {forceDeleteOutcome.message}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleForceDelete}
                    disabled={!canConfirmForceDelete}
                    className="inline-flex h-9 w-full items-center justify-center rounded-xl bg-fuchsia-700 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-800 disabled:cursor-not-allowed disabled:bg-fuchsia-200 disabled:text-fuchsia-500"
                  >
                    {isForceDeletePending
                      ? "Eliminando forzadamente..."
                      : "Eliminar forzadamente"}
                  </button>
                </section>
              ) : null}

              {isBlockedByOrders ? (
                <section className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">Eliminación forzada no permitida</p>
                  <p className="mt-1 text-xs leading-5">
                    Este producto tiene pedidos asociados. En esta fase no se permite eliminarlo
                    forzadamente. Usa descontinuar.
                  </p>
                </section>
              ) : null}

              {deleteOutcome.status === "success" ? (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <p className="font-semibold">Producto eliminado</p>
                  <p className="mt-1 text-xs leading-5">{deleteOutcome.message}</p>
                </section>
              ) : null}

              {forceDeleteOutcome.status === "success" ? (
                <section className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <p className="font-semibold">Producto eliminado forzadamente</p>
                  <p className="text-xs leading-5">{forceDeleteOutcome.message}</p>
                  {forceDeleteOutcome.cleanupSummary ? (
                    <div className="grid grid-cols-1 gap-1 text-[11px] leading-4 text-emerald-900 sm:grid-cols-2">
                      <p>
                        CatalogGroupProduct: {" "}
                        {forceDeleteOutcome.cleanupSummary.catalogGroupRelationsDeleted}
                      </p>
                      <p>
                        ProductSection: {" "}
                        {forceDeleteOutcome.cleanupSummary.sectionRelationsDeleted}
                      </p>
                      <p>
                        ProductAttribute: {" "}
                        {forceDeleteOutcome.cleanupSummary.attributesDeleted}
                      </p>
                      <p>
                        PublicacionProducto: {" "}
                        {forceDeleteOutcome.cleanupSummary.publicationLinksDeleted}
                      </p>
                      <p>
                        ProductImageGeneration: {" "}
                        {forceDeleteOutcome.cleanupSummary.generationsDeleted}
                      </p>
                      <p>Image: {forceDeleteOutcome.cleanupSummary.imagesDeleted}</p>
                      <p>ProductVariant: {forceDeleteOutcome.cleanupSummary.variantsDeleted}</p>
                      <p>
                        ProductVariantOption: {" "}
                        {forceDeleteOutcome.cleanupSummary.variantOptionsDeleted}
                      </p>
                      <p>
                        Cloudinary pendiente: {" "}
                        {forceDeleteOutcome.cleanupSummary.cloudinaryCleanupPending
                          ? "Sí"
                          : "No"}
                      </p>
                      <p>
                        Estimado assets: {" "}
                        {forceDeleteOutcome.cleanupSummary.cloudinaryAssetEstimate}
                      </p>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <div className={`flex min-w-0 flex-col gap-1.5 ${className ?? ""}`}>
        <button
          type="button"
          onClick={handleOpenPreview}
          disabled={isAnyPending}
          className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:h-9"
        >
          {isPending ? "Revisando..." : "Revisar eliminación"}
        </button>

      </div>

      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}