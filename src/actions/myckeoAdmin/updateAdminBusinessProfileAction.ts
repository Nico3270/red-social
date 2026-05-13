"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { EstadoNegocio, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

type NullableString = string | null | undefined;
type NullableNumber = number | string | null | undefined;

export type UpdateAdminBusinessProfileData = {
  nombre?: NullableString;
  nombreNegocio?: NullableString;
  slug?: NullableString;
  slugNegocio?: NullableString;
  descripcion?: NullableString;
  descripcionNegocio?: NullableString;
  ciudad?: NullableString;
  ciudadNegocio?: NullableString;
  departamento?: NullableString;
  departamentoNegocio?: NullableString;
  direccion?: NullableString;
  direccionNegocio?: NullableString;
  telefonoNegocio?: NullableString;
  telefonoContacto?: NullableString;
  fotoPerfil?: NullableString;
  imagenPerfil?: NullableString;
  fotoPortada?: NullableString;
  imagenPortada?: NullableString;
  sitioWeb?: NullableString;
  urlGoogleMaps?: NullableString;
  latitud?: NullableNumber;
  latitudNegocio?: NullableNumber;
  longitud?: NullableNumber;
  longitudNegocio?: NullableNumber;
  estado?: NullableString;
  estadoNegocio?: NullableString;
  categorias?: string[];
  categoriaIds?: string[];
  secciones?: string[];
  seccionesIds?: string[];
  redesSociales?: {
    instagram?: NullableString;
    facebook?: NullableString;
    twitter?: NullableString;
    tiktok?: NullableString;
    youtube?: NullableString;
    whatsapp?: NullableString;
  };
  instagram?: NullableString;
  facebook?: NullableString;
  twitter?: NullableString;
  tiktok?: NullableString;
  youtube?: NullableString;
};

export type UpdateAdminBusinessProfileActionInput = {
  businessId: string;
  expectedSlug: string;
  data: UpdateAdminBusinessProfileData;
};

export type UpdateAdminBusinessProfileActionResult =
  | {
      ok: true;
      businessId: string;
      businessSlug: string;
      message: string;
      ignoredFields: string[];
    }
  | {
      ok: false;
      error: string;
    };

type ValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: string;
    };

const LOG_PREFIX = "[updateAdminBusinessProfileAction]";
const ALLOWED_ESTADOS = new Set<string>(Object.values(EstadoNegocio));

function buildTraceId() {
  return `update-admin-business-profile-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeRequiredString(value: unknown, fieldLabel: string) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    return {
      ok: false,
      error: `${fieldLabel} es obligatorio.`,
    } satisfies ValidationResult<string>;
  }

  return {
    ok: true,
    value: normalized,
  } satisfies ValidationResult<string>;
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = typeof value === "string" ? value.trim() : String(value).trim();
  return normalized || null;
}

function normalizeStringArray(value: unknown, fieldLabel: string) {
  if (value === undefined) return { ok: true, value: undefined } as const;

  if (!Array.isArray(value)) {
    return {
      ok: false,
      error: `${fieldLabel} debe ser una lista.`,
    } satisfies ValidationResult<string[] | undefined>;
  }

  const normalized = Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

  if (normalized.length === 0) {
    return {
      ok: false,
      error: `${fieldLabel} debe tener al menos un elemento válido.`,
    } satisfies ValidationResult<string[] | undefined>;
  }

  return {
    ok: true,
    value: normalized,
  } satisfies ValidationResult<string[] | undefined>;
}

function normalizeCoordinate(
  value: NullableNumber,
  fieldLabel: string,
  min: number,
  max: number
) {
  if (value === undefined) return { ok: true, value: undefined } as const;
  if (value === null || value === "") return { ok: true, value: null } as const;

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return {
      ok: false,
      error: `${fieldLabel} no es válida.`,
    } satisfies ValidationResult<number | null | undefined>;
  }

  return {
    ok: true,
    value: parsed,
  } satisfies ValidationResult<number | null | undefined>;
}

function normalizeColombianPhone(value: unknown) {
  if (value === undefined) return { ok: true, value: undefined } as const;
  if (value === null) return { ok: true, value: null } as const;

  const rawValue = typeof value === "string" ? value.trim() : String(value).trim();
  if (!rawValue) return { ok: true, value: null } as const;

  const digitsOnly = rawValue.replace(/\D/g, "");
  const normalized =
    digitsOnly.length === 10
      ? `+57${digitsOnly}`
      : digitsOnly.length === 12 && digitsOnly.startsWith("57")
        ? `+${digitsOnly}`
        : "";

  if (!/^\+57\d{10}$/.test(normalized)) {
    return {
      ok: false,
      error: "El teléfono debe tener exactamente 10 dígitos de Colombia.",
    } satisfies ValidationResult<string | null | undefined>;
  }

  return {
    ok: true,
    value: normalized,
  } satisfies ValidationResult<string | null | undefined>;
}

function normalizeUrl(value: unknown, fieldLabel: string) {
  const normalized = normalizeOptionalString(value);
  if (normalized === undefined || normalized === null) {
    return { ok: true, value: normalized } as const;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized) && !/^https?:\/\//i.test(normalized)) {
    return {
      ok: false,
      error: `${fieldLabel} debe usar http o https.`,
    } satisfies ValidationResult<string | null | undefined>;
  }

  const candidate = /^https?:\/\//i.test(normalized)
    ? normalized
    : `https://${normalized}`;

  try {
    const parsed = new URL(candidate);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        ok: false,
        error: `${fieldLabel} debe usar http o https.`,
      } satisfies ValidationResult<string | null | undefined>;
    }

    return {
      ok: true,
      value: parsed.toString(),
    } satisfies ValidationResult<string | null | undefined>;
  } catch {
    return {
      ok: false,
      error: `${fieldLabel} no es una URL válida.`,
    } satisfies ValidationResult<string | null | undefined>;
  }
}

function normalizeGoogleMapsUrl(value: unknown) {
  const result = normalizeUrl(value, "La URL de Google Maps");
  if (!result.ok || result.value === undefined || result.value === null) {
    return result;
  }

  const parsed = new URL(result.value);
  const isGoogleMapsHost =
    parsed.hostname === "maps.app.goo.gl" ||
    parsed.hostname.endsWith(".google.com") ||
    parsed.hostname === "google.com";

  if (!isGoogleMapsHost) {
    return {
      ok: false,
      error: "La URL de Google Maps debe pertenecer a Google Maps.",
    } satisfies ValidationResult<string | null | undefined>;
  }

  return result;
}

function normalizeImageUrl(value: unknown, fieldLabel: string) {
  const normalized = normalizeOptionalString(value);
  if (normalized === undefined || normalized === null) return normalized;

  if (normalized.startsWith("/") && !normalized.startsWith("//")) {
    return {
      ok: true,
      value: normalized,
    } satisfies ValidationResult<string | null | undefined>;
  }

  try {
    const parsed = new URL(normalized);

    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname
    ) {
      return {
        ok: true,
        value: parsed.toString(),
      } satisfies ValidationResult<string | null | undefined>;
    }
  } catch {
    // El error controlado se devuelve abajo para mantener un mensaje estable.
  }

  return {
    ok: false,
    error: `${fieldLabel} debe ser una URL válida o una ruta local.`,
  } satisfies ValidationResult<string | null | undefined>;
}

function normalizeSocialUrl(
  value: unknown,
  fieldLabel: string,
  pattern: RegExp
) {
  const normalized = normalizeOptionalString(value);
  if (normalized === undefined || normalized === null) {
    return { ok: true, value: normalized } as const;
  }

  if (!pattern.test(normalized)) {
    return {
      ok: false,
      error: `${fieldLabel} no tiene un formato válido.`,
    } satisfies ValidationResult<string | null | undefined>;
  }

  return {
    ok: true,
    value: normalized,
  } satisfies ValidationResult<string | null | undefined>;
}

function pickFirstDefined<T>(...values: T[]) {
  return values.find((value) => value !== undefined);
}

function hasOwnValue<T extends object>(source: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function applyValue<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined
) {
  if (value !== undefined) {
    target[key] = value;
  }
}

function buildGoogleMapsUrl(latitud: number | null, longitud: number | null) {
  if (latitud === null || longitud === null) return null;
  return `https://www.google.com/maps?q=${latitud},${longitud}`;
}

function revalidateAdminBusinessProfileSurfaces(slug: string) {
  revalidatePath("/myckeoAdmin/negocios");
  revalidatePath(`/myckeoAdmin/editar/${slug}`);
  revalidatePath(`/perfil/${slug}`);
}

export async function updateAdminBusinessProfileAction(
  input: UpdateAdminBusinessProfileActionInput
): Promise<UpdateAdminBusinessProfileActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();
  const businessId = normalizeOptionalString(input?.businessId) ?? "";
  const expectedSlug = normalizeOptionalString(input?.expectedSlug) ?? "";
  const ignoredFields: string[] = [];

  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.warn(`${LOG_PREFIX}[${traceId}] Sesión no válida`);
      return {
        ok: false,
        error: "No autorizado.",
      };
    }

    if (session.user.role !== "super_admin") {
      console.warn(`${LOG_PREFIX}[${traceId}] Acceso denegado por rol`, {
        actorUserId: session.user.id,
        role: session.user.role,
      });

      return {
        ok: false,
        error: "No tienes permisos para actualizar este negocio.",
      };
    }

    const controlledError = (error: string, reason: string) => {
      console.warn(`${LOG_PREFIX}[${traceId}] Error controlado`, {
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
        reason,
      });

      return {
        ok: false,
        error,
      } satisfies UpdateAdminBusinessProfileActionResult;
    };

    if (!businessId || !expectedSlug) {
      console.warn(`${LOG_PREFIX}[${traceId}] Identificadores inválidos`, {
        actorUserId: session.user.id,
        hasBusinessId: Boolean(businessId),
        hasExpectedSlug: Boolean(expectedSlug),
      });

      return {
        ok: false,
        error: "El identificador del negocio y el slug esperado son obligatorios.",
      };
    }

    if (!input?.data || typeof input.data !== "object" || Array.isArray(input.data)) {
      console.warn(`${LOG_PREFIX}[${traceId}] Payload inválido`, {
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
      });

      return {
        ok: false,
        error: "Los datos del negocio son obligatorios.",
      };
    }

    console.info(`${LOG_PREFIX}[${traceId}] Inicio`, {
      actorUserId: session.user.id,
      businessId,
      expectedSlug,
    });

    const existingBusiness = await prisma.negocio.findUnique({
      where: {
        id: businessId,
      },
      select: {
        id: true,
        slug: true,
        usuarioId: true,
        latitud: true,
        longitud: true,
      },
    });

    if (!existingBusiness) {
      console.warn(`${LOG_PREFIX}[${traceId}] Negocio no encontrado`, {
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
      });

      return {
        ok: false,
        error: "El negocio no existe o ya no está disponible.",
      };
    }

    if (existingBusiness.slug !== expectedSlug) {
      console.warn(`${LOG_PREFIX}[${traceId}] Slug esperado no coincide`, {
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
        currentSlug: existingBusiness.slug,
      });

      return {
        ok: false,
        error:
          "El negocio cambió de slug desde que se cargó la vista. Recarga la página antes de guardar.",
      };
    }

    const data = input.data;
    const requestedSlug = normalizeOptionalString(
      pickFirstDefined(data.slug, data.slugNegocio)
    );

    if (requestedSlug && requestedSlug !== expectedSlug) {
      ignoredFields.push("slug");
      console.info(`${LOG_PREFIX}[${traceId}] Cambio de slug ignorado`, {
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
      });
    }

    const nombre = normalizeRequiredString(
      pickFirstDefined(data.nombre, data.nombreNegocio),
      "El nombre del negocio"
    );

    if (!nombre.ok) {
      console.warn(`${LOG_PREFIX}[${traceId}] Validación fallida`, {
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
        reason: "nombre",
      });

      return {
        ok: false,
        error: nombre.error,
      };
    }

    const ciudad = normalizeOptionalString(
      pickFirstDefined(data.ciudad, data.ciudadNegocio)
    );
    if (ciudad === null) {
      return controlledError("La ciudad del negocio es obligatoria.", "ciudad");
    }

    const departamento = normalizeOptionalString(
      pickFirstDefined(data.departamento, data.departamentoNegocio)
    );
    if (departamento === null) {
      return controlledError(
        "El departamento del negocio es obligatorio.",
        "departamento"
      );
    }

    const telefono = normalizeColombianPhone(
      pickFirstDefined(data.telefonoContacto, data.telefonoNegocio)
    );
    if (!telefono.ok) return controlledError(telefono.error, "telefono");

    const latitud = normalizeCoordinate(
      pickFirstDefined(data.latitud, data.latitudNegocio),
      "La latitud",
      -90,
      90
    );
    if (!latitud.ok) return controlledError(latitud.error, "latitud");

    const longitud = normalizeCoordinate(
      pickFirstDefined(data.longitud, data.longitudNegocio),
      "La longitud",
      -180,
      180
    );
    if (!longitud.ok) return controlledError(longitud.error, "longitud");

    const sitioWeb = normalizeUrl(data.sitioWeb, "El sitio web");
    if (!sitioWeb.ok) return controlledError(sitioWeb.error, "sitioWeb");

    const urlGoogleMaps = normalizeGoogleMapsUrl(data.urlGoogleMaps);
    if (!urlGoogleMaps.ok) {
      return controlledError(urlGoogleMaps.error, "urlGoogleMaps");
    }

    const fotoPerfil = normalizeImageUrl(
      pickFirstDefined(data.fotoPerfil, data.imagenPerfil),
      "La foto de perfil"
    );
    if (typeof fotoPerfil === "object" && fotoPerfil && !fotoPerfil.ok) {
      return controlledError(fotoPerfil.error, "fotoPerfil");
    }

    const fotoPortada = normalizeImageUrl(
      pickFirstDefined(data.fotoPortada, data.imagenPortada),
      "La foto de portada"
    );
    if (typeof fotoPortada === "object" && fotoPortada && !fotoPortada.ok) {
      return controlledError(fotoPortada.error, "fotoPortada");
    }

    const estado = normalizeOptionalString(
      pickFirstDefined(data.estado, data.estadoNegocio)
    );
    if (estado !== undefined && estado !== null && !ALLOWED_ESTADOS.has(estado)) {
      return controlledError("El estado del negocio no es válido.", "estado");
    }

    const categoriaIds = normalizeStringArray(
      pickFirstDefined(data.categorias, data.categoriaIds),
      "Las categorías"
    );
    if (!categoriaIds.ok) {
      return controlledError(categoriaIds.error, "categorias");
    }

    const seccionIds = normalizeStringArray(
      pickFirstDefined(data.secciones, data.seccionesIds),
      "Las secciones"
    );
    if (!seccionIds.ok) return controlledError(seccionIds.error, "secciones");

    if (categoriaIds.value) {
      const categoriasExistentes = await prisma.category.count({
        where: {
          id: {
            in: categoriaIds.value,
          },
        },
      });

      if (categoriasExistentes !== categoriaIds.value.length) {
        console.warn(`${LOG_PREFIX}[${traceId}] Categorías inválidas`, {
          actorUserId: session.user.id,
          businessId,
          expectedSlug,
          receivedCount: categoriaIds.value.length,
          validCount: categoriasExistentes,
        });

        return {
          ok: false,
          error: "Una o más categorías proporcionadas no existen.",
        };
      }
    }

    if (seccionIds.value) {
      const seccionesExistentes = await prisma.section.count({
        where: {
          id: {
            in: seccionIds.value,
          },
        },
      });

      if (seccionesExistentes !== seccionIds.value.length) {
        console.warn(`${LOG_PREFIX}[${traceId}] Secciones inválidas`, {
          actorUserId: session.user.id,
          businessId,
          expectedSlug,
          receivedCount: seccionIds.value.length,
          validCount: seccionesExistentes,
        });

        return {
          ok: false,
          error: "Una o más secciones proporcionadas no existen.",
        };
      }
    }

    const finalLatitud =
      latitud.value !== undefined ? latitud.value : existingBusiness.latitud;
    const finalLongitud =
      longitud.value !== undefined ? longitud.value : existingBusiness.longitud;

    const negocioData: Prisma.NegocioUpdateInput = {
      nombre: nombre.value,
    };

    applyValue(
      negocioData,
      "descripcion",
      normalizeOptionalString(
        pickFirstDefined(data.descripcion, data.descripcionNegocio)
      )
    );
    applyValue(negocioData, "ciudad", ciudad ?? undefined);
    applyValue(negocioData, "departamento", departamento ?? undefined);
    applyValue(
      negocioData,
      "direccion",
      normalizeOptionalString(pickFirstDefined(data.direccion, data.direccionNegocio))
    );
    applyValue(negocioData, "telefonoContacto", telefono.value);
    applyValue(
      negocioData,
      "fotoPerfil",
      fotoPerfil && typeof fotoPerfil === "object" ? fotoPerfil.value : fotoPerfil
    );
    applyValue(
      negocioData,
      "fotoPortada",
      fotoPortada && typeof fotoPortada === "object" ? fotoPortada.value : fotoPortada
    );
    applyValue(negocioData, "sitioWeb", sitioWeb.value);
    applyValue(negocioData, "latitud", latitud.value);
    applyValue(negocioData, "longitud", longitud.value);

    if (estado !== undefined && estado !== null) {
      negocioData.estado = estado as EstadoNegocio;
    }

    if (urlGoogleMaps.value !== undefined) {
      negocioData.urlGoogleMaps = urlGoogleMaps.value;
    } else if (latitud.value !== undefined || longitud.value !== undefined) {
      negocioData.urlGoogleMaps = buildGoogleMapsUrl(finalLatitud, finalLongitud);
    }

    if (categoriaIds.value) {
      negocioData.categorias = {
        deleteMany: {},
        create: categoriaIds.value.map((categoryId) => ({
          categoryId,
        })),
      };
    }

    if (seccionIds.value) {
      negocioData.secciones = {
        deleteMany: {},
        create: seccionIds.value.map((sectionId) => ({
          sectionId,
          prioridad: 0,
        })),
      };
    }

    const redesSociales = data.redesSociales ?? {};
    const usuarioData: Prisma.UsuarioUpdateInput = {};

    const facebook = normalizeSocialUrl(
      pickFirstDefined(data.facebook, redesSociales.facebook),
      "Facebook",
      /^https:\/\/(www\.)?facebook\.com\/.+/
    );
    if (!facebook.ok) return controlledError(facebook.error, "facebook");

    const instagram = normalizeSocialUrl(
      pickFirstDefined(data.instagram, redesSociales.instagram),
      "Instagram",
      /^https:\/\/(www\.)?instagram\.com\/.+/
    );
    if (!instagram.ok) return controlledError(instagram.error, "instagram");

    const twitter = normalizeSocialUrl(
      pickFirstDefined(data.twitter, redesSociales.twitter),
      "Twitter",
      /^https:\/\/(www\.)?twitter\.com\/.+/
    );
    if (!twitter.ok) return controlledError(twitter.error, "twitter");

    const tiktok = normalizeSocialUrl(
      pickFirstDefined(data.tiktok, redesSociales.tiktok),
      "TikTok",
      /^https:\/\/(www\.)?tiktok\.com\/.+/
    );
    if (!tiktok.ok) return controlledError(tiktok.error, "tiktok");

    const youtube = normalizeSocialUrl(
      pickFirstDefined(data.youtube, redesSociales.youtube),
      "YouTube",
      /^https:\/\/(www\.)?youtube\.com\/.+/
    );
    if (!youtube.ok) return controlledError(youtube.error, "youtube");

    applyValue(usuarioData, "facebook", facebook.value);
    applyValue(usuarioData, "instagram", instagram.value);
    applyValue(usuarioData, "twitter", twitter.value);
    applyValue(usuarioData, "tiktok", tiktok.value);
    applyValue(usuarioData, "youtube", youtube.value);

    if (hasOwnValue(redesSociales, "whatsapp")) {
      ignoredFields.push("redesSociales.whatsapp");
      console.info(`${LOG_PREFIX}[${traceId}] Campo whatsapp ignorado`, {
        actorUserId: session.user.id,
        businessId,
        expectedSlug,
      });
    }

    const shouldUpdateOwner = Object.keys(usuarioData).length > 0;

    console.info(`${LOG_PREFIX}[${traceId}] Validaciones OK`, {
      actorUserId: session.user.id,
      businessId,
      expectedSlug,
      updatesOwner: shouldUpdateOwner,
      updatesCategories: Boolean(categoriaIds.value),
      updatesSections: Boolean(seccionIds.value),
    });

    const updatedBusiness = await prisma.$transaction(async (tx) => {
      const negocioActualizado = await tx.negocio.update({
        where: {
          id: businessId,
        },
        data: negocioData,
        select: {
          id: true,
          slug: true,
          updatedAt: true,
        },
      });

      if (shouldUpdateOwner) {
        await tx.usuario.update({
          where: {
            id: existingBusiness.usuarioId,
          },
          data: usuarioData,
        });
      }

      return negocioActualizado;
    });

    revalidateAdminBusinessProfileSurfaces(updatedBusiness.slug);

    console.info(`${LOG_PREFIX}[${traceId}] Update OK`, {
      actorUserId: session.user.id,
      businessId: updatedBusiness.id,
      businessSlug: updatedBusiness.slug,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      businessId: updatedBusiness.id,
      businessSlug: updatedBusiness.slug,
      message: "Perfil del negocio actualizado correctamente.",
      ignoredFields,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      error,
      businessId,
      expectedSlug,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: false,
      error: "No fue posible actualizar el perfil del negocio.",
    };
  }
}
