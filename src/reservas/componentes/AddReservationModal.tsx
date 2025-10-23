// /components/dashboard/reservas/AddReservationModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FaTimes, FaFlag } from "react-icons/fa"; // Agregado FaFlag para el icono de bandera
import { motion, AnimatePresence } from "framer-motion";
import { createEditarReserva } from "../actions/createEditarReserva";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "next-auth/react";

// Interface para datos de reserva
export interface ReservationFormData {
  id?: string;
  nombre: string;
  telefono: string; // Será el número completo en formato E.164 (+57...)
  fechaHoraInicio: string;
  fechaHoraFin?: string;
  notas?: string;
  estado: "PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "COMPLETADA" | "BLOQUEADA";
}

interface AddReservationModalProps {
  negocioId?: string;
  horaInicio: string;
  horaFin: string;
  data?: ReservationFormData;
  onClose: () => void;
  onSuccess?: () => void;
}

// Schema Zod actualizado con validación estricta para teléfono
const formSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().min(3, "Nombre requerido (mínimo 3 caracteres)"),
  telefono: z.string().regex(/^\d{10}$/, "El número de teléfono debe tener exactamente 10 dígitos"),
  estado: z.enum(["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA", "BLOQUEADA"]),
  fechaHoraInicio: z.string().min(1, "Hora de inicio requerida"),
  fechaHoraFin: z.string().optional(),
  notas: z.string().optional(),
});

export default function AddReservationModal({ negocioId, horaInicio, horaFin, data, onClose, onSuccess }: AddReservationModalProps) {
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<ReservationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      nombre: "",
      telefono: "",
      estado: "PENDIENTE",
      fechaHoraInicio: horaInicio,
      fechaHoraFin: horaFin,
      notas: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { data: session, status } = useSession();
  const roleUser = status === "authenticated" && session?.user?.role === "negocio" && session.user.negocioId === negocioId;

  // Pre-llenar si data para edit
  useEffect(() => {
    if (data) {
      // Si el número incluye +57, removerlo para mostrar solo el número local
      const localNumber = data.telefono?.startsWith("+57") ? data.telefono.slice(3) : data.telefono;
      reset({ ...data, telefono: localNumber });
    }
  }, [data, reset]);

  // Pre-llenar nombre si usuario autenticado y no es edición
  useEffect(() => {
    if (status === "authenticated" && session?.user && !data?.id) {
      const fullName = `${session.user.name || ""} ${session.user.apellido || ""}`.trim();
      if (fullName) {
        setValue("nombre", fullName);
      }
    }
  }, [session, status, setValue, data]);

  const onSubmit: SubmitHandler<ReservationFormData> = async (formData) => {
    setLoading(true);
    // Concatenar el indicativo +57 al número
    const formattedData = {
      ...formData,
      telefono: `+57${formData.telefono}`,
      estado: roleUser ? formData.estado : "PENDIENTE", // Forzar PENDIENTE si no es negocio
    };

    const result = await createEditarReserva({ ...formattedData, negocioId: negocioId || undefined });
    setLoading(false);
    setResponseMessage(result.message);
    setIsError(!result.ok);

    if (result.ok) {
      reset();
      setSubmitted(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
        setResponseMessage(null);
      }, 1500);
    } else {
      setTimeout(() => {
        setResponseMessage(null);
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4 sm:mx-0">
        {/* Icono de cierre */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 hover:scale-110 transition-all duration-200 ease-in-out"
          aria-label="Cerrar modal"
        >
          <FaTimes size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-gray-900 text-center">
          {data?.id ? "Editar Reserva" : "Crear Reserva"} para{" "}
          <span className="text-gray-700">
            {format(parseISO(horaInicio), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </span>
          {" de "}
          <span className="text-blue-600">
            {format(parseISO(horaInicio), "h:mm a", { locale: es })}
          </span>
          {" - "}
          <span className="text-blue-600">
            {format(parseISO(horaFin), "h:mm a", { locale: es })}
          </span>
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("fechaHoraInicio")} />
          <input type="hidden" {...register("fechaHoraFin")} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              {...register("nombre")}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaFlag className="text-gray-500" size={16} />
                <span className="ml-2 text-gray-600 text-sm">+57</span>
              </div>
              <input
                type="tel"
                {...register("telefono")}
                placeholder="3182258523"
                className="w-full pl-16 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                disabled={loading}
                maxLength={10}
                onChange={(e) => {
                  // Solo permite dígitos
                  const value = e.target.value.replace(/\D/g, "");
                  setValue("telefono", value);
                }}
                aria-label="Número de teléfono (10 dígitos)"
              />
            </div>
            {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono.message}</p>}
          </div>

          {roleUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                {...register("estado")}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="CANCELADA">Cancelada</option>
                <option value="COMPLETADA">Completada</option>
                <option value="BLOQUEADA">Bloqueada</option>
              </select>
              {errors.estado && <p className="text-red-500 text-xs mt-1">{errors.estado.message}</p>}
            </div>
          )}
          {!roleUser && <input type="hidden" {...register("estado")} value="PENDIENTE" />}

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Notas (opcional)</label>
            <textarea
              {...register("notas")}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={loading || submitted}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
            ) : data?.id ? (
              "Actualizar Reserva"
            ) : (
              "Crear Reserva"
            )}
          </button>
        </form>

        <AnimatePresence>
          {responseMessage && (
            <motion.div
              key="response-message"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`mt-4 p-4 rounded-md border ${isError ? "bg-red-100 text-red-700 border-red-300" : "bg-green-100 text-green-700 border-green-300"} shadow-md`}
            >
              {responseMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}