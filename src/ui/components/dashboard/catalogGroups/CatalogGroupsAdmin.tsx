"use client";

/**
 * FASE 4-5: Admin de CatalogGroups - Orquestador
 *
 * Componente contenedor que integra:
 * - Selector jerárquico de grupos
 * - Detalle del grupo seleccionado
 * - Formulario de creación
 * - Panel de asignación de productos
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { FaPlus, FaTimes } from "react-icons/fa";
import { createCatalogGroup } from "@/actions/catalogGroups/createCatalogGroup";
import {
  updateCatalogGroup,
  deleteCatalogGroup,
} from "@/actions/catalogGroups/updateCatalogGroup";
import {
  toggleCatalogGroupActive,
} from "@/actions/catalogGroups/manageCatalogGroups";
import {
  getCatalogGroupsTreeByNegocioId,
  getCatalogGroupDetail,
} from "@/actions/catalogGroups/getCatalogGroupsTree";
import {
  CreateCatalogGroupInput,
  UpdateCatalogGroupInput,
} from "@/interfaces/catalogGroup.interface";
import CatalogGroupsTree from "./CatalogGroupsTree";
import GroupDetailPanel from "./GroupDetailPanel";
import ProductAssignmentPanel from "./ProductAssignmentPanel";


interface CatalogGroupsAdminProps {
  negocioId: string;
}

interface TreeGroup {
  id: string;
  nombre: string;
  slug: string;
  isActive: boolean;
  order: number;
  children?: TreeGroup[];
}

interface SelectedGroupProduct {
  id: string;
  productId: string;
  order: number;
  isFeatured: boolean;
  product?: {
    nombre?: string | null;
    precio?: number | null;
    imagenes?: Array<{ url: string }>;
  } | null;
}

interface SelectedGroupDetail {
  id: string;
  nombre: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  parentId?: string | null;
  parentName?: string;
  productCount: number;
  productos: SelectedGroupProduct[];
}

function findGroupNameById(groups: TreeGroup[], groupId: string | null | undefined): string | undefined {
  if (!groupId) {
    return undefined;
  }

  for (const group of groups) {
    if (group.id === groupId) {
      return group.nombre;
    }

    const childMatch = findGroupNameById(group.children ?? [], groupId);
    if (childMatch) {
      return childMatch;
    }
  }

  return undefined;
}

function countGroups(groups: TreeGroup[]): number {
  return groups.reduce(
    (total, group) => total + 1 + countGroups(group.children ?? []),
    0
  );
}

function countActiveGroups(groups: TreeGroup[]): number {
  return groups.reduce(
    (total, group) =>
      total + (group.isActive ? 1 : 0) + countActiveGroups(group.children ?? []),
    0
  );
}

export default function CatalogGroupsAdmin({
  negocioId,
}: CatalogGroupsAdminProps) {
  // Estados principales
  const [treeGroups, setTreeGroups] = useState<TreeGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<SelectedGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasGroups, setHasGroups] = useState(false);

  // Crear nuevo grupo
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createInput, setCreateInput] = useState<CreateCatalogGroupInput>({
    nombre: "",
  });
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  // Tab de visualización 
  const [activeTab, setActiveTab] = useState<"detalle" | "productos">("productos");

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCatalogGroupsTreeByNegocioId(negocioId);
      if (result.ok) {
        // Reorganizar respuesta en estructura flat para el árbol
        const flattenedTree = result.tree || [];
        setTreeGroups(flattenedTree);
        setHasGroups(result.hasGroups || false);

        // Auto-seleccionar el primer grupo
        if (flattenedTree.length > 0) {
          setSelectedGroupId(
            (currentGroupId) => currentGroupId ?? flattenedTree[0].id
          );
        }
      }
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  }, [negocioId]);

  const loadGroupDetail = useCallback(async (groupId: string) => {
    try {
      const result = await getCatalogGroupDetail(groupId);
      if (result.ok && result.group) {
        const group = result.group;
        setSelectedGroupDetail({
          id: group.id,
          nombre: group.nombre,
          slug: group.slug,
          description: group.description,
          isActive: group.isActive,
          parentId: group.parentId,
          parentName: findGroupNameById(treeGroups, group.parentId),
          productCount: group.productos?.length || 0,
          productos: group.productos || [],
        });
      }
    } catch (error) {
      console.error("Error loading group detail:", error);
    }
  }, [treeGroups]);

  // Cargar árbol inicial
  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  // Cargar detalle cuando se selecciona un grupo
  useEffect(() => {
    if (selectedGroupId) {
      void loadGroupDetail(selectedGroupId);
    }
  }, [loadGroupDetail, selectedGroupId]);

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    setCreatingGroup(true);
    setCreateMessage(null);

    try {
      const input: CreateCatalogGroupInput = {
        ...createInput,
        parentId: createParentId || undefined,
      };

      const result = await createCatalogGroup(input);

      if (result.ok) {
        setCreateMessage("Grupo creado exitosamente");
        setCreateInput({ nombre: "" });
        setCreateParentId(null);
        setShowCreateForm(false);
        await loadTree();
        if (result.catalogGroup?.id) {
          setSelectedGroupId(result.catalogGroup.id);
          setActiveTab("productos");
        }

        setTimeout(() => setCreateMessage(null), 3000);
      } else {
        setCreateMessage(`Error: ${result.message}`);
      }
    } catch {
      setCreateMessage("Error al crear el grupo");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleUpdateGroup = async (
    groupId: string,
    updates: UpdateCatalogGroupInput
  ) => {
    try {
      const result = await updateCatalogGroup(groupId, updates);

      if (result.ok) {
        await loadTree();
        await loadGroupDetail(groupId);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleToggleActive = async (groupId: string, isActive: boolean) => {
    try {
      const result = await toggleCatalogGroupActive(groupId, isActive);

      if (result.ok) {
        await loadTree();
        await loadGroupDetail(groupId);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const result = await deleteCatalogGroup(groupId);

      if (result.ok) {
        setSelectedGroupId(null);
        setSelectedGroupDetail(null);
        await loadTree();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      alert(`Error al eliminar: ${error}`);
    }
  };

  const handleCreateSubgroup = (parentId: string) => {
    setCreateParentId(parentId);
    setShowCreateForm(true);
    setCreateInput({ nombre: "" });
  };

  const handleProductsUpdated = () => {
    if (selectedGroupId) {
      loadGroupDetail(selectedGroupId);
      loadTree();
    }
  };

  const totalGroups = useMemo(() => countGroups(treeGroups), [treeGroups]);
  const activeGroupsCount = useMemo(
    () => countActiveGroups(treeGroups),
    [treeGroups]
  );
  const createParentName = useMemo(
    () => findGroupNameById(treeGroups, createParentId),
    [createParentId, treeGroups]
  );
  const selectedGroupDescription = selectedGroupDetail?.description?.trim()
    ? selectedGroupDetail.description.trim()
    : selectedGroupDetail?.parentName
      ? `Subgrupo dentro de ${selectedGroupDetail.parentName}. Usa este espacio para curar qué productos entran, cómo se ordenan y cuáles deben destacar.`
      : "Grupo raíz del catálogo. Aquí defines la narrativa principal de esta sección: selección, orden y destacados.";

  if (loading) {
    return (
      <div className="mx-auto max-w-[1540px] space-y-4 px-3 pb-10 pt-4 sm:px-5 lg:px-6">
        <div className="h-44 animate-pulse rounded-[32px] bg-slate-200/80" />
        <div className="h-56 animate-pulse rounded-[32px] bg-slate-100" />
        <div className="h-[560px] animate-pulse rounded-[32px] bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1540px] space-y-5 px-3 pb-10 pt-3 sm:px-5 lg:px-6">
      <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_36%),linear-gradient(135deg,#f8fafc,#ffffff)] px-4 py-5 shadow-[0_28px_80px_rgba(15,23,42,0.08)] sm:px-6 sm:py-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
              Myckeo Catalog Studio
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Organización del Catálogo
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">
              Reordena la experiencia para que los grupos vivan arriba y el
              espacio principal quede dedicado a la curaduría de productos,
              destacados y orden final del catálogo.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[420px] xl:items-end">
            <button
              type="button"
              onClick={() => {
                setCreateParentId(null);
                setShowCreateForm(true);
                setCreateInput({ nombre: "" });
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <FaPlus className="text-xs" />
              Nuevo grupo raíz
            </button>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:w-full">
              <div className="rounded-[24px] border border-slate-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Grupos
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {totalGroups}
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Activos
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  {activeGroupsCount}
                </p>
              </div>
              <div className="col-span-2 rounded-[24px] border border-slate-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur sm:col-span-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Grupo activo
                </p>
                <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                  {selectedGroupDetail?.nombre || "Sin selección"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showCreateForm && (
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                {createParentId ? "Nuevo subgrupo" : "Nuevo grupo raíz"}
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                Diseña una nueva sección del catálogo
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {createParentId
                  ? `Este nuevo grupo quedará dentro de ${createParentName || "el grupo seleccionado"}.`
                  : "Crea una capa principal para ordenar mejor la narrativa del catálogo."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>

          {createMessage && (
            <div className={`mx-4 mt-4 rounded-2xl border px-4 py-3 text-sm font-medium sm:mx-5 ${
              createMessage.startsWith("Error")
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}>
              {createMessage}
            </div>
          )}

          <form onSubmit={handleCreateGroup} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Nombre del grupo
              </label>
              <input
                type="text"
                placeholder="Ej: Bebidas, Platos Fuertes"
                value={createInput.nombre}
                onChange={(event) =>
                  setCreateInput({ ...createInput, nombre: event.target.value })
                }
                className="w-full rounded-[22px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Descripción
              </label>
              <textarea
                placeholder="Describe qué contiene este grupo (opcional)"
                value={createInput.description || ""}
                onChange={(event) =>
                  setCreateInput({
                    ...createInput,
                    description: event.target.value,
                  })
                }
                className="w-full rounded-[22px] border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none"
                rows={3}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:col-span-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creatingGroup || !createInput.nombre.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaPlus className="text-xs" />
                {creatingGroup ? "Creando..." : "Crear grupo"}
              </button>
            </div>
          </form>
        </section>
      )}

      {!hasGroups ? (
        <section className="rounded-[32px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center">
          <p className="text-lg font-semibold tracking-[-0.01em] text-slate-900">
            Todavía no hay grupos de catálogo.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Crea el primero para pasar de un catálogo plano a una experiencia curada por secciones.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <FaPlus className="text-xs" />
            Crear Primer Grupo
          </button>
        </section>
      ) : (
        <div className="space-y-5">
          <CatalogGroupsTree
            groups={treeGroups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={(id) => setSelectedGroupId(id)}
            onCreateSubgroup={handleCreateSubgroup}
            onDeleteGroup={handleDeleteGroup}
            loading={loading}
          />

          {selectedGroupDetail ? (
            <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
              <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),linear-gradient(180deg,#ffffff,#f8fafc)] px-4 py-5 sm:px-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                      Grupo activo
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                        {selectedGroupDetail.nombre}
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          selectedGroupDetail.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {selectedGroupDetail.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {selectedGroupDetail.slug}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {selectedGroupDetail.parentName
                          ? `Dentro de ${selectedGroupDetail.parentName}`
                          : "Grupo raíz"}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {selectedGroupDetail.productCount || 0} producto(s)
                      </span>
                    </div>
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                      {selectedGroupDescription}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 xl:min-w-[360px] xl:items-end">
                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab("productos")}
                        className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                          activeTab === "productos"
                            ? "bg-white text-slate-950 shadow-sm"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Productos ({selectedGroupDetail.productCount || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("detalle")}
                        className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                          activeTab === "detalle"
                            ? "bg-white text-slate-950 shadow-sm"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Configuración
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 xl:text-right">
                      {activeTab === "productos"
                        ? "La curaduría de productos es instantánea y solo se publica al guardar cambios."
                        : "Ajusta metadatos del grupo sin perder el contexto del catálogo."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 lg:p-5">
                {activeTab === "detalle" ? (
                  <GroupDetailPanel
                    group={selectedGroupDetail}
                    onUpdate={handleUpdateGroup}
                    onToggleActive={handleToggleActive}
                    onProductsClick={() => setActiveTab("productos")}
                  />
                ) : (
                  <ProductAssignmentPanel
                    groupId={selectedGroupDetail.id}
                    groupProducts={selectedGroupDetail.productos?.map(
                      (p) => ({
                        id: p.id,
                        productId: p.productId,
                        productName: p.product?.nombre || "Producto sin nombre",
                        productImage: p.product?.imagenes?.[0]?.url,
                        precio: p.product?.precio ?? 0,
                        order: p.order,
                        isFeatured: p.isFeatured,
                      })
                    ) || []}
                    onProductsUpdated={handleProductsUpdated}
                  />
                )}
              </div>
            </section>
          ) : (
            <section className="rounded-[32px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center">
              <p className="text-sm font-semibold text-slate-800">
                Selecciona un grupo para empezar a trabajar.
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
