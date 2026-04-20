"use client";

import React, { useState } from "react";
import { UpdateCatalogGroupInput } from "@/interfaces/catalogGroup.interface";
import {
  FaEdit,
  FaCheck,
  FaTimes,
  FaToggleOn,
  FaToggleOff,
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

const GroupDetailPanel: React.FC<GroupDetailPanelProps> = ({
  group,
  loading = false,
  onUpdate,
  onToggleActive,
  onProductsClick,
}) => {
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
      <div className="p-8 text-center bg-gray-50 rounded-lg">
        <p className="text-gray-600">
          Selecciona un grupo para ver sus detalles
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* Encabezado */}
      <div>
        <h3 className="text-xl font-bold text-gray-900">Detalle del Grupo</h3>
        {group.parentName && (
          <p className="text-sm text-gray-600 mt-1">
            Padre: <span className="font-medium">{group.parentName}</span>
          </p>
        )}
      </div>

      {/* Estado activo/inactivo */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Estado</p>
          <p className={`text-sm ${group.isActive ? "text-green-600" : "text-red-600"}`}>
            {group.isActive ? "Activo" : "Inactivo"}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={isSaving}
          className={`p-2 rounded-lg transition ${
            group.isActive
              ? "text-green-600 hover:bg-green-100"
              : "text-red-600 hover:bg-red-100"
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

      {/* Nombre */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Nombre
        </label>
        {editingField === "nombre" ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={() => handleSaveEdit("nombre")}
              disabled={isSaving}
              className="p-2 text-green-600 hover:bg-green-100 rounded transition"
            >
              <FaCheck />
            </button>
            <button
              onClick={() => setEditingField(null)}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded transition"
            >
              <FaTimes />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-900">{group.nombre}</span>
            <button
              onClick={() => handleStartEdit("nombre", group.nombre)}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded transition"
            >
              <FaEdit />
            </button>
          </div>
        )}
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Slug
        </label>
        <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-600 text-sm font-mono">
          {group.slug}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          El slug se normaliza automáticamente
        </p>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Descripción
        </label>
        {editingField === "description" ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveEdit("description")}
                disabled={isSaving}
                className="p-2 text-green-600 hover:bg-green-100 rounded transition"
              >
                <FaCheck /> Guardar
              </button>
              <button
                onClick={() => setEditingField(null)}
                className="p-2 text-gray-600 hover:bg-gray-200 rounded transition"
              >
                <FaTimes /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {group.description ? (
                <p className="text-gray-700 text-sm whitespace-pre-line">
                  {group.description}
                </p>
              ) : (
                <p className="text-gray-400 text-sm italic">Sin descripción</p>
              )}
            </div>
            <button
              onClick={() =>
                handleStartEdit("description", group.description || "")
              }
              className="p-2 text-blue-600 hover:bg-blue-100 rounded transition flex-shrink-0"
            >
              <FaEdit />
            </button>
          </div>
        )}
      </div>

      {/* Info de productos */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>{group.productCount || 0}</strong> producto(s) asignado(s) a
          este grupo
        </p>
      </div>

      {/* Botón para ir a productos */}
      {onProductsClick && (
        <button
          onClick={onProductsClick}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Gestionar Productos
        </button>
      )}
    </div>
  );
};

export default GroupDetailPanel;
