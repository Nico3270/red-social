"use client";

/**
 * FASE 4-5: Admin de CatalogGroups - Orquestador
 * 
 * Componente contenedor que integra:
 * - Árbol jerárquico de grupos (maestro)
 * - Detalle del grupo seleccionado (detalle)
 * - Formulario de creación
 * - Panel de asignación de productos
 */

import { useCallback, useEffect, useState } from "react";
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
    slug: "",
  });
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  // Tab de visualización 
  const [activeTab, setActiveTab] = useState<"detalle" | "productos">("detalle");

  // Cargar árbol inicial
  useEffect(() => {
    loadTree();
  }, [negocioId]);

  // Cargar detalle cuando se selecciona un grupo
  useEffect(() => {
    if (selectedGroupId) {
      loadGroupDetail(selectedGroupId);
    }
  }, [selectedGroupId]);

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
        if (flattenedTree.length > 0 && !selectedGroupId) {
          setSelectedGroupId(flattenedTree[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  }, [negocioId, selectedGroupId]);

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

  const handleCreateGroup = async (e: React.FormEvent) => {
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
        setCreateInput({ nombre: "", slug: "" });
        setCreateParentId(null);
        setShowCreateForm(false);
        await loadTree();

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
    setCreateInput({ nombre: "", slug: "" });
  };

  const handleProductsUpdated = () => {
    if (selectedGroupId) {
      loadGroupDetail(selectedGroupId);
      loadTree();
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Encabezado principal */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Organización del Catálogo
          </h1>
          <p className="text-gray-600 mt-1">
            Crea grupos de productos y organiza tu catálogo de forma editorial
          </p>
        </div>
        <button
          onClick={() => {
            setCreateParentId(null);
            setShowCreateForm(true);
            setCreateInput({ nombre: "", slug: "" });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <FaPlus /> Nuevo Grupo Raíz
        </button>
      </div>

      {/* Formulario de creación modal-like */}
      {showCreateForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">
              {createParentId ? "Crear Subgrupo" : "Crear Nuevo Grupo"}
            </h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-1 hover:bg-blue-100 rounded"
            >
              <FaTimes />
            </button>
          </div>

          {createMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              createMessage.startsWith("Error")
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-green-50 text-green-800 border border-green-200"
            }`}>
              {createMessage}
            </div>
          )}

          <form onSubmit={handleCreateGroup} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                placeholder="Ej: Bebidas, Platos Fuertes"
                value={createInput.nombre}
                onChange={(e) =>
                  setCreateInput({ ...createInput, nombre: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                placeholder="Automático si no rellenas"
                value={createInput.slug}
                onChange={(e) =>
                  setCreateInput({ ...createInput, slug: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                placeholder="Describe qué contiene este grupo (opcional)"
                value={createInput.description || ""}
                onChange={(e) =>
                  setCreateInput({
                    ...createInput,
                    description: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creatingGroup || !createInput.nombre.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingGroup ? "Creando..." : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contenido principal maestro-detalle */}
      {!hasGroups ? (
        <div className="p-12 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">
            No tienes grupos de catálogo aún. ¡Crea el primero para empezar a
            organizar tu catálogo!
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Crear Primer Grupo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel izquierdo: Árbol de grupos */}
          <div className="lg:col-span-1">
            <h3 className="font-semibold text-gray-900 mb-3">Estructura</h3>
            <CatalogGroupsTree
              groups={treeGroups}
              selectedGroupId={selectedGroupId}
              onSelectGroup={(id) => setSelectedGroupId(id)}
              onCreateSubgroup={handleCreateSubgroup}
              onDeleteGroup={handleDeleteGroup}
              loading={loading}
            />
          </div>

          {/* Panel derecho: Detalle o productos */}
          <div className="lg:col-span-2">
            {selectedGroupDetail && (
              <div className="space-y-4">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab("detalle")}
                    className={`px-4 py-2 font-medium transition-colors ${
                      activeTab === "detalle"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Detalle del Grupo
                  </button>
                  <button
                    onClick={() => setActiveTab("productos")}
                    className={`px-4 py-2 font-medium transition-colors ${
                      activeTab === "productos"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Productos ({selectedGroupDetail.productCount || 0})
                  </button>
                </div>

                {/* Contenido del tab */}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
