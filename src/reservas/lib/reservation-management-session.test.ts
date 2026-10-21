import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("server-only", () => ({}), { virtual: true });

import {
  createReservationManagementSession,
  getReservationManagementCookieClearOptions,
  getReservationManagementCookieName,
  getReservationManagementCookieOptions,
  verifyReservationManagementSession,
} from "./reservation-management-session";

const originalSecret = process.env.RESERVATION_MANAGEMENT_SECRET;
const originalNodeEnv = process.env.NODE_ENV;
const validSecret = Buffer.from(
  Array.from({ length: 32 }, (_, index) => index + 1),
).toString("base64url");
const otherValidSecret = Buffer.from(
  Array.from({ length: 32 }, (_, index) => 255 - index),
).toString("base64url");
const now = new Date("2026-08-19T12:00:00.000Z");
const capabilityId = "capability_synthetic-1";

function signPayload(
  payload: Record<string, unknown>,
  version = "v1",
  secret = validSecret,
): string {
  const payloadBase64url = Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url");
  const signedContent = `${version}.${payloadBase64url}`;
  const signature = createHmac(
    "sha256",
    Buffer.from(secret, "base64url"),
  )
    .update(signedContent)
    .digest("base64url");

  return `${signedContent}.${signature}`;
}

function setNodeEnv(value: string): void {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  });
}

describe("reservation-management-session", () => {
  beforeEach(() => {
    process.env.RESERVATION_MANAGEMENT_SECRET = validSecret;
    setNodeEnv("test");
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.RESERVATION_MANAGEMENT_SECRET;
    } else {
      process.env.RESERVATION_MANAGEMENT_SECRET = originalSecret;
    }

    setNodeEnv(originalNodeEnv ?? "test");
  });

  describe("cookie contract", () => {
    const futureExpiresAt = new Date("2099-01-01T12:34:56.789Z");

    it("usa nombre __Secure- y secure=true exclusivamente en producción", () => {
      setNodeEnv("production");

      expect(getReservationManagementCookieName()).toBe(
        "__Secure-myckeo-reservation-management",
      );
      expect(getReservationManagementCookieOptions(futureExpiresAt)).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/reservas/gestionar",
        expires: futureExpiresAt,
      });
      expect(
        getReservationManagementCookieOptions(futureExpiresAt),
      ).not.toHaveProperty("domain");
    });

    it.each(["development", "test", "staging"])(
      "usa nombre local y secure=false fuera de producción: %s",
      (nodeEnv) => {
        setNodeEnv(nodeEnv);

        expect(getReservationManagementCookieName()).toBe(
          "myckeo-reservation-management",
        );
        expect(
          getReservationManagementCookieOptions(futureExpiresAt).secure,
        ).toBe(false);
      },
    );

    it("conserva exactamente la expiración recibida sin recalcular TTL", () => {
      const options =
        getReservationManagementCookieOptions(futureExpiresAt);

      expect(options.expires).toEqual(futureExpiresAt);
      expect(options.expires.getTime()).toBe(futureExpiresAt.getTime());
      expect(options).not.toHaveProperty("maxAge");
    });

    it.each([new Date(Number.NaN), new Date(0)])(
      "rechaza expiración inválida o pasada: %s",
      (expiresAt) => {
        expect(() =>
          getReservationManagementCookieOptions(expiresAt),
        ).toThrow(
          expect.objectContaining({
            code: "RESERVATION_MANAGEMENT_COOKIE_EXPIRY_INVALID",
          }),
        );
      },
    );

    it.each([
      ["production", true],
      ["development", false],
    ] as const)(
      "genera borrado canónico con las mismas flags en %s",
      (nodeEnv, secure) => {
        setNodeEnv(nodeEnv);

        expect(getReservationManagementCookieClearOptions()).toEqual({
          httpOnly: true,
          secure,
          sameSite: "lax",
          path: "/reservas/gestionar",
          expires: new Date(0),
          maxAge: 0,
        });
      },
    );

    it("centraliza nombre y path para creación y borrado", () => {
      setNodeEnv("production");
      const name = getReservationManagementCookieName();
      const createOptions =
        getReservationManagementCookieOptions(futureExpiresAt);
      const clearOptions = getReservationManagementCookieClearOptions();
      const source = readFileSync(
        join(
          process.cwd(),
          "src/reservas/lib/reservation-management-session.ts",
        ),
        "utf8",
      );

      expect(name).toBe("__Secure-myckeo-reservation-management");
      expect(createOptions.path).toBe(clearOptions.path);
      expect(createOptions.secure).toBe(clearOptions.secure);
      expect(createOptions.httpOnly).toBe(clearOptions.httpOnly);
      expect(createOptions.sameSite).toBe(clearOptions.sameSite);
      expect(
        source.match(/"myckeo-reservation-management"/g),
      ).toHaveLength(1);
      expect(source.match(/"\/reservas\/gestionar"/g)).toHaveLength(1);
    });

    it("no lee el secret para resolver nombre u opciones", () => {
      delete process.env.RESERVATION_MANAGEMENT_SECRET;

      expect(getReservationManagementCookieName()).toBe(
        "myckeo-reservation-management",
      );
      expect(getReservationManagementCookieOptions(futureExpiresAt)).toEqual(
        expect.objectContaining({ expires: futureExpiresAt }),
      );
      expect(getReservationManagementCookieClearOptions()).toEqual(
        expect.objectContaining({ expires: new Date(0), maxAge: 0 }),
      );
    });
  });

  it("crea y verifica un contexto firmado round-trip", () => {
    const created = createReservationManagementSession(
      {
        capabilityId,
        capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
      },
      now,
    );

    expect(verifyReservationManagementSession(created.value, now)).toEqual({
      capabilityId,
      expiresAt: created.expiresAt,
    });
  });

  it("limita la sesión a 30 minutos", () => {
    const created = createReservationManagementSession(
      {
        capabilityId,
        capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
      },
      now,
    );

    expect(created.expiresAt).toEqual(
      new Date("2026-08-19T12:30:00.000Z"),
    );
  });

  it("nunca supera la expiración de la capability y redondea hacia abajo", () => {
    const capabilityExpiresAt = new Date("2026-08-19T12:10:00.987Z");
    const created = createReservationManagementSession(
      { capabilityId, capabilityExpiresAt },
      now,
    );

    expect(created.expiresAt).toEqual(
      new Date("2026-08-19T12:10:00.000Z"),
    );
    expect(created.expiresAt.getTime()).toBeLessThanOrEqual(
      capabilityExpiresAt.getTime(),
    );
  });

  it.each([
    new Date("2026-08-19T12:00:00.000Z"),
    new Date("2026-08-19T11:59:59.999Z"),
  ])("rechaza una capability ya expirada: %s", (capabilityExpiresAt) => {
    expect(() =>
      createReservationManagementSession(
        { capabilityId, capabilityExpiresAt },
        now,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "RESERVATION_MANAGEMENT_SESSION_INPUT_INVALID",
      }),
    );
  });

  it("rechaza fechas inválidas al crear y verificar", () => {
    expect(() =>
      createReservationManagementSession(
        { capabilityId, capabilityExpiresAt: new Date(Number.NaN) },
        now,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "RESERVATION_MANAGEMENT_SESSION_INPUT_INVALID",
      }),
    );
    expect(() =>
      createReservationManagementSession(
        {
          capabilityId,
          capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
        },
        new Date(Number.NaN),
      ),
    ).toThrow(
      expect.objectContaining({
        code: "RESERVATION_MANAGEMENT_SESSION_INPUT_INVALID",
      }),
    );
    expect(
      verifyReservationManagementSession("anything", new Date(Number.NaN)),
    ).toBeNull();
  });

  it.each([
    "",
    " capability",
    "capability ",
    "capability.id",
    "capability/1",
    "ñ",
    "A".repeat(129),
  ])("rechaza capabilityId fuera del contrato: %j", (invalidCapabilityId) => {
    expect(() =>
      createReservationManagementSession(
        {
          capabilityId: invalidCapabilityId,
          capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
        },
        now,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "RESERVATION_MANAGEMENT_SESSION_INPUT_INVALID",
      }),
    );
  });

  it("usa exactamente v1.<payloadBase64url>.<signatureBase64url>", () => {
    const created = createReservationManagementSession(
      {
        capabilityId,
        capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
      },
      now,
    );
    const segments = created.value.split(".");

    expect(segments).toHaveLength(3);
    expect(segments[0]).toBe("v1");
    expect(segments[1]).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(segments[2]).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("serializa únicamente v, capabilityId y exp", () => {
    const created = createReservationManagementSession(
      {
        capabilityId,
        capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
      },
      now,
    );
    const [, payloadBase64url] = created.value.split(".");
    const payload = JSON.parse(
      Buffer.from(payloadBase64url, "base64url").toString("utf8"),
    );

    expect(payload).toEqual({
      v: 1,
      capabilityId,
      exp: 1787142600,
    });
    expect(Object.keys(payload)).toEqual(["v", "capabilityId", "exp"]);
  });

  it("firma exactamente la versión y el payload", () => {
    const created = createReservationManagementSession(
      {
        capabilityId,
        capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
      },
      now,
    );
    const [version, payloadBase64url, signature] = created.value.split(".");
    const expectedSignature = createHmac(
      "sha256",
      Buffer.from(validSecret, "base64url"),
    )
      .update(`${version}.${payloadBase64url}`)
      .digest("base64url");

    expect(signature).toBe(expectedSignature);
  });

  it("es determinista para el mismo payload, expiración y secret", () => {
    const input = {
      capabilityId,
      capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
    };

    expect(createReservationManagementSession(input, now)).toEqual(
      createReservationManagementSession(input, now),
    );
  });

  it("rechaza payload o firma manipulados", () => {
    const created = createReservationManagementSession(
      {
        capabilityId,
        capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
      },
      now,
    );
    const [version, payload, signature] = created.value.split(".");
    const tamperedPayload = `${payload[0] === "A" ? "B" : "A"}${payload.slice(1)}`;
    const tamperedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;

    expect(
      verifyReservationManagementSession(
        `${version}.${tamperedPayload}.${signature}`,
        now,
      ),
    ).toBeNull();
    expect(
      verifyReservationManagementSession(
        `${version}.${payload}.${tamperedSignature}`,
        now,
      ),
    ).toBeNull();
  });

  it("rechaza una firma producida con otro secret", () => {
    const created = createReservationManagementSession(
      {
        capabilityId,
        capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
      },
      now,
    );
    process.env.RESERVATION_MANAGEMENT_SECRET = otherValidSecret;

    expect(
      verifyReservationManagementSession(created.value, now),
    ).toBeNull();
  });

  it("rechaza versión de envelope o payload distinta de v1", () => {
    const exp = 1787142600;

    expect(
      verifyReservationManagementSession(
        signPayload({ v: 1, capabilityId, exp }, "v2"),
        now,
      ),
    ).toBeNull();
    expect(
      verifyReservationManagementSession(
        signPayload({ v: 2, capabilityId, exp }),
        now,
      ),
    ).toBeNull();
  });

  it.each([
    null,
    undefined,
    123,
    "",
    "one",
    "v1.payload",
    "v1.payload.signature.extra",
    "v1.===.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "v1.payload.short",
    `v1.payñload.${"A".repeat(43)}`,
    "A".repeat(1025),
  ])("rechaza input malformed sin lanzar: %p", (value) => {
    expect(verifyReservationManagementSession(value, now)).toBeNull();
  });

  it("rechaza JSON inválido aunque tenga firma correcta", () => {
    const payloadBase64url = Buffer.from("not-json", "utf8").toString(
      "base64url",
    );
    const signedContent = `v1.${payloadBase64url}`;
    const signature = createHmac(
      "sha256",
      Buffer.from(validSecret, "base64url"),
    )
      .update(signedContent)
      .digest("base64url");

    expect(
      verifyReservationManagementSession(
        `${signedContent}.${signature}`,
        now,
      ),
    ).toBeNull();
  });

  it("rechaza expiración anterior o exactamente igual a now", () => {
    expect(
      verifyReservationManagementSession(
        signPayload({ v: 1, capabilityId, exp: 1787140799 }),
        now,
      ),
    ).toBeNull();
    expect(
      verifyReservationManagementSession(
        signPayload({ v: 1, capabilityId, exp: 1787140800 }),
        now,
      ),
    ).toBeNull();
  });

  it("rechaza expiración firmada que excede el TTL máximo", () => {
    expect(
      verifyReservationManagementSession(
        signPayload({ v: 1, capabilityId, exp: 1787142601 }),
        now,
      ),
    ).toBeNull();
  });

  it.each([
    { v: 1, capabilityId, exp: 1.5 },
    { v: 1, capabilityId, exp: -1 },
    { v: 1, capabilityId: "invalid id", exp: 1787142600 },
    { v: 1, capabilityId, exp: 1787142600, reservationId: "reservation-1" },
    { v: 1, capabilityId, exp: 1787142600, extra: true },
  ])("rechaza payload firmado fuera del contrato mínimo: %p", (payload) => {
    expect(
      verifyReservationManagementSession(signPayload(payload), now),
    ).toBeNull();
  });

  it("falla de forma controlada cuando falta el secret", () => {
    const created = createReservationManagementSession(
      {
        capabilityId,
        capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
      },
      now,
    );
    delete process.env.RESERVATION_MANAGEMENT_SECRET;

    expect(() =>
      createReservationManagementSession(
        {
          capabilityId,
          capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
        },
        now,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "RESERVATION_MANAGEMENT_SECRET_INVALID",
      }),
    );
    expect(() =>
      verifyReservationManagementSession(created.value, now),
    ).toThrow(
      expect.objectContaining({
        code: "RESERVATION_MANAGEMENT_SECRET_INVALID",
      }),
    );
  });

  it.each([
    "",
    "not+base64url",
    "a".repeat(32),
    Buffer.alloc(31, 1).toString("base64url"),
    `${Buffer.alloc(32, 1).toString("base64url")}=`,
  ])("rechaza secret no canónico o menor de 32 bytes", (invalidSecret) => {
    process.env.RESERVATION_MANAGEMENT_SECRET = invalidSecret;

    expect(() =>
      createReservationManagementSession(
        {
          capabilityId,
          capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
        },
        now,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "RESERVATION_MANAGEMENT_SECRET_INVALID",
      }),
    );
  });

  it("no filtra el secret en resultados ni errores", () => {
    const created = createReservationManagementSession(
      {
        capabilityId,
        capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
      },
      now,
    );
    expect(created.value).not.toContain(validSecret);
    expect(JSON.stringify(created)).not.toContain(validSecret);

    process.env.RESERVATION_MANAGEMENT_SECRET = "invalid";
    try {
      createReservationManagementSession(
        {
          capabilityId,
          capabilityExpiresAt: new Date("2026-08-19T15:00:00.000Z"),
        },
        now,
      );
      throw new Error("Expected configuration error.");
    } catch (error) {
      expect(String(error)).not.toContain("invalid");
    }
  });

  it("es server-only, puro y no integra DB, auth, cookies, PUBLISHED ni logs", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/reservas/lib/reservation-management-session.ts",
      ),
      "utf8",
    );

    expect(source.startsWith('import "server-only";')).toBe(true);
    expect(source).not.toContain('"use server"');
    expect(source).toContain("timingSafeEqual(");
    expect(source).not.toMatch(/@\/lib\/prisma|\bprisma\b|\$transaction/);
    expect(source).not.toMatch(/auth\.config|\bauth\s*\(/);
    expect(source).not.toMatch(/\bcookies\s*\(|\.set\s*\(|\.get\s*\(|\.delete\s*\(/);
    expect(source).not.toMatch(
      /business-visibility-policy|buildPublishedBusinessWhere|PUBLISHED/,
    );
    expect(source).not.toMatch(/reservationId|tokenHash|telefono|nombre|notas/);
    expect(source).not.toMatch(/console\./);
  });
});
