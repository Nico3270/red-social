import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export const ACCOUNT_ACTIVATION_SESSION_MAX_TTL_MS = 15 * 60 * 1000;
export const ACCOUNT_ACTIVATION_COOKIE_NAME =
  "myckeo-account-activation";

const ACCOUNT_ACTIVATION_COOKIE_PATH = "/activar";
const ACCOUNT_ACTIVATION_SESSION_AAD =
  "myckeo-account-activation-session:v1";
const ACCOUNT_ACTIVATION_SESSION_VERSION = "v1";
const ACCOUNT_ACTIVATION_SESSION_PURPOSE = "account-activation";
const ACCOUNT_ACTIVATION_SESSION_MAX_LENGTH = 1024;
const ACCOUNT_ACTIVATION_SESSION_MAX_CIPHERTEXT_BYTES = 512;
const ACCOUNT_ACTIVATION_SECRET_MIN_BYTES = 32;
const AES_256_GCM_IV_BYTES = 12;
const AES_256_GCM_TAG_BYTES = 16;
const CSRF_NONCE_BYTES = 32;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const ACCOUNT_CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CSRF_NONCE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type AccountActivationSessionErrorCode =
  | "ACCOUNT_ACTIVATION_SESSION_SECRET_INVALID"
  | "ACCOUNT_ACTIVATION_SESSION_INPUT_INVALID"
  | "ACCOUNT_ACTIVATION_COOKIE_EXPIRY_INVALID";

class AccountActivationSessionError extends Error {
  readonly code: AccountActivationSessionErrorCode;

  constructor(code: AccountActivationSessionErrorCode) {
    super("Account activation session operation failed.");
    this.name = "AccountActivationSessionError";
    this.code = code;
  }
}

export type CreateAccountActivationSessionInput = {
  rawToken: string;
  claimExpiresAt: Date;
};

export type AccountActivationSessionResult = {
  value: string;
  csrfNonce: string;
  expiresAt: Date;
};

export type AccountActivationSessionReadResult =
  | {
      valid: true;
      rawToken: string;
      csrfNonce: string;
      expiresAt: Date;
    }
  | {
      valid: false;
    };

export type AccountActivationCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: typeof ACCOUNT_ACTIVATION_COOKIE_PATH;
  expires: Date;
};

export type AccountActivationCookieClearOptions =
  AccountActivationCookieOptions & {
    maxAge: 0;
  };

type AccountActivationSessionPayload = {
  v: 1;
  purpose: typeof ACCOUNT_ACTIVATION_SESSION_PURPOSE;
  rawToken: string;
  csrfNonce: string;
  exp: number;
};

function getValidDateTimestamp(value: unknown): number | null {
  if (!(value instanceof Date)) {
    return null;
  }

  const timestamp = value.getTime();
  return Number.isSafeInteger(timestamp) ? timestamp : null;
}

function getAccountActivationKey(): Buffer {
  const secret = process.env.ACCOUNT_ACTIVATION_SESSION_SECRET;

  if (
    typeof secret !== "string" ||
    secret !== secret.trim() ||
    Buffer.byteLength(secret, "utf8") < ACCOUNT_ACTIVATION_SECRET_MIN_BYTES
  ) {
    throw new AccountActivationSessionError(
      "ACCOUNT_ACTIVATION_SESSION_SECRET_INVALID",
    );
  }

  return createHash("sha256").update(secret, "utf8").digest();
}

function decodeCanonicalBase64url(value: string): Buffer | null {
  if (
    !value ||
    !BASE64URL_PATTERN.test(value) ||
    value.length % 4 === 1
  ) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.toString("base64url") === value ? decoded : null;
  } catch {
    return null;
  }
}

function isValidRawToken(value: unknown): value is string {
  return (
    typeof value === "string" && ACCOUNT_CLAIM_TOKEN_PATTERN.test(value)
  );
}

function isValidCsrfNonce(value: unknown): value is string {
  return typeof value === "string" && CSRF_NONCE_PATTERN.test(value);
}

function isStrictPayload(
  value: unknown,
): value is AccountActivationSessionPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const keys = Object.keys(payload);

  return (
    keys.length === 5 &&
    keys.includes("v") &&
    keys.includes("purpose") &&
    keys.includes("rawToken") &&
    keys.includes("csrfNonce") &&
    keys.includes("exp") &&
    payload.v === 1 &&
    payload.purpose === ACCOUNT_ACTIVATION_SESSION_PURPOSE &&
    isValidRawToken(payload.rawToken) &&
    isValidCsrfNonce(payload.csrfNonce) &&
    typeof payload.exp === "number" &&
    Number.isSafeInteger(payload.exp) &&
    payload.exp > 0
  );
}

function getAccountActivationCookieBaseOptions(): Omit<
  AccountActivationCookieOptions,
  "expires"
> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: ACCOUNT_ACTIVATION_COOKIE_PATH,
  };
}

export function getAccountActivationCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? `__Secure-${ACCOUNT_ACTIVATION_COOKIE_NAME}`
    : ACCOUNT_ACTIVATION_COOKIE_NAME;
}

export function getAccountActivationCookieOptions(
  expiresAt: Date,
): AccountActivationCookieOptions {
  const expiresAtTimestamp = getValidDateTimestamp(expiresAt);

  if (expiresAtTimestamp === null || expiresAtTimestamp <= Date.now()) {
    throw new AccountActivationSessionError(
      "ACCOUNT_ACTIVATION_COOKIE_EXPIRY_INVALID",
    );
  }

  return {
    ...getAccountActivationCookieBaseOptions(),
    expires: new Date(expiresAtTimestamp),
  };
}

export function getAccountActivationCookieClearOptions(): AccountActivationCookieClearOptions {
  return {
    ...getAccountActivationCookieBaseOptions(),
    expires: new Date(0),
    maxAge: 0,
  };
}

export function createAccountActivationSession(
  input: CreateAccountActivationSessionInput,
  now: Date = new Date(),
): AccountActivationSessionResult {
  const key = getAccountActivationKey();
  const nowTimestamp = getValidDateTimestamp(now);
  const claimExpiresAtTimestamp = getValidDateTimestamp(
    input?.claimExpiresAt,
  );

  if (
    !isValidRawToken(input?.rawToken) ||
    nowTimestamp === null ||
    claimExpiresAtTimestamp === null ||
    claimExpiresAtTimestamp <= nowTimestamp
  ) {
    throw new AccountActivationSessionError(
      "ACCOUNT_ACTIVATION_SESSION_INPUT_INVALID",
    );
  }

  const sessionLimitTimestamp =
    nowTimestamp + ACCOUNT_ACTIVATION_SESSION_MAX_TTL_MS;
  const expiresAtTimestamp = Math.min(
    sessionLimitTimestamp,
    claimExpiresAtTimestamp,
  );

  if (
    !Number.isSafeInteger(sessionLimitTimestamp) ||
    !Number.isSafeInteger(expiresAtTimestamp) ||
    expiresAtTimestamp <= nowTimestamp
  ) {
    throw new AccountActivationSessionError(
      "ACCOUNT_ACTIVATION_SESSION_INPUT_INVALID",
    );
  }

  const csrfNonce = randomBytes(CSRF_NONCE_BYTES).toString("base64url");
  const payload: AccountActivationSessionPayload = {
    v: 1,
    purpose: ACCOUNT_ACTIVATION_SESSION_PURPOSE,
    rawToken: input.rawToken,
    csrfNonce,
    exp: expiresAtTimestamp,
  };
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const iv = randomBytes(AES_256_GCM_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: AES_256_GCM_TAG_BYTES,
  });
  cipher.setAAD(Buffer.from(ACCOUNT_ACTIVATION_SESSION_AAD, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authenticationTag = cipher.getAuthTag();

  return {
    value: [
      ACCOUNT_ACTIVATION_SESSION_VERSION,
      iv.toString("base64url"),
      ciphertext.toString("base64url"),
      authenticationTag.toString("base64url"),
    ].join("."),
    csrfNonce,
    expiresAt: new Date(expiresAtTimestamp),
  };
}

export function readAccountActivationSession(
  value: unknown,
  now: Date = new Date(),
): AccountActivationSessionReadResult {
  try {
    const nowTimestamp = getValidDateTimestamp(now);
    if (
      nowTimestamp === null ||
      typeof value !== "string" ||
      !value ||
      value.length > ACCOUNT_ACTIVATION_SESSION_MAX_LENGTH
    ) {
      return { valid: false };
    }

    const segments = value.split(".");
    if (segments.length !== 4) {
      return { valid: false };
    }

    const [version, ivBase64url, ciphertextBase64url, tagBase64url] =
      segments;
    if (
      version !== ACCOUNT_ACTIVATION_SESSION_VERSION ||
      !BASE64URL_PATTERN.test(ivBase64url) ||
      !BASE64URL_PATTERN.test(ciphertextBase64url) ||
      !BASE64URL_PATTERN.test(tagBase64url)
    ) {
      return { valid: false };
    }

    const iv = decodeCanonicalBase64url(ivBase64url);
    const ciphertext = decodeCanonicalBase64url(ciphertextBase64url);
    const authenticationTag = decodeCanonicalBase64url(tagBase64url);
    if (
      !iv ||
      iv.length !== AES_256_GCM_IV_BYTES ||
      !ciphertext ||
      ciphertext.length === 0 ||
      ciphertext.length > ACCOUNT_ACTIVATION_SESSION_MAX_CIPHERTEXT_BYTES ||
      !authenticationTag ||
      authenticationTag.length !== AES_256_GCM_TAG_BYTES
    ) {
      return { valid: false };
    }

    const key = getAccountActivationKey();
    const decipher = createDecipheriv("aes-256-gcm", key, iv, {
      authTagLength: AES_256_GCM_TAG_BYTES,
    });
    decipher.setAAD(Buffer.from(ACCOUNT_ACTIVATION_SESSION_AAD, "utf8"));
    decipher.setAuthTag(authenticationTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(plaintext.toString("utf8"));
    } catch {
      return { valid: false };
    }

    if (!isStrictPayload(parsedPayload)) {
      return { valid: false };
    }

    const sessionLimitTimestamp =
      nowTimestamp + ACCOUNT_ACTIVATION_SESSION_MAX_TTL_MS;
    if (
      !Number.isSafeInteger(sessionLimitTimestamp) ||
      parsedPayload.exp <= nowTimestamp ||
      parsedPayload.exp > sessionLimitTimestamp
    ) {
      return { valid: false };
    }

    const expiresAt = new Date(parsedPayload.exp);
    if (getValidDateTimestamp(expiresAt) === null) {
      return { valid: false };
    }

    return {
      valid: true,
      rawToken: parsedPayload.rawToken,
      csrfNonce: parsedPayload.csrfNonce,
      expiresAt,
    };
  } catch {
    return { valid: false };
  }
}
