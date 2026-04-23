"use client";

import { useState } from "react";
import type { UpdateCatalogGroupInput } from "@/interfaces/catalogGroup.interface";
import {
  FaCheck,
  FaEdit,
  FaTimes,
  FaToggleOff,
  FaToggleOn,
} from "react-icons/fa";

interface GroupDetail {
  id: string;
  nombre: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  parentId?: string | null;
  parentName?: string;
  productCount?: number;
}

interface GroupDetailPanelProps {
  group: GroupDetail | null;
  loading?: boolean;
  onUpdate: (groupId: string, updates: UpdateCatalogGroupInput) => Promise<void>;
  onToggleActive: (groupId: string, isActive: boolean) => Promise<void>;
  onProductsClick?: () => void;
}

type EditableField = "nombre" | "description";

export default function GroupDetailPanel({
  group,
  loading = false,
  onUpdate,
  onToggleActive,
  onProductsClick,
}: GroupDetailPanelProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = (field: EditableField, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const handleSaveEdit = async (field: EditableField) => {
    if (!group) return;

    setIsSaving(true);
    try {
      const updates: UpdateCatalogGroupInput =
        field === "nombre"
          ? { nombre: editValue }
          : { description: editValue };

      await onUpdate(group.id, updates);
      setEditingField(null);
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!group) return;
    setIsSaving(true);
    try {
      await onToggleActive(group.id, !group.isActive);
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      alert("Error al cambiar el estado");
    } finally {
      setIsSaving(false);
    }
  };

  if (!group) {
    return (
      <div className="rounded-[30px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-slate-800">
          Selecciona un grupo para revisar su configuración.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="h-[360px] animate-pulse rounded-[30px] bg-slate-100" />
        <div className="h-[360px] animate-pulse rounded-[30px] bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(280px,0.82fr)]">
      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
          Configuración editorial
        </p>
        <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
          Ajusta el grupo con calma
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Edita nombre, descripción y datos de referencia sin salir del flujo de organización.
        </p>

        <div className="mt-6 space-y-4">
          <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Nombre visible
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Este texto aparece como referencia principal del grupo.
                </p>
              </div>
              {editingField !== "nombre" && (
                <button
                  type="button"
                  onClick={() => handleStartEdit("nombre", group.nombre)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  title="Editar nombre"
                >
                  <FaEdit className="text-xs" />
                </button>
              )}
            </div>

            {editingField === "nombre" ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit("nombre")}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaCheck className="text-xs" />
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingField(null)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FaTimes className="text-xs" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-lg font-semibold tracking-[-0.02em] text-slate-950">
                {group.nombre}
              </p>
            )}
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Slug técnico
            </p>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-600">
              {group.slug}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Se normaliza automáticamente para mantener consistencia en rutas y referencias.
            </p>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Contexto del grupo
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Ayuda a entender qué productos pertenecen a esta sección.
                </p>
              </div>
              {editingField !== "description" && (
                <button
                  type="button"
                  onClick={() => handleStartEdit("description", group.description || "")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  title="Editar descripción"
                >
                  <FaEdit className="text-xs" />
                </button>
              )}
            </div>

            {editingField === "description" ? (
              <div className="mt-4 space-y-3">
                <textarea
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  className="w-full rounded-[22px] border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none"
                  rows={4}
                  autoFocus
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit("description")}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaCheck className="text-xs" />
                    Guardar descripción
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingField(null)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FaTimes className="text-xs" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : group.description ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
                {group.description}
              </p>
            ) : (
              <p className="mt-4 text-sm italic text-slate-400">
                Sin descripción todavía.
              </p>
            )}
          </section>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.9))] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
            Estado del grupo
          </p>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {group.isActive ? "Activo" : "Inactivo"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {group.isActive
                  ? "Listo para usarse dentro del flujo de catálogo."
                  : "Puedes reactivarlo cuando quieras sin perder su configuración."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={isSaving}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                group.isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
              title={group.isActive ? "Desactivar" : "Activar"}
            >
              {group.isActive ? (
                <FaToggleOn className="text-2xl" />
              ) : (
                <FaToggleOff className="text-2xl" />
              )}
            </button>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
            Resumen rápido
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Productos asignados
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {group.productCount || 0}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Jerarquía
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                {group.parentName ? `Depende de ${group.parentName}` : "Grupo raíz del catálogo"}
              </p>
            </div>
          </div>
        </section>

        {onProductsClick && (
          <button
            type="button"
            onClick={onProductsClick}
            className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Ir a la curaduría de productos
          </button>
        )}
      </aside>
    </div>
  );
}
