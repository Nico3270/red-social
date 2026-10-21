"use server";

import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";

import { auth } from "@/auth.config";
import {
  AccountClaimError,
  consumeAccountClaim,
} from "@/lib/auth/account-claim";
import {
  getAccountActivationCookieClearOptions,
  getAccountActivationCookieName,
  readAccountActivationSession,
} from "@/lib/auth/account-activation-session";
import { checkAccountActivationSubmitRateLimit } from "@/lib/security/account-activation-rate-limit";
import {
  type AccountActivationInput,
  validateAccountActivationInput,
} from "@/lib/validators/account-activation";
import { Prisma } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const SUCCESS_REDIRECT = "/auth/login?callbackUrl=%2Fdashboard";
const CSRF_NONCE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const BCRYPT_COST = 10;
const THROTTLE_FALLBACK_RETRY_SECONDS = 60;
const ACTION_METADATA_PREFIX = "$ACTION_";
const EMAIL_UNIQUE_CONSTRAINT = "Usuario_email_key";
const USERNAME_UNIQUE_CONSTRAINT = "Usuario_username_key";

const ACTIVATION_FIELD_NAMES = [
  "nombre",
  "apellido",
  "email",
  "username",
  "ciudadCompleta",
  "genero",
  "fechaNacimiento",
  "password",
  "confirmPassword",
] as const satisfies ReadonlyArray<keyof AccountActivationInput>;

type ActivationFieldName = (typeof ACTIVATION_FIELD_NAMES)[number];
type ActivationFieldErrors = Partial<Record<ActivationFieldName, string[]>>;

export type ActivateAccountResult =
  | {
      ok: false;
      code:
        | "ACTIVATION_UNAVAILABLE"
        | "AUTH_SESSION_PRESENT"
        | "INVALID_ORIGIN"
        | "INVALID_CSRF"
        | "INVALID_REQUEST"
        | "EMAIL_UNAVAILABLE"
        | "USERNAME_UNAVAILABLE"
        | "INTERNAL_ERROR";
    }
  | {
      ok: false;
      code: "VALIDATION_ERROR";
      fieldErrors: ActivationFieldErrors;
    }
  | {
      ok: false;
      code: "ACTIVATION_THROTTLED";
      retryAfterSeconds: number;
    };

type ActivationCookieStore = Awaited<ReturnType<typeof cookies>>;

type ExtractedForm =
  | {
      valid: true;
      input: Record<ActivationFieldName, unknown>;
    }
  | {
      valid: false;
    };

class AccountActivationInvariantError extends Error {
  constructor() {
    super("Account activation invariant failed.");
    this.name = "AccountActivationInvariantError";
  }
}

const RESULTS = {
  ACTIVATION_UNAVAILABLE: {
    ok: false,
    code: "ACTIVATION_UNAVAILABLE",
  },
  AUTH_SESSION_PRESENT: {
    ok: false,
    code: "AUTH_SESSION_PRESENT",
  },
  INVALID_ORIGIN: {
    ok: false,
    code: "INVALID_ORIGIN",
  },
  INVALID_CSRF: {
    ok: false,
    code: "INVALID_CSRF",
  },
  INVALID_REQUEST: {
    ok: false,
    code: "INVALID_REQUEST",
  },
  EMAIL_UNAVAILABLE: {
    ok: false,
    code: "EMAIL_UNAVAILABLE",
  },
  USERNAME_UNAVAILABLE: {
    ok: false,
    code: "USERNAME_UNAVAILABLE",
  },
  INTERNAL_ERROR: {
    ok: false,
    code: "INTERNAL_ERROR",
  },
} as const satisfies Record<
  Exclude<
    ActivateAccountResult["code"],
    "VALIDATION_ERROR" | "ACTIVATION_THROTTLED"
  >,
  ActivateAccountResult
>;

function throttledResult(
  retryAfterSeconds: number,
): Extract<ActivateAccountResult, { code: "ACTIVATION_THROTTLED" }> {
  return {
    ok: false,
    code: "ACTIVATION_THROTTLED",
    retryAfterSeconds:
      Number.isSafeInteger(retryAfterSeconds) && retryAfterSeconds >= 1
        ? retryAfterSeconds
        : THROTTLE_FALLBACK_RETRY_SECONDS,
  };
}

function isProductionLoopback(hostname: string): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const normalizedHostname = hostname.toLowerCase();
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.startsWith("127.") ||
    normalizedHostname === "::1" ||
    normalizedHostname === "[::1]"
  );
}

function getCanonicalOrigin(): string | null {
  const raw = process.env.SITE_URL;

  if (!raw || raw !== raw.trim()) {
    return null;
  }

  try {
    const siteUrl = new URL(raw);

    if (
      (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:") ||
      siteUrl.username ||
      siteUrl.password ||
      siteUrl.search ||
      siteUrl.hash ||
      siteUrl.pathname !== "/" ||
      isProductionLoopback(siteUrl.hostname)
    ) {
      return null;
    }

    return siteUrl.origin;
  } catch {
    return null;
  }
}

function clearActivationCookie(cookieStore: ActivationCookieStore): void {
  try {
    cookieStore.set(
      getAccountActivationCookieName(),
      "",
      getAccountActivationCookieClearOptions(),
    );
  } catch {
    // La limpieza no cambia el resultado seguro ya decidido por la acción.
  }
}

function getSingleStringValue(
  formData: FormData,
  fieldName: string,
): string | null {
  const values = formData.getAll(fieldName);

  return values.length === 1 && typeof values[0] === "string"
    ? values[0]
    : null;
}

function hasValidCsrfNonce(
  submittedNonce: string | null,
  expectedNonce: string,
): boolean {
  if (
    submittedNonce === null ||
    !CSRF_NONCE_PATTERN.test(submittedNonce) ||
    !CSRF_NONCE_PATTERN.test(expectedNonce)
  ) {
    return false;
  }

  const submittedBytes = Buffer.from(submittedNonce, "utf8");
  const expectedBytes = Buffer.from(expectedNonce, "utf8");

  return (
    submittedBytes.length === expectedBytes.length &&
    timingSafeEqual(submittedBytes, expectedBytes)
  );
}

function extractStrictActivationInput(formData: FormData): ExtractedForm {
  const allowedFields = new Set<string>([
    "csrfNonce",
    ...ACTIVATION_FIELD_NAMES,
  ]);

  for (const fieldName of formData.keys()) {
    if (
      !fieldName.startsWith(ACTION_METADATA_PREFIX) &&
      !allowedFields.has(fieldName)
    ) {
      return { valid: false };
    }
  }

  const input = {} as Record<ActivationFieldName, unknown>;

  for (const fieldName of ACTIVATION_FIELD_NAMES) {
    const values = formData.getAll(fieldName);

    if (values.length > 1) {
      return { valid: false };
    }

    input[fieldName] = values.length === 1 ? values[0] : undefined;
  }

  return {
    valid: true,
    input,
  };
}

function getValidationFieldErrors(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): ActivationFieldErrors {
  const allowedFields = new Set<string>(ACTIVATION_FIELD_NAMES);
  const fieldErrors: ActivationFieldErrors = {};

  for (const issue of issues) {
    const fieldName = issue.path[0];

    if (typeof fieldName !== "string" || !allowedFields.has(fieldName)) {
      continue;
    }

    const activationFieldName = fieldName as ActivationFieldName;
    const messages = fieldErrors[activationFieldName] ?? [];
    messages.push(issue.message);
    fieldErrors[activationFieldName] = messages;
  }

  return fieldErrors;
}

function splitCanonicalCity(
  ciudadCompleta: string,
): { ciudad: string; departamento: string } | null {
  const parts = ciudadCompleta.split(" - ");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  return {
    ciudad: parts[0],
    departamento: parts[1],
  };
}

function isUniqueConflict(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function getUsuarioUniqueConflictField(
  error: Prisma.PrismaClientKnownRequestError,
): "email" | "username" | null {
  if (
    error.meta?.modelName !== undefined &&
    error.meta.modelName !== "Usuario"
  ) {
    return null;
  }

  const target = error.meta?.target;
  const constraint = error.meta?.constraint;

  if (
    (Array.isArray(target) && target.length === 1 && target[0] === "email") ||
    target === "email" ||
    target === EMAIL_UNIQUE_CONSTRAINT ||
    constraint === EMAIL_UNIQUE_CONSTRAINT
  ) {
    return "email";
  }

  if (
    (Array.isArray(target) &&
      target.length === 1 &&
      target[0] === "username") ||
    target === "username" ||
    target === USERNAME_UNIQUE_CONSTRAINT ||
    constraint === USERNAME_UNIQUE_CONSTRAINT
  ) {
    return "username";
  }

  return null;
}

export async function activateAccount(
  formData: FormData,
): Promise<ActivateAccountResult> {
  let cookieStore: ActivationCookieStore;

  try {
    cookieStore = await cookies();
  } catch {
    return RESULTS.INTERNAL_ERROR;
  }

  const cookieValue = cookieStore.get(getAccountActivationCookieName())?.value;

  if (!cookieValue) {
    clearActivationCookie(cookieStore);
    return RESULTS.ACTIVATION_UNAVAILABLE;
  }

  let activationSession: ReturnType<typeof readAccountActivationSession>;

  try {
    activationSession = readAccountActivationSession(cookieValue);
  } catch {
    clearActivationCookie(cookieStore);
    return RESULTS.ACTIVATION_UNAVAILABLE;
  }

  if (!activationSession.valid) {
    clearActivationCookie(cookieStore);
    return RESULTS.ACTIVATION_UNAVAILABLE;
  }

  try {
    const existingSession = await auth();

    if (existingSession) {
      return RESULTS.AUTH_SESSION_PRESENT;
    }
  } catch {
    return RESULTS.INTERNAL_ERROR;
  }

  const canonicalOrigin = getCanonicalOrigin();

  if (!canonicalOrigin) {
    clearActivationCookie(cookieStore);
    return RESULTS.INVALID_ORIGIN;
  }

  let requestOrigin: string | null;
  let requestHeaders: Headers;

  try {
    requestHeaders = await headers();
    requestOrigin = requestHeaders.get("origin");
  } catch {
    clearActivationCookie(cookieStore);
    return RESULTS.INVALID_ORIGIN;
  }

  if (requestOrigin !== canonicalOrigin) {
    clearActivationCookie(cookieStore);
    return RESULTS.INVALID_ORIGIN;
  }

  let submittedCsrfNonce: string | null;

  try {
    submittedCsrfNonce = getSingleStringValue(formData, "csrfNonce");
  } catch {
    clearActivationCookie(cookieStore);
    return RESULTS.INVALID_CSRF;
  }

  if (!hasValidCsrfNonce(submittedCsrfNonce, activationSession.csrfNonce)) {
    clearActivationCookie(cookieStore);
    return RESULTS.INVALID_CSRF;
  }

  let extractedForm: ExtractedForm;

  try {
    extractedForm = extractStrictActivationInput(formData);
  } catch {
    return RESULTS.INVALID_REQUEST;
  }

  if (!extractedForm.valid) {
    return RESULTS.INVALID_REQUEST;
  }

  let validation: ReturnType<typeof validateAccountActivationInput>;

  try {
    validation = validateAccountActivationInput(extractedForm.input);
  } catch {
    return RESULTS.INTERNAL_ERROR;
  }

  if (!validation.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      fieldErrors: getValidationFieldErrors(validation.error.issues),
    };
  }

  const location = splitCanonicalCity(validation.data.ciudadCompleta);

  if (!location) {
    return RESULTS.INTERNAL_ERROR;
  }

  try {
    const rateLimit = await checkAccountActivationSubmitRateLimit(
      requestHeaders,
      activationSession.csrfNonce,
    );

    if (!rateLimit.allowed) {
      return throttledResult(rateLimit.retryAfterSeconds);
    }
  } catch {
    return throttledResult(THROTTLE_FALLBACK_RETRY_SECONDS);
  }

  let passwordHash: string;

  try {
    passwordHash = await bcryptjs.hash(validation.data.password, BCRYPT_COST);
  } catch {
    return RESULTS.INTERNAL_ERROR;
  }

  try {
    await consumeAccountClaim(
      activationSession.rawToken,
      async ({ tx, usuarioId }) => {
        const updated = await tx.usuario.updateMany({
          where: {
            id: usuarioId,
            isPlaceholder: true,
          },
          data: {
            nombre: validation.data.nombre,
            apellido: validation.data.apellido,
            email: validation.data.email,
            username: validation.data.username,
            contraseña: passwordHash,
            ciudad: location.ciudad,
            departamento: location.departamento,
            genero: validation.data.genero,
            fechaNacimiento: validation.data.fechaNacimiento,
            isPlaceholder: false,
            perfilCompleto: true,
            emailVerified: null,
          },
        });

        if (updated.count !== 1) {
          throw new AccountActivationInvariantError();
        }
      },
    );
  } catch (error) {
    if (
      error instanceof AccountClaimError ||
      error instanceof AccountActivationInvariantError
    ) {
      clearActivationCookie(cookieStore);
      return RESULTS.ACTIVATION_UNAVAILABLE;
    }

    if (isUniqueConflict(error)) {
      const field = getUsuarioUniqueConflictField(error);

      if (field === "email") {
        return RESULTS.EMAIL_UNAVAILABLE;
      }

      if (field === "username") {
        return RESULTS.USERNAME_UNAVAILABLE;
      }
    }

    return RESULTS.INTERNAL_ERROR;
  }

  clearActivationCookie(cookieStore);
  redirect(SUCCESS_REDIRECT);
}
