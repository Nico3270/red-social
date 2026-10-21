import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("server-only", () => ({}), { virtual: true });

import {
  ACCOUNT_ACTIVATION_COOKIE_NAME,
  ACCOUNT_ACTIVATION_SESSION_MAX_TTL_MS,
  createAccountActivationSession,
  getAccountActivationCookieClearOptions,
  getAccountActivationCookieName,
  getAccountActivationCookieOptions,
  readAccountActivationSession,
} from "./account-activation-session";

const originalSecret = process.env.ACCOUNT_ACTIVATION_SESSION_SECRET;
const originalNodeEnv = process.env.NODE_ENV;
const validSecret = "A".repeat(32);
const otherValidSecret = "B".repeat(32);
const sessionAad = "myckeo-account-activation-session:v1";
const now = new Date("2026-09-12T15:00:00.123Z");
const rawToken = "R".repeat(43);
const csrfNonce = "C".repeat(43);
const longClaimExpiry = new Date(
  now.getTime() + 60 * 60 * 1000,
);

function setNodeEnv(value: string): void {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  });
}

function keyFor(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

function encryptBytes(
  plaintext: Buffer,
  secret = validSecret,
  aad = sessionAad,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(secret), iv, {
    authTagLength: 16,
  });
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

function encryptPayload(
  payload: Record<string, unknown>,
  secret = validSecret,
): string {
  return encryptBytes(Buffer.from(JSON.stringify(payload), "utf8"), secret);
}

function decryptPayload(
  value: string,
  secret = validSecret,
  aad = sessionAad,
): Record<string, unknown> {
  const [version, ivValue, ciphertextValue, tagValue] = value.split(".");
  expect(version).toBe("v1");

  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFor(secret),
    Buffer.from(ivValue, "base64url"),
    { authTagLength: 16 },
  );
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString("utf8")) as Record<string, unknown>;
}

function validPayload(
  changes: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    v: 1,
    purpose: "account-activation",
    rawToken,
    csrfNonce,
    exp: now.getTime() + 5 * 60 * 1000,
    ...changes,
  };
}

function changeFirstCharacter(value: string): string {
  return `${value[0] === "A" ? "B" : "A"}${value.slice(1)}`;
}

describe("account-activation-session", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    process.env.ACCOUNT_ACTIVATION_SESSION_SECRET = validSecret;
    setNodeEnv("test");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.ACCOUNT_ACTIVATION_SESSION_SECRET;
    } else {
      process.env.ACCOUNT_ACTIVATION_SESSION_SECRET = originalSecret;
    }

    setNodeEnv(originalNodeEnv ?? "test");
  });

  describe("creation and encryption", () => {
    it("creates a compact v1 AES-GCM session with a 12-byte IV and 16-byte tag", () => {
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt: longClaimExpiry },
        now,
      );
      const segments = created.value.split(".");

      expect(created.value).toBeTruthy();
      expect(segments).toHaveLength(4);
      expect(segments[0]).toBe("v1");
      expect(segments.slice(1)).toEqual([
        expect.stringMatching(/^[A-Za-z0-9_-]+$/),
        expect.stringMatching(/^[A-Za-z0-9_-]+$/),
        expect.stringMatching(/^[A-Za-z0-9_-]+$/),
      ]);
      expect(Buffer.from(segments[1], "base64url")).toHaveLength(12);
      expect(Buffer.from(segments[3], "base64url")).toHaveLength(16);
      expect(Buffer.from(segments[2], "base64url").length).toBeLessThanOrEqual(
        512,
      );
    });

    it("derives the AES-256 key with SHA-256 and authenticates the versioned AAD", () => {
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt: longClaimExpiry },
        now,
      );
      const payload = decryptPayload(created.value);

      expect(keyFor(validSecret)).toHaveLength(32);
      expect(payload).toEqual({
        v: 1,
        purpose: "account-activation",
        rawToken,
        csrfNonce: created.csrfNonce,
        exp: created.expiresAt.getTime(),
      });
      expect(Object.keys(payload)).toEqual([
        "v",
        "purpose",
        "rawToken",
        "csrfNonce",
        "exp",
      ]);
      expect(() =>
        decryptPayload(created.value, validSecret, "wrong-context:v1"),
      ).toThrow();
    });

    it("generates an independent 256-bit base64url CSRF nonce", () => {
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt: longClaimExpiry },
        now,
      );

      expect(created.csrfNonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(Buffer.from(created.csrfNonce, "base64url")).toHaveLength(32);
      expect(created.csrfNonce).not.toBe(rawToken);
    });

    it("uses fresh IV and CSRF entropy for repeated sessions", () => {
      const input = { rawToken, claimExpiresAt: longClaimExpiry };
      const first = createAccountActivationSession(input, now);
      const second = createAccountActivationSession(input, now);

      expect(first.value).not.toBe(second.value);
      expect(first.value.split(".")[1]).not.toBe(second.value.split(".")[1]);
      expect(first.csrfNonce).not.toBe(second.csrfNonce);
    });

    it("keeps all logical payload values out of cookie plaintext", () => {
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt: longClaimExpiry },
        now,
      );

      expect(created.value).not.toContain(rawToken);
      expect(created.value).not.toContain(created.csrfNonce);
      expect(created.value).not.toContain("account-activation");
      expect(created.value).not.toContain("rawToken");
      expect(created.value).not.toContain("csrfNonce");
      expect(created.value).not.toContain("{");
      expect(created.value).not.toContain("}");
    });

    it("keeps a typical cookie value below 1024 bytes", () => {
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt: longClaimExpiry },
        now,
      );

      expect(Buffer.byteLength(created.value, "utf8")).toBeLessThan(1024);
      expect(Buffer.byteLength(created.value, "utf8")).toBeLessThan(2048);
    });
  });

  describe("round trip and TTL", () => {
    it("round-trips only rawToken, csrfNonce and expiresAt", () => {
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt: longClaimExpiry },
        now,
      );

      expect(readAccountActivationSession(created.value, now)).toEqual({
        valid: true,
        rawToken,
        csrfNonce: created.csrfNonce,
        expiresAt: created.expiresAt,
      });
    });

    it("caps a long-lived claim at exactly 15 minutes", () => {
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt: longClaimExpiry },
        now,
      );

      expect(ACCOUNT_ACTIVATION_SESSION_MAX_TTL_MS).toBe(15 * 60 * 1000);
      expect(created.expiresAt).toEqual(
        new Date(now.getTime() + 15 * 60 * 1000),
      );
      expect(created.expiresAt.getTime()).toBeLessThanOrEqual(
        longClaimExpiry.getTime(),
      );
    });

    it("uses the claim expiry when it is only five minutes away", () => {
      const claimExpiresAt = new Date(now.getTime() + 5 * 60 * 1000);
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt },
        now,
      );

      expect(created.expiresAt).toEqual(claimExpiresAt);
      expect(created.expiresAt.getTime()).toBeLessThanOrEqual(
        now.getTime() + ACCOUNT_ACTIVATION_SESSION_MAX_TTL_MS,
      );
    });

    it.each([
      new Date(now.getTime()),
      new Date(now.getTime() - 1),
    ])("rejects a claim that is not active at creation: %s", (claimExpiresAt) => {
      expect(() =>
        createAccountActivationSession({ rawToken, claimExpiresAt }, now),
      ).toThrow(
        expect.objectContaining({
          name: "AccountActivationSessionError",
          code: "ACCOUNT_ACTIVATION_SESSION_INPUT_INVALID",
        }),
      );
    });

    it("rejects invalid creation dates without sleeping", () => {
      expect(() =>
        createAccountActivationSession(
          { rawToken, claimExpiresAt: new Date(Number.NaN) },
          now,
        ),
      ).toThrow(
        expect.objectContaining({
          code: "ACCOUNT_ACTIVATION_SESSION_INPUT_INVALID",
        }),
      );
      expect(() =>
        createAccountActivationSession(
          { rawToken, claimExpiresAt: longClaimExpiry },
          new Date(Number.NaN),
        ),
      ).toThrow(
        expect.objectContaining({
          code: "ACCOUNT_ACTIVATION_SESSION_INPUT_INVALID",
        }),
      );
    });

    it.each([
      "",
      "A".repeat(42),
      "A".repeat(44),
      `${"A".repeat(42)}=`,
      `${"A".repeat(42)}+`,
      `${"A".repeat(42)}/`,
      ` ${"A".repeat(43)}`,
    ])("rejects malformed AccountClaim token at creation: %j", (value) => {
      expect(() =>
        createAccountActivationSession(
          { rawToken: value, claimExpiresAt: longClaimExpiry },
          now,
        ),
      ).toThrow(
        expect.objectContaining({
          code: "ACCOUNT_ACTIVATION_SESSION_INPUT_INVALID",
        }),
      );
    });

    it("rejects the session at and after its exact expiry", () => {
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt: longClaimExpiry },
        now,
      );

      expect(
        readAccountActivationSession(created.value, created.expiresAt),
      ).toEqual({ valid: false });
      expect(
        readAccountActivationSession(
          created.value,
          new Date(created.expiresAt.getTime() + 1),
        ),
      ).toEqual({ valid: false });
    });

    it("does not accept an authenticated payload that exceeds the maximum TTL", () => {
      const value = encryptPayload(
        validPayload({
          exp: now.getTime() + ACCOUNT_ACTIVATION_SESSION_MAX_TTL_MS + 1,
        }),
      );

      expect(readAccountActivationSession(value, now)).toEqual({
        valid: false,
      });
    });
  });

  describe("secret isolation", () => {
    it("does not throw at module import and rejects a missing secret only when creating", () => {
      delete process.env.ACCOUNT_ACTIVATION_SESSION_SECRET;

      expect(() =>
        createAccountActivationSession(
          { rawToken, claimExpiresAt: longClaimExpiry },
          now,
        ),
      ).toThrow(
        expect.objectContaining({
          name: "AccountActivationSessionError",
          code: "ACCOUNT_ACTIVATION_SESSION_SECRET_INVALID",
        }),
      );
    });

    it.each(["S".repeat(31), ` ${"S".repeat(32)}`, `${"S".repeat(32)} `])(
      "rejects a short or externally padded secret without exposing it: %j",
      (secret) => {
        process.env.ACCOUNT_ACTIVATION_SESSION_SECRET = secret;

        expect(() =>
          createAccountActivationSession(
            { rawToken, claimExpiresAt: longClaimExpiry },
            now,
          ),
        ).toThrow(
          expect.objectContaining({
            message: "Account activation session operation failed.",
            code: "ACCOUNT_ACTIVATION_SESSION_SECRET_INVALID",
          }),
        );
      },
    );

    it("measures the minimum secret in UTF-8 bytes", () => {
      process.env.ACCOUNT_ACTIVATION_SESSION_SECRET = "é".repeat(16);
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt: longClaimExpiry },
        now,
      );

      expect(readAccountActivationSession(created.value, now).valid).toBe(
        true,
      );
    });

    it("returns invalid rather than throwing if the read secret is absent", () => {
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt: longClaimExpiry },
        now,
      );
      delete process.env.ACCOUNT_ACTIVATION_SESSION_SECRET;

      expect(() => readAccountActivationSession(created.value, now)).not.toThrow();
      expect(readAccountActivationSession(created.value, now)).toEqual({
        valid: false,
      });
    });

    it("rejects a cookie read with a different valid secret", () => {
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt: longClaimExpiry },
        now,
      );
      process.env.ACCOUNT_ACTIVATION_SESSION_SECRET = otherValidSecret;

      expect(readAccountActivationSession(created.value, now)).toEqual({
        valid: false,
      });
    });
  });

  describe("tamper and malformed input rejection", () => {
    it.each(["version", "iv", "ciphertext", "tag"] as const)(
      "rejects a modified %s",
      (target) => {
        const created = createAccountActivationSession(
          { rawToken, claimExpiresAt: longClaimExpiry },
          now,
        );
        const segments = created.value.split(".");
        const targetIndex = {
          version: 0,
          iv: 1,
          ciphertext: 2,
          tag: 3,
        }[target];
        segments[targetIndex] =
          target === "version"
            ? "v2"
            : changeFirstCharacter(segments[targetIndex]);

        expect(readAccountActivationSession(segments.join("."), now)).toEqual(
          { valid: false },
        );
      },
    );

    it.each([
      ["undefined", undefined],
      ["null", null],
      ["empty", ""],
      ["giant", "A".repeat(10_000)],
      ["missing segments", "v1.AA.AA"],
      ["extra segments", "v1.AA.AA.AA.AA"],
      ["wrong version", "v2.AA.AA.AA"],
      ["invalid base64url", "v1.AA+.AA.AA"],
      ["base64 padding", "v1.AA==.AA.AA"],
      ["empty ciphertext", "v1.AAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAAAAAAAAA"],
    ])("returns invalid for malformed %s", (_label, value) => {
      expect(readAccountActivationSession(value, now)).toEqual({
        valid: false,
      });
    });

    it("rejects decoded IV and tag lengths before decryption", () => {
      const shortIv = Buffer.alloc(11).toString("base64url");
      const shortTag = Buffer.alloc(15).toString("base64url");
      const ciphertext = Buffer.from("ciphertext").toString("base64url");

      expect(
        readAccountActivationSession(
          `v1.${shortIv}.${ciphertext}.${Buffer.alloc(16).toString("base64url")}`,
          now,
        ),
      ).toEqual({ valid: false });
      expect(
        readAccountActivationSession(
          `v1.${Buffer.alloc(12).toString("base64url")}.${ciphertext}.${shortTag}`,
          now,
        ),
      ).toEqual({ valid: false });
    });

    it("rejects ciphertext larger than the strict bound", () => {
      const value = [
        "v1",
        Buffer.alloc(12).toString("base64url"),
        Buffer.alloc(513).toString("base64url"),
        Buffer.alloc(16).toString("base64url"),
      ].join(".");

      expect(readAccountActivationSession(value, now)).toEqual({
        valid: false,
      });
    });

    it("rejects authenticated plaintext that is not JSON", () => {
      const value = encryptBytes(Buffer.from("not-json", "utf8"));

      expect(readAccountActivationSession(value, now)).toEqual({
        valid: false,
      });
    });

    it.each([
      ["wrong payload version", { v: 2 }],
      ["wrong purpose", { purpose: "reservation-management" }],
      ["malformed raw token", { rawToken: "short" }],
      ["malformed csrf nonce", { csrfNonce: "short" }],
      ["non-integer expiry", { exp: now.getTime() + 0.5 }],
      ["expired payload", { exp: now.getTime() }],
    ])("rejects authenticated payload with %s", (_label, changes) => {
      expect(
        readAccountActivationSession(
          encryptPayload(validPayload(changes)),
          now,
        ),
      ).toEqual({ valid: false });
    });

    it("rejects payloads with missing or extra fields", () => {
      const missing = validPayload();
      delete missing.csrfNonce;
      const extra = validPayload({ usuarioId: "forbidden-user" });

      expect(
        readAccountActivationSession(encryptPayload(missing), now),
      ).toEqual({ valid: false });
      expect(readAccountActivationSession(encryptPayload(extra), now)).toEqual(
        { valid: false },
      );
    });

    it("rejects an invalid injected clock without decrypting visibly", () => {
      const created = createAccountActivationSession(
        { rawToken, claimExpiresAt: longClaimExpiry },
        now,
      );

      expect(
        readAccountActivationSession(created.value, new Date(Number.NaN)),
      ).toEqual({ valid: false });
    });
  });

  describe("cookie contract", () => {
    const futureExpiresAt = new Date("2099-01-01T12:34:56.789Z");

    it("uses __Secure- and Secure only in production", () => {
      setNodeEnv("production");

      expect(ACCOUNT_ACTIVATION_COOKIE_NAME).toBe(
        "myckeo-account-activation",
      );
      expect(getAccountActivationCookieName()).toBe(
        "__Secure-myckeo-account-activation",
      );
      expect(getAccountActivationCookieOptions(futureExpiresAt)).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/activar",
        expires: futureExpiresAt,
      });
      expect(
        getAccountActivationCookieOptions(futureExpiresAt),
      ).not.toHaveProperty("domain");
    });

    it.each(["development", "test", "staging"])(
      "uses the local name with Secure=false outside production: %s",
      (nodeEnv) => {
        setNodeEnv(nodeEnv);

        expect(getAccountActivationCookieName()).toBe(
          "myckeo-account-activation",
        );
        expect(
          getAccountActivationCookieOptions(futureExpiresAt).secure,
        ).toBe(false);
      },
    );

    it("preserves the supplied expiry and omits Domain and Max-Age", () => {
      const options = getAccountActivationCookieOptions(futureExpiresAt);

      expect(options.expires).toEqual(futureExpiresAt);
      expect(options.expires).not.toBe(futureExpiresAt);
      expect(options).not.toHaveProperty("domain");
      expect(options).not.toHaveProperty("maxAge");
    });

    it.each([new Date(Number.NaN), new Date(0)])(
      "rejects an invalid or past cookie expiry: %s",
      (expiresAt) => {
        expect(() => getAccountActivationCookieOptions(expiresAt)).toThrow(
          expect.objectContaining({
            code: "ACCOUNT_ACTIVATION_COOKIE_EXPIRY_INVALID",
          }),
        );
      },
    );

    it.each([
      ["production", true],
      ["development", false],
    ] as const)(
      "creates canonical clear options with matching flags in %s",
      (nodeEnv, secure) => {
        setNodeEnv(nodeEnv);

        expect(getAccountActivationCookieClearOptions()).toEqual({
          httpOnly: true,
          secure,
          sameSite: "lax",
          path: "/activar",
          expires: new Date(0),
          maxAge: 0,
        });
      },
    );

    it("does not read the encryption secret for cookie metadata", () => {
      delete process.env.ACCOUNT_ACTIVATION_SESSION_SECRET;

      expect(getAccountActivationCookieName()).toBe(
        "myckeo-account-activation",
      );
      expect(getAccountActivationCookieOptions(futureExpiresAt)).toEqual(
        expect.objectContaining({ expires: futureExpiresAt }),
      );
      expect(getAccountActivationCookieClearOptions()).toEqual(
        expect.objectContaining({ expires: new Date(0), maxAge: 0 }),
      );
    });
  });

  it("is server-only crypto with no persistence, Next cookies API or logging", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/auth/account-activation-session.ts"),
      "utf8",
    );

    expect(source.startsWith('import "server-only";')).toBe(true);
    expect(source).toContain('from "node:crypto"');
    expect(source).not.toMatch(/@\/lib\/prisma|PrismaClient|prisma\./);
    expect(source).not.toMatch(/account-claim|AccountClaim/);
    expect(source).not.toMatch(/from "next\/headers"|\bcookies\s*\(/);
    expect(source).not.toMatch(/console\.|\blogger\b/);
    expect(source).not.toMatch(
      /AUTH_SECRET|NEXTAUTH_SECRET|MYCKEO_ADMIN_KEY|ACCOUNT_PROVISIONING_HMAC_SECRET|RESERVATION_MANAGEMENT_SECRET/,
    );
  });
});
