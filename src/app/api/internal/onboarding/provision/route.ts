import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { separarCiudadDepartamento } from "@/helpers/usuario/funcionesUsuario";
import prisma from "@/lib/prisma";
import { Genero, Prisma } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MIN_HMAC_SECRET_LENGTH = 32;
const MAX_PROVISIONING_REF_LENGTH = 128;
const MAX_BUSINESS_NAME_LENGTH = 160;
const MAX_FULL_CITY_LENGTH = 200;
const PROVISIONING_REF_PATTERN = /^[A-Za-z0-9._:-]+$/;
const PROVISIONING_HASH_FIELD = "placeholderProvisioningKeyHash";
const PROVISIONING_HASH_UNIQUE_CONSTRAINT =
  "Usuario_placeholderProvisioningKeyHash_key";
const ALLOWED_BODY_KEYS = new Set([
  "provisioningRef",
  "nombreNegocio",
  "ciudadCompleta",
]);

type ValidProvisionInput = {
  provisioningRef: string;
  ciudad: string;
  departamento: string;
};

type ProvisionResult =
  | {
      available: true;
      usuarioId: string;
      created: boolean;
    }
  | {
      available: false;
    };

function jsonError(code: string, status: number) {
  return NextResponse.json({ ok: false, code }, { status });
}

function hasValidApiKey(request: Request): boolean {
  const suppliedKey = request.headers.get("x-api-key");
  const configuredKey = process.env.MYCKEO_ADMIN_KEY;

  if (
    typeof suppliedKey !== "string" ||
    typeof configuredKey !== "string" ||
    suppliedKey.length === 0 ||
    suppliedKey.length !== configuredKey.length
  ) {
    return false;
  }

  const suppliedBytes = Buffer.from(suppliedKey, "utf8");
  const configuredBytes = Buffer.from(configuredKey, "utf8");

  return (
    suppliedBytes.length === configuredBytes.length &&
    timingSafeEqual(suppliedBytes, configuredBytes)
  );
}

function getHmacSecret(): string | null {
  const secret = process.env.ACCOUNT_PROVISIONING_HMAC_SECRET;

  if (
    typeof secret !== "string" ||
    secret.length < MIN_HMAC_SECRET_LENGTH ||
    secret !== secret.trim()
  ) {
    return null;
  }

  return secret;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasControlCharacters(value: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(value);
}

function parseProvisionInput(value: unknown): ValidProvisionInput | null {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !ALLOWED_BODY_KEYS.has(key))
  ) {
    return null;
  }

  const { provisioningRef, nombreNegocio, ciudadCompleta } = value;

  if (
    typeof provisioningRef !== "string" ||
    provisioningRef.length === 0 ||
    provisioningRef.length > MAX_PROVISIONING_REF_LENGTH ||
    provisioningRef !== provisioningRef.trim() ||
    !PROVISIONING_REF_PATTERN.test(provisioningRef)
  ) {
    return null;
  }

  if (
    typeof nombreNegocio !== "string" ||
    nombreNegocio.trim().length === 0 ||
    nombreNegocio.length > MAX_BUSINESS_NAME_LENGTH ||
    hasControlCharacters(nombreNegocio)
  ) {
    return null;
  }

  if (
    typeof ciudadCompleta !== "string" ||
    ciudadCompleta.trim().length === 0 ||
    ciudadCompleta.length > MAX_FULL_CITY_LENGTH ||
    hasControlCharacters(ciudadCompleta)
  ) {
    return null;
  }

  const { ciudad, departamento } = separarCiudadDepartamento(ciudadCompleta);
  if (!ciudad || !departamento) {
    return null;
  }

  return {
    provisioningRef,
    ciudad,
    departamento,
  };
}

function hashProvisioningRef(
  provisioningRef: string,
  hmacSecret: string,
): string {
  return createHmac("sha256", hmacSecret)
    .update(provisioningRef, "utf8")
    .digest("hex");
}

function internalEmail(provisioningHash: string): string {
  return `placeholder-${provisioningHash.slice(0, 40)}@accounts.myckeo.com`;
}

function internalUsername(provisioningHash: string): string {
  return `pending_${provisioningHash.slice(0, 24)}`;
}

async function createUnknownPasswordHash(): Promise<string> {
  const unknownPassword = randomBytes(32).toString("base64url");
  return bcryptjs.hash(unknownPassword, 10);
}

function isProvisioningHashUniqueConflict(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  if (error.meta?.modelName && error.meta.modelName !== "Usuario") {
    return false;
  }

  const target = error.meta?.target;
  const targetMatches =
    (Array.isArray(target) &&
      target.length === 1 &&
      target[0] === PROVISIONING_HASH_FIELD) ||
    target === PROVISIONING_HASH_FIELD ||
    target === PROVISIONING_HASH_UNIQUE_CONSTRAINT;

  return (
    targetMatches ||
    error.meta?.constraint === PROVISIONING_HASH_UNIQUE_CONSTRAINT
  );
}

async function findProvisionedUsuario(provisioningHash: string) {
  return prisma.usuario.findUnique({
    where: {
      placeholderProvisioningKeyHash: provisioningHash,
    },
    select: {
      id: true,
      isPlaceholder: true,
    },
  });
}

async function provisionPlaceholder(
  input: ValidProvisionInput,
  hmacSecret: string,
): Promise<ProvisionResult> {
  const provisioningHash = hashProvisioningRef(
    input.provisioningRef,
    hmacSecret,
  );
  const existing = await findProvisionedUsuario(provisioningHash);

  if (existing) {
    return existing.isPlaceholder
      ? { available: true, usuarioId: existing.id, created: false }
      : { available: false };
  }

  const passwordHash = await createUnknownPasswordHash();

  try {
    const usuario = await prisma.usuario.create({
      data: {
        nombre: "Dueño",
        apellido: "Pendiente",
        email: internalEmail(provisioningHash),
        contraseña: passwordHash,
        username: internalUsername(provisioningHash),
        genero: Genero.otro,
        fechaNacimiento: new Date("1990-01-01T00:00:00.000Z"),
        ciudad: input.ciudad,
        departamento: input.departamento,
        isPlaceholder: true,
        perfilCompleto: false,
        placeholderProvisioningKeyHash: provisioningHash,
      },
      select: {
        id: true,
      },
    });

    return {
      available: true,
      usuarioId: usuario.id,
      created: true,
    };
  } catch (error) {
    if (!isProvisioningHashUniqueConflict(error)) {
      throw error;
    }

    const raceWinner = await findProvisionedUsuario(provisioningHash);
    if (!raceWinner) {
      throw error;
    }

    return raceWinner.isPlaceholder
      ? { available: true, usuarioId: raceWinner.id, created: false }
      : { available: false };
  }
}

export async function POST(request: Request) {
  if (!hasValidApiKey(request)) {
    return jsonError("UNAUTHORIZED", 401);
  }

  const hmacSecret = getHmacSecret();
  if (hmacSecret === null) {
    return jsonError("INTERNAL_ERROR", 500);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_REQUEST", 400);
  }

  const input = parseProvisionInput(body);
  if (input === null) {
    return jsonError("INVALID_REQUEST", 400);
  }

  try {
    const result = await provisionPlaceholder(input, hmacSecret);

    if (!result.available) {
      return jsonError("PROVISIONING_UNAVAILABLE", 409);
    }

    return NextResponse.json(
      {
        ok: true,
        usuarioId: result.usuarioId,
        created: result.created,
      },
      { status: result.created ? 201 : 200 },
    );
  } catch {
    return jsonError("INTERNAL_ERROR", 500);
  }
}
