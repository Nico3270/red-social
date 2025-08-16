// /components/dashboard/reservas/CrearReservasForm.tsx
"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createEditReservasBusiness } from "../actions/createEditReservasBusiness";
import { redirect } from "next/navigation";

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Interface para datos, similar a BusinessAvailability (id opcional para edit)
export interface BusinessAvailabilityData {
  id?: string;
  diasAtencion: string[];
  franjaMananaInicio?: string;
  franjaMananaFin?: string;
  franjaTardeInicio?: string;
  franjaTardeFin?: string;
  intervaloMinutos: number;
  capacidadPorIntervalo: number;
  duracionMinimaIntervalos?: number;
  camposCustom: boolean;
}

// Schema Zod para validaciones
const formSchema = z.object({
  diasAtencion: z.array(z.string()).min(1, "Selecciona al menos un día de atención"),
  franjaMananaInicio: z.string().optional(),
  franjaMananaFin: z.string().optional(),
  franjaTardeInicio: z.string().optional(),
  franjaTardeFin: z.string().optional(),
  intervaloMinutos: z.number().int().min(5).max(120),
  capacidadPorIntervalo: z.number().int().min(1).max(50),
  duracionMinimaIntervalos: z.number().int().min(1).optional(),
  camposCustom: z.boolean(),
});

interface CrearReservasFormProps {
  data?: BusinessAvailabilityData; // Opcional: data para pre-llenar en edición
  negocioId: string; // Requerido: ID del negocio para la action
}

export default function CrearReservasForm({ data, negocioId }: CrearReservasFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<BusinessAvailabilityData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      diasAtencion: [],
      intervaloMinutos: 30,
      capacidadPorIntervalo: 1,
      camposCustom: false,
    },
  });

  const diasAtencion = watch("diasAtencion", []); // Monitorea el valor actual del form para checks

  // Pre-llenar form si data existe (modo edición)
  useEffect(() => {
    if (data) {
      reset(data);
    }
  }, [data, reset]);

  // Manejo de checkboxes para array
  const handleDiasChange = (dia: string, checked: boolean) => {
    const current = diasAtencion;
    const updated = checked ? [...current, dia] : current.filter(d => d !== dia);
    setValue("diasAtencion", updated);
  };

  // Seleccionar/Deseleccionar todos
  const handleSelectAll = (checked: boolean) => {
    setValue("diasAtencion", checked ? diasSemana : []);
  };

  // Submit: Llama a action y maneja respuesta
  const onSubmit = async (formData: BusinessAvailabilityData) => {
    const result = await createEditReservasBusiness({ ...formData, negocioId });
    if (result.ok) {
      console.log("Éxito:", result.message, result.informacionReserva); // Maneja UI success (e.g., toast)
      redirect("/dashboard/reservas"); // Redirige a lista de reservas
    } else {
      console.error("Error:", result.message); // Maneja UI error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
      {/* Días de Atención */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Días de Atención</label>
        <p className="text-sm text-gray-500 mb-2">Selecciona los días en que tu negocio atiende clientes. Puedes marcar todos para agilizar.</p>
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="selectAll"
            checked={diasAtencion.length === diasSemana.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="selectAll" className="ml-2 text-sm text-gray-600">Seleccionar todos</label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {diasSemana.map((dia) => (
            <div key={dia} className="flex items-center">
              <input
                type="checkbox"
                id={dia}
                checked={diasAtencion.includes(dia)}
                onChange={(e) => handleDiasChange(dia, e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={dia} className="ml-2 text-sm text-gray-600">{dia}</label>
            </div>
          ))}
        </div>
        {errors.diasAtencion && <p className="text-red-500 text-xs mt-1">{errors.diasAtencion.message}</p>}
      </div>

      {/* Franjas Horarias (Responsive: 1 col en mobile, 2 en sm+) */}
      <div>
        <p className="text-sm text-gray-500 mb-2">Define los horarios de atención. Solo ingresa franjas válidas (ej: 08:00 para inicio). Deja en blanco si no aplica.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mañana: Inicio</label>
            <input
              type="time"
              {...register("franjaMananaInicio")}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mañana: Fin</label>
            <input
              type="time"
              {...register("franjaMananaFin")}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tarde: Inicio</label>
          <input
            type="time"
            {...register("franjaTardeInicio")}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tarde: Fin</label>
          <input
            type="time"
            {...register("franjaTardeFin")}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Intervalos y Capacidad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Intervalo de Tiempo (minutos)</label>
          <p className="text-sm text-gray-500 mb-2">Elige el tiempo entre cada reserva posible (ej: 30 min para citas rápidas).</p>
          <select
            {...register("intervaloMinutos", { valueAsNumber: true })}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
            <option value={45}>45</option>
            <option value={60}>60</option>
          </select>
          {errors.intervaloMinutos && <p className="text-red-500 text-xs mt-1">{errors.intervaloMinutos.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Capacidad por Intervalo</label>
          <p className="text-sm text-gray-500 mb-2">Número máximo de reservas por intervalo (ej: 1 para citas individuales, 5 para grupos).</p>
          <input
            type="number"
            {...register("capacidadPorIntervalo", { valueAsNumber: true })}
            min={1}
            max={50}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.capacidadPorIntervalo && <p className="text-red-500 text-xs mt-1">{errors.capacidadPorIntervalo.message}</p>}
        </div>
      </div>

      {/* Duración Mínima y Campos Custom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duración Mínima (intervalos, opcional)</label>
          <p className="text-sm text-gray-500 mb-2">Mínimo de intervalos que ocupa una reserva (ej: 2 para sesiones de 1 hora si intervalo es 30 min).</p>
          <input
            type="number"
            {...register("duracionMinimaIntervalos", { valueAsNumber: true })}
            min={1}
            placeholder="Ej: 1"
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center mt-4 sm:mt-0">
          <input
            type="checkbox"
            {...register("camposCustom")}
            id="camposCustom"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="camposCustom" className="ml-2 text-sm text-gray-600">Activar campos personalizados (ej: motivo)</label>
        </div>
      </div>

      {/* Botón Submit */}
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        {data?.id ? "Actualizar Configuración" : "Crear Configuración"}
      </button>
    </form>
  );
}