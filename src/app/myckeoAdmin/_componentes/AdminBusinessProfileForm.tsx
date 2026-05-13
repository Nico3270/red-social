"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  updateAdminBusinessProfileAction,
  type UpdateAdminBusinessProfileData,
} from "@/actions/myckeoAdmin/updateAdminBusinessProfileAction";
import type {
  AdminBusinessProfile,
  AdminBusinessProfileOptions,
} from "@/actions/myckeoAdmin/getAdminBusinessProfileBySlugAction";
import AutoUploadMedia from "@/ui/components/autoUpload/AutoUploadMedia";
import colombia from "@/config/colombia.json";

type AdminBusinessProfileFormProps = {
  business: AdminBusinessProfile;
  options: AdminBusinessProfileOptions;
};

type FeedbackState =
  | {
      type: "success" | "error";
      message: string;
      ignoredFields?: string[];
    }
  | null;

type FormState = {
  nombre: string;
  descripcion: string;
  ciudad: string;
  departamento: string;
  direccion: string;
  telefonoContacto: string;
  fotoPerfil: string;
  fotoPortada: string;
  sitioWeb: string;
  urlGoogleMaps: string;
  latitud: string;
  longitud: string;
  estado: string;
  categoriaIds: string[];
  seccionIds: string[];
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  youtube: string;
};

type MediaUploadState = {
  fotoPerfil: boolean;
  fotoPortada: boolean;
};

type MediaUploadResetKeys = {
  fotoPerfil: number;
  fotoPortada: number;
};

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
  required?: boolean;
  help?: string;
  multiline?: boolean;
};

type StatusToastProps = {
  isSaving: boolean;
  isUploadingMedia: boolean;
  feedback: FeedbackState;
  publicProfileHref: string;
};

const estadoOptions = [
  { value: "activo", label: "Activo" },
  { value: "suspendido", label: "Suspendido" },
  { value: "eliminado", label: "Eliminado" },
];

const inputClasses =
  "mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500";

const labelClasses =
  "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

function normalizeOptionalValue(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function uniqueList(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isPreviewableImageSource(value: string) {
  const source = value.trim();

  if (source.startsWith("/") && !source.startsWith("//")) return true;

  try {
    const parsed = new URL(source);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function getFriendlyUploadError(message: string) {
  const cleanedMessage = message
    .replace(/^Error al subir archivo a Cloudinary:\s*/i, "")
    .trim();

  if (/api key|upload_preset|preset|cloudinary|signature|unsigned|undefined/i.test(cleanedMessage)) {
    return "No fue posible subir la imagen a Cloudinary. Revisa la configuración de Cloudinary o intenta de nuevo.";
  }

  return cleanedMessage
    ? `No fue posible subir la imagen. ${cleanedMessage}`
    : "No fue posible subir la imagen. Intenta nuevamente.";
}

function getBusinessInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getInitialFormState(business: AdminBusinessProfile): FormState {
  return {
    nombre: business.nombre,
    descripcion: business.descripcion ?? "",
    ciudad: business.ciudad,
    departamento: business.departamento,
    direccion: business.direccion ?? "",
    telefonoContacto: business.telefonoContacto ?? "",
    fotoPerfil: business.fotoPerfil ?? "",
    fotoPortada: business.fotoPortada ?? "",
    sitioWeb: business.sitioWeb ?? "",
    urlGoogleMaps: business.urlGoogleMaps ?? "",
    latitud: business.latitud?.toString() ?? "",
    longitud: business.longitud?.toString() ?? "",
    estado: business.estado,
    categoriaIds: business.categorias.map((item) => item.categoryId),
    seccionIds: business.secciones.map((item) => item.sectionId),
    facebook: business.owner.facebook ?? "",
    instagram: business.owner.instagram ?? "",
    twitter: business.owner.twitter ?? "",
    tiktok: business.owner.tiktok ?? "",
    youtube: business.owner.youtube ?? "",
  };
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  required = false,
  help,
  multiline = false,
}: TextFieldProps) {
  return (
    <label className="block">
      <span className={labelClasses}>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          rows={5}
          className={`${inputClasses} py-3`}
        />
      ) : (
        <input
          type={type}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className={inputClasses}
        />
      )}
      {help ? <span className="mt-1 block text-xs text-slate-500">{help}</span> : null}
    </label>
  );
}

function LoadingSpinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

function StatusToast({
  isSaving,
  isUploadingMedia,
  feedback,
  publicProfileHref,
}: StatusToastProps) {
  if (isSaving || isUploadingMedia) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed right-4 top-4 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)]"
      >
        <span className="text-sky-600">
          <LoadingSpinner />
        </span>
        <span>
          {isUploadingMedia ? "Subiendo imágenes..." : "Guardando cambios..."}
        </span>
      </div>
    );
  }

  if (!feedback) return null;

  const isSuccess = feedback.type === "success";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      className={`fixed right-4 top-4 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] ${
        isSuccess
          ? "border-emerald-200 bg-white text-emerald-800"
          : "border-rose-200 bg-white text-rose-800"
      }`}
    >
      <p>{feedback.message}</p>
      {isSuccess ? (
        <Link
          href={publicProfileHref}
          target="_blank"
          className="mt-2 inline-flex text-xs font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-900"
        >
          Ver perfil público
        </Link>
      ) : null}
    </div>
  );
}

function ImagePreviewSurface({
  label,
  value,
  variant,
  fallbackText,
}: {
  label: string;
  value: string;
  variant: "cover" | "avatar";
  fallbackText: string;
}) {
  const canPreview = isPreviewableImageSource(value);
  const roundedClass = variant === "avatar" ? "rounded-[28px]" : "rounded-[30px]";
  const imageClass = variant === "avatar" ? "object-cover" : "object-cover";

  return (
    <div
      className={`relative h-full w-full overflow-hidden border border-white/70 bg-slate-100 shadow-inner ${roundedClass}`}
    >
      {canPreview ? (
        <Image
          src={value.trim()}
          alt={label}
          fill
          sizes={variant === "avatar" ? "160px" : "(max-width: 1024px) 100vw, 900px"}
          className={imageClass}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,#e0f2fe,#f8fafc_52%,#e2e8f0)] px-4 text-center ${
            variant === "avatar"
              ? "text-3xl font-semibold text-slate-700"
              : "text-sm font-medium text-slate-500"
          }`}
        >
          {value.trim() ? "URL no previsualizable" : fallbackText}
        </div>
      )}
    </div>
  );
}

function ImageUploadCard({
  title,
  description,
  uploaderKey,
  value,
  onUrlChange,
  onUploadChange,
  onUploadError,
  onLoading,
  isUploading,
}: {
  title: string;
  description: string;
  uploaderKey: number;
  value: string;
  onUrlChange: (value: string) => void;
  onUploadChange: (urls: string[] | string | undefined) => void;
  onUploadError: (message: string) => void;
  onLoading: (isLoading: boolean) => void;
  isUploading: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_42px_-32px_rgba(15,23,42,0.24)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
          </div>
          {isUploading ? (
            <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
              Subiendo
            </span>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-3 py-4">
          <AutoUploadMedia
            key={uploaderKey}
            multiple={false}
            mediaType="image"
            onChange={onUploadChange}
            onError={onUploadError}
            onLoading={onLoading}
          />
        </div>

        <details className="group mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 marker:hidden">
            URL manual avanzada
            <span className="ml-2 text-xs font-normal text-slate-500">
              {value.trim() ? "configurada" : "vacía"}
            </span>
          </summary>
          <label className="mt-3 block">
            <span className={labelClasses}>URL que se guardará</span>
            <input
              type="text"
              value={value}
              onChange={(event) => onUrlChange(event.target.value)}
              placeholder="https://res.cloudinary.com/... o /ruta-local.jpg"
              className={inputClasses}
            />
            <span className="mt-1 block text-xs text-slate-500">
              Si este campo queda vacío, se guardará como null al presionar Guardar cambios.
            </span>
          </label>
        </details>
      </div>
    </section>
  );
}

function BusinessMediaHero({
  businessName,
  slug,
  city,
  department,
  fotoPerfil,
  fotoPortada,
}: {
  businessName: string;
  slug: string;
  city: string;
  department: string;
  fotoPerfil: string;
  fotoPortada: string;
}) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_54px_-36px_rgba(15,23,42,0.36)]">
      <div className="relative h-[260px] bg-slate-100 sm:h-[320px]">
        <ImagePreviewSurface
          label="Foto de portada"
          value={fotoPortada}
          variant="cover"
          fallbackText="Sin foto de portada"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.68))]" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:p-7">
          <div className="h-28 w-28 shrink-0 rounded-[32px] border-4 border-white bg-white shadow-[0_18px_34px_-18px_rgba(15,23,42,0.55)] sm:h-32 sm:w-32">
            <ImagePreviewSurface
              label="Foto de perfil"
              value={fotoPerfil}
              variant="avatar"
              fallbackText={getBusinessInitials(businessName) || "M"}
            />
          </div>

          <div className="min-w-0 pb-1 text-white">
            <span className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur">
              Editando como super-admin
            </span>
            <h2 className="mt-3 max-w-3xl truncate text-2xl font-semibold tracking-tight sm:text-4xl">
              {businessName}
            </h2>
            <p className="mt-2 text-sm font-medium text-white/88">
              /{slug} · {city}, {department}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AdminBusinessProfileForm({
  business,
  options,
}: AdminBusinessProfileFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => getInitialFormState(business));
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mediaUploading, setMediaUploading] = useState<MediaUploadState>({
    fotoPerfil: false,
    fotoPortada: false,
  });
  const [mediaUploadResetKeys, setMediaUploadResetKeys] =
    useState<MediaUploadResetKeys>({
      fotoPerfil: 0,
      fotoPortada: 0,
  });
  const isSubmittingRef = useRef(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUploadingMedia = mediaUploading.fotoPerfil || mediaUploading.fotoPortada;
  const saveButtonLabel = isUploadingMedia
    ? "Subiendo imágenes..."
    : isSaving
      ? "Guardando..."
      : "Guardar cambios";
  const publicProfileHref = `/perfil/${encodeURIComponent(business.slug)}`;

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const departments = useMemo(() => {
    const baseDepartments = colombia.map((department) => department.departamento);
    return uniqueList([...baseDepartments, business.departamento]);
  }, [business.departamento]);

  const cities = useMemo(() => {
    const selectedDepartment = colombia.find(
      (department) => department.departamento === form.departamento
    );
    return uniqueList([...(selectedDepartment?.ciudades ?? []), business.ciudad]);
  }, [business.ciudad, form.departamento]);

  const selectedCategoryIds = useMemo(
    () => new Set(form.categoriaIds),
    [form.categoriaIds]
  );

  const visibleSections = useMemo(() => {
    if (form.categoriaIds.length === 0) return options.sections;

    return options.sections.filter(
      (section) =>
        !section.categoryId ||
        selectedCategoryIds.has(section.categoryId) ||
        form.seccionIds.includes(section.id)
    );
  }, [form.categoriaIds.length, form.seccionIds, options.sections, selectedCategoryIds]);

  const handleProfileUploadError = useCallback((message: string) => {
    setMediaUploading((current) => ({
      ...current,
      fotoPerfil: false,
    }));
    setFeedback({
      type: "error",
      message: getFriendlyUploadError(message),
    });
  }, []);

  const handleCoverUploadError = useCallback((message: string) => {
    setMediaUploading((current) => ({
      ...current,
      fotoPortada: false,
    }));
    setFeedback({
      type: "error",
      message: getFriendlyUploadError(message),
    });
  }, []);

  const handleProfileUploadLoading = useCallback((isLoading: boolean) => {
    setMediaUploading((current) =>
      current.fotoPerfil === isLoading
        ? current
        : {
            ...current,
            fotoPerfil: isLoading,
          }
    );
  }, []);

  const handleCoverUploadLoading = useCallback((isLoading: boolean) => {
    setMediaUploading((current) =>
      current.fotoPortada === isLoading
        ? current
        : {
            ...current,
            fotoPortada: isLoading,
          }
    );
  }, []);

  const handleProfileUploadChange = useCallback(
    (urls: string[] | string | undefined) => {
      const nextUrl = Array.isArray(urls) ? urls[0]?.trim() ?? "" : urls?.trim() ?? "";
      if (!nextUrl) return;

      setForm((current) =>
        current.fotoPerfil === nextUrl
          ? current
          : {
              ...current,
              fotoPerfil: nextUrl,
            }
      );
      setMediaUploadResetKeys((current) => ({
        ...current,
        fotoPerfil: current.fotoPerfil + 1,
      }));
    },
    []
  );

  const handleCoverUploadChange = useCallback(
    (urls: string[] | string | undefined) => {
      const nextUrl = Array.isArray(urls) ? urls[0]?.trim() ?? "" : urls?.trim() ?? "";
      if (!nextUrl) return;

      setForm((current) =>
        current.fotoPortada === nextUrl
          ? current
          : {
              ...current,
              fotoPortada: nextUrl,
            }
      );
      setMediaUploadResetKeys((current) => ({
        ...current,
        fotoPortada: current.fotoPortada + 1,
      }));
    },
    []
  );

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) =>
      current[key] === value
        ? current
        : {
            ...current,
            [key]: value,
          }
    );
  };

  const toggleCategory = (categoryId: string) => {
    setForm((current) => {
      const nextCategoryIds = current.categoriaIds.includes(categoryId)
        ? current.categoriaIds.filter((id) => id !== categoryId)
        : [...current.categoriaIds, categoryId];

      const nextCategorySet = new Set(nextCategoryIds);
      const nextSectionIds = current.seccionIds.filter((sectionId) => {
        const section = options.sections.find((item) => item.id === sectionId);
        return !section?.categoryId || nextCategorySet.has(section.categoryId);
      });

      return {
        ...current,
        categoriaIds: nextCategoryIds,
        seccionIds: nextSectionIds,
      };
    });
  };

  const toggleSection = (sectionId: string) => {
    setForm((current) => ({
      ...current,
      seccionIds: current.seccionIds.includes(sectionId)
        ? current.seccionIds.filter((id) => id !== sectionId)
        : [...current.seccionIds, sectionId],
    }));
  };

  const validateBeforeSubmit = () => {
    if (!form.nombre.trim()) return "El nombre del negocio es obligatorio.";
    if (!form.ciudad.trim()) return "La ciudad del negocio es obligatoria.";
    if (!form.departamento.trim()) return "El departamento del negocio es obligatorio.";
    if (form.categoriaIds.length === 0) return "Selecciona al menos una categoría.";
    if (form.seccionIds.length === 0) return "Selecciona al menos una sección.";
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmittingRef.current) return;

    setFeedback(null);

    const validationError = validateBeforeSubmit();
    if (validationError) {
      setFeedback({
        type: "error",
        message: validationError,
      });
      return;
    }

    if (isUploadingMedia) {
      setFeedback({
        type: "error",
        message: "Espera a que termine la subida de imágenes antes de guardar.",
      });
      return;
    }

    const payload: UpdateAdminBusinessProfileData = {
      nombre: form.nombre,
      slug: business.slug,
      descripcion: normalizeOptionalValue(form.descripcion),
      ciudad: form.ciudad,
      departamento: form.departamento,
      direccion: normalizeOptionalValue(form.direccion),
      telefonoContacto: normalizeOptionalValue(form.telefonoContacto),
      fotoPerfil: normalizeOptionalValue(form.fotoPerfil),
      fotoPortada: normalizeOptionalValue(form.fotoPortada),
      sitioWeb: normalizeOptionalValue(form.sitioWeb),
      urlGoogleMaps: normalizeOptionalValue(form.urlGoogleMaps),
      latitud: normalizeOptionalValue(form.latitud),
      longitud: normalizeOptionalValue(form.longitud),
      estado: form.estado,
      categorias: form.categoriaIds,
      secciones: form.seccionIds,
      redesSociales: {
        facebook: normalizeOptionalValue(form.facebook),
        instagram: normalizeOptionalValue(form.instagram),
        twitter: normalizeOptionalValue(form.twitter),
        tiktok: normalizeOptionalValue(form.tiktok),
        youtube: normalizeOptionalValue(form.youtube),
      },
    };

    isSubmittingRef.current = true;
    setIsSaving(true);

    try {
      const result = await updateAdminBusinessProfileAction({
        businessId: business.id,
        expectedSlug: business.slug,
        data: payload,
      });

      if (!result.ok) {
        setFeedback({
          type: "error",
          message: result.error,
        });
        return;
      }

      setFeedback({
        type: "success",
        message: result.message,
        ignoredFields: result.ignoredFields,
      });

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 1200);
    } catch {
      setFeedback({
        type: "error",
        message: "Ocurrió un error inesperado al guardar el negocio.",
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <StatusToast
        isSaving={isSaving}
        isUploadingMedia={isUploadingMedia}
        feedback={feedback}
        publicProfileHref={publicProfileHref}
      />

      <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.3)]">
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.96))] px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                Editando como super-admin
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                {form.nombre || business.nombre}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Ajusta la identidad visual y la información principal del negocio. La subida de imágenes solo prepara la URL; Prisma se actualiza al guardar.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/myckeoAdmin/negocios"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Volver a negocios
              </Link>
              <button
                type="submit"
                disabled={isSaving || isUploadingMedia}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving || isUploadingMedia ? <LoadingSpinner /> : null}
                {saveButtonLabel}
              </button>
            </div>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mx-6 mt-5 rounded-2xl border px-4 py-3 text-sm font-medium ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {feedback.message}
                {feedback.type === "success" && feedback.ignoredFields?.length ? (
                  <span className="mt-1 block text-xs">
                    Campos ignorados: {feedback.ignoredFields.join(", ")}
                  </span>
                ) : null}
              </div>
              {feedback.type === "success" ? (
                <Link
                  href={publicProfileHref}
                  target="_blank"
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  Ver perfil público
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="px-6 pt-6">
          <BusinessMediaHero
            businessName={form.nombre || business.nombre}
            slug={business.slug}
            city={form.ciudad || business.ciudad}
            department={form.departamento || business.departamento}
            fotoPerfil={form.fotoPerfil}
            fotoPortada={form.fotoPortada}
          />
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Nombre"
                value={form.nombre}
                onChange={(value) => updateField("nombre", value)}
                required
              />

              <label className="block">
                <span className={labelClasses}>Slug</span>
                <input
                  value={business.slug}
                  readOnly
                  className={inputClasses}
                />
                <span className="mt-1 block text-xs text-slate-500">
                  El cambio de slug se manejará en una fase separada para evitar romper enlaces públicos.
                </span>
              </label>
            </div>

            <TextField
              label="Descripción"
              value={form.descripcion}
              onChange={(value) => updateField("descripcion", value)}
              placeholder="Describe el negocio"
              multiline
            />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className={labelClasses}>Departamento</span>
                <select
                  value={form.departamento}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      departamento: event.target.value,
                      ciudad: "",
                    }))
                  }
                  className={inputClasses}
                  required
                >
                  <option value="">Selecciona un departamento</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={labelClasses}>Ciudad</span>
                <select
                  value={form.ciudad}
                  onChange={(event) => updateField("ciudad", event.target.value)}
                  className={inputClasses}
                  required
                >
                  <option value="">Selecciona una ciudad</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Dirección"
                value={form.direccion}
                onChange={(value) => updateField("direccion", value)}
                placeholder="Dirección del negocio"
              />
              <TextField
                label="Teléfono contacto"
                value={form.telefonoContacto}
                onChange={(value) => updateField("telefonoContacto", value)}
                placeholder="+573123456789"
                help="Acepta +57 o 10 dígitos colombianos."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Sitio web"
                value={form.sitioWeb}
                onChange={(value) => updateField("sitioWeb", value)}
                placeholder="https://www.ejemplo.com"
              />
              <TextField
                label="URL Google Maps"
                value={form.urlGoogleMaps}
                onChange={(value) => updateField("urlGoogleMaps", value)}
                placeholder="https://www.google.com/maps/..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <TextField
                label="Latitud"
                value={form.latitud}
                onChange={(value) => updateField("latitud", value)}
                type="number"
                step="any"
              />
              <TextField
                label="Longitud"
                value={form.longitud}
                onChange={(value) => updateField("longitud", value)}
                type="number"
                step="any"
              />
              <label className="block">
                <span className={labelClasses}>Estado</span>
                <select
                  value={form.estado}
                  onChange={(event) => updateField("estado", event.target.value)}
                  className={inputClasses}
                >
                  {estadoOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <aside className="space-y-5">
            <ImageUploadCard
              title="Imagen de perfil"
              description="Sube una imagen cuadrada o pega una URL. Se guardará como fotoPerfil solo al confirmar cambios."
              uploaderKey={mediaUploadResetKeys.fotoPerfil}
              value={form.fotoPerfil}
              onUrlChange={(value) => updateField("fotoPerfil", value)}
              onUploadChange={handleProfileUploadChange}
              onUploadError={handleProfileUploadError}
              onLoading={handleProfileUploadLoading}
              isUploading={mediaUploading.fotoPerfil}
            />

            <ImageUploadCard
              title="Imagen de portada"
              description="Sube una portada horizontal. La imagen anterior no se elimina automáticamente en esta fase."
              uploaderKey={mediaUploadResetKeys.fotoPortada}
              value={form.fotoPortada}
              onUrlChange={(value) => updateField("fotoPortada", value)}
              onUploadChange={handleCoverUploadChange}
              onUploadError={handleCoverUploadError}
              onLoading={handleCoverUploadLoading}
              isUploading={mediaUploading.fotoPortada}
            />
          </aside>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.24)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="text-base font-semibold text-slate-950">Categorías</h3>
            <p className="mt-1 text-sm text-slate-600">
              Selecciona las categorías actuales del negocio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 px-6 py-5">
            {options.categories.map((category) => {
              const selected = form.categoriaIds.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  aria-pressed={selected}
                  className={`inline-flex items-center rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                    selected
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  {category.nombre}
                  {!category.isActive ? (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        selected
                          ? "bg-white/15 text-white"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      inactiva
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.24)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="text-base font-semibold text-slate-950">Secciones</h3>
            <p className="mt-1 text-sm text-slate-600">
              Las secciones se filtran por las categorías seleccionadas.
            </p>
          </div>
          <div className="grid grid-cols-1 items-stretch gap-2 px-6 py-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleSections.length > 0 ? (
              visibleSections.map((section) => {
                const selected = form.seccionIds.includes(section.id);
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    aria-pressed={selected}
                    className={`h-full min-h-20 rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-sky-300 bg-sky-50 text-sky-900"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <span className="block text-sm font-semibold">
                      {section.nombre}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {section.category?.nombre || "Sin categoría padre"}
                      {!section.isActive ? " · inactiva" : ""}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">
                Selecciona una categoría para ver secciones disponibles.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.24)]">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="text-base font-semibold text-slate-950">Redes sociales del dueño</h3>
          <p className="mt-1 text-sm text-slate-600">
            Estos campos viven en el usuario propietario asociado al negocio.
          </p>
        </div>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <TextField
            label="Facebook"
            value={form.facebook}
            onChange={(value) => updateField("facebook", value)}
            placeholder="https://www.facebook.com/tu-negocio"
          />
          <TextField
            label="Instagram"
            value={form.instagram}
            onChange={(value) => updateField("instagram", value)}
            placeholder="https://www.instagram.com/tu-negocio"
          />
          <TextField
            label="Twitter"
            value={form.twitter}
            onChange={(value) => updateField("twitter", value)}
            placeholder="https://www.twitter.com/tu-negocio"
          />
          <TextField
            label="TikTok"
            value={form.tiktok}
            onChange={(value) => updateField("tiktok", value)}
            placeholder="https://www.tiktok.com/@tu-negocio"
          />
          <TextField
            label="YouTube"
            value={form.youtube}
            onChange={(value) => updateField("youtube", value)}
            placeholder="https://www.youtube.com/c/tu-negocio"
          />
        </div>
      </section>

      <div className="sticky bottom-4 z-10 rounded-[28px] border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.42)] backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Los cambios se guardan con permisos super-admin y se mantienen en esta misma ruta.
          </p>
          <button
            type="submit"
            disabled={isSaving || isUploadingMedia}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving || isUploadingMedia ? <LoadingSpinner /> : null}
            {saveButtonLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
