"use client";

import {
  getAdminAvailableProductsForCatalogGroupAction,
  getAdminCatalogGroupDetailAction,
  saveAdminCatalogGroupProductsBatchAction,
  type AdminCatalogGroupAssignedProduct,
  type AdminCatalogGroupAvailableProduct,
  type AdminCatalogGroupDetail,
} from "@/actions/myckeoAdmin/adminCatalogGroupProductActions";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

type AdminCatalogGroupProductsPanelProps = {
  businessId: string;
  expectedSlug: string;
  selectedGroupId: string | null;
  selectedGroupName?: string | null;
};

type DraftAssignedProduct = AdminCatalogGroupAssignedProduct;

type FeedbackState =
  | { type: "info" | "success" | "error"; message: string }
  | null;

function formatPrice(value: number) {
  if (!Number.isFinite(value)) {
    return "Precio no disponible";
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function ProductStatusBadge({ status }: { status: string }) {
  const classes =
    status === "disponible"
      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "agotado"
        ? "border border-amber-200 bg-amber-50 text-amber-700"
        : status === "oculto"
          ? "border border-slate-200 bg-slate-100 text-slate-600"
          : "border border-slate-200 bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${classes}`}
    >
      {status}
    </span>
  );
}

function normalizeImageUrl(value: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeAssignedProducts(products: DraftAssignedProduct[]) {
  return products.map((product, index) => ({
    ...product,
    order: index,
    isFeatured: Boolean(product.isFeatured),
  }));
}

function normalizeAssignedProductsFromServer(products: DraftAssignedProduct[]) {
  return [...products]
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.product.nombre.localeCompare(right.product.nombre, "es-CO");
    })
    .map((product, index) => ({
      ...product,
      order: index,
      isFeatured: Boolean(product.isFeatured),
    }));
}

function buildAssignmentSignature(products: DraftAssignedProduct[]) {
  return normalizeAssignedProducts(products)
    .map((product) => `${product.productId}:${product.order}:${product.isFeatured ? 1 : 0}`)
    .join("|");
}

function swapDraftProducts(
  products: DraftAssignedProduct[],
  sourceIndex: number,
  targetIndex: number
) {
  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex >= products.length ||
    targetIndex >= products.length
  ) {
    return products;
  }

  const nextProducts = [...products];
  const [movedProduct] = nextProducts.splice(sourceIndex, 1);
  nextProducts.splice(targetIndex, 0, movedProduct);
  return normalizeAssignedProducts(nextProducts);
}

function normalizeGroupDetail(group: AdminCatalogGroupDetail): AdminCatalogGroupDetail {
  const normalizedProducts = normalizeAssignedProductsFromServer(group.products);

  return {
    ...group,
    productCount: normalizedProducts.length,
    products: normalizedProducts,
  };
}

function ProductImage({
  imageUrl,
  label,
}: {
  imageUrl: string | null;
  label: string;
}) {
  const normalizedImageUrl = useMemo(() => normalizeImageUrl(imageUrl), [imageUrl]);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    setHasLoadError(false);
  }, [normalizedImageUrl]);

  if (normalizedImageUrl && !hasLoadError) {
    return (
      <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-slate-100 sm:h-14 sm:w-14">
        <Image
          src={normalizedImageUrl}
          alt={label}
          fill
          sizes="(min-width: 640px) 56px, 48px"
          className="object-cover"
          onError={() => setHasLoadError(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500 sm:h-14 sm:w-14 sm:text-base">
      {label.trim().charAt(0).toUpperCase() || "P"}
    </div>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{message}</p>
      </div>
    </div>
  );
}

function LoadingCards({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-[22px] bg-slate-100"
        />
      ))}
    </div>
  );
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState }) {
  if (!feedback) {
    return null;
  }

  const classes =
    feedback.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : feedback.type === "error"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : "border-blue-200 bg-blue-50 text-blue-900";

  const Icon =
    feedback.type === "success"
      ? CheckCircle2
      : feedback.type === "error"
        ? AlertCircle
        : Sparkles;

  return (
    <div className={`rounded-[24px] border px-4 py-4 ${classes}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-sm font-medium">{feedback.message}</p>
      </div>
    </div>
  );
}

function AssignedProductCard({
  product,
  canMoveUp,
  canMoveDown,
  disabled,
  onMoveUp,
  onMoveDown,
  onToggleFeatured,
  onRemove,
}: {
  product: DraftAssignedProduct;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleFeatured: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.16)]">
      <div className="flex items-start gap-3">
        <ProductImage
          imageUrl={product.product.imageUrl}
          label={product.product.nombre}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="truncate text-sm font-semibold tracking-tight text-slate-950 sm:text-[15px]">
              {product.product.nombre}
            </h4>
            <ProductStatusBadge status={product.product.status} />
            {product.isFeatured ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                <Star className="h-3.5 w-3.5 fill-current" />
                Destacado
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              Orden {product.order}
            </span>
            {product.product.slug ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {product.product.slug}
              </span>
            ) : null}
            {product.product.category ? (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                {product.product.category.nombre}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600 sm:text-sm">
            <span className="font-semibold text-slate-900">
              {formatPrice(product.product.precio)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onMoveUp}
              title="Mover producto hacia arriba"
              disabled={disabled || !canMoveUp}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:px-3 sm:text-sm"
            >
              <ArrowUp className="h-4 w-4" />
              Subir
            </button>

            <button
              type="button"
              onClick={onMoveDown}
              title="Mover producto hacia abajo"
              disabled={disabled || !canMoveDown}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:px-3 sm:text-sm"
            >
              <ArrowDown className="h-4 w-4" />
              Bajar
            </button>

            <button
              type="button"
              onClick={onToggleFeatured}
              title={
                product.isFeatured
                  ? "Quitar destacado del producto"
                  : "Marcar producto como destacado"
              }
              disabled={disabled}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:px-3 sm:text-sm ${
                product.isFeatured
                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Star className={`h-4 w-4 ${product.isFeatured ? "fill-current" : ""}`} />
              {product.isFeatured ? "Quitar destacado" : "Marcar destacado"}
            </button>

            <button
              type="button"
              onClick={onRemove}
              title="Quitar producto del grupo"
              disabled={disabled}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:px-3 sm:text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Quitar
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function AvailableProductCard({
  product,
  disabled,
  onAdd,
}: {
  product: AdminCatalogGroupAvailableProduct;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <article className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.16)]">
      <div className="flex items-start gap-3">
        <ProductImage imageUrl={product.imageUrl} label={product.nombre} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="truncate text-sm font-semibold text-slate-950 sm:text-[15px]">
              {product.nombre}
            </h4>
            <ProductStatusBadge status={product.status} />
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.slug ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {product.slug}
              </span>
            ) : null}
            {product.category ? (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                {product.category.nombre}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-900 sm:text-sm">
              {formatPrice(product.precio)}
            </p>

            <button
              type="button"
              onClick={onAdd}
              disabled={disabled}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AdminCatalogGroupProductsPanel({
  businessId,
  expectedSlug,
  selectedGroupId,
  selectedGroupName,
}: AdminCatalogGroupProductsPanelProps) {
  const router = useRouter();
  const [groupDetail, setGroupDetail] = useState<AdminCatalogGroupDetail | null>(
    null
  );
  const [serverAssignedProducts, setServerAssignedProducts] = useState<
    DraftAssignedProduct[]
  >([]);
  const [assignedDraftProducts, setAssignedDraftProducts] = useState<
    DraftAssignedProduct[]
  >([]);
  const [availableProducts, setAvailableProducts] = useState<
    AdminCatalogGroupAvailableProduct[]
  >([]);
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const selectedGroupIdRef = useRef<string | null>(selectedGroupId);
  const previousGroupIdRef = useRef<string | null>(selectedGroupId);
  const isDirtyRef = useRef(false);
  const isSaveLoadingRef = useRef(false);
  const detailRequestRef = useRef(0);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  const selectedGroupLabel = useMemo(
    () => selectedGroupName?.trim() || "este grupo",
    [selectedGroupName]
  );

  const serverSignature = useMemo(
    () => buildAssignmentSignature(serverAssignedProducts),
    [serverAssignedProducts]
  );
  const draftSignature = useMemo(
    () => buildAssignmentSignature(assignedDraftProducts),
    [assignedDraftProducts]
  );
  const isDirty = draftSignature !== serverSignature;

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    isSaveLoadingRef.current = isSaveLoading;
  }, [isSaveLoading]);

  const draftAssignmentsById = useMemo(() => {
    return new Map(
      assignedDraftProducts.map((product) => [
        product.productId,
        { order: product.order, isFeatured: product.isFeatured },
      ])
    );
  }, [assignedDraftProducts]);

  const availableProductsView = useMemo(
    () =>
      availableProducts.map((product) => {
        const draftAssignment = draftAssignmentsById.get(product.id);

        return {
          ...product,
          isAssignedToGroup: Boolean(draftAssignment),
          groupAssignment: draftAssignment
            ? {
                order: draftAssignment.order,
                isFeatured: draftAssignment.isFeatured,
              }
            : null,
        };
      }),
    [availableProducts, draftAssignmentsById]
  );
  const unassignedAvailableProducts = useMemo(
    () =>
      availableProductsView.filter((product) => !product.isAssignedToGroup),
    [availableProductsView]
  );

  const isMutationDisabled =
    !selectedGroupId || isDetailLoading || isSaveLoading || Boolean(detailError);

  const clearEditingFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const loadGroupDetail = useCallback(
    async (groupId: string, options?: { preserveVisibleState?: boolean }) => {
      const requestId = ++detailRequestRef.current;
      setIsDetailLoading(true);
      setDetailError(null);

      if (!options?.preserveVisibleState) {
        setGroupDetail(null);
        setServerAssignedProducts([]);
        setAssignedDraftProducts([]);
      }

      try {
        const result = await getAdminCatalogGroupDetailAction({
          businessId,
          expectedSlug,
          groupId,
        });

        if (
          detailRequestRef.current !== requestId ||
          selectedGroupIdRef.current !== groupId
        ) {
          return;
        }

        if (!result.ok) {
          setDetailError(result.error);
          return;
        }

        const normalizedGroup = normalizeGroupDetail(result.group);
        setGroupDetail(normalizedGroup);
        setServerAssignedProducts(normalizedGroup.products);
        setAssignedDraftProducts(normalizedGroup.products);
      } catch {
        if (
          detailRequestRef.current === requestId &&
          selectedGroupIdRef.current === groupId
        ) {
          setDetailError(
            "No fue posible cargar los productos asignados al grupo."
          );
        }
      } finally {
        if (
          detailRequestRef.current === requestId &&
          selectedGroupIdRef.current === groupId
        ) {
          setIsDetailLoading(false);
        }
      }
    },
    [businessId, expectedSlug]
  );

  const loadAvailableProducts = useCallback(
    async (groupId: string, searchValue: string) => {
      const requestId = ++searchRequestRef.current;
      setIsSearchLoading(true);
      setSearchError(null);

      try {
        const result = await getAdminAvailableProductsForCatalogGroupAction({
          businessId,
          expectedSlug,
          groupId,
          search: searchValue,
          take: 50,
          skip: 0,
        });

        if (
          searchRequestRef.current !== requestId ||
          selectedGroupIdRef.current !== groupId
        ) {
          return;
        }

        if (!result.ok) {
          setSearchError(result.error);
          setAvailableProducts([]);
          setHasMore(false);
          return;
        }

        setAvailableProducts(result.products);
        setHasMore(result.hasMore);
      } catch {
        if (
          searchRequestRef.current === requestId &&
          selectedGroupIdRef.current === groupId
        ) {
          setSearchError(
            "No fue posible buscar productos disponibles para este grupo."
          );
          setAvailableProducts([]);
          setHasMore(false);
        }
      } finally {
        if (
          searchRequestRef.current === requestId &&
          selectedGroupIdRef.current === groupId
        ) {
          setIsSearchLoading(false);
        }
      }
    },
    [businessId, expectedSlug]
  );

  useEffect(() => {
    const previousGroupId = previousGroupIdRef.current;

    if (
      previousGroupId &&
      previousGroupId !== selectedGroupId &&
      isDirtyRef.current &&
      !isSaveLoadingRef.current
    ) {
      setFeedback({
        type: "info",
        message:
          "Los cambios locales no guardados se descartaron al cambiar de grupo.",
      });
    }

    previousGroupIdRef.current = selectedGroupId;

    if (!selectedGroupId) {
      setGroupDetail(null);
      setServerAssignedProducts([]);
      setAssignedDraftProducts([]);
      setAvailableProducts([]);
      setSearchInput("");
      setSubmittedSearch("");
      setHasMore(false);
      setDetailError(null);
      setSearchError(null);
      setIsDetailLoading(false);
      setIsSearchLoading(false);
      setIsSaveLoading(false);
      return;
    }

    setSearchInput("");
    setSubmittedSearch("");
    setAvailableProducts([]);
    setHasMore(false);
    setSearchError(null);
    setIsSaveLoading(false);
    void loadGroupDetail(selectedGroupId);
    void loadAvailableProducts(selectedGroupId, "");
  }, [loadAvailableProducts, loadGroupDetail, selectedGroupId]);

  const handleSearchSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!selectedGroupId || isSaveLoading) {
        return;
      }

      const search = searchInput.trim();
      setSubmittedSearch(search);
      await loadAvailableProducts(selectedGroupId, search);
    },
    [isSaveLoading, loadAvailableProducts, searchInput, selectedGroupId]
  );

  const handleAddProduct = useCallback(
    (product: AdminCatalogGroupAvailableProduct) => {
      if (isMutationDisabled) {
        return;
      }

      setFeedback(null);
      setAssignedDraftProducts((currentProducts) => {
        if (currentProducts.some((item) => item.productId === product.id)) {
          return currentProducts;
        }

        return normalizeAssignedProducts([
          ...currentProducts,
          {
            productId: product.id,
            order: currentProducts.length,
            isFeatured: false,
            product: {
              id: product.id,
              nombre: product.nombre,
              slug: product.slug,
              precio: product.precio,
              status: product.status,
              imageUrl: product.imageUrl,
              category: product.category,
            },
          },
        ]);
      });
    },
    [isMutationDisabled]
  );

  const handleRemoveProduct = useCallback(
    (productId: string) => {
      if (isMutationDisabled) {
        return;
      }

      clearEditingFeedback();
      setAssignedDraftProducts((currentProducts) =>
        normalizeAssignedProducts(
          currentProducts.filter((product) => product.productId !== productId)
        )
      );
    },
    [clearEditingFeedback, isMutationDisabled]
  );

  const handleMoveProduct = useCallback(
    (productId: string, direction: "up" | "down") => {
      if (isMutationDisabled) {
        return;
      }

      clearEditingFeedback();
      setAssignedDraftProducts((currentProducts) => {
        const sourceIndex = currentProducts.findIndex(
          (product) => product.productId === productId
        );

        if (sourceIndex === -1) {
          return currentProducts;
        }

        const targetIndex = direction === "up" ? sourceIndex - 1 : sourceIndex + 1;
        return swapDraftProducts(currentProducts, sourceIndex, targetIndex);
      });
    },
    [clearEditingFeedback, isMutationDisabled]
  );

  const handleToggleFeatured = useCallback(
    (productId: string) => {
      if (isMutationDisabled) {
        return;
      }

      clearEditingFeedback();
      setAssignedDraftProducts((currentProducts) =>
        normalizeAssignedProducts(
          currentProducts.map((product) =>
            product.productId === productId
              ? { ...product, isFeatured: !product.isFeatured }
              : product
          )
        )
      );
    },
    [clearEditingFeedback, isMutationDisabled]
  );

  const handleDiscardChanges = useCallback(() => {
    if (!isDirty || isSaveLoading) {
      return;
    }

    setAssignedDraftProducts(serverAssignedProducts);
    setFeedback({
      type: "info",
      message: "Restauramos el ultimo estado sincronizado del grupo.",
    });
  }, [isDirty, isSaveLoading, serverAssignedProducts]);

  const handleSaveChanges = useCallback(async () => {
    if (
      !selectedGroupId ||
      isSaveLoading ||
      isDetailLoading ||
      !isDirty
    ) {
      return;
    }

    const groupId = selectedGroupId;
    const draftSnapshot = normalizeAssignedProducts(assignedDraftProducts);

    setIsSaveLoading(true);
    setFeedback(null);

    try {
      const result = await saveAdminCatalogGroupProductsBatchAction({
        businessId,
        expectedSlug,
        groupId,
        products: draftSnapshot.map((product, index) => ({
          productId: product.productId,
          order: index,
          isFeatured: product.isFeatured,
        })),
      });

      if (selectedGroupIdRef.current !== groupId) {
        router.refresh();
        return;
      }

      if (!result.ok) {
        setFeedback({
          type: "error",
          message: result.error,
        });
        return;
      }

      setServerAssignedProducts(draftSnapshot);
      setAssignedDraftProducts(draftSnapshot);
      setGroupDetail((currentGroup) =>
        currentGroup
          ? {
              ...currentGroup,
              productCount: draftSnapshot.length,
              products: draftSnapshot,
            }
          : currentGroup
      );
      setFeedback({
        type: "success",
        message: "Los cambios de productos se guardaron correctamente.",
      });

      void loadAvailableProducts(groupId, submittedSearch);
      router.refresh();
    } catch {
      if (selectedGroupIdRef.current === groupId) {
        setFeedback({
          type: "error",
          message: "No fue posible guardar los cambios de productos.",
        });
      }
    } finally {
      if (selectedGroupIdRef.current === groupId) {
        setIsSaveLoading(false);
      }
    }
  }, [
    assignedDraftProducts,
    businessId,
    expectedSlug,
    isDetailLoading,
    isDirty,
    isSaveLoading,
    loadAvailableProducts,
    router,
    selectedGroupId,
    submittedSearch,
  ]);

  if (!selectedGroupId) {
    return (
      <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.24)]">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
            Productos del grupo
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Edicion local de productos
          </h3>
        </div>

        <div className="px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-800">
            Selecciona un grupo para ver sus productos.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Aqui podras preparar cambios locales de productos, revisar su orden y
            guardar el batch cuando el grupo este seleccionado.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.24)]">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
          Productos del grupo
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Edicion local de {selectedGroupLabel}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Los cambios de productos se guardan solo al presionar Guardar cambios.
          Puedes preparar el lote, revisar el orden y descartar el borrador si
          lo necesitas.
        </p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div className="rounded-[24px] border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="font-medium">
              Los cambios de productos se guardan solo al presionar Guardar
              cambios.
            </p>
          </div>
        </div>

        <FeedbackBanner feedback={feedback} />

        {isDirty ? (
          <section className="sticky top-4 z-20 rounded-[24px] border border-amber-200 bg-white/95 px-4 py-4 shadow-[0_18px_42px_-32px_rgba(217,119,6,0.34)] backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Tienes cambios de productos sin guardar
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Revisa el borrador actual y guarda el batch cuando esté listo.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void handleSaveChanges()}
                  disabled={!isDirty || isMutationDisabled}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaveLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar cambios
                </button>

                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  disabled={!isDirty || isSaveLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" />
                  Descartar
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
          <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.9))] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h4 className="text-base font-semibold text-slate-950">
                  Productos del grupo
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Borrador local compacto para ordenar, destacar y quitar
                  productos antes de guardar.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
                  {assignedDraftProducts.length} producto(s)
                </span>
                {groupDetail?.slug ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
                    {groupDetail.slug}
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    isDirty
                      ? "border border-amber-200 bg-amber-50 text-amber-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {isDirty ? "Cambios pendientes" : "Sin cambios pendientes"}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {isDetailLoading ? <LoadingCards count={2} /> : null}

              {!isDetailLoading && detailError ? (
                <SectionError message={detailError} />
              ) : null}

              {!isDetailLoading &&
              !detailError &&
              assignedDraftProducts.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    Este grupo aun no tiene productos asignados.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Puedes agregarlos desde la lista de productos disponibles y
                    luego guardar el batch.
                  </p>
                </div>
              ) : null}

              {!isDetailLoading && !detailError && assignedDraftProducts.length > 0 ? (
                <div className="grid gap-2.5 xl:max-h-[68vh] xl:overflow-y-auto xl:pr-1">
                  {assignedDraftProducts.map((product, index) => (
                    <AssignedProductCard
                      key={product.productId}
                      product={product}
                      canMoveUp={index > 0}
                      canMoveDown={index < assignedDraftProducts.length - 1}
                      disabled={isMutationDisabled}
                      onMoveUp={() => handleMoveProduct(product.productId, "up")}
                      onMoveDown={() =>
                        handleMoveProduct(product.productId, "down")
                      }
                      onToggleFeatured={() =>
                        handleToggleFeatured(product.productId)
                      }
                      onRemove={() => handleRemoveProduct(product.productId)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.9))] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="text-base font-semibold text-slate-950">
                  Productos disponibles
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Solo se muestran productos vigentes que todavía no están en el
                  borrador actual del grupo.
                </p>
              </div>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
                {unassignedAvailableProducts.length} visible(s)
              </span>
            </div>

            <form
              className="mt-5 flex flex-col gap-3 sm:flex-row"
              onSubmit={handleSearchSubmit}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar por nombre del producto"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  disabled={isSearchLoading || isSaveLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isSearchLoading || isSaveLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSearchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Buscar
              </button>
            </form>

            {submittedSearch ? (
              <p className="mt-3 text-xs text-slate-500">
                Resultado para{" "}
                <span className="font-semibold">&quot;{submittedSearch}&quot;</span>
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                Mostrando la primera ventana de productos vigentes del negocio.
              </p>
            )}

            <div className="mt-5 space-y-4">
              {isSearchLoading ? <LoadingCards count={3} /> : null}

              {!isSearchLoading && searchError ? (
                <SectionError message={searchError} />
              ) : null}

              {!isSearchLoading &&
              !searchError &&
              availableProducts.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    No encontramos productos para esta consulta.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Refina la busqueda o usa un nombre mas cercano al producto.
                  </p>
                </div>
              ) : null}

              {!isSearchLoading &&
              !searchError &&
              availableProducts.length > 0 &&
              unassignedAvailableProducts.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    Todos los productos encontrados ya están en este grupo.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Ajusta la búsqueda si quieres encontrar otros productos para
                    agregar.
                  </p>
                </div>
              ) : null}

              {!isSearchLoading && !searchError && unassignedAvailableProducts.length > 0 ? (
                <div className="grid gap-2.5 xl:max-h-[68vh] xl:overflow-y-auto xl:pr-1">
                  {unassignedAvailableProducts.map((product) => (
                    <AvailableProductCard
                      key={product.id}
                      product={product}
                      disabled={isMutationDisabled}
                      onAdd={() => handleAddProduct(product)}
                    />
                  ))}
                </div>
              ) : null}

              {!isSearchLoading && !searchError && hasMore ? (
                <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  Hay mas productos disponibles. Refina la busqueda para ver
                  resultados mas especificos.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
