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
import { trackAnalyticsEvent } from "@/analytics/events";
import {
  findGroupInTree,
  findRootGroupIdForGroupId,
  getPreferredGroupIdFromNode,
} from "@/perfil/helpers/catalog-group-url";
import { getCatalogAccentTheme } from "@/perfil/helpers/catalogVisualThemes";
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
  const selectedRootGroup = selectedGroupId
    ? findGroupInTree(selectedGroupId, groupsTree)
    : null;
  const selectedTheme = getCatalogAccentTheme(
    selectedGroupId ?? currentGroupId ?? negocioSlug
  );
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
      className="mx-auto w-full max-w-[1560px] space-y-4 px-4 sm:px-6 lg:px-8 2xl:px-10"
      data-testid="catalog-groups-public-view"
    >
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.04),transparent_36%),linear-gradient(180deg,#ffffff,#f8fafc)] px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {(selectedGroupId || selectedSubgroupId) && (
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Ver todo
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          <div className="flex gap-2.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:justify-center">
            {groupsTree.map((rootGroup) => {
              const theme = getCatalogAccentTheme(rootGroup.id || rootGroup.slug);
              const isSelectedRoot = selectedGroupId === rootGroup.id;
              const preferredGroupId =
                rootGroup.productCount > 0
                  ? rootGroup.id
                  : getPreferredGroupIdFromNode(rootGroup) ?? rootGroup.id;
              const nextSubgroupId =
                preferredGroupId !== rootGroup.id ? preferredGroupId : null;
              const nextGroupId = nextSubgroupId ?? rootGroup.id;

              return (
                <button
                  key={rootGroup.id}
                  type="button"
                  onClick={() => {
                    if (
                      selectedGroupId === rootGroup.id &&
                      currentGroupId === nextGroupId
                    ) {
                      return;
                    }

                    setSelectedGroupId(rootGroup.id);
                    setSelectedSubgroupId(nextSubgroupId);
                    handleGroupSelection(rootGroup.id, nextSubgroupId);
                  }}
                  className="inline-flex h-11 flex-shrink-0 items-center gap-2.5 rounded-full border px-3.5 pr-4 text-sm font-semibold transition duration-200"
                  style={
                    isSelectedRoot
                      ? {
                          background: `linear-gradient(135deg, ${theme.surfaceStrong}, ${theme.surface})`,
                          borderColor: theme.border,
                          boxShadow: theme.shadow,
                          color: theme.text,
                        }
                      : {
                          background: `linear-gradient(135deg, ${theme.surfaceMuted}, rgba(255,255,255,0.96))`,
                          borderColor: theme.border,
                          color: theme.text,
                        }
                  }
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: isSelectedRoot ? theme.solid : theme.badgeText }}
                  />
                  <span className="whitespace-nowrap">{rootGroup.nombre}</span>
                </button>
              );
            })}
          </div>

          {selectedRootGroup && selectedRootGroup.children.length > 0 && (
            <div
              className="rounded-[24px] border px-3 py-3"
              style={{
                background: `linear-gradient(135deg, ${selectedTheme.surfaceMuted}, ${selectedTheme.surface})`,
                borderColor: selectedTheme.border,
              }}
            >
              <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:justify-center md:justify-start">
                {selectedRootGroup.children.map((subgroup) => {
                  const isSubSelected =
                    selectedSubgroupId === subgroup.id && selectedGroupId === selectedRootGroup.id;

                  return (
                    <button
                      key={subgroup.id}
                      type="button"
                      onClick={() => {
                        if (
                          selectedGroupId === selectedRootGroup.id &&
                          selectedSubgroupId === subgroup.id
                        ) {
                          return;
                        }

                        setSelectedGroupId(selectedRootGroup.id);
                        setSelectedSubgroupId(subgroup.id);
                        handleGroupSelection(selectedRootGroup.id, subgroup.id);
                      }}
                      className="whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition"
                      style={
                        isSubSelected
                          ? {
                              backgroundColor: selectedTheme.solid,
                              borderColor: selectedTheme.solid,
                              color: selectedTheme.solidText,
                              boxShadow: selectedTheme.shadow,
                            }
                          : {
                              backgroundColor: "rgba(255,255,255,0.86)",
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
          )}
        </div>
      </section>

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
