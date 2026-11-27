"use server";

import { createHmac, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/business/productAccess";
import {
  assistedBusinessInput,
  normalizeBusinessName,
  demoSnapshotSchema,
} from "@/lib/onboarding/contracts";
import { DEMO_TTL_MS, demoTokenHash } from "@/lib/onboarding/demo-security";
import { POST as provision } from "@/app/api/internal/onboarding/provision/route";
import { POST as createBusiness } from "@/app/api/negocio/route";
import { issueAccountClaim } from "@/lib/auth/account-claim";
import { revalidateAdminProductSurfaces } from "./revalidateAdminProductSurfaces";
import { reportOperationalError } from "@/lib/observability/operationalLogger";

class AssistedCreationFailure extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus?: number,
    readonly serviceCode?: string,
    readonly publicMessage?: string,
  ) {
    super(code);
  }
}

function creationValidationMessage(error: z.ZodError) {
  const field = error.issues[0]?.path[0];
  if (field === "telefonoContacto")
    return "El teléfono comercial debe usar +57 seguido de 10 dígitos, o quedar vacío.";
  if (field === "ciudad" || field === "departamento")
    return "Selecciona una ciudad válida para el departamento indicado.";
  if (field === "categoriaIds") return "Selecciona una categoría válida.";
  if (field === "seccionIds")
    return "Selecciona una sección válida para la categoría.";
  if (field === "nombre")
    return "El nombre comercial debe tener entre 2 y 160 caracteres.";
  if (field === "descripcion")
    return "La descripción debe tener máximo 3000 caracteres.";
  if (field === "operationId")
    return "No se pudo validar la referencia de operación. Recarga el formulario.";
  return "Revisa nombre, ciudad, teléfono, categoría y sección.";
}

function businessValidationMessage(message: unknown) {
  if (message === "Una o más categorías no existen.")
    return "La categoría seleccionada ya no está disponible. Recarga el formulario.";
  if (message === "Una o más secciones no existen.")
    return "La sección seleccionada ya no está disponible. Recarga el formulario.";
  if (message === "Selecciona categorías y secciones activas compatibles.")
    return "Selecciona una categoría activa y una sección compatible.";
  return undefined;
}

function internalRequest(body: unknown) {
  const key = process.env.MYCKEO_ADMIN_KEY;
  if (!key) throw new Error("La incorporación no está configurada.");
  return new Request("http://internal.myckeo/onboarding", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify(body),
  });
}
function baseUrl() {
  const configured = process.env.SITE_URL;
  if (!configured || configured !== configured.trim())
    throw new Error("Origen no configurado.");
  const url = new URL(configured);
  if (
    url.username ||
    url.password ||
    !["http:", "https:"].includes(url.protocol) ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  )
    throw new Error("Origen no configurado.");
  return url.origin;
}
const businessIdSchema = z.string().uuid();
async function assistedBusiness(id: string) {
  const business = await prisma.negocio.findUnique({
    where: { id: businessIdSchema.parse(id) },
    include: {
      usuario: {
        select: {
          id: true,
          isPlaceholder: true,
          perfilCompleto: true,
          estado: true,
          placeholderProvisioningKeyHash: true,
        },
      },
    },
  });
  if (
    !business ||
    !business.usuario.placeholderProvisioningKeyHash ||
    business.archivedAt ||
    business.estado === "eliminado"
  )
    throw new Error("Negocio provisional no disponible.");
  return business;
}

export async function createAssistedBusinessAction(raw: unknown) {
  let stage = "authorize";
  try {
    await requireSuperAdmin();
    stage = "validate";
    const input = assistedBusinessInput.parse(raw);
    stage = "configure";
    const ref = `assisted-v1:${input.operationId}`;
    const secret = process.env.ACCOUNT_PROVISIONING_HMAC_SECRET;
    if (!secret)
      throw new AssistedCreationFailure("PROVISIONING_SECRET_MISSING");
    if (secret.length < 32 || secret !== secret.trim())
      throw new AssistedCreationFailure("PROVISIONING_SECRET_INVALID");
    if (!process.env.MYCKEO_ADMIN_KEY)
      throw new AssistedCreationFailure("ADMIN_KEY_MISSING");
    const hash = createHmac("sha256", secret).update(ref).digest("hex");
    stage = "deduplicate";
    return await prisma.$transaction(
      async (guard) => {
        // Different operation references for the same normalized name/city or
        // phone must perform duplicate review serially. Retry keeps its reference.
        const keys = [
          `assisted:operation:${input.operationId}`,
          `assisted:name:${normalizeBusinessName(input.nombre)}:${normalizeBusinessName(input.ciudad)}`,
          ...(input.telefonoContacto
            ? [`assisted:phone:${input.telefonoContacto}`]
            : []),
        ].sort();
        for (const key of keys)
          await guard.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
        const previous = await prisma.usuario.findUnique({
          where: { placeholderProvisioningKeyHash: hash },
          select: {
            negocio: {
              select: { id: true, slug: true, estado: true, archivedAt: true },
            },
          },
        });
        if (previous?.negocio) {
          if (
            previous.negocio.archivedAt ||
            previous.negocio.estado === "eliminado"
          )
            return {
              ok: false as const,
              error:
                "La referencia pertenece a un negocio archivado o eliminado. Requiere revisión administrativa.",
            };
          return {
            ok: true as const,
            business: { id: previous.negocio.id, slug: previous.negocio.slug },
          };
        }
        const candidates = await prisma.negocio.findMany({
          where: {
            OR: [
              { ciudad: { equals: input.ciudad, mode: "insensitive" } },
              ...(input.telefonoContacto
                ? [{ telefonoContacto: input.telefonoContacto }]
                : []),
            ],
          },
          select: {
            id: true,
            nombre: true,
            ciudad: true,
            telefonoContacto: true,
            slug: true,
          },
        });
        const duplicates = candidates.filter(
          (b) =>
            normalizeBusinessName(b.nombre) ===
              normalizeBusinessName(input.nombre) ||
            Boolean(
              input.telefonoContacto &&
                input.telefonoContacto === b.telefonoContacto,
            ),
        );
        if (duplicates.some((b) => !input.reviewedDuplicateIds.includes(b.id)))
          return {
            ok: false as const,
            error:
              "Revisa las posibles coincidencias antes de crear otro negocio.",
            duplicates,
          };
        stage = "provision";
        const userResponse = await provision(
          internalRequest({
            provisioningRef: ref,
            nombreNegocio: input.nombre,
            ciudadCompleta: `${input.ciudad} - ${input.departamento}`,
          }),
        );
        const user = await userResponse.json();
        if (
          !userResponse.ok ||
          typeof user.usuarioId !== "string" ||
          !user.usuarioId
        )
          throw new AssistedCreationFailure(
            "PROVISION_FAILED",
            userResponse.status,
            [
              "UNAUTHORIZED",
              "INTERNAL_ERROR",
              "INVALID_REQUEST",
              "PROVISIONING_UNAVAILABLE",
            ].includes(user.code)
              ? user.code
              : "UNEXPECTED_RESPONSE",
          );
        stage = "create_business";
        const response = await createBusiness(
          internalRequest({
            usuarioId: user.usuarioId,
            nombre: input.nombre,
            descripcion:
              input.descripcion || "Perfil en preparación por Myckeo.",
            ciudad: input.ciudad,
            departamento: input.departamento,
            telefonoContacto: input.telefonoContacto,
            categoriaIds: input.categoriaIds,
            seccionIds: input.seccionIds,
            prepararOculto: true,
          }) as Parameters<typeof createBusiness>[0],
        );
        const result = await response.json();
        if (!response.ok || !result.ok)
          throw new AssistedCreationFailure(
            "BUSINESS_CREATE_FAILED",
            response.status,
            undefined,
            businessValidationMessage(result.message),
          );
        if (
          typeof result.negocioId !== "string" ||
          !result.negocioId ||
          typeof result.slug !== "string" ||
          !result.slug
        )
          throw new AssistedCreationFailure(
            "BUSINESS_RESPONSE_INVALID",
            response.status,
          );
        stage = "revalidate";
        revalidatePath("/myckeoAdmin/incorporacion");
        return {
          ok: true as const,
          business: {
            id: result.negocioId as string,
            slug: result.slug as string,
          },
        };
      },
      { timeout: 30000, maxWait: 10000 },
    );
  } catch (error) {
    // Never serialize the original error, input, operation reference, identity,
    // URL, provider body or Prisma meta: these can contain personal data/secrets.
    try {
      reportOperationalError({
        area: "assisted-onboarding",
        event: "creation_failed",
        message: "No se pudo completar la preparación del negocio.",
        context: {
          stage,
          code:
            error instanceof AssistedCreationFailure
              ? error.code
              : error instanceof z.ZodError
                ? "INPUT_INVALID"
                : stage === "authorize"
                  ? "AUTHORIZATION_FAILED"
                  : "INTERNAL_ERROR",
          ...(error instanceof AssistedCreationFailure &&
          error.httpStatus !== undefined
            ? { httpStatus: error.httpStatus }
            : {}),
          ...(error instanceof AssistedCreationFailure && error.serviceCode
            ? { serviceCode: error.serviceCode }
            : {}),
          ...(error instanceof Prisma.PrismaClientKnownRequestError
            ? { prismaCode: error.code }
            : {}),
        },
      });
    } catch {
      /* Diagnostics must not change the safe response. */
    }
    return {
      ok: false as const,
      error:
        error instanceof z.ZodError
          ? creationValidationMessage(error)
          : error instanceof AssistedCreationFailure && error.publicMessage
            ? error.publicMessage
            : "No se pudo preparar el negocio. Reintenta la misma operación.",
    };
  }
}

export async function generateBusinessDemoAction(raw: unknown) {
  try {
    const actor = await requireSuperAdmin();
    const input = z
      .object({
        businessId: businessIdSchema,
        productIds: z.array(z.string().uuid()).min(1).max(100),
        authorizationConfirmed: z.literal(true),
      })
      .strict()
      .parse(raw);
    const business = await assistedBusiness(input.businessId);
    const ids = [...new Set(input.productIds)];
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, negocioId: business.id },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        precio: true,
        imagenes: { select: { url: true } },
        variantes: {
          where: { isActive: true },
          select: {
            nombre: true,
            precio: true,
            options: { select: { nombre: true, valor: true } },
          },
        },
      },
    });
    if (
      products.length !== ids.length ||
      products.some((p) => !p.imagenes.length)
    )
      throw new Error(
        "Selecciona únicamente productos del negocio con fotografía autorizada.",
      );
    const snapshot = demoSnapshotSchema.parse({
      version: 1,
      businessId: business.id,
      nombre: business.nombre,
      descripcion: business.descripcion,
      ciudad: business.ciudad,
      departamento: business.departamento,
      direccion: business.direccion,
      telefono: business.telefonoContacto,
      fotoPerfil: business.fotoPerfil,
      fotoPortada: business.fotoPortada,
      products: products.map((p) => ({
        ...p,
        imagenes: p.imagenes.map((i) => i.url),
        variantes: p.variantes.map((v) => ({
          nombre: v.nombre,
          precio: v.precio,
          opciones: v.options,
        })),
      })),
    });
    const token = randomBytes(32).toString("base64url"),
      expiresAt = new Date(Date.now() + DEMO_TTL_MS);
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Negocio" WHERE "id" = ${business.id} FOR UPDATE`;
      await tx.businessDemoLink.updateMany({
        where: { negocioId: business.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.businessDemoLink.create({
        data: {
          negocioId: business.id,
          tokenHash: demoTokenHash(token),
          productIds: ids,
          snapshot: snapshot as Prisma.InputJsonValue,
          createdById: actor.id,
          authorizedAt: new Date(),
          expiresAt,
        },
      });
    });
    revalidatePath("/myckeoAdmin/incorporacion");
    return {
      ok: true as const,
      url: `${baseUrl()}/demo#token=${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  } catch {
    return {
      ok: false as const,
      error:
        "No se pudo generar la demo. Verifica permiso, selección y autorización del contenido.",
    };
  }
}

export async function revokeBusinessDemosAction(id: string) {
  try {
    await requireSuperAdmin();
    const business = await assistedBusiness(id);
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Negocio" WHERE "id" = ${business.id} FOR UPDATE`;
      await tx.businessDemoLink.updateMany({
        where: { negocioId: business.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    revalidatePath("/myckeoAdmin/incorporacion");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "No se pudo revocar la demostración." };
  }
}

export async function generateAssistedActivationAction(
  id: string,
  identityConfirmed: boolean,
) {
  try {
    await requireSuperAdmin();
    if (identityConfirmed !== true) throw new Error();
    const business = await assistedBusiness(id);
    if (!business.usuario.isPlaceholder || business.usuario.estado !== "activo")
      return {
        ok: false as const,
        error:
          "La cuenta ya está activa o necesita revisión. No se fusionan cuentas existentes.",
      };
    // Same issuer as /api/internal/onboarding/claim, scoped to the queried identity.
    // A deliberate reissue revokes all previous activation links.
    const claim = await issueAccountClaim(business.usuarioId);
    return {
      ok: true as const,
      url: `${baseUrl()}/activar#token=${claim.rawToken}`,
      expiresAt: claim.expiresAt.toISOString(),
    };
  } catch {
    return {
      ok: false as const,
      error:
        "No se pudo emitir la activación. Confirma identidad y representación del responsable.",
    };
  }
}

export async function setAssistedPublicationAction(raw: unknown) {
  try {
    await requireSuperAdmin();
    const input = z
      .object({
        businessId: businessIdSchema,
        approved: z.boolean(),
        productIds: z.array(z.string().uuid()).max(100),
        authorizationConfirmed: z.literal(true),
      })
      .strict()
      .parse(raw);
    const business = await assistedBusiness(input.businessId);
    if (
      input.approved &&
      (business.usuario.isPlaceholder ||
        !business.usuario.perfilCompleto ||
        business.usuario.estado !== "activo" ||
        business.isTestData)
    )
      throw new Error("Activa la cuenta del propietario antes de publicar.");
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Negocio" WHERE "id" = ${business.id} FOR UPDATE`;
      const current = await tx.negocio.findUnique({
        where: { id: business.id },
        include: { usuario: true },
      });
      if (
        !current ||
        current.archivedAt ||
        current.estado === "eliminado" ||
        (input.approved &&
          (current.usuario.isPlaceholder ||
            !current.usuario.perfilCompleto ||
            current.usuario.estado !== "activo" ||
            current.isTestData))
      )
        throw new Error("Negocio no publicable.");
      const ids = [...new Set(input.productIds)];
      const products = await tx.product.findMany({
        where: { id: { in: ids }, negocioId: business.id },
        include: { imagenes: true, variantes: { where: { isActive: true } } },
      });
      if (
        input.approved &&
        (products.length !== ids.length ||
          products.some(
            (p) =>
              p.precio <= 0 ||
              !p.imagenes.length ||
              (p.usaVariantes && !p.variantes.length),
          ))
      )
        throw new Error(
          "Revisa precios, imágenes y variantes de los productos seleccionados.",
        );
      // Only the explicitly approved selection can become available.
      await tx.product.updateMany({
        where: { negocioId: business.id, status: "disponible" },
        data: { status: "oculto" },
      });
      await tx.negocio.update({
        where: { id: business.id },
        data: { estado: input.approved ? "activo" : "suspendido" },
      });
      if (input.approved && ids.length)
        await tx.product.updateMany({
          where: { negocioId: business.id, id: { in: ids } },
          data: { status: "disponible" },
        });
    });
    const all = await prisma.product.findMany({
      where: { negocioId: business.id },
      select: { slug: true },
    });
    for (const product of all)
      revalidateAdminProductSurfaces({
        businessSlug: business.slug,
        productSlug: product.slug,
        includeProductCount: true,
      });
    revalidatePath("/", "layout");
    for (const path of [
      "/",
      "/inicio",
      "/myckeoAdmin/incorporacion",
      "/api/search",
      `/perfil/${business.slug}`,
    ])
      revalidatePath(path);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error &&
        !/Prisma|Invalid|query|connect/i.test(error.message)
          ? error.message
          : "No se pudo cambiar la publicación.",
    };
  }
}
