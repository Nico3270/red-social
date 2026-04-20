"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import {
  reportOperationalError,
  reportOperationalWarning,
} from "@/lib/observability/operationalLogger";
import { FaChevronDown } from "react-icons/fa";
import { getGroupProductsPublic } from "@/actions/catalogGroups/getGroupProductsPublic";
import { mapPublicCatalogGroupProductToProductRedSocial } from "@/actions/catalogGroups/mapPublicCatalogGroupProduct";
import type { CatalogGroupTreeNode } from "@/actions/catalogGroups/getCatalogGroupsTree";
import { trackAnalyticsEvent } from "@/analytics/events";
import {
  findGroupInTree,
  findRootGroupIdForGroupId,
  getPreferredGroupIdFromNode,
} from "@/perfil/helpers/catalog-group-url";
import { ProductGridWithSectionFilter } from "../../sectonFilterBar/SectionFilterBar";
import type { ProductGuideExploreContext } from "@/perfil/guide/business-guide.types";
import { dedupeProductsById } from "./catalogPublicProducts";

interface CatalogGroupsPublicViewProps {
  groupsTree: CatalogGroupTreeNode[];
  negocioSlug: string;
  catalogProducts: ProductRedSocial[];
  initialGroupId?: string;
  initialGroupProducts?: ProductRedSocial[];
  guideContext?: ProductGuideExploreContext | null;
  onGroupChange?: (groupId: string | null) => void;
}

interface GroupSelectionState {
  selectedGroupId: string | null;
  selectedSubgroupId: string | null;
}

function resolveSelectionFromGroupId(
  groupsTree: CatalogGroupTreeNode[],
  targetGroupId?: string | null
): GroupSelectionState {
  if (!groupsTree.length || !targetGroupId) {
    return {
      selectedGroupId: null,
      selectedSubgroupId: null,
    };
  }

  const rootGroupId = findRootGroupIdForGroupId(targetGroupId, groupsTree);

  if (!rootGroupId) {
    return {
      selectedGroupId: null,
      selectedSubgroupId: null,
    };
  }

  return {
    selectedGroupId: rootGroupId,
    selectedSubgroupId: rootGroupId === targetGroupId ? null : targetGroupId,
  };
}

const CatalogGroupsPublicView: React.FC<CatalogGroupsPublicViewProps> = ({
  groupsTree,
  negocioSlug,
  catalogProducts,
  initialGroupId,
  initialGroupProducts,
  guideContext = null,
  onGroupChange,
}) => {
  const initialSelection = useMemo(
    () => resolveSelectionFromGroupId(groupsTree, initialGroupId ?? null),
    [groupsTree, initialGroupId]
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialSelection.selectedGroupId
  );
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(
    initialSelection.selectedSubgroupId
  );
  const [groupsWithProducts, setGroupsWithProducts] = useState<Record<string, ProductRedSocial[]>>(
    initialGroupId && initialGroupProducts ? { [initialGroupId]: initialGroupProducts } : {}
  );
  const [groupLoadErrors, setGroupLoadErrors] = useState<Record<string, string>>({});
  const [loadingGroups, setLoadingGroups] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () =>
      initialSelection.selectedGroupId && initialSelection.selectedSubgroupId
        ? new Set([initialSelection.selectedGroupId])
        : new Set()
  );
  const previousGroupIdRef = useRef<string | null>(null);
  const reportedGroupIdRef = useRef<string | null | undefined>(undefined);

  const currentGroupId = useMemo(
    () => selectedSubgroupId ?? selectedGroupId,
    [selectedSubgroupId, selectedGroupId]
  );

  useEffect(() => {
    setSelectedGroupId(initialSelection.selectedGroupId);
    setSelectedSubgroupId(initialSelection.selectedSubgroupId);
    setExpandedGroups(
      initialSelection.selectedGroupId && initialSelection.selectedSubgroupId
        ? new Set([initialSelection.selectedGroupId])
        : new Set()
    );
  }, [initialSelection.selectedGroupId, initialSelection.selectedSubgroupId]);

  const handleGroupSelection = useCallback(
    (newGroupId: string, newSubgroupId: string | null) => {
      const finalGroupId = newSubgroupId ?? newGroupId;
      const finalGroup = findGroupInTree(finalGroupId, groupsTree);
      const rootGroup = findGroupInTree(newGroupId, groupsTree);

      if (!finalGroup || previousGroupIdRef.current === finalGroupId) {
        return;
      }

      trackAnalyticsEvent({
        event: "catalog_group_changed",
        timestamp: Date.now(),
        negocioSlug,
        navigationMode: "catalog_groups",
        source: "grupo_navegacion",
        groupId: finalGroupId,
        groupSlug: finalGroup.slug,
        groupName: finalGroup.nombre ?? "",
        previousGroupId: previousGroupIdRef.current ?? undefined,
        hasSubgroups: Boolean(rootGroup?.children?.length),
        productCount: groupsWithProducts[finalGroupId]?.length,
      });

      previousGroupIdRef.current = finalGroupId;
    },
    [groupsTree, groupsWithProducts, negocioSlug]
  );

  useEffect(() => {
    if (!onGroupChange || reportedGroupIdRef.current === currentGroupId) {
      return;
    }

    reportedGroupIdRef.current = currentGroupId;
    onGroupChange(currentGroupId);
  }, [currentGroupId, onGroupChange]);

  const clearSelection = useCallback(() => {
    if (!selectedGroupId && !selectedSubgroupId) {
      return;
    }

    setSelectedGroupId(null);
    setSelectedSubgroupId(null);
  }, [selectedGroupId, selectedSubgroupId]);

  useEffect(() => {
    if (!currentGroupId || groupsWithProducts[currentGroupId]) {
      return;
    }

    setLoadingGroups((prev) => {
      const next = new Set(prev);
      next.add(currentGroupId);
      return next;
    });

    void (async () => {
      try {
        const result = await getGroupProductsPublic(currentGroupId, negocioSlug);

        if (result.ok && result.products) {
          const rows = result.products;

          setGroupsWithProducts((prev) => ({
            ...prev,
            [currentGroupId]: rows.map((row) =>
              mapPublicCatalogGroupProductToProductRedSocial(row, negocioSlug)
            ),
          }));

          setGroupLoadErrors((prev) => {
            if (!prev[currentGroupId]) {
              return prev;
            }

            const next = { ...prev };
            delete next[currentGroupId];
            return next;
          });

          return;
        }

        const failureMessage = result.message || "No se pudo cargar la categoría seleccionada.";
        setGroupLoadErrors((prev) => ({
          ...prev,
          [currentGroupId]: failureMessage,
        }));

        reportOperationalWarning({
          area: "catalog-public",
          event: "catalog_group_products_unavailable",
          message: "La carga pública de productos del grupo devolvió un estado no exitoso.",
          context: {
            negocioSlug,
            groupId: currentGroupId,
            reason: failureMessage,
          },
          dedupeKey: `catalog-group-products-unavailable:${negocioSlug}:${currentGroupId}`,
        });
      } catch (error) {
        setGroupLoadErrors((prev) => ({
          ...prev,
          [currentGroupId]: "No se pudo cargar esta categoría en este momento.",
        }));

        reportOperationalError({
          area: "catalog-public",
          event: "catalog_group_products_failed",
          message: "Falló la carga pública de productos del grupo seleccionado.",
          context: {
            negocioSlug,
            groupId: currentGroupId,
          },
          error,
          dedupeKey: `catalog-group-products-failed:${negocioSlug}:${currentGroupId}`,
        });
      } finally {
        setLoadingGroups((prev) => {
          const next = new Set(prev);
          next.delete(currentGroupId);
          return next;
        });
      }
    })();
  }, [currentGroupId, groupsWithProducts, negocioSlug]);

  const currentProducts = useMemo(
    () => dedupeProductsById(currentGroupId ? groupsWithProducts[currentGroupId] ?? [] : []),
    [currentGroupId, groupsWithProducts]
  );
  const currentGroupError = currentGroupId ? groupLoadErrors[currentGroupId] : null;
  const isLoading = currentGroupId ? loadingGroups.has(currentGroupId) : false;
  const selectedGroupNode = currentGroupId ? findGroupInTree(currentGroupId, groupsTree) : null;
  const isContainerSelection =
    !!selectedGroupNode &&
    (selectedGroupNode.productCount ?? 0) === 0 &&
    Boolean(selectedGroupNode.children?.length);

  if (groupsTree.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-600">
        Este catálogo todavía se está configurando. Vuelve a intentarlo en unos minutos.
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-[1560px] space-y-6 px-4 sm:px-6 lg:px-8 2xl:px-10"
      data-testid="catalog-groups-public-view"
    >
      <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Colecciones</h3>

          {(selectedGroupId || selectedSubgroupId) && (
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Ver todo
            </button>
          )}
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {groupsTree.map((rootGroup) => {
            const hasSubgroups = Boolean(rootGroup.children?.length);
            const isExpanded = expandedGroups.has(rootGroup.id);
            const isSelected = selectedGroupId === rootGroup.id && !selectedSubgroupId;

            return (
              <div key={rootGroup.id} className="space-y-1">
                <button
                  onClick={() => {
                    const preferredGroupId =
                      rootGroup.productCount > 0
                        ? rootGroup.id
                        : getPreferredGroupIdFromNode(rootGroup) ?? rootGroup.id;
                    const nextSubgroupId =
                      preferredGroupId !== rootGroup.id ? preferredGroupId : null;
                    const nextGroupId = nextSubgroupId ?? rootGroup.id;

                    if (
                      selectedGroupId === rootGroup.id &&
                      currentGroupId === nextGroupId
                    ) {
                      return;
                    }

                    setSelectedGroupId(rootGroup.id);
                    setSelectedSubgroupId(nextSubgroupId);
                    handleGroupSelection(rootGroup.id, nextSubgroupId);

                    if (hasSubgroups) {
                      setExpandedGroups((prev) => new Set(prev).add(rootGroup.id));
                    }
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                    isSelected
                      ? "border border-amber-300 bg-amber-100 font-semibold text-amber-950"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate">{rootGroup.nombre}</span>
                  </span>

                  {hasSubgroups && (
                    <FaChevronDown
                      className={`flex-shrink-0 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {hasSubgroups && isExpanded && (
                  <div className="ml-4 space-y-1">
                    {rootGroup.children.map((subgroup) => {
                      const isSubSelected =
                        selectedSubgroupId === subgroup.id && selectedGroupId === rootGroup.id;

                      return (
                        <button
                          key={subgroup.id}
                          onClick={() => {
                            if (
                              selectedGroupId === rootGroup.id &&
                              selectedSubgroupId === subgroup.id
                            ) {
                              return;
                            }

                            setSelectedGroupId(rootGroup.id);
                            setSelectedSubgroupId(subgroup.id);
                            handleGroupSelection(rootGroup.id, subgroup.id);
                          }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            isSubSelected
                              ? "border border-amber-200 bg-amber-50 font-medium text-amber-900"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {subgroup.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {currentGroupError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No pudimos cargar la colección seleccionada ahora. El catálogo completo sigue disponible
          abajo.
        </div>
      )}

      {!selectedGroupNode && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Usa las colecciones para destacar partes del catálogo, o explora directamente por
          secciones como siempre.
        </div>
      )}

      {selectedGroupNode && currentProducts.length === 0 && !isLoading && !currentGroupError && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {isContainerSelection
            ? "Esta colección organiza el catálogo. Mostramos el catálogo completo y puedes elegir una subcolección para enfocarte mejor."
            : "No encontramos productos visibles en esta colección ahora mismo, así que mantenemos el catálogo completo disponible."}
        </div>
      )}

      <ProductGridWithSectionFilter
        initialProducts={catalogProducts}
        slug={negocioSlug}
        guideContext={guideContext}
        groupContext={
          selectedGroupNode && currentProducts.length > 0
            ? {
                groupId: currentGroupId!,
                groupSlug: selectedGroupNode.slug,
                groupName: selectedGroupNode.nombre || "Colección",
                highlightedProducts: currentProducts,
                onClear: clearSelection,
              }
            : null
        }
        analyticsContext={{
          negocioSlug,
          navigationMode: "catalog_groups",
          source: "productos_tab",
        }}
      />
    </div>
  );
};

export default CatalogGroupsPublicView;
