"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { archiveBusinessAction } from "@/actions/myckeoAdmin/archiveBusinessAction";
import { unarchiveBusinessAction } from "@/actions/myckeoAdmin/unarchiveBusinessAction";
import { updateBusinessTestFlagAction } from "@/actions/myckeoAdmin/updateBusinessTestFlagAction";
import BusinessDeletePreviewDialog from "./BusinessDeletePreviewDialog";

type BusinessActionsCellProps = {
  business: {
    id: string;
    nombre: string;
    slug: string | null;
    estado: string;
    isTestData: boolean;
    archivedAt: Date | string | null;
  };
  compact?: boolean;
};

type ActionKey =
  | "archive"
  | "unarchive"
  | "mark_test"
  | "mark_real"
  | null;

export default function BusinessActionsCell({
  business,
  compact = false,
}: BusinessActionsCellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<ActionKey>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isArchived = Boolean(business.archivedAt);
  const businessSlug = business.slug?.trim() ?? "";
  const organizeHref = businessSlug
    ? `/myckeoAdmin/organizar/${encodeURIComponent(businessSlug)}`
    : null;
  const editHref = businessSlug
    ? `/myckeoAdmin/editar/${encodeURIComponent(businessSlug)}`
    : null;
  const productsHref = businessSlug
    ? `/myckeoAdmin/productos/${encodeURIComponent(businessSlug)}`
    : null;

  const clearFeedback = () => {
    setFeedback(null);
  };

  const runWithFeedback = (
    action: ActionKey,
    runner: () => Promise<{ ok: boolean; message: string; error: string | null }>
  ) => {
    clearFeedback();
    setActiveAction(action);

    startTransition(async () => {
      try {
        const result = await runner();

        if (!result.ok) {
          setFeedback({
            type: "error",
            message: result.error || "No fue posible completar la acción.",
          });
          return;
        }

        setFeedback({
          type: "success",
          message: result.message || "Acción ejecutada correctamente.",
        });

        router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Ocurrió un error inesperado al ejecutar la acción.",
        });
      } finally {
        setActiveAction(null);
      }
    });
  };

  const handleArchive = () => {
    if (isPending || isArchived) return;

    const confirmed = window.confirm(
      `¿Seguro que quieres archivar el negocio "${business.nombre}"?\n\nEsto lo marcará como archivado y lo dejará en estado eliminado para mantener compatibilidad con la lógica actual.`
    );

    if (!confirmed) return;

    runWithFeedback("archive", () =>
      archiveBusinessAction({
        businessId: business.id,
      })
    );
  };

  const handleUnarchive = () => {
    if (isPending || !isArchived) return;

    const confirmed = window.confirm(
      `¿Seguro que quieres desarchivar el negocio "${business.nombre}"?\n\nEsto quitará archivedAt y, si estaba en estado eliminado, lo devolverá a activo.`
    );

    if (!confirmed) return;

    runWithFeedback("unarchive", () =>
      unarchiveBusinessAction({
        businessId: business.id,
      })
    );
  };

  const handleToggleTestFlag = (nextIsTestData: boolean) => {
    if (isPending) return;

    const actionLabel = nextIsTestData ? "marcar como test" : "marcar como real";

    const confirmed = window.confirm(
      `¿Seguro que quieres ${actionLabel} el negocio "${business.nombre}"?`
    );

    if (!confirmed) return;

    runWithFeedback(nextIsTestData ? "mark_test" : "mark_real", () =>
      updateBusinessTestFlagAction({
        businessId: business.id,
        isTestData: nextIsTestData,
      })
    );
  };

  const baseButtonClasses =
    "inline-flex h-9 items-center justify-center rounded-2xl border px-3 text-[11px] font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 xl:h-10 xl:px-3.5 xl:text-xs";

  const containerClasses = compact
    ? "flex flex-wrap gap-2"
    : "flex flex-wrap items-center justify-start gap-2 xl:justify-end";

  return (
    <>
      <div className="flex flex-col gap-2">
      <div className={containerClasses}>
        {organizeHref ? (
          <Link
            href={organizeHref}
            className={`${baseButtonClasses} border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50`}
            title={`Organizar catálogo de ${business.nombre}`}
          >
            Organizar
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className={`${baseButtonClasses} border-slate-200 bg-white text-slate-400 shadow-sm`}
            title="Este negocio no tiene slug disponible"
          >
            Organizar
          </button>
        )}

        {editHref ? (
          <Link
            href={editHref}
            className={`${baseButtonClasses} border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50`}
            title={`Editar ${business.nombre}`}
          >
            Editar
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className={`${baseButtonClasses} border-slate-200 bg-white text-slate-400 shadow-sm`}
            title="Este negocio no tiene slug disponible"
          >
            Editar
          </button>
        )}

        {productsHref ? (
          <Link
            href={productsHref}
            className={`${baseButtonClasses} border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50`}
            title={`Ver productos de ${business.nombre}`}
          >
            Productos
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className={`${baseButtonClasses} border-slate-200 bg-white text-slate-400 shadow-sm`}
            title="Este negocio no tiene slug disponible"
          >
            Productos
          </button>
        )}

        {isArchived ? (
          <button
            type="button"
            onClick={handleUnarchive}
            disabled={isPending}
            className={`${baseButtonClasses} border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-100`}
          >
            {activeAction === "unarchive" && isPending
              ? "Desarchivando..."
              : "Desarchivar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleArchive}
            disabled={isPending}
            className={`${baseButtonClasses} border-amber-200 bg-amber-50 text-amber-700 shadow-sm hover:border-amber-300 hover:bg-amber-100`}
          >
            {activeAction === "archive" && isPending
              ? "Archivando..."
              : "Archivar"}
          </button>
        )}

        {business.isTestData ? (
          <button
            type="button"
            onClick={() => handleToggleTestFlag(false)}
            disabled={isPending}
            className={`${baseButtonClasses} border-sky-200 bg-sky-50 text-sky-700 shadow-sm hover:border-sky-300 hover:bg-sky-100`}
          >
            {activeAction === "mark_real" && isPending
              ? "Cambiando..."
              : "Marcar real"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleToggleTestFlag(true)}
            disabled={isPending}
            className={`${baseButtonClasses} border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 shadow-sm hover:border-fuchsia-300 hover:bg-fuchsia-100`}
          >
            {activeAction === "mark_test" && isPending
              ? "Cambiando..."
              : "Marcar test"}
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className={`${baseButtonClasses} border-rose-200 bg-rose-50 text-rose-700 shadow-sm hover:border-rose-300 hover:bg-rose-100`}
          title="Ver preview de impacto antes de una futura purge"
        >
          Eliminar
        </button>

        {/*
        Más adelante:
        <BusinessPreviewDeleteButton businessId={business.id} />
        <BusinessActionsDropdown business={business} />
        */}
      </div>

      {feedback && (
        <div
          className={`rounded-2xl border px-3 py-2 text-xs shadow-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      )}
      </div>

      <BusinessDeletePreviewDialog
        business={business}
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  );
}
