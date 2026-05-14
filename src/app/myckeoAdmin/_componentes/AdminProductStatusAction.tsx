"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateAdminProductStatusAction,
} from "@/actions/myckeoAdmin/updateAdminProductStatusAction";
import { ProductStatus } from "@prisma/client";

type AdminProductStatusActionProps = {
  businessId: string;
  expectedSlug: string;
  productId: string;
  productName: string;
  currentStatus: ProductStatus;
  className?: string;
};

const STATUS_OPTIONS: Array<{ value: ProductStatus; label: string }> = [
  { value: ProductStatus.disponible, label: "Disponible" },
  { value: ProductStatus.agotado, label: "Agotado" },
  { value: ProductStatus.oculto, label: "Oculto" },
  { value: ProductStatus.descontinuado, label: "Descontinuado" },
];

const ALLOWED_STATUS_VALUES = new Set<ProductStatus>(
  STATUS_OPTIONS.map((option) => option.value),
);

export default function AdminProductStatusAction({
  businessId,
  expectedSlug,
  productId,
  productName,
  currentStatus,
  className,
}: AdminProductStatusActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus>(currentStatus);
  const [feedback, setFeedback] = useState<
    | {
        type: "success" | "error";
        message: string;
      }
    | null
  >(null);

  useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus]);

  const statusChanged = useMemo(
    () => selectedStatus !== currentStatus,
    [selectedStatus, currentStatus],
  );

  const handleApply = () => {
    if (!statusChanged || isPending) {
      return;
    }

    if (selectedStatus === ProductStatus.descontinuado) {
      const confirmed = window.confirm(
        "Vas a marcar este producto como descontinuado. No se eliminará, pero dejará de considerarse activo. ¿Continuar?",
      );

      if (!confirmed) {
        return;
      }
    }

    setFeedback(null);

    startTransition(async () => {
      const result = await updateAdminProductStatusAction({
        businessId,
        expectedSlug,
        productId,
        status: selectedStatus,
      });

      if (!result.ok) {
        setFeedback({
          type: "error",
          message: result.error,
        });
        return;
      }

      setFeedback({
        type: "success",
        message:
          result.message ||
          `Estado actualizado para ${productName}. Si hay filtros activos, este producto podría desaparecer de la lista.`,
      });

      window.setTimeout(() => {
        router.refresh();
      }, 250);
    });
  };

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className ?? ""}`}>
      <div className="flex min-w-0 items-center gap-1.5">
        <select
          value={selectedStatus}
          onChange={(event) => {
            const nextValue = event.target.value as ProductStatus;

            if (!ALLOWED_STATUS_VALUES.has(nextValue)) {
              setFeedback({
                type: "error",
                message: "Estado inválido. Selecciona una opción permitida.",
              });
              return;
            }

            setFeedback(null);
            setSelectedStatus(nextValue);
          }}
          disabled={isPending}
          aria-label={`Cambiar estado de ${productName}`}
          className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-400 sm:h-9"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleApply}
          disabled={!statusChanged || isPending}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-900 px-2.5 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:h-9"
        >
          {isPending ? "..." : "Aplicar"}
        </button>
      </div>

      {feedback ? (
        <p
          className={`text-[11px] leading-4 ${
            feedback.type === "success" ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}