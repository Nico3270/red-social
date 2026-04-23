"use client";

import { useMemo } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";

interface TreeGroup {
  id: string;
  nombre: string;
  slug: string;
  isActive: boolean;
  order: number;
  children?: TreeGroup[];
}

interface CatalogGroupsTreeProps {
  groups: TreeGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onCreateSubgroup: (parentId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  loading?: boolean;
}

interface FlattenedGroup extends TreeGroup {
  level: number;
  parentName?: string;
  childCount: number;
}

const flattenGroups = (
  groups: TreeGroup[],
  level = 0,
  parentName?: string
): FlattenedGroup[] =>
  groups.flatMap((group) => [
    {
      ...group,
      level,
      parentName,
      childCount: group.children?.length ?? 0,
    },
    ...flattenGroups(group.children ?? [], level + 1, group.nombre),
  ]);

const getHierarchyLabel = (group: FlattenedGroup) => {
  if (group.level === 0) {
    return "Grupo raíz";
  }

  return group.parentName ? `Subgrupo de ${group.parentName}` : "Subgrupo";
};

export default function CatalogGroupsTree({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateSubgroup,
  onDeleteGroup,
  loading = false,
}: CatalogGroupsTreeProps) {
  const flattenedGroups = useMemo(() => flattenGroups(groups), [groups]);
  const selectedGroup = useMemo(
    () =>
      flattenedGroups.find((group) => group.id === selectedGroupId) ??
      flattenedGroups[0] ??
      null,
    [flattenedGroups, selectedGroupId]
  );

  const handleDeleteSelected = () => {
    if (!selectedGroup) {
      return;
    }

    if (
      window.confirm(
        "¿Estás seguro de que quieres eliminar este grupo y todos sus subgrupos?"
      )
    ) {
      onDeleteGroup(selectedGroup.id);
    }
  };

  if (loading) {
    return (
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <div className="space-y-4 p-4 sm:p-5">
          <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-36 min-w-[240px] animate-pulse rounded-[28px] bg-slate-100"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (flattenedGroups.length === 0) {
    return (
      <section className="rounded-[32px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-slate-800">
          Todavía no hay grupos en este negocio.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Crea uno para empezar a organizar el catálogo por secciones editoriales.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.05),transparent_34%),linear-gradient(180deg,#ffffff,#f8fafc)] px-4 py-5 sm:px-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
          Selector de grupos
        </p>
        <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
          Cambia de grupo sin perder ancho útil para los productos
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Usa esta banda superior para navegar el catálogo y deja el workspace
          principal libre para curar productos, orden y destacados.
        </p>
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {flattenedGroups.map((group) => {
            const isSelected = selectedGroup?.id === group.id;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onSelectGroup(group.id)}
                className={`group min-w-[240px] max-w-[300px] flex-shrink-0 rounded-[28px] border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-slate-200 ${
                  isSelected
                    ? "border-slate-950 bg-slate-950 text-white shadow-[0_24px_48px_rgba(15,23,42,0.24)]"
                    : "border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] text-slate-900 shadow-[0_16px_36px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_22px_40px_rgba(15,23,42,0.1)]"
                } ${!group.isActive ? "opacity-80" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        isSelected ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {getHierarchyLabel(group)}
                    </p>
                    <h4 className="mt-2 line-clamp-2 text-base font-semibold leading-5 tracking-[-0.02em]">
                      {group.nombre}
                    </h4>
                  </div>

                  {group.childCount > 0 && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isSelected
                          ? "bg-white/10 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {group.childCount} sub
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      isSelected
                        ? "bg-white/10 text-slate-100"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {group.slug}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      group.isActive
                        ? isSelected
                          ? "bg-emerald-400/20 text-emerald-100"
                          : "bg-emerald-50 text-emerald-700"
                        : isSelected
                          ? "bg-white/10 text-slate-200"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {group.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {selectedGroup && (
          <div className="mt-4 rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Grupo activo
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h4 className="text-lg font-semibold tracking-[-0.02em] text-slate-950 sm:text-xl">
                    {selectedGroup.nombre}
                  </h4>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      selectedGroup.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {selectedGroup.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedGroup.parentName
                    ? `Subgrupo conectado a ${selectedGroup.parentName}.`
                    : "Grupo raíz del catálogo."}{" "}
                  Aquí puedes cambiar de sección rápido y mantener el foco en la curaduría de productos.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onCreateSubgroup(selectedGroup.id)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <FaPlus className="text-xs" />
                  Crear subgrupo
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  <FaTrash className="text-xs" />
                  Eliminar grupo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
