"use client";

import { useRef, useState } from "react";
import { FaSpinner } from "react-icons/fa";

import { cancelManagedReservation } from "@/reservas/actions/cancelManagedReservation";

const GENERIC_ERROR_MESSAGE =
  "No pudimos procesar la cancelación. Inténtalo nuevamente.";

type CancellationFeedback = {
  message: string;
  terminal: boolean;
  success: boolean;
};

export default function ManagedReservationCancelForm() {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<CancellationFeedback | null>(null);
  const submitInFlight = useRef(false);

  const openConfirmation = () => {
    if (submitInFlight.current || pending || feedback?.terminal) return;
    setConfirmationOpen(true);
  };

  const closeConfirmation = () => {
    if (submitInFlight.current || pending) return;
    setConfirmationOpen(false);
  };

  const confirmCancellation = async () => {
    if (submitInFlight.current || feedback?.terminal) return;

    submitInFlight.current = true;
    setPending(true);

    try {
      const result = await cancelManagedReservation();
      const terminal = result.code !== "INTERNAL_ERROR";

      setFeedback({
        message: result.message,
        terminal,
        success: result.ok,
      });
      setConfirmationOpen(false);
    } catch {
      setFeedback({
        message: GENERIC_ERROR_MESSAGE,
        terminal: false,
        success: false,
      });
      setConfirmationOpen(false);
    } finally {
      submitInFlight.current = false;
      setPending(false);
    }
  };

  return (
    <section className="space-y-4" aria-live="polite">
      {feedback ? (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm leading-6 ${
            feedback.success
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {!feedback?.terminal ? (
        <button
          type="button"
          onClick={openConfirmation}
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {feedback ? "Reintentar cancelación" : "Cancelar reserva"}
        </button>
      ) : null}

      {confirmationOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          onClick={closeConfirmation}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="managed-reservation-cancel-title"
            aria-describedby="managed-reservation-cancel-description"
            aria-busy={pending}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="managed-reservation-cancel-title"
              className="text-xl font-semibold text-slate-900"
            >
              Cancelar reserva
            </h2>
            <div
              id="managed-reservation-cancel-description"
              className="mt-3 space-y-2 text-sm leading-6 text-slate-600"
            >
              <p>¿Estás seguro de que deseas cancelar esta reserva?</p>
              <p>Esta acción no se puede deshacer desde esta página.</p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={pending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmCancellation}
                disabled={pending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <FaSpinner aria-hidden="true" className="animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  "Confirmar cancelación"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
