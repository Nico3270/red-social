// /components/dashboard/reservas/AddReservationModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FaTimes } from "react-icons/fa"; // Para close icon
import { motion, AnimatePresence } from "framer-motion"; // Agregado AnimatePresence para mejores animaciones de entrada/salida
import { createEditarReserva } from "../actions/createEditarReserva";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale"; // Para idioma español
import { useSession } from "next-auth/react";

// Interface para datos de reserva (corrige el error de tipos)
export interface ReservationFormData {
  id?: string; // idReserva para edit
  nombre: string;
  telefono: string;
  fechaHoraInicio: string; // ISO string para consistencia
  fechaHoraFin?: string;
  notas?: string; // Opcional
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA' | 'BLOQUEADA';
}

interface AddReservationModalProps {
  negocioId?: string; // Opcional: si presente, modo dueño
  horaInicio: string; // HH:mm o ISO
  horaFin: string;
  data?: ReservationFormData; // Opcional: para pre-llenar en edit
  onClose: () => void; // Función para cerrar modal
  onSuccess?: () => void; // Función opcional para refrescar después de éxito
}

// Schema Zod para validaciones (expandido para match full ReservationFormData)
const formSchema = z.object({
  id: z.string().optional(), // Agregamos id al schema para validación (optional)
  nombre: z.string().min(3, "Nombre requerido (mínimo 3 caracteres)"),
  telefono: z.string().min(7, "Teléfono requerido (mínimo 7 dígitos)"),
  estado: z.enum(['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA', 'BLOQUEADA']),
  fechaHoraInicio: z.string().min(1, "Hora de inicio requerida"), // Ahora incluido y requerido
  fechaHoraFin: z.string().optional(),
  notas: z.string().optional(),
});

export default function AddReservationModal({ negocioId, horaInicio, horaFin, data, onClose, onSuccess }: AddReservationModalProps) {
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<ReservationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '', // Default empty for create
      nombre: '',
      telefono: '',
      estado: 'PENDIENTE',
      fechaHoraInicio: horaInicio,
      fechaHoraFin: horaFin,
      notas: '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [submitted, setSubmitted] = useState(false); // Bloqueo post-submit
  const { data: session, status } = useSession(); // Agrego status para chequeo explícito de autenticación
  const roleUser = status === "authenticated" && session?.user?.role === "negocio" && session.user.negocioId === negocioId; // Chequeo robusto: solo true si autenticado y role negocio

  

  // Pre-llenar si data para edit
  React.useEffect(() => {
    if (data) {
      reset(data);
    }
  }, [data, reset]);

  // Pre-llenar nombre si usuario autenticado y no es edición (evita sobrescribir)
  useEffect(() => {
    if (status === "authenticated" && session?.user && !data?.id) { // Solo en creación
      const fullName = `${session.user.name || ''} ${session.user.apellido || ''}`.trim();
      if (fullName) {
        setValue('nombre', fullName); // Pre-llenar nombre completo
      }
      // Si teléfono está disponible en sesión, pre-llenar (asume que podría agregarse en futuro)
      // if (session.user.telefono) setValue('telefono', session.user.telefono);
    }
  }, [session, status, setValue, data]);

  const onSubmit: SubmitHandler<ReservationFormData> = async (formData) => {
    setLoading(true);
    // Si no es negocio, forzar estado a 'PENDIENTE' (seguridad adicional)
    if (!roleUser) {
      formData.estado = 'PENDIENTE';
    }
    const result = await createEditarReserva({ ...formData, negocioId: negocioId || undefined });
    setLoading(false);
    setResponseMessage(result.message);
    setIsError(!result.ok);
    if (result.ok) {
      // console.log("Éxito en submit de AddReservationModal, llamando onSuccess y cerrando con delay");
      reset(); // Limpia form inmediatamente
      setSubmitted(true); // Bloqueo botón permanentemente post-éxito
      if (onSuccess) onSuccess(); // Propaga refresh a padres inmediatamente
      // Cierre local con delay para ver mensaje de éxito
      setTimeout(() => {
        onClose();
        setResponseMessage(null); // Limpia mensaje al cerrar
      }, 1500); // 1.5s para feedback visual, asimilando a modales elegantes como en LinkedIn
    } else {
      // Para errores, permite reintentar, así que no setSubmitted(true)
      setTimeout(() => {
        setResponseMessage(null); // Opcional: limpia mensaje de error después de 3s para no bloquear UI
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4 sm:mx-0">
        {/* Icono de cierre elegante en top-right */}
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
          {/* Input hidden para id (persistente para update) */}
          <input type="hidden" {...register("id")} />

          {/* Inputs hidden para fechas (no editables, pero enviadas en submit) */}
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
            <input
              type="tel"
              {...register("telefono")}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono.message}</p>}
          </div>
          {/* Campo de Estado: Condicional basado en roleUser */}
          {roleUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                {...register("estado")}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900" // Ring verde para estados positivos
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
          {/* Input hidden para estado si no es negocio (forzado a PENDIENTE) */}
          {!roleUser && <input type="hidden" {...register("estado")} value="PENDIENTE" />}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
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
              key="response-message" // Key para AnimatePresence
              initial={{ opacity: 0, y: 20, scale: 0.95 }} // Animación de entrada: fade-in con slide-up y leve scale
              animate={{ opacity: 1, y: 0, scale: 1 }} // Estado animado
              exit={{ opacity: 0, y: -20, scale: 0.95 }} // Animación de salida: fade-out con slide-down
              transition={{ duration: 0.3, ease: "easeInOut" }} // Transición suave
              className={`mt-4 p-4 rounded-md border ${isError ? "bg-red-100 text-red-700 border-red-300" : "bg-green-100 text-green-700 border-green-300"} shadow-md`} // Mejores estilos: padding, border y shadow para que se vea como un "mini-modal" dentro del form
            >
              {responseMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}