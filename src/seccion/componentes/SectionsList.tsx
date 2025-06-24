"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { getSectionsList } from "../actions/getSectionsList";
import { updateSectionsOrder } from "../actions/updateSectionsOrder";
import { SortableItem } from "./SortableItem";
import { FaGripVertical } from "react-icons/fa";

interface Section {
  id: string;
  nombre: string;
  slug: string;
  order: number;
  isActive: boolean;
}

export const SectionsList = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const fetchedSections = await getSectionsList();
        setSections(fetchedSections);
      } catch (error) {
        console.error("Error al cargar las secciones:", error);
      }
    };
    fetchSections();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Activar arrastre tras 5px
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = sections.findIndex((section) => section.id === active.id);
      const newIndex = sections.findIndex((section) => section.id === over.id);

      const reorderedSections = arrayMove(sections, oldIndex, newIndex).map(
        (section, index) => ({
          ...section,
          order: index + 1,
        })
      );

      setSections(reorderedSections);
    }
  };

  const saveOrder = async () => {
    setIsSaving(true);
    try {
      const sectionsToUpdate = sections.map(({ id, order }) => ({ id, order }));
      const result = await updateSectionsOrder(sectionsToUpdate);

      if (result.success) {
        alert("Orden actualizado con éxito");
      } else {
        alert("Error al actualizar el orden");
      }
    } catch (error) {
      console.error("Error al guardar el orden:", error);
      alert("Ocurrió un error al guardar el orden.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 bg-white rounded-md shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Lista de Secciones</h2>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((section) => section.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="overflow-x-auto">
            <table className="table-auto min-w-[600px] w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200 text-center">
                  <th className="border p-2 w-12"></th>
                  <th className="border p-2 w-12">Orden</th>
                  <th className="border p-2">Nombre</th>
                  <th className="border p-2">Slug</th>
                  <th className="border p-2">Estado</th>
                  <th className="border p-2">Modificar</th>
                </tr>
              </thead>
              <tbody>
  {sections.map((section) => (
    <tr key={section.id}>
      {/* 🔥 Envolver solo esta celda con SortableItem */}
      <SortableItem id={section.id}>
        <td className="border p-2 text-center cursor-grab">
          <FaGripVertical className="text-gray-500" />
        </td>
      </SortableItem>
      <td className="border p-2 text-center">{section.order}</td>
      <td className="border p-2">{section.nombre}</td>
      <td className="border p-2">{section.slug}</td>
      <td className="border p-2 text-center">
        {section.isActive ? (
          <span className="text-green-600 font-bold">Activo</span>
        ) : (
          <span className="text-red-500 font-bold">Inactivo</span>
        )}
      </td>
      <td className="border p-2 text-center">
        <Link href={`/dashboard/sections/${section.id}`} className="text-blue-600 hover:underline">
          Modificar
        </Link>
      </td>
    </tr>
  ))}
</tbody>

            </table>
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-4 text-right">
        <button
          onClick={saveOrder}
          disabled={isSaving}
          className={`px-6 py-2 rounded-md ${
            isSaving
              ? "bg-gray-400 text-gray-800 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isSaving ? "Guardando..." : "Actualizar Orden"}
        </button>
      </div>
    </div>
  );
};
