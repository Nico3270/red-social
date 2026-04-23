"use client";

import { useCallback, useMemo, useState } from "react";
import {
  attachAdminProductImagesAction,
  type AttachAdminProductImagesActionResult,
} from "@/actions/myckeoAdmin/attachAdminProductImagesAction";
import {
  createAdminProductForBusinessAction,
  type CreateAdminProductForBusinessActionResult,
} from "@/actions/myckeoAdmin/createAdminProductForBusinessAction";
import type { AdminProductCreationBusiness } from "@/actions/myckeoAdmin/getBusinessesForProductCreationAction";
import {
  publishAdminProductAction,
  type PublishAdminProductActionResult,
} from "@/actions/myckeoAdmin/publishAdminProductAction";
import {
  generateAdminProductDraftAction,
  type AdminGeneratedProductDraft,
  type AdminProductDraftContextSummary,
} from "@/actions/myckeoAdmin/generateAdminProductDraftAction";
import AutoUploadMedia from "@/ui/components/autoUpload/AutoUploadMedia";
import AdminProductBatchCreationPanel from "./AdminProductBatchCreationPanel";

type AssistedProductCreationClientProps = {
  businesses: AdminProductCreationBusiness[];
  truncated: boolean;
};

type BriefingState = {
  productName: string;
  price: string;
  baseDescription: string;
  additionalContext: string;
};

type GeneratedDraftState = {
  draft: AdminGeneratedProductDraft;
  contextSummary: AdminProductDraftContextSummary;
  model: string;
  businessId: string;
  sourceBriefing: BriefingState;
};

type SavedProductState = NonNullable<
  CreateAdminProductForBusinessActionResult["data"]
>;

type AttachedImagesState = NonNullable<
  AttachAdminProductImagesActionResult["data"]
>;

type PublishedProductState = NonNullable<
  PublishAdminProductActionResult["data"]
>;

type SuggestedOptionForm = {
  id: string;
  nombre: string;
  slug: string;
  razon: string;
};

type VariantOptionForm = {
  nombre: string;
  valor: string;
};

type VariantForm = {
  nombre: string;
  skuSugerido: string;
  precioSugerido: string;
  stockIlimitadoSugerido: boolean;
  opciones: VariantOptionForm[];
};

type EditableDraftFormState = {
  nombre: string;
  slugSugerido: string;
  precioBase: string;
  descripcionCorta: string;
  descripcion: string;
  tags: string[];
  componentes: string[];
  categoriaSugerida: SuggestedOptionForm;
  seccionSugerida: SuggestedOptionForm;
  catalogGroupsSugeridos: SuggestedOptionForm[];
  etiquetaEspecialSugerida: string;
  usaVariantesSugerido: boolean;
  variantesSugeridas: VariantForm[];
  promptsImagen: {
    promptCatalogo: string;
    promptPublicitario: string;
  };
};

type DraftSuggestedOption = {
  id?: string | null;
  nombre: string;
  slug?: string | null;
  razon?: string;
};

const initialBriefing: BriefingState = {
  productName: "",
  price: "",
  baseDescription: "",
  additionalContext: "",
};

const productLabelOptions = [
  "mas_buscado",
  "mas_vendido",
  "novedad",
  "reciente",
  "promocion",
  "ultimos_dias",
  "ninguna",
];

const inputClasses =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100";

const compactInputClasses =
  "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100";

const labelClasses =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

function getBusinessStateLabel(business: AdminProductCreationBusiness) {
  if (business.archivedAt) return "Archivado";
  if (business.estado !== "activo") return business.estado;
  return business.isTestData ? "Test activo" : "Activo";
}

function getBusinessStateClasses(business: AdminProductCreationBusiness) {
  if (business.archivedAt) return "border-amber-200 bg-amber-50 text-amber-700";
  if (business.estado !== "activo")
    return "border-rose-200 bg-rose-50 text-rose-700";
  if (business.isTestData)
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function cleanStringArray(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const normalized = item.replace(/\s+/g, " ").trim();
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function mapSuggestedOption(option: DraftSuggestedOption): SuggestedOptionForm {
  return {
    id: option.id ?? "",
    nombre: option.nombre ?? "",
    slug: option.slug ?? "",
    razon: option.razon ?? "",
  };
}

function toEditableDraftForm(
  draft: AdminGeneratedProductDraft,
  sourceBriefing: BriefingState,
): EditableDraftFormState {
  return {
    nombre: draft.nombre,
    slugSugerido: draft.slugSugerido,
    precioBase: sourceBriefing.price,
    descripcionCorta: draft.descripcionCorta,
    descripcion: draft.descripcion,
    tags: cleanStringArray(draft.tags),
    componentes: cleanStringArray(draft.componentes),
    categoriaSugerida: mapSuggestedOption(draft.categoriaSugerida),
    seccionSugerida: mapSuggestedOption(draft.seccionSugerida),
    catalogGroupsSugeridos:
      draft.catalogGroupsSugeridos.map(mapSuggestedOption),
    etiquetaEspecialSugerida: draft.etiquetaEspecialSugerida,
    usaVariantesSugerido: draft.usaVariantesSugerido,
    variantesSugeridas: draft.variantesSugeridas.map((variant) => ({
      nombre: variant.nombre,
      skuSugerido: variant.skuSugerido,
      precioSugerido:
        variant.precioSugerido === null || variant.precioSugerido === undefined
          ? ""
          : String(variant.precioSugerido),
      stockIlimitadoSugerido: variant.stockIlimitadoSugerido,
      opciones: variant.opciones.map((option) => ({
        nombre: option.nombre,
        valor: option.valor,
      })),
    })),
    promptsImagen: {
      promptCatalogo: draft.promptsImagen.promptCatalogo,
      promptPublicitario: draft.promptsImagen.promptPublicitario,
    },
  };
}

function parseClientPrice(value: string) {
  const normalized = value
    .trim()
    .replace(/[^\d.,-]/g, "")
    .replace(",", ".");
  return Number(normalized);
}

function formatVariantOptions(options: VariantOptionForm[]) {
  return options
    .map((option) => `${option.nombre}: ${option.valor}`)
    .join("\n");
}

function parseVariantOptions(value: string): VariantOptionForm[] {
  return value
    .split("\n")
    .map((line) => {
      const [name = "", ...rest] = line.split(":");
      return {
        nombre: name.trim(),
        valor: rest.join(":").trim(),
      };
    })
    .filter((option) => option.nombre || option.valor);
}

function validateEditableDraftForm(form: EditableDraftFormState) {
  const errors: string[] = [];
  const price = parseClientPrice(form.precioBase);
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (!form.nombre.trim())
    errors.push("El nombre del producto es obligatorio.");
  if (!form.slugSugerido.trim()) {
    errors.push("El slug sugerido es obligatorio.");
  } else if (!slugPattern.test(form.slugSugerido.trim())) {
    errors.push("El slug debe estar en kebab-case sin acentos ni espacios.");
  }

  if (!form.precioBase.trim()) {
    errors.push("El precio base debe mantenerse visible.");
  } else if (!Number.isFinite(price) || price < 0) {
    errors.push("El precio base debe ser un número válido.");
  }

  if (cleanStringArray(form.tags).length !== form.tags.length) {
    errors.push("Los tags no deben estar vacíos ni duplicados.");
  }

  if (cleanStringArray(form.componentes).length !== form.componentes.length) {
    errors.push("Los componentes no deben estar vacíos ni duplicados.");
  }

  if (form.usaVariantesSugerido) {
    if (form.variantesSugeridas.length === 0) {
      errors.push(
        "Si el producto usa variantes, agrega al menos una variante.",
      );
    }

    form.variantesSugeridas.forEach((variant, variantIndex) => {
      if (!variant.nombre.trim()) {
        errors.push(`La variante ${variantIndex + 1} necesita nombre.`);
      }

      if (variant.precioSugerido.trim()) {
        const variantPrice = parseClientPrice(variant.precioSugerido);
        if (!Number.isFinite(variantPrice) || variantPrice < 0) {
          errors.push(
            `El precio sugerido de la variante ${variantIndex + 1} debe ser válido.`,
          );
        }
      }

      variant.opciones.forEach((option, optionIndex) => {
        const hasName = option.nombre.trim().length > 0;
        const hasValue = option.valor.trim().length > 0;
        if (hasName !== hasValue) {
          errors.push(
            `La opción ${optionIndex + 1} de la variante ${
              variantIndex + 1
            } necesita nombre y valor.`,
          );
        }
      });
    });
  }

  return errors;
}

function formatPriceRange(
  priceRange: AdminProductDraftContextSummary["priceRange"],
) {
  if (
    priceRange.min === null &&
    priceRange.max === null &&
    priceRange.avg === null
  ) {
    return "Sin histórico de precios";
  }

  return `Min ${priceRange.min ?? "N/A"} · Prom ${
    priceRange.avg ?? "N/A"
  } · Max ${priceRange.max ?? "N/A"}`;
}

function InlineChips({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Sin sugerencias.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.28)] ${className}`}
    >
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      {description ? (
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className={inputClasses}
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={inputClasses}
      />
    </div>
  );
}

function ChipEditor({
  label,
  inputId,
  items,
  inputValue,
  emptyLabel,
  setInputValue,
  onAdd,
  onRemove,
}: {
  label: string;
  inputId: string;
  items: string[];
  inputValue: string;
  emptyLabel: string;
  setInputValue: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4">
      <label htmlFor={inputId} className={labelClasses}>
        {label}
      </label>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-full px-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label={`Quitar ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder={`Agregar ${label.toLowerCase()}`}
          className={compactInputClasses}
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}

function SuggestedOptionEditor({
  title,
  option,
  onChange,
}: {
  title: string;
  option: SuggestedOptionForm;
  onChange: (nextOption: SuggestedOptionForm) => void;
}) {
  const update = (patch: Partial<SuggestedOptionForm>) =>
    onChange({ ...option, ...patch });

  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={option.nombre}
          onChange={(event) => update({ nombre: event.target.value })}
          placeholder="Nombre"
          className={compactInputClasses}
        />
        <input
          value={option.slug}
          onChange={(event) => update({ slug: event.target.value })}
          placeholder="slug"
          className={compactInputClasses}
        />
        <input
          value={option.id}
          onChange={(event) => update({ id: event.target.value })}
          placeholder="ID existente opcional"
          className={`${compactInputClasses} sm:col-span-2`}
        />
        <textarea
          value={option.razon}
          onChange={(event) => update({ razon: event.target.value })}
          placeholder="Razón de la sugerencia"
          rows={3}
          className={`${compactInputClasses} sm:col-span-2`}
        />
      </div>
    </div>
  );
}

function CatalogGroupsEditor({
  groups,
  onChange,
}: {
  groups: SuggestedOptionForm[];
  onChange: (groups: SuggestedOptionForm[]) => void;
}) {
  const updateGroup = (index: number, patch: Partial<SuggestedOptionForm>) => {
    onChange(
      groups.map((group, itemIndex) =>
        itemIndex === index ? { ...group, ...patch } : group,
      ),
    );
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            CatalogGroups sugeridos
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Edita o descarta sugerencias sin crear grupos nuevos todavía.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([...groups, { id: "", nombre: "", slug: "", razon: "" }])
          }
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Agregar grupo
        </button>
      </div>

      {groups.length > 0 ? (
        <div className="mt-4 space-y-3">
          {groups.map((group, index) => (
            <div
              key={`${group.id || group.slug || group.nombre}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">
                  Grupo {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      groups.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="text-xs font-semibold text-rose-600 transition hover:text-rose-800"
                >
                  Quitar
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={group.nombre}
                  onChange={(event) =>
                    updateGroup(index, { nombre: event.target.value })
                  }
                  placeholder="Nombre del grupo"
                  className={compactInputClasses}
                />
                <input
                  value={group.slug}
                  onChange={(event) =>
                    updateGroup(index, { slug: event.target.value })
                  }
                  placeholder="slug-del-grupo"
                  className={compactInputClasses}
                />
                <input
                  value={group.id}
                  onChange={(event) =>
                    updateGroup(index, { id: event.target.value })
                  }
                  placeholder="ID existente opcional"
                  className={compactInputClasses}
                />
                <input
                  value={group.razon}
                  onChange={(event) =>
                    updateGroup(index, { razon: event.target.value })
                  }
                  placeholder="Razón"
                  className={compactInputClasses}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Sin grupo sugerido para este borrador.
        </p>
      )}
    </div>
  );
}

function VariantsEditor({
  enabled,
  variants,
  onEnabledChange,
  onChange,
}: {
  enabled: boolean;
  variants: VariantForm[];
  onEnabledChange: (enabled: boolean) => void;
  onChange: (variants: VariantForm[]) => void;
}) {
  const updateVariant = (index: number, patch: Partial<VariantForm>) => {
    onChange(
      variants.map((variant, itemIndex) =>
        itemIndex === index ? { ...variant, ...patch } : variant,
      ),
    );
  };

  return (
    <FormSection
      title="Variantes"
      description="Mantiene la estructura sugerida sin convertir esta fase en un configurador completo."
    >
      <div className="space-y-4">
        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200"
          />
          Usar variantes sugeridas
        </label>

        {enabled ? (
          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div
                key={`${variant.nombre}-${index}`}
                className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Variante {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        variants.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className="text-xs font-semibold text-rose-600 transition hover:text-rose-800"
                  >
                    Quitar
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    value={variant.nombre}
                    onChange={(event) =>
                      updateVariant(index, { nombre: event.target.value })
                    }
                    placeholder="Nombre de variante"
                    className={compactInputClasses}
                  />
                  <input
                    value={variant.skuSugerido}
                    onChange={(event) =>
                      updateVariant(index, { skuSugerido: event.target.value })
                    }
                    placeholder="SKU sugerido"
                    className={compactInputClasses}
                  />
                  <input
                    value={variant.precioSugerido}
                    onChange={(event) =>
                      updateVariant(index, {
                        precioSugerido: event.target.value,
                      })
                    }
                    placeholder="Precio sugerido opcional"
                    inputMode="numeric"
                    className={compactInputClasses}
                  />
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={variant.stockIlimitadoSugerido}
                    onChange={(event) =>
                      updateVariant(index, {
                        stockIlimitadoSugerido: event.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200"
                  />
                  Stock ilimitado sugerido
                </label>
                <div className="mt-3">
                  <label className={labelClasses}>
                    Opciones, una por línea con formato nombre: valor
                  </label>
                  <textarea
                    value={formatVariantOptions(variant.opciones)}
                    onChange={(event) =>
                      updateVariant(index, {
                        opciones: parseVariantOptions(event.target.value),
                      })
                    }
                    rows={3}
                    placeholder="Tamaño: Grande"
                    className={compactInputClasses}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                onChange([
                  ...variants,
                  {
                    nombre: "",
                    skuSugerido: "",
                    precioSugerido: "",
                    stockIlimitadoSugerido: true,
                    opciones: [],
                  },
                ])
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Agregar variante
            </button>
          </div>
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Las variantes quedan desactivadas para este borrador. Puedes
            activarlas si el producto necesita opciones.
          </p>
        )}
      </div>
    </FormSection>
  );
}

function CopyPromptButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
    >
      {copied ? "Prompt copiado" : "Copiar prompt"}
    </button>
  );
}

function ProductImagesAndPublishSection({
  savedProduct,
  imageUrls,
  attachedImageUrls,
  imagesDirty,
  imageUploadError,
  attachImagesError,
  attachImagesValidationErrors,
  publishError,
  publishValidationErrors,
  publishedProduct,
  isUploadingImages,
  isAttachingImages,
  isPublishingProduct,
  onImagesChange,
  onUploadError,
  onUploadLoading,
  onAttachImages,
  onPublishProduct,
}: {
  savedProduct: SavedProductState | null;
  imageUrls: string[];
  attachedImageUrls: string[];
  imagesDirty: boolean;
  imageUploadError: string | null;
  attachImagesError: string | null;
  attachImagesValidationErrors: string[];
  publishError: string | null;
  publishValidationErrors: string[];
  publishedProduct: PublishedProductState | null;
  isUploadingImages: boolean;
  isAttachingImages: boolean;
  isPublishingProduct: boolean;
  onImagesChange: (urls: string[] | string | undefined) => void;
  onUploadError: (message: string) => void;
  onUploadLoading: (isLoading: boolean) => void;
  onAttachImages: () => void;
  onPublishProduct: () => void;
}) {
  if (!savedProduct) {
    return (
      <FormSection
        title="Imágenes del producto"
        description="Primero guarda el producto para obtener un productId estable."
      >
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          El uploader se habilita después de guardar el producto como oculto.
        </div>
      </FormSection>
    );
  }

  const canPublish =
    attachedImageUrls.length > 0 && !imagesDirty && !publishedProduct;

  return (
    <FormSection
      title="Imágenes del producto"
      description="Sube imágenes generadas externamente y guárdalas en el producto antes de publicarlo."
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <p>
            Producto:{" "}
            <span className="font-semibold">{savedProduct.product.nombre}</span>
          </p>
          <p>
            ID: <span className="font-mono">{savedProduct.product.id}</span> ·
            estado actual:{" "}
            <span className="font-semibold">{savedProduct.product.status}</span>
          </p>
        </div>

        <AutoUploadMedia
          key={savedProduct.product.id}
          initialData={attachedImageUrls}
          multiple
          mediaType="image"
          onChange={onImagesChange}
          onError={onUploadError}
          onLoading={onUploadLoading}
        />

        {imageUploadError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {imageUploadError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
          <p>
            Imágenes en uploader: {imageUrls.length} · imágenes guardadas en DB:{" "}
            {attachedImageUrls.length}
          </p>
          {imagesDirty ? (
            <p className="font-medium text-amber-700">
              Hay cambios de imágenes sin asociar al producto.
            </p>
          ) : (
            <p className="font-medium text-emerald-700">
              Las imágenes del uploader están sincronizadas con el producto.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={isUploadingImages || isAttachingImages}
            onClick={onAttachImages}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
          >
            {isAttachingImages ? "Guardando imágenes..." : "Guardar imágenes"}
          </button>
          <button
            type="button"
            disabled={!canPublish || isPublishingProduct}
            onClick={onPublishProduct}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-900 bg-emerald-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 sm:w-auto"
          >
            {isPublishingProduct
              ? "Publicando..."
              : publishedProduct
                ? "Producto publicado"
                : "Publicar producto"}
          </button>
        </div>

        {imagesDirty ? (
          <p className="text-xs leading-5 text-amber-700">
            Guarda los cambios de imágenes antes de publicar.
          </p>
        ) : null}
        {attachedImageUrls.length === 0 ? (
          <p className="text-xs leading-5 text-amber-700">
            El producto necesita al menos una imagen guardada para publicarse.
          </p>
        ) : null}

        {attachImagesError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
            <p className="font-semibold">{attachImagesError}</p>
            {attachImagesValidationErrors.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {attachImagesValidationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {publishError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
            <p className="font-semibold">{publishError}</p>
            {publishValidationErrors.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {publishValidationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {publishedProduct ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            <p className="font-semibold">Producto publicado correctamente.</p>
            <p>
              {publishedProduct.product.nombre} · estado:{" "}
              {publishedProduct.product.status} · imágenes:{" "}
              {publishedProduct.product.imageCount}
            </p>
          </div>
        ) : null}
      </div>
    </FormSection>
  );
}

function EditableProductDraftForm({
  selectedBusiness,
  generatedDraft,
  editableDraft,
  isDraftDirty,
  isEditableDraftReady,
  draftFormErrors,
  tagInput,
  componentInput,
  setTagInput,
  setComponentInput,
  addTag,
  addComponent,
  updateEditableDraft,
  onSaveProduct,
  isSavingProduct,
  saveError,
  saveValidationErrors,
  savedProduct,
  imageUrls,
  attachedImageUrls,
  imagesDirty,
  imageUploadError,
  attachImagesError,
  attachImagesValidationErrors,
  publishError,
  publishValidationErrors,
  publishedProduct,
  isUploadingImages,
  isAttachingImages,
  isPublishingProduct,
  onImagesChange,
  onUploadError,
  onUploadLoading,
  onAttachImages,
  onPublishProduct,
}: {
  selectedBusiness: AdminProductCreationBusiness | null;
  generatedDraft: GeneratedDraftState;
  editableDraft: EditableDraftFormState;
  isDraftDirty: boolean;
  isEditableDraftReady: boolean;
  draftFormErrors: string[];
  tagInput: string;
  componentInput: string;
  setTagInput: (value: string) => void;
  setComponentInput: (value: string) => void;
  addTag: () => void;
  addComponent: () => void;
  updateEditableDraft: (
    updater: (current: EditableDraftFormState) => EditableDraftFormState,
  ) => void;
  onSaveProduct: () => void;
  isSavingProduct: boolean;
  saveError: string | null;
  saveValidationErrors: string[];
  savedProduct: SavedProductState | null;
  imageUrls: string[];
  attachedImageUrls: string[];
  imagesDirty: boolean;
  imageUploadError: string | null;
  attachImagesError: string | null;
  attachImagesValidationErrors: string[];
  publishError: string | null;
  publishValidationErrors: string[];
  publishedProduct: PublishedProductState | null;
  isUploadingImages: boolean;
  isAttachingImages: boolean;
  isPublishingProduct: boolean;
  onImagesChange: (urls: string[] | string | undefined) => void;
  onUploadError: (message: string) => void;
  onUploadLoading: (isLoading: boolean) => void;
  onAttachImages: () => void;
  onPublishProduct: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-800">
        <p className="font-semibold">
          Formulario precargado con {generatedDraft.model}
        </p>
        <p className="mt-1">
          Contexto usado: {generatedDraft.contextSummary.productsAnalyzed}{" "}
          productos analizados ·{" "}
          {formatPriceRange(generatedDraft.contextSummary.priceRange)}
        </p>
        {isDraftDirty ? (
          <p className="mt-1 font-medium">
            Hay ediciones manuales en curso. Regenerar pedirá confirmación antes
            de reemplazarlas.
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Contexto que originó este draft
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-950">Negocio:</span>{" "}
            {selectedBusiness?.nombre ?? "Negocio no disponible"} ·{" "}
            {generatedDraft.businessId}
          </p>
          <p>
            <span className="font-semibold text-slate-950">Precio brief:</span>{" "}
            {generatedDraft.sourceBriefing.price}
          </p>
          <p className="md:col-span-2">
            <span className="font-semibold text-slate-950">Idea:</span>{" "}
            {generatedDraft.sourceBriefing.baseDescription}
          </p>
          {generatedDraft.sourceBriefing.additionalContext ? (
            <p className="md:col-span-2">
              <span className="font-semibold text-slate-950">
                Contexto adicional:
              </span>{" "}
              {generatedDraft.sourceBriefing.additionalContext}
            </p>
          ) : null}
        </div>
      </div>

      <FormSection
        title="Identidad del producto"
        description="Datos mínimos para que la siguiente fase pueda guardar con businessId explícito."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            id="draft-name"
            label="Nombre"
            value={editableDraft.nombre}
            onChange={(nombre) =>
              updateEditableDraft((current) => ({ ...current, nombre }))
            }
          />
          <TextField
            id="draft-slug"
            label="Slug sugerido"
            value={editableDraft.slugSugerido}
            onChange={(slugSugerido) =>
              updateEditableDraft((current) => ({ ...current, slugSugerido }))
            }
            placeholder="producto-en-kebab-case"
          />
          <TextField
            id="draft-price"
            label="Precio base del briefing"
            value={editableDraft.precioBase}
            onChange={(precioBase) =>
              updateEditableDraft((current) => ({ ...current, precioBase }))
            }
            inputMode="numeric"
          />
          <div>
            <label htmlFor="draft-label" className={labelClasses}>
              Etiqueta especial sugerida
            </label>
            <select
              id="draft-label"
              value={editableDraft.etiquetaEspecialSugerida}
              onChange={(event) =>
                updateEditableDraft((current) => ({
                  ...current,
                  etiquetaEspecialSugerida: event.target.value,
                }))
              }
              className={inputClasses}
            >
              {productLabelOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Descripción"
        description="Texto comercial editable, tags y componentes sugeridos."
      >
        <div className="space-y-4">
          <TextAreaField
            id="draft-short-description"
            label="Descripción corta"
            value={editableDraft.descripcionCorta}
            onChange={(descripcionCorta) =>
              updateEditableDraft((current) => ({
                ...current,
                descripcionCorta,
              }))
            }
            rows={3}
          />
          <TextAreaField
            id="draft-description"
            label="Descripción completa"
            value={editableDraft.descripcion}
            onChange={(descripcion) =>
              updateEditableDraft((current) => ({ ...current, descripcion }))
            }
            rows={7}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChipEditor
              label="Tags"
              inputId="draft-tag-input"
              items={editableDraft.tags}
              inputValue={tagInput}
              emptyLabel="Sin tags todavía."
              setInputValue={setTagInput}
              onAdd={addTag}
              onRemove={(index) =>
                updateEditableDraft((current) => ({
                  ...current,
                  tags: current.tags.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                }))
              }
            />
            <ChipEditor
              label="Componentes"
              inputId="draft-component-input"
              items={editableDraft.componentes}
              inputValue={componentInput}
              emptyLabel="Sin componentes todavía."
              setInputValue={setComponentInput}
              onAdd={addComponent}
              onRemove={(index) =>
                updateEditableDraft((current) => ({
                  ...current,
                  componentes: current.componentes.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                }))
              }
            />
          </div>
        </div>
      </FormSection>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <FormSection
          title="Clasificación"
          description="Sugerencias editables para conectar después con categorías, secciones y grupos reales."
          className="h-full"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-1">
              <SuggestedOptionEditor
                title="Categoría sugerida"
                option={editableDraft.categoriaSugerida}
                onChange={(categoriaSugerida) =>
                  updateEditableDraft((current) => ({
                    ...current,
                    categoriaSugerida,
                  }))
                }
              />
              <SuggestedOptionEditor
                title="Sección sugerida"
                option={editableDraft.seccionSugerida}
                onChange={(seccionSugerida) =>
                  updateEditableDraft((current) => ({
                    ...current,
                    seccionSugerida,
                  }))
                }
              />
            </div>
            <CatalogGroupsEditor
              groups={editableDraft.catalogGroupsSugeridos}
              onChange={(catalogGroupsSugeridos) =>
                updateEditableDraft((current) => ({
                  ...current,
                  catalogGroupsSugeridos,
                }))
              }
            />
          </div>
        </FormSection>

        <VariantsEditor
          enabled={editableDraft.usaVariantesSugerido}
          variants={editableDraft.variantesSugeridas}
          onEnabledChange={(usaVariantesSugerido) =>
            updateEditableDraft((current) => ({
              ...current,
              usaVariantesSugerido,
            }))
          }
          onChange={(variantesSugeridas) =>
            updateEditableDraft((current) => ({
              ...current,
              variantesSugeridas,
            }))
          }
        />
      </div>

      <FormSection
        title="Prompts de imagen"
        description="Listos para una fase posterior de generación o carga de media."
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <TextAreaField
              id="draft-image-catalog"
              label="Prompt catálogo"
              value={editableDraft.promptsImagen.promptCatalogo}
              onChange={(promptCatalogo) =>
                updateEditableDraft((current) => ({
                  ...current,
                  promptsImagen: { ...current.promptsImagen, promptCatalogo },
                }))
              }
              rows={7}
            />
            <CopyPromptButton
              value={editableDraft.promptsImagen.promptCatalogo}
            />
          </div>
          <div>
            <TextAreaField
              id="draft-image-editorial"
              label="Prompt publicitario"
              value={editableDraft.promptsImagen.promptPublicitario}
              onChange={(promptPublicitario) =>
                updateEditableDraft((current) => ({
                  ...current,
                  promptsImagen: {
                    ...current.promptsImagen,
                    promptPublicitario,
                  },
                }))
              }
              rows={7}
            />
            <CopyPromptButton
              value={editableDraft.promptsImagen.promptPublicitario}
            />
          </div>
        </div>
      </FormSection>

      <div
        className={`rounded-3xl border px-5 py-4 text-sm leading-6 ${
          isEditableDraftReady
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        <p className="font-semibold">
          {isEditableDraftReady
            ? "Draft listo para la siguiente fase de persistencia."
            : "Revisa estas validaciones antes de persistir en una fase posterior."}
        </p>
        {draftFormErrors.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {draftFormErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1">
            El estado editable ya contiene businessId, precio base y campos
            normalizados para una action de guardado futura.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={
              !isEditableDraftReady || isSavingProduct || Boolean(savedProduct)
            }
            onClick={onSaveProduct}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-900 bg-emerald-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 sm:w-auto"
          >
            {isSavingProduct
              ? "Guardando producto..."
              : savedProduct
                ? "Producto guardado"
                : "Guardar producto"}
          </button>
          <p className="text-xs leading-5 text-slate-600">
            Se guardará como oculto hasta integrar imágenes y revisión final.
          </p>
        </div>

        {saveError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
            <p className="font-semibold">{saveError}</p>
            {saveValidationErrors.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {saveValidationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {savedProduct ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm leading-6 text-emerald-800">
            <p className="font-semibold">
              Producto guardado correctamente como {savedProduct.product.status}
              .
            </p>
            <p className="mt-1">
              {savedProduct.product.nombre} · slug final:{" "}
              <span className="font-mono">{savedProduct.product.slug}</span>
            </p>
            {savedProduct.warnings.length > 0 ? (
              <ul className="mt-2 space-y-1 text-amber-700">
                {savedProduct.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            {isDraftDirty ? (
              <p className="mt-2 text-amber-700">
                Hay cambios posteriores en el formulario. En esta fase no se
                actualiza el producto ya creado; si necesitas editarlo después
                de guardar, lo recomendable es una action de actualización en
                una fase aparte.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <ProductImagesAndPublishSection
          savedProduct={savedProduct}
          imageUrls={imageUrls}
          attachedImageUrls={attachedImageUrls}
          imagesDirty={imagesDirty}
          imageUploadError={imageUploadError}
          attachImagesError={attachImagesError}
          attachImagesValidationErrors={attachImagesValidationErrors}
          publishError={publishError}
          publishValidationErrors={publishValidationErrors}
          publishedProduct={publishedProduct}
          isUploadingImages={isUploadingImages}
          isAttachingImages={isAttachingImages}
          isPublishingProduct={isPublishingProduct}
          onImagesChange={onImagesChange}
          onUploadError={onUploadError}
          onUploadLoading={onUploadLoading}
          onAttachImages={onAttachImages}
          onPublishProduct={onPublishProduct}
        />

        <FormSection title="Señales de contexto usadas" className="h-full">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Categorías
              </p>
              <InlineChips
                items={generatedDraft.contextSummary.categorySignals}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Secciones
              </p>
              <InlineChips
                items={generatedDraft.contextSummary.sectionSignals}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                CatalogGroups
              </p>
              <InlineChips
                items={generatedDraft.contextSummary.catalogGroupSignals}
              />
            </div>
          </div>
        </FormSection>
      </div>
    </div>
  );
}

export default function AssistedProductCreationClient({
  businesses,
  truncated,
}: AssistedProductCreationClientProps) {
  const [search, setSearch] = useState("");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [creationMode, setCreationMode] = useState<"single" | "batch">(
    "single",
  );
  const [briefing, setBriefing] = useState<BriefingState>(initialBriefing);
  const [generatedDraft, setGeneratedDraft] =
    useState<GeneratedDraftState | null>(null);
  const [editableDraft, setEditableDraft] =
    useState<EditableDraftFormState | null>(null);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [componentInput, setComponentInput] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveValidationErrors, setSaveValidationErrors] = useState<string[]>(
    [],
  );
  const [savedProduct, setSavedProduct] = useState<SavedProductState | null>(
    null,
  );
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productImageUrls, setProductImageUrls] = useState<string[]>([]);
  const [attachedImages, setAttachedImages] =
    useState<AttachedImagesState | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [attachImagesError, setAttachImagesError] = useState<string | null>(
    null,
  );
  const [attachImagesValidationErrors, setAttachImagesValidationErrors] =
    useState<string[]>([]);
  const [isAttachingImages, setIsAttachingImages] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishValidationErrors, setPublishValidationErrors] = useState<
    string[]
  >([]);
  const [publishedProduct, setPublishedProduct] =
    useState<PublishedProductState | null>(null);
  const [isPublishingProduct, setIsPublishingProduct] = useState(false);

  const selectedBusiness = useMemo(
    () =>
      businesses.find((business) => business.id === selectedBusinessId) ?? null,
    [businesses, selectedBusinessId],
  );

  const filteredBusinesses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return businesses;

    return businesses.filter((business) =>
      [
        business.nombre,
        business.slug,
        business.id,
        business.descripcion,
        business.estado,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [businesses, search]);

  const canPrepareAiDraft =
    Boolean(selectedBusiness) &&
    briefing.productName.trim().length > 0 &&
    briefing.price.trim().length > 0 &&
    briefing.baseDescription.trim().length > 0;

  const draftFormErrors = useMemo(
    () => (editableDraft ? validateEditableDraftForm(editableDraft) : []),
    [editableDraft],
  );

  const isEditableDraftReady =
    Boolean(editableDraft) && draftFormErrors.length === 0;

  const attachedImageUrls = useMemo(
    () => attachedImages?.imageUrls ?? [],
    [attachedImages],
  );

  const imagesDirty = useMemo(() => {
    if (!savedProduct) return false;
    if (productImageUrls.length !== attachedImageUrls.length) return true;
    return productImageUrls.some(
      (url, index) => url !== attachedImageUrls[index],
    );
  }, [attachedImageUrls, productImageUrls, savedProduct]);

  const updateBriefing = (field: keyof BriefingState, value: string) => {
    setBriefing((current) => ({ ...current, [field]: value }));
  };

  const clearMediaPublicationState = () => {
    setProductImageUrls([]);
    setAttachedImages(null);
    setImageUploadError(null);
    setIsUploadingImages(false);
    setAttachImagesError(null);
    setAttachImagesValidationErrors([]);
    setIsAttachingImages(false);
    setPublishError(null);
    setPublishValidationErrors([]);
    setPublishedProduct(null);
    setIsPublishingProduct(false);
  };

  const clearSaveFeedback = () => {
    setSaveError(null);
    setSaveValidationErrors([]);
  };

  const clearSavedProductState = () => {
    setSavedProduct(null);
    clearMediaPublicationState();
  };

  const clearDraftState = () => {
    setGeneratedDraft(null);
    setEditableDraft(null);
    setIsDraftDirty(false);
    setTagInput("");
    setComponentInput("");
    clearSaveFeedback();
    clearSavedProductState();
  };

  const updateEditableDraft = (
    updater: (current: EditableDraftFormState) => EditableDraftFormState,
  ) => {
    setEditableDraft((current) => (current ? updater(current) : current));
    setIsDraftDirty(true);
    clearSaveFeedback();
  };

  const handleCreationModeChange = (mode: "single" | "batch") => {
    if (mode === creationMode) return;

    if (
      mode === "batch" &&
      editableDraft &&
      isDraftDirty &&
      !window.confirm(
        "Hay ediciones manuales en el producto individual. Cambiar a batch las mantendrá en memoria, pero podrías perder foco del flujo actual. ¿Quieres continuar?",
      )
    ) {
      return;
    }

    setCreationMode(mode);
  };

  const handleSelectBusiness = (businessId: string) => {
    if (businessId === selectedBusinessId) return;

    if (
      editableDraft &&
      isDraftDirty &&
      !window.confirm(
        "Ya hiciste ediciones manuales en el borrador. Cambiar de negocio descartará esos cambios. ¿Quieres continuar?",
      )
    ) {
      return;
    }

    setSelectedBusinessId(businessId);
    setGenerationError(null);
    setValidationErrors([]);
    clearDraftState();
  };

  const addTag = () => {
    const normalized = tagInput.trim();
    if (!normalized) return;

    updateEditableDraft((current) => ({
      ...current,
      tags: cleanStringArray([...current.tags, normalized]),
    }));
    setTagInput("");
  };

  const addComponent = () => {
    const normalized = componentInput.trim();
    if (!normalized) return;

    updateEditableDraft((current) => ({
      ...current,
      componentes: cleanStringArray([...current.componentes, normalized]),
    }));
    setComponentInput("");
  };

  const handleProductImagesChange = useCallback(
    (urls: string[] | string | undefined) => {
      setProductImageUrls(Array.isArray(urls) ? urls : urls ? [urls] : []);
      setAttachImagesError(null);
      setAttachImagesValidationErrors([]);
      setPublishError(null);
      setPublishValidationErrors([]);
      setPublishedProduct(null);
    },
    [],
  );

  const handleProductImageUploadError = useCallback((message: string) => {
    setImageUploadError(message);
  }, []);

  const handleProductImageUploadLoading = useCallback((isLoading: boolean) => {
    setIsUploadingImages(isLoading);
    if (isLoading) setImageUploadError(null);
  }, []);

  const handleGenerateDraft = async () => {
    if (!selectedBusiness || !canPrepareAiDraft) return;

    if (
      editableDraft &&
      isDraftDirty &&
      !window.confirm(
        "Ya hiciste ediciones manuales. Regenerar reemplazará el formulario actual por un nuevo draft IA. ¿Quieres continuar?",
      )
    ) {
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setValidationErrors([]);
    clearDraftState();

    try {
      const result = await generateAdminProductDraftAction({
        businessId: selectedBusiness.id,
        productName: briefing.productName,
        price: briefing.price,
        baseDescription: briefing.baseDescription,
        additionalContext: briefing.additionalContext,
      });

      if (!result.ok || !result.data) {
        setGenerationError(
          result.error || "No fue posible generar el borrador del producto.",
        );
        setValidationErrors(result.validationErrors ?? []);
        return;
      }

      const sourceBriefing = { ...briefing };
      setGeneratedDraft({
        ...result.data,
        businessId: selectedBusiness.id,
        sourceBriefing,
      });
      setEditableDraft(toEditableDraftForm(result.data.draft, sourceBriefing));
      setIsDraftDirty(false);
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al generar el borrador.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!selectedBusiness || !editableDraft) return;

    if (savedProduct) return;

    if (draftFormErrors.length > 0) {
      setSaveError("Corrige las validaciones del formulario antes de guardar.");
      setSaveValidationErrors(draftFormErrors);
      setSavedProduct(null);
      return;
    }

    setIsSavingProduct(true);
    setSaveError(null);
    setSaveValidationErrors([]);
    setSavedProduct(null);

    try {
      const result = await createAdminProductForBusinessAction({
        businessId: selectedBusiness.id,
        draft: editableDraft,
      });

      if (!result.ok || !result.data) {
        setSaveError(result.error || "No fue posible guardar el producto.");
        setSaveValidationErrors(result.validationErrors ?? []);
        return;
      }

      setSavedProduct(result.data);
      clearMediaPublicationState();
      setIsDraftDirty(false);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al guardar el producto.",
      );
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleAttachImages = async () => {
    if (!selectedBusiness || !savedProduct) return;

    setIsAttachingImages(true);
    setAttachImagesError(null);
    setAttachImagesValidationErrors([]);
    setPublishError(null);
    setPublishValidationErrors([]);
    setPublishedProduct(null);

    try {
      const result = await attachAdminProductImagesAction({
        businessId: selectedBusiness.id,
        productId: savedProduct.product.id,
        imageUrls: productImageUrls,
      });

      if (!result.ok || !result.data) {
        setAttachImagesError(
          result.error || "No fue posible guardar las imágenes.",
        );
        setAttachImagesValidationErrors(result.validationErrors ?? []);
        return;
      }

      setAttachedImages(result.data);
      setProductImageUrls(result.data.imageUrls);
    } catch (error) {
      setAttachImagesError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al guardar las imágenes.",
      );
    } finally {
      setIsAttachingImages(false);
    }
  };

  const handlePublishProduct = async () => {
    if (!selectedBusiness || !savedProduct) return;

    if (imagesDirty) {
      setPublishError("Guarda los cambios de imágenes antes de publicar.");
      return;
    }

    setIsPublishingProduct(true);
    setPublishError(null);
    setPublishValidationErrors([]);

    try {
      const result = await publishAdminProductAction({
        businessId: selectedBusiness.id,
        productId: savedProduct.product.id,
      });

      if (!result.ok || !result.data) {
        setPublishError(result.error || "No fue posible publicar el producto.");
        setPublishValidationErrors(result.validationErrors ?? []);
        return;
      }

      const publishedData = result.data;

      setPublishedProduct(publishedData);
      setSavedProduct((current) =>
        current
          ? {
              ...current,
              product: {
                ...current.product,
                status: publishedData.product.status,
              },
            }
          : current,
      );
    } catch (error) {
      setPublishError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al publicar el producto.",
      );
    } finally {
      setIsPublishingProduct(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.38)]">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fafc_54%,#eef6ff_100%)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                Centro de control
              </span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Negocio, modo y contexto
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                La selección de negocio queda fija arriba para que el resto del
                flujo pueda trabajar con todo el ancho disponible.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[460px]">
              <div className="rounded-3xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Selección
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                  {selectedBusiness?.nombre ?? "Pendiente"}
                </p>
              </div>
              <div className="rounded-3xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Modo
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {creationMode === "single" ? "Individual" : "Batch"}
                </p>
              </div>
              <div className="col-span-2 rounded-3xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm backdrop-blur sm:col-span-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Resultados
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {filteredBusinesses.length} visibles
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 border-t border-slate-100 px-5 py-5 sm:px-6 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.35fr)_minmax(260px,0.75fr)]">
          <div className="space-y-4">
            <div>
              <label htmlFor="business-search" className={labelClasses}>
                Buscar negocio
              </label>
              <input
                id="business-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, slug, estado o id"
                className={inputClasses}
              />
              {truncated ? (
                <p className="mt-2 text-xs leading-5 text-amber-700">
                  Lista limitada en servidor. Usa búsqueda específica si no ves
                  el negocio esperado.
                </p>
              ) : null}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Negocio activo
              </p>
              {selectedBusiness ? (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">
                      {selectedBusiness.nombre}
                    </p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${getBusinessStateClasses(
                        selectedBusiness,
                      )}`}
                    >
                      {getBusinessStateLabel(selectedBusiness)}
                    </span>
                  </div>
                  <p className="break-all text-xs leading-5 text-slate-500">
                    {selectedBusiness.slug || "sin-slug"} ·{" "}
                    {selectedBusiness.id}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Selecciona un negocio para habilitar generación, guardado e
                  imágenes.
                </p>
              )}
            </div>
          </div>

          <div className="min-h-[220px] rounded-[28px] border border-slate-200 bg-slate-50/80 p-3">
            <div className="max-h-[310px] space-y-2 overflow-y-auto pr-1">
              {filteredBusinesses.length === 0 ? (
                <div className="flex min-h-[180px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      No encontramos negocios con esa búsqueda.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Prueba con nombre, slug o id del negocio.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                  {filteredBusinesses.map((business) => {
                    const isSelected = business.id === selectedBusinessId;

                    return (
                      <button
                        key={business.id}
                        type="button"
                        onClick={() => handleSelectBusiness(business.id)}
                        className={`min-h-[132px] rounded-3xl border px-4 py-3 text-left transition ${
                          isSelected
                            ? "border-sky-300 bg-white shadow-[0_18px_34px_-26px_rgba(2,132,199,0.55)] ring-4 ring-sky-100"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {business.nombre}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {business.slug || "sin-slug"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${getBusinessStateClasses(
                              business,
                            )}`}
                          >
                            {getBusinessStateLabel(business)}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                          {business.descripcion || business.id}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-3 text-white shadow-[0_18px_44px_-30px_rgba(15,23,42,0.75)]">
            <p className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
              Modo de creación
            </p>
            <div className="mt-3 space-y-3">
              <button
                type="button"
                onClick={() => handleCreationModeChange("single")}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  creationMode === "single"
                    ? "border-sky-300 bg-sky-400 text-slate-950"
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Crear un producto
                <span
                  className={`mt-1 block text-xs font-normal ${
                    creationMode === "single"
                      ? "text-slate-800"
                      : "text-slate-300"
                  }`}
                >
                  Flujo completo con imágenes y publicación.
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleCreationModeChange("batch")}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  creationMode === "batch"
                    ? "border-cyan-300 bg-cyan-300 text-slate-950"
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Crear varios productos
                <span
                  className={`mt-1 block text-xs font-normal ${
                    creationMode === "batch"
                      ? "text-slate-800"
                      : "text-slate-300"
                  }`}
                >
                  Desde carta/lista. Guarda aceptados como ocultos.
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {creationMode === "batch" ? (
        <AdminProductBatchCreationPanel
          key={selectedBusiness?.id ?? "no-business"}
          selectedBusiness={selectedBusiness}
        />
      ) : (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.3)]">
            <div className="border-b border-slate-100 px-6 py-5">
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                Paso 2
              </span>
              <h2 className="mt-3 text-lg font-semibold text-slate-950">
                Briefing para OpenAI
              </h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
                Captura la intención del producto. Este bloque queda compacto y
                el formulario editable aparecerá debajo aprovechando el ancho.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 px-6 py-5 xl:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Preparación
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {selectedBusiness
                    ? `El draft se generará para ${selectedBusiness.nombre}.`
                    : "Selecciona un negocio arriba para activar este paso."}
                </p>
                <button
                  type="button"
                  disabled={!canPrepareAiDraft || isGenerating}
                  onClick={handleGenerateDraft}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  title="Genera un borrador con OpenAI sin guardar en base de datos."
                >
                  {isGenerating
                    ? "Generando borrador..."
                    : "Generar producto con IA"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField
                  id="product-name"
                  label="Nombre del producto"
                  value={briefing.productName}
                  onChange={(value) => updateBriefing("productName", value)}
                  placeholder="Ej: Caja desayuno premium"
                />
                <TextField
                  id="product-price"
                  label="Precio"
                  value={briefing.price}
                  onChange={(value) => updateBriefing("price", value)}
                  placeholder="Ej: 75000"
                  inputMode="numeric"
                />
                <div className="md:col-span-2">
                  <TextAreaField
                    id="base-description"
                    label="Descripción base o idea"
                    value={briefing.baseDescription}
                    onChange={(value) =>
                      updateBriefing("baseDescription", value)
                    }
                    placeholder="Describe qué quieres vender, para quién es y qué debe incluir."
                    rows={4}
                  />
                </div>
                <div className="md:col-span-2">
                  <TextAreaField
                    id="additional-context"
                    label="Contexto adicional"
                    value={briefing.additionalContext}
                    onChange={(value) =>
                      updateBriefing("additionalContext", value)
                    }
                    placeholder="Tono, ocasión, restricciones, estilo visual, diferenciales o público objetivo."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.3)]">
            <div className="border-b border-slate-100 px-6 py-5">
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Paso 3
              </span>
              <h2 className="mt-3 text-lg font-semibold text-slate-950">
                Borrador, imágenes y publicación
              </h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
                El formulario se despliega en bloques amplios para edición,
                guardado oculto, carga de imágenes y publicación final.
              </p>
            </div>

            <div className="space-y-5 px-6 py-5">
              {generationError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-700">
                  <p className="font-semibold">{generationError}</p>
                  {validationErrors.length > 0 ? (
                    <ul className="mt-3 space-y-1">
                      {validationErrors.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {generatedDraft && editableDraft ? (
                <EditableProductDraftForm
                  selectedBusiness={selectedBusiness}
                  generatedDraft={generatedDraft}
                  editableDraft={editableDraft}
                  isDraftDirty={isDraftDirty}
                  isEditableDraftReady={isEditableDraftReady}
                  draftFormErrors={draftFormErrors}
                  tagInput={tagInput}
                  componentInput={componentInput}
                  setTagInput={setTagInput}
                  setComponentInput={setComponentInput}
                  addTag={addTag}
                  addComponent={addComponent}
                  updateEditableDraft={updateEditableDraft}
                  onSaveProduct={handleSaveProduct}
                  isSavingProduct={isSavingProduct}
                  saveError={saveError}
                  saveValidationErrors={saveValidationErrors}
                  savedProduct={savedProduct}
                  imageUrls={productImageUrls}
                  attachedImageUrls={attachedImageUrls}
                  imagesDirty={imagesDirty}
                  imageUploadError={imageUploadError}
                  attachImagesError={attachImagesError}
                  attachImagesValidationErrors={attachImagesValidationErrors}
                  publishError={publishError}
                  publishValidationErrors={publishValidationErrors}
                  publishedProduct={publishedProduct}
                  isUploadingImages={isUploadingImages}
                  isAttachingImages={isAttachingImages}
                  isPublishingProduct={isPublishingProduct}
                  onImagesChange={handleProductImagesChange}
                  onUploadError={handleProductImageUploadError}
                  onUploadLoading={handleProductImageUploadLoading}
                  onAttachImages={handleAttachImages}
                  onPublishProduct={handlePublishProduct}
                />
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                  <p className="text-sm font-medium text-slate-800">
                    Aún no hay borrador generado.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Completa el briefing y genera un draft para editarlo aquí.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
