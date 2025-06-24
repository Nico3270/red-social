"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { createSection } from "../actions/createSection";

interface FormValues {
  nombre: string;
  slug: string;
  iconName: string;
  order: number; // Cambiado a number
  isActive: boolean;
}

export const NewSection = () => {
  const { register, handleSubmit, reset } = useForm<FormValues>();
  const [status, setStatus] = useState<string | null>(null);

  const onSubmit = async (data: FormValues) => {
    const parsedData = {
      ...data,
      order: Number(data.order), // Convierte a número
    };

    const response = await createSection(parsedData);

    if (response.success) {
      setStatus("Sección creada con éxito.");
      reset();
    } else {
      setStatus(`Error: ${response.error}`);
    }
  };

  return (
    <div className="container mx-auto p-4 bg-white rounded-md shadow-md">
      <h2 className="text-2xl font-bold mb-4">Crear Nueva Sección</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="nombre" className="block font-medium">
            Nombre
          </label>
          <input
            {...register("nombre", { required: true })}
            id="nombre"
            type="text"
            placeholder="Nombre de la sección"
            className="w-full border p-2 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="slug" className="block font-medium">
            Slug
          </label>
          <input
            {...register("slug", { required: true })}
            id="slug"
            type="text"
            placeholder="Slug (ej: cumpleanos)"
            className="w-full border p-2 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="iconName" className="block font-medium">
            Icono (Nombre)
          </label>
          <input
            {...register("iconName", { required: true })}
            id="iconName"
            type="text"
            placeholder="Nombre del ícono (ej: FaBirthdayCake)"
            className="w-full border p-2 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="order" className="block font-medium">
            Orden
          </label>
          <input
            {...register("order", { required: true, valueAsNumber: true })}
            id="order"
            type="number"
            placeholder="Prioridad de orden"
            className="w-full border p-2 rounded-md"
          />
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="isActive" className="font-medium">
            Activo
          </label>
          <input
            {...register("isActive")}
            id="isActive"
            type="checkbox"
            className="w-5 h-5"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          Crear Sección
        </button>
      </form>
      {status && <p className="mt-4 text-center">{status}</p>}
    </div>
  );
};
