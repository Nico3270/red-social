"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button, Input } from "@mui/material";

type SyncResult = {
  success: boolean;
  totalEvents?: number;
  updatedContacts?: number;
  error?: string;
};

export default function BrevoSyncForm() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  // Validar fechas en el cliente
  if (!startDate || isNaN(Date.parse(startDate))) {
    setResult({
      success: false,
      error: "Por favor, selecciona una fecha inicial válida",
    });
    setShowModal(true);
    return;
  }
  if (endDate && isNaN(Date.parse(endDate))) {
    setResult({
      success: false,
      error: "La fecha final no es válida",
    });
    setShowModal(true);
    return;
  }
  if (endDate && new Date(endDate) < new Date(startDate)) {
    setResult({
      success: false,
      error: "La fecha final no puede ser anterior a la fecha inicial",
    });
    setShowModal(true);
    return;
  }

  setLoading(true);
  setShowModal(false);
  setResult(null);

  try {
    const response = await fetch("/api/brevo/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate }),
    });

    const data: { ok: boolean; totalEvents?: number; updatedContacts?: number; error?: string } =
      await response.json();

    if (data.ok) {
      setResult({
        success: true,
        totalEvents: data.totalEvents ?? 0,
        updatedContacts: data.updatedContacts ?? 0,
      });
    } else {
      setResult({
        success: false,
        error: data.error ?? "Error desconocido al obtener los eventos.",
      });
    }
  } catch (error) {
    console.error("Error al obtener eventos:", error);
    setResult({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido.",
    });
  } finally {
    setLoading(false);
    setShowModal(true);
  }
};

  const handleStartChange = (e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value);
  const handleEndChange = (e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value);

  return (
    <div className="relative">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-neutral-900 shadow-xl rounded-2xl p-6 space-y-5 border border-neutral-200 dark:border-neutral-800"
      >
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 text-center">
          Sincronizar Eventos Brevo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-neutral-600 dark:text-neutral-400 mb-1 block">
              Fecha inicial
            </label>
            <Input
              type="date"
              required
              value={startDate}
              onChange={handleStartChange}
              inputProps={{ max: endDate || undefined }}
            />
          </div>

          <div>
            <label className="text-sm text-neutral-600 dark:text-neutral-400 mb-1 block">
              Fecha final (opcional)
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={handleEndChange}
              inputProps={{ min: startDate || undefined }}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 rounded-xl text-white font-medium"
          disabled={loading || !startDate}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin w-5 h-5" />
              Sincronizando...
            </div>
          ) : (
            "Obtener y actualizar eventos"
          )}
        </Button>
      </form>

      {/* MODAL DE RESULTADO */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6 w-80 text-center border border-neutral-200 dark:border-neutral-800"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              {result?.success ? (
                <>
                  <CheckCircle2 className="text-green-500 w-14 h-14 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-1">
                    Sincronización completada
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    Se procesaron <b>{result.totalEvents}</b> eventos y se actualizaron{" "}
                    <b>{result.updatedContacts}</b> contactos.
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="text-red-500 w-14 h-14 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-1">
                    Error en la sincronización
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    {result?.error ?? "No se pudieron obtener los eventos. Intenta nuevamente."}
                  </p>
                </>
              )}

              <Button onClick={() => setShowModal(false)} className="w-full mt-2">
                Cerrar
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
