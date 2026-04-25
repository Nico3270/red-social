"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { saveCatalogGroupProductsBatch } from "@/actions/catalogGroups/catalogGroupProducts";
import { getAvailableProducts } from "@/actions/catalogGroups/getAvailableProducts";
import type { AvailableProduct } from "@/actions/catalogGroups/getAvailableProducts";
import { getCloudinaryImageUrl } from "@/lib/cloudinary/buildCloudinaryDeliveryUrl";
import {
  FaArrowDown,
  FaArrowUp,
  FaCheck,
  FaPlus,
  FaSearch,
  FaStar,
  FaTrash,
  FaUndo,
} from "react-icons/fa";

interface GroupProduct {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  precio: number;
  order: number;
  isFeatured: boolean;
}

interface ProductAssignmentPanelProps {
  groupId: string;
  groupProducts?: GroupProduct[];
  onProductsUpdated?: () => void;
}

type Notice = {
  type: "success" | "error" | "info";
  text: string;
} | null;

const PRODUCT_IMAGE_PLACEHOLDER = "/imgs/placeholder_productos.png";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);

const sortAndReindexAssignedProducts = (products: GroupProduct[]) =>
  [...products]
    .sort((left, right) => left.order - right.order)
    .map((product, index) => ({ ...product, order: index }));

const reindexAssignedProducts = (products: GroupProduct[]) =>
  products.map((product, index) => ({ ...product, order: index }));

const buildAssignmentSignature = (products: GroupProduct[]) =>
  reindexAssignedProducts(products)
    .map(
      (product, index) =>
        `${product.productId}:${index}:${product.isFeatured ? "1" : "0"}`
    )
    .join("|");

const productMatchesSearch = (productName: string, searchQuery: string) =>
  !searchQuery.trim() ||
  productName.toLowerCase().includes(searchQuery.trim().toLowerCase());

const buildGroupProductFromAvailable = (
  product: AvailableProduct,
  order: number
): GroupProduct => ({
  id: `draft-${product.id}`,
  productId: product.id,
  productName: product.nombre,
  productImage: product.imagenes[0]?.url,
  precio: product.precio,
  order,
  isFeatured: false,
});

const buildAvailableFromGroupProduct = (
  product: GroupProduct
): AvailableProduct => ({
  id: product.productId,
  nombre: product.productName,
  slug: product.productId,
  descripcionCorta: null,
  precio: product.precio,
  status: "disponible",
  imagenes: product.productImage ? [{ url: product.productImage }] : [],
  isAssignedToGroup: false,
});

const ProductThumb = ({
  src,
  alt,
  className,
  sizes = "56px",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
}) => {
  const optimizedProductThumbnailUrl = getCloudinaryImageUrl(
    src || PRODUCT_IMAGE_PLACEHOLDER,
    "thumbnail",
  );

  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100 shadow-sm ${className ?? "h-12 w-12 sm:h-14 sm:w-14"}`}
    >
      <Image
        src={optimizedProductThumbnailUrl}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
};

const EmptyState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center">
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
  </div>
);

const SavingSpinner = () => (
  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
);

const ProductAssignmentPanel = ({
  groupId,
  groupProducts = [],
  onProductsUpdated,
}: ProductAssignmentPanelProps) => {
  const incomingAssignedProducts = useMemo(
    () => sortAndReindexAssignedProducts(groupProducts),
    [groupProducts]
  );
  const incomingSignature = useMemo(
    () => buildAssignmentSignature(incomingAssignedProducts),
    [incomingAssignedProducts]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [assignedProducts, setAssignedProducts] = useState<GroupProduct[]>(
    incomingAssignedProducts
  );
  const [savedProducts, setSavedProducts] = useState<GroupProduct[]>(
    incomingAssignedProducts
  );
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    setAssignedProducts(incomingAssignedProducts);
    setSavedProducts(incomingAssignedProducts);
    setNotice(null);
  }, [groupId, incomingAssignedProducts, incomingSignature]);

  const flashNotice = useCallback((nextNotice: Exclude<Notice, null>) => {
    setNotice(nextNotice);

    if (nextNotice.type !== "info") {
      window.setTimeout(() => {
        setNotice((currentNotice) =>
          currentNotice?.text === nextNotice.text ? null : currentNotice
        );
      }, nextNotice.type === "success" ? 3200 : 5200);
    }
  }, []);

  const loadAvailableProducts = useCallback(
    async (query: string) => {
      setLoadingProducts(true);
      try {
        const result = await getAvailableProducts(groupId, query, 200, 0);

        if (result.ok && result.products) {
          setAvailableProducts(result.products);
        } else {
          flashNotice({ type: "error", text: result.message });
        }
      } catch {
        flashNotice({
          type: "error",
          text: "No fue posible cargar los productos",
        });
      } finally {
        setLoadingProducts(false);
      }
    },
    [flashNotice, groupId]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAvailableProducts(searchQuery);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [loadAvailableProducts, searchQuery]);

  const assignedProductIds = useMemo(
    () => new Set(assignedProducts.map((product) => product.productId)),
    [assignedProducts]
  );

  const savedProductIds = useMemo(
    () => new Set(savedProducts.map((product) => product.productId)),
    [savedProducts]
  );

  const visibleAvailableProducts = useMemo(
    () =>
      availableProducts.filter(
        (product) =>
          !assignedProductIds.has(product.id) &&
          productMatchesSearch(product.nombre, searchQuery)
      ),
    [assignedProductIds, availableProducts, searchQuery]
  );

  const savedSignature = useMemo(
    () => buildAssignmentSignature(savedProducts),
    [savedProducts]
  );
  const draftSignature = useMemo(
    () => buildAssignmentSignature(assignedProducts),
    [assignedProducts]
  );
  const hasPendingChanges = draftSignature !== savedSignature;

  const pendingSummary = useMemo(() => {
    const currentPositions = new Map(
      assignedProducts.map((product, index) => [
        product.productId,
        { index, isFeatured: product.isFeatured },
      ])
    );
    const savedPositions = new Map(
      savedProducts.map((product, index) => [
        product.productId,
        { index, isFeatured: product.isFeatured },
      ])
    );

    const added = assignedProducts.filter(
      (product) => !savedProductIds.has(product.productId)
    ).length;
    const removed = savedProducts.filter(
      (product) => !assignedProductIds.has(product.productId)
    ).length;
    const changed = assignedProducts.filter((product) => {
      const savedPosition = savedPositions.get(product.productId);
      const currentPosition = currentPositions.get(product.productId);

      return (
        savedPosition &&
        currentPosition &&
        (savedPosition.index !== currentPosition.index ||
          savedPosition.isFeatured !== currentPosition.isFeatured)
      );
    }).length;

    return { added, removed, changed };
  }, [assignedProductIds, assignedProducts, savedProductIds, savedProducts]);

  const pendingSummaryText = [
    pendingSummary.added > 0 ? `${pendingSummary.added} agregados` : null,
    pendingSummary.removed > 0 ? `${pendingSummary.removed} quitados` : null,
    pendingSummary.changed > 0 ? `${pendingSummary.changed} ajustados` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const handleAssignProduct = (product: AvailableProduct) => {
    setAssignedProducts((currentProducts) => {
      if (
        currentProducts.some(
          (currentProduct) => currentProduct.productId === product.id
        )
      ) {
        return currentProducts;
      }

      return reindexAssignedProducts([
        ...currentProducts,
        buildGroupProductFromAvailable(product, currentProducts.length),
      ]);
    });
    setNotice(null);
  };

  const handleRemoveProduct = (product: GroupProduct) => {
    setAssignedProducts((currentProducts) =>
      reindexAssignedProducts(
        currentProducts.filter(
          (currentProduct) => currentProduct.productId !== product.productId
        )
      )
    );
    setAvailableProducts((currentProducts) => {
      if (
        currentProducts.some(
          (currentProduct) => currentProduct.id === product.productId
        ) ||
        !productMatchesSearch(product.productName, searchQuery)
      ) {
        return currentProducts;
      }

      return [buildAvailableFromGroupProduct(product), ...currentProducts];
    });
    setNotice(null);
  };

  const handleMoveProduct = (
    productId: string,
    direction: "up" | "down"
  ) => {
    setAssignedProducts((currentProducts) => {
      const currentIndex = currentProducts.findIndex(
        (product) => product.productId === productId
      );
      if (currentIndex === -1) return currentProducts;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= currentProducts.length) return currentProducts;

      const nextProducts = [...currentProducts];
      [nextProducts[currentIndex], nextProducts[newIndex]] = [
        nextProducts[newIndex],
        nextProducts[currentIndex],
      ];

      return reindexAssignedProducts(nextProducts);
    });
    setNotice(null);
  };

  const handleToggleFeatured = (productId: string) => {
    setAssignedProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.productId === productId
          ? { ...product, isFeatured: !product.isFeatured }
          : product
      )
    );
    setNotice(null);
  };

  const handleDiscardChanges = () => {
    setAssignedProducts(savedProducts);
    setAvailableProducts((currentProducts) =>
      currentProducts.map((product) => ({
        ...product,
        isAssignedToGroup: savedProductIds.has(product.id),
      }))
    );
    flashNotice({
      type: "info",
      text: "Cambios descartados. El grupo volvió al último estado guardado.",
    });
  };

  const handleSaveChanges = async () => {
    if (!hasPendingChanges || isSaving) return;

    setIsSaving(true);
    setNotice(null);

    try {
      const result = await saveCatalogGroupProductsBatch({
        catalogGroupId: groupId,
        products: assignedProducts.map((product, index) => ({
          productId: product.productId,
          order: index,
          isFeatured: product.isFeatured,
        })),
      });

      if (!result.ok || !result.catalogGroupProducts) {
        flashNotice({ type: "error", text: result.message });
        return;
      }

      const savedAssignmentsByProductId = new Map(
        result.catalogGroupProducts.map((assignment) => [
          assignment.productId,
          assignment,
        ])
      );
      const nextSavedProducts = reindexAssignedProducts(
        assignedProducts.map((product, index) => {
          const savedAssignment = savedAssignmentsByProductId.get(
            product.productId
          );

          return {
            ...product,
            id: savedAssignment?.id ?? product.id,
            order: savedAssignment?.order ?? index,
            isFeatured: savedAssignment?.isFeatured ?? product.isFeatured,
          };
        })
      );

      setAssignedProducts(nextSavedProducts);
      setSavedProducts(nextSavedProducts);
      setAvailableProducts((currentProducts) =>
        currentProducts.map((product) => ({
          ...product,
          isAssignedToGroup: savedAssignmentsByProductId.has(product.id),
        }))
      );
      flashNotice({
        type: "success",
        text: "Cambios guardados. El catálogo público ya puede usar este orden.",
      });
      onProductsUpdated?.();
    } catch {
      flashNotice({
        type: "error",
        text: "No fue posible guardar los cambios del grupo",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_34%),linear-gradient(135deg,#f8fafc,#ffffff)] px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">
                Curaduría del grupo
              </p>
              {hasPendingChanges && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700">
                  Cambios pendientes
                </span>
              )}
            </div>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Asignar productos
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Edita la selección, el orden y los destacados de forma instantánea.
              Nada se publica hasta guardar los cambios.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-[26px] border border-slate-200 bg-white/85 p-2 text-center shadow-sm backdrop-blur sm:min-w-64">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950">
              <p className="text-2xl font-black">{visibleAvailableProducts.length}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Disponibles
              </p>
            </div>
            <div className="rounded-[20px] border border-blue-200 bg-blue-50/80 px-4 py-3 text-slate-950">
              <p className="text-2xl font-black">{assignedProducts.length}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                Agregados
              </p>
            </div>
          </div>
        </div>

        {notice && (
          <div
            className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ${
              notice.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : notice.type === "info"
                  ? "border border-blue-200 bg-blue-50 text-blue-800"
                  : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {notice.text}
          </div>
        )}
      </div>

      <div className="grid gap-4 p-3 sm:p-4 xl:grid-cols-2 xl:gap-5 xl:p-5">
        <div className="min-w-0 rounded-[24px] border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h4 className="text-base font-black text-slate-950">
                Productos disponibles
              </h4>
              <p className="text-sm text-slate-500">
                Agrega al grupo sin refrescar la lista.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto overflow-x-hidden pr-1">
            {loadingProducts ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-[104px] animate-pulse rounded-3xl bg-white sm:h-[92px]"
                  />
                ))}
              </div>
            ) : visibleAvailableProducts.length === 0 ? (
              <EmptyState
                title={
                  searchQuery
                    ? "No hay resultados disponibles"
                    : "No quedan productos disponibles"
                }
                description={
                  searchQuery
                    ? "Prueba con otro nombre o revisa los productos ya agregados."
                    : "Todos los productos cargados ya están en este borrador."
                }
              />
            ) : (
              visibleAvailableProducts.map((product) => (
                <article
                  key={product.id}
                  className="group min-w-0 rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_48px_rgba(15,23,42,0.12)] sm:flex sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <ProductThumb
                      src={product.imagenes[0]?.url}
                      alt={product.nombre}
                      className="h-14 w-14 sm:h-16 sm:w-16"
                      sizes="64px"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Producto disponible
                      </p>
                      <h5 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-5 tracking-[-0.01em] text-slate-950 sm:text-base">
                        {product.nombre}
                      </h5>
                      <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-slate-900">
                        {formatCurrency(product.precio)}
                      </p>
                      {product.descripcionCorta && (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {product.descripcionCorta}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3 sm:mt-0 sm:flex-shrink-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleAssignProduct(product)}
                      disabled={isSaving}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[9px] text-white transition group-hover:bg-blue-600">
                        <FaPlus />
                      </span>
                      Agregar
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-[24px] border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-base font-black text-slate-950">
                Productos agregados
              </h4>
              <p className="text-sm text-slate-500">
                Ordena, destaca o quita antes de guardar.
              </p>
            </div>
            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
              {assignedProducts.length}
            </span>
          </div>

          <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto overflow-x-hidden pr-1">
            {assignedProducts.length === 0 ? (
              <EmptyState
                title="Este grupo aún está vacío"
                description="Agrega productos desde la columna izquierda para construir esta sección del catálogo."
              />
            ) : (
              assignedProducts.map((product, index) => (
                <article
                  key={product.productId}
                  className={`group min-w-0 rounded-[28px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.9))] p-3.5 shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4 ${
                    product.isFeatured
                      ? "border-amber-300 ring-2 ring-amber-100"
                      : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_22px_40px_rgba(15,23,42,0.1)]"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3.5">
                    <ProductThumb
                      src={product.productImage}
                      alt={product.productName}
                      className="h-14 w-14 sm:h-16 sm:w-16"
                      sizes="64px"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Posición {index + 1}
                        </span>
                        {product.isFeatured && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-700">
                            Destacado
                          </span>
                        )}
                      </div>
                      <h5 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-5 tracking-[-0.01em] text-slate-950 sm:text-base">
                        {product.productName}
                      </h5>
                      <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-slate-900">
                        {formatCurrency(product.precio)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Orden local listo para guardarse en batch.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(product.productId)}
                      disabled={isSaving}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        product.isFeatured
                          ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                      title={
                        product.isFeatured
                          ? "Marcar como no destacado"
                          : "Marcar como destacado"
                      }
                    >
                      <FaStar />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveProduct(product.productId, "up")}
                      disabled={index === 0 || isSaving}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                      title="Mover arriba"
                    >
                      <FaArrowUp />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveProduct(product.productId, "down")}
                      disabled={index === assignedProducts.length - 1 || isSaving}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                      title="Mover abajo"
                    >
                      <FaArrowDown />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(product)}
                      disabled={isSaving}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Quitar"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p
              className={`text-sm font-black ${
                hasPendingChanges ? "text-amber-700" : "text-slate-700"
              }`}
            >
              {hasPendingChanges ? "Cambios pendientes por guardar" : "Todo está guardado"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {hasPendingChanges
                ? pendingSummaryText || "Hay cambios locales en este grupo."
                : "Puedes seguir editando; guardaremos solo cuando haya cambios."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={handleDiscardChanges}
              disabled={!hasPendingChanges || isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <FaUndo className="text-xs" />
              Descartar
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={!hasPendingChanges || isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSaving ? <SavingSpinner /> : <FaCheck className="text-xs" />}
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductAssignmentPanel;