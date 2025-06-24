"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { updateSection } from "../actions/updateSectionById";


interface Section {
  id: string;
  nombre: string;
  slug: string;
  iconName: string;
  isActive: boolean;
}

interface Props {
  section: Section; // Recibe la sección como prop
}

export const UpdateSection = ({ section }: Props) => {
  const { register, handleSubmit } = useForm<Section>({
    defaultValues: section, // Carga los valores iniciales
  });
  const [status, setStatus] = useState<string | null>(null);

  const onSubmit = async (data: Section) => {
    const response = await updateSection(data);
    if (response.success) {
      setStatus("Sección actualizada con éxito.");
    } else {
      setStatus(`Error: ${response.error}`);
    }
  };

  return (
    <div className="container mx-auto p-4 bg-white rounded-md shadow-md">
      <h2 className="text-2xl font-bold mb-4">Modificar Sección</h2>
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
          Modificar Sección
        </button>
      </form>
      {status && <p className="mt-4 text-center">{status}</p>}
    </div>
  );
};
