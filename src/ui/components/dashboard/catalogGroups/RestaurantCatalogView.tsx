"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import {
  reportOperationalError,
  reportOperationalWarning,
} from "@/lib/observability/operationalLogger";
import { getGroupProductsPublic } from "@/actions/catalogGroups/getGroupProductsPublic";
import { mapPublicCatalogGroupProductToProductRedSocial } from "@/actions/catalogGroups/mapPublicCatalogGroupProduct";
import type { CatalogGroupTreeNode } from "@/actions/catalogGroups/getCatalogGroupsTree";
import { RestaurantGroupNav } from "./RestaurantGroupNav";
import { trackAnalyticsEvent } from "@/analytics/events";
import {
  findGroupInTree,
  findRootGroupIdForGroupId,
  getPreferredGroupIdFromNode,
} from "@/perfil/helpers/catalog-group-url";
import { getCatalogAccentTheme } from "@/perfil/helpers/catalogVisualThemes";
import { dedupeProductsById } from "./catalogPublicProducts";
import { ProductGridWithSectionFilter } from "../../sectonFilterBar/SectionFilterBar";
import type { ProductGuideExploreContext } from "@/perfil/guide/business-guide.types";

interface RestaurantCatalogViewProps {
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

const RestaurantCatalogView: React.FC<RestaurantCatalogViewProps> = ({
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
  const previousGroupIdRef = useRef<string | null>(null);
  const reportedGroupIdRef = useRef<string | null | undefined>(undefined);

  const currentGroupId = useMemo(
    () => selectedSubgroupId ?? selectedGroupId,
    [selectedSubgroupId, selectedGroupId]
  );

  useEffect(() => {
    setSelectedGroupId(initialSelection.selectedGroupId);
    setSelectedSubgroupId(initialSelection.selectedSubgroupId);
  }, [initialSelection.selectedGroupId, initialSelection.selectedSubgroupId]);

  const selectedRootGroup = selectedGroupId ? findGroupInTree(selectedGroupId, groupsTree) : null;
  const selectedGroupNode = currentGroupId ? findGroupInTree(currentGroupId, groupsTree) : null;

  const handleGroupSelection = useCallback(
    (newGroupId: string, newSubgroupId: string | null = null) => {
      const finalGroupId = newSubgroupId ?? newGroupId;
      const finalGroup = findGroupInTree(finalGroupId, groupsTree);

      if (!finalGroup || previousGroupIdRef.current === finalGroupId) {
        return;
      }

      trackAnalyticsEvent({
        event: "restaurant_menu_group_selected",
        timestamp: Date.now(),
        negocioSlug,
        navigationMode: "catalog_groups",
        source: "grupo_navegacion",
        groupId: finalGroupId,
        groupSlug: finalGroup.slug,
        groupName: finalGroup.nombre ?? "",
        previousGroupId: previousGroupIdRef.current ?? undefined,
      });

      previousGroupIdRef.current = finalGroupId;
    },
    [groupsTree, negocioSlug]
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

        const failureMessage = result.message || "No se pudo cargar la sección seleccionada.";
        setGroupLoadErrors((prev) => ({
          ...prev,
          [currentGroupId]: failureMessage,
        }));

        reportOperationalWarning({
          area: "restaurant-public",
          event: "restaurant_group_products_unavailable",
          message: "La carga de productos del menú restaurante devolvió un estado no exitoso.",
          context: {
            negocioSlug,
            groupId: currentGroupId,
            reason: failureMessage,
          },
          dedupeKey: `restaurant-group-products-unavailable:${negocioSlug}:${currentGroupId}`,
        });
      } catch (error) {
        setGroupLoadErrors((prev) => ({
          ...prev,
          [currentGroupId]: "No se pudo cargar esta sección en este momento.",
        }));

        reportOperationalError({
          area: "restaurant-public",
          event: "restaurant_group_products_failed",
          message: "Falló la carga de productos del menú restaurante.",
          context: {
            negocioSlug,
            groupId: currentGroupId,
          },
          error,
          dedupeKey: `restaurant-group-products-failed:${negocioSlug}:${currentGroupId}`,
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
  const navGroups = useMemo(
    () =>
      groupsTree.map((group) => ({
        id: group.id,
        nombre: group.nombre,
        slug: group.slug,
        subgroupCount: group.children.length,
      })),
    [groupsTree]
  );
  const subgroups = selectedRootGroup?.children ?? [];
  const selectedTheme = getCatalogAccentTheme(
    selectedGroupId ?? currentGroupId ?? negocioSlug
  );

  if (groupsTree.length === 0) {
    return (
      <div className="rounded-lg bg-amber-50 p-8 text-center text-amber-900">
        El menú todavía se está preparando. Vuelve a intentarlo en unos minutos.
      </div>
    );
  }

  return (
    <div className="w-full" data-testid="restaurant-catalog-view">
      <RestaurantGroupNav
        groups={navGroups}
        selectedGroupId={selectedGroupId ?? undefined}
        onClearSelection={clearSelection}
        onSelectGroup={(groupId) => {
          const rootGroup = findGroupInTree(groupId, groupsTree);
          const preferredGroupId = rootGroup
            ? rootGroup.productCount > 0
              ? rootGroup.id
              : getPreferredGroupIdFromNode(rootGroup) ?? rootGroup.id
            : groupId;
          const nextSubgroupId = preferredGroupId !== groupId ? preferredGroupId : null;
          const nextGroupId = nextSubgroupId ?? groupId;

          if (selectedGroupId === groupId && currentGroupId === nextGroupId) {
            return;
          }

          setSelectedGroupId(groupId);
          setSelectedSubgroupId(nextSubgroupId);
          handleGroupSelection(groupId, nextSubgroupId);
        }}
        isLoading={isLoading}
      />

      {subgroups.length > 0 && (
        <div className="border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-[1560px] px-4 py-2 sm:px-6 lg:px-8 2xl:px-10">
            <div
              className="rounded-2xl border p-1.5"
              style={{
                background: `linear-gradient(135deg, ${selectedTheme.surfaceMuted}, rgba(255,255,255,0.96))`,
                borderColor: selectedTheme.border,
              }}
            >
              <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible lg:grid lg:grid-cols-[repeat(auto-fit,minmax(148px,1fr))] lg:gap-2.5 lg:overflow-visible">
                {subgroups.map((subgroup) => {
                  const isSelected = selectedSubgroupId === subgroup.id;

                  return (
                    <button
                      key={subgroup.id}
                      type="button"
                      onClick={() => {
                        if (selectedSubgroupId === subgroup.id) {
                          return;
                        }

                        setSelectedSubgroupId(subgroup.id);
                        handleGroupSelection(selectedGroupId ?? subgroup.id, subgroup.id);
                      }}
                      className="whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition lg:min-h-[48px] lg:w-full lg:text-center"
                      style={
                        isSelected
                          ? {
                              backgroundColor: selectedTheme.solid,
                              borderColor: selectedTheme.solid,
                              color: selectedTheme.solidText,
                              boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                            }
                          : {
                              backgroundColor: "rgba(255,255,255,0.88)",
                              borderColor: selectedTheme.border,
                              color: selectedTheme.text,
                            }
                      }
                    >
                      {subgroup.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1560px] px-0 py-1 sm:px-6 lg:px-4 2xl:px-6">
        {currentGroupError && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No pudimos cargar esta colección ahora. El catálogo completo sigue visible abajo.
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
                  groupName: selectedGroupNode.nombre || "Sección del menú",
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
    </div>
  );
};

export default RestaurantCatalogView;
