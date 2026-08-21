import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ReservationOperationAction, ReservationStatus } from "@prisma/client";

jest.mock("server-only", () => ({}), { virtual: true });

import {
  buildCancelReservationOperationFingerprint,
  buildCreateReservationOperationFingerprint,
  buildUpdateReservationOperationFingerprint,
  canonicalizeReservationOperationValue,
  createReservationOperationFingerprint,
  isValidReservationOperationSourceReference,
} from "./reservation-operation";

const start = "2026-09-01T15:00:00.000Z";
const end = "2026-09-01T15:30:00.000Z";

function requiredResult<T>(value: T | null): T {
  expect(value).not.toBeNull();
  if (value === null) throw new Error("Expected a valid fingerprint result.");
  return value;
}

function createInput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    nombreCliente: "Ana Cliente",
    telefonoCliente: "3001234567",
    fechaHoraInicio: start,
    fechaHoraFin: end,
    notas: "Mesa tranquila",
    estado: ReservationStatus.PENDIENTE,
    permitirSobrecupo: false,
    ...overrides,
  };
}

describe("reservation-operation", () => {
  describe("sourceReference", () => {
    it.each(["wa:wamid.test:0", "abc", "A B", "referencia-ñ-😀"])(
      "acepta un identificador opaco válido: %s",
      (value) => {
        expect(isValidReservationOperationSourceReference(value)).toBe(true);
      },
    );

    it.each([
      "",
      " abc",
      "abc ",
      "\tabc",
      "abc\n",
      `abc${String.fromCharCode(0x7f)}`,
      `abc${String.fromCharCode(0x80)}`,
      "a".repeat(256),
      null,
      undefined,
      123,
      {},
    ])("rechaza una referencia inválida: %p", (value) => {
      expect(isValidReservationOperationSourceReference(value)).toBe(false);
    });

    it("no cambia case ni normaliza el valor", () => {
      const upper = "ABC";
      const lower = "abc";

      expect(isValidReservationOperationSourceReference(upper)).toBe(true);
      expect(isValidReservationOperationSourceReference(lower)).toBe(true);
      expect(upper).not.toBe(lower);
    });

    it("aplica el límite sobre length de JavaScript", () => {
      expect(isValidReservationOperationSourceReference("😀".repeat(127))).toBe(
        true,
      );
      expect(isValidReservationOperationSourceReference("😀".repeat(128))).toBe(
        false,
      );
    });
  });

  describe("canonical JSON y fingerprint genérico", () => {
    it("ordena keys recursivamente", () => {
      const first = {
        z: 3,
        nested: { z: 2, a: 1 },
        a: 1,
      };
      const second = {
        a: 1,
        nested: { a: 1, z: 2 },
        z: 3,
      };

      expect(canonicalizeReservationOperationValue(first)).toBe(
        canonicalizeReservationOperationValue(second),
      );
      expect(
        createReservationOperationFingerprint({
          action: ReservationOperationAction.CREATE,
          payload: first,
        }),
      ).toBe(
        createReservationOperationFingerprint({
          action: ReservationOperationAction.CREATE,
          payload: second,
        }),
      );
    });

    it("conserva el orden de arrays", () => {
      const ordered = createReservationOperationFingerprint({
        action: ReservationOperationAction.CREATE,
        payload: [1, 2],
      });
      const reversed = createReservationOperationFingerprint({
        action: ReservationOperationAction.CREATE,
        payload: [2, 1],
      });

      expect(ordered).not.toBe(reversed);
    });

    it("omite undefined en objetos", () => {
      const withUndefined = createReservationOperationFingerprint({
        action: ReservationOperationAction.CREATE,
        payload: { a: 1, b: undefined },
      });
      const omitted = createReservationOperationFingerprint({
        action: ReservationOperationAction.CREATE,
        payload: { a: 1 },
      });

      expect(withUndefined).toBe(omitted);
    });

    it("rechaza undefined y holes dentro de arrays", () => {
      expect(() =>
        createReservationOperationFingerprint({
          action: ReservationOperationAction.CREATE,
          payload: [1, undefined],
        }),
      ).toThrow(TypeError);

      const sparse = new Array(2);
      sparse[0] = 1;
      expect(() =>
        createReservationOperationFingerprint({
          action: ReservationOperationAction.CREATE,
          payload: sparse,
        }),
      ).toThrow(TypeError);
    });

    it("acepta objetos con prototype null", () => {
      const nullPrototype = Object.create(null) as Record<string, unknown>;
      nullPrototype.z = 2;
      nullPrototype.a = 1;

      expect(canonicalizeReservationOperationValue(nullPrototype)).toBe(
        canonicalizeReservationOperationValue({ a: 1, z: 2 }),
      );
    });

    it("rechaza tipos y estructuras no canónicas", () => {
      class Instance {
        value = 1;
      }

      const invalidValues: unknown[] = [
        NaN,
        Infinity,
        -Infinity,
        BigInt(1),
        new Date(start),
        new Map([["a", 1]]),
        new Set([1]),
        () => 1,
        Symbol("value"),
        new Instance(),
      ];

      for (const payload of invalidValues) {
        expect(() =>
          createReservationOperationFingerprint({
            action: ReservationOperationAction.CREATE,
            payload,
          }),
        ).toThrow(TypeError);
      }
    });

    it("rechaza referencias circulares y symbol keys", () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      const symbolKey = { a: 1 } as Record<PropertyKey, unknown>;
      symbolKey[Symbol("hidden")] = 2;

      expect(() => canonicalizeReservationOperationValue(circular)).toThrow(
        TypeError,
      );
      expect(() => canonicalizeReservationOperationValue(symbolKey)).toThrow(
        TypeError,
      );
    });

    it("usa la preimagen y formato v1 exactos", () => {
      const canonicalDocument = '{"action":"CREATE","payload":{"a":1,"z":2}}';
      const expectedDigest = createHash("sha256")
        .update(`myckeo:reservation-operation:v1\n${canonicalDocument}`, "utf8")
        .digest("hex");
      const fingerprint = createReservationOperationFingerprint({
        action: ReservationOperationAction.CREATE,
        payload: { z: 2, a: 1 },
      });

      expect(fingerprint).toBe(`v1:${expectedDigest}`);
      expect(fingerprint).toMatch(/^v1:[0-9a-f]{64}$/);
      expect(fingerprint).toHaveLength(67);
    });

    it("incluye action en el documento canónico", () => {
      const payload = { value: "same" };
      const createFingerprint = createReservationOperationFingerprint({
        action: ReservationOperationAction.CREATE,
        payload,
      });
      const updateFingerprint = createReservationOperationFingerprint({
        action: ReservationOperationAction.UPDATE,
        payload,
      });

      expect(createFingerprint).not.toBe(updateFingerprint);
    });

    it("rechaza actions fuera del enum", () => {
      expect(() =>
        createReservationOperationFingerprint({
          action: "UPSERT" as ReservationOperationAction,
          payload: {},
        }),
      ).toThrow(TypeError);
    });
  });

  describe("CREATE factory", () => {
    it("produce el documento canónico completo", () => {
      const result = requiredResult(
        buildCreateReservationOperationFingerprint(
          createInput({
            nombreCliente: "  Ana Cliente  ",
            telefonoCliente: "+57 (300) 123-4567",
            notas: "  Mesa tranquila  ",
          }),
        ),
      );

      expect(result.action).toBe(ReservationOperationAction.CREATE);
      expect(result.payload).toEqual({
        nombreCliente: "Ana Cliente",
        telefonoCliente: "+573001234567",
        fechaHoraInicio: start,
        fechaHoraFin: end,
        notas: "Mesa tranquila",
        estado: ReservationStatus.PENDIENTE,
        permitirSobrecupo: false,
      });
      expect(result.fingerprint).toBe(
        createReservationOperationFingerprint({
          action: result.action,
          payload: result.payload,
        }),
      );
    });

    it("normaliza teléfonos locales e internacionales equivalentes", () => {
      const local = requiredResult(
        buildCreateReservationOperationFingerprint(createInput()),
      );
      const international = requiredResult(
        buildCreateReservationOperationFingerprint(
          createInput({ telefonoCliente: "+573001234567" }),
        ),
      );

      expect(local.payload.telefonoCliente).toBe("+573001234567");
      expect(local.fingerprint).toBe(international.fingerprint);
    });

    it("normaliza instantes equivalentes al mismo ISO", () => {
      const utc = requiredResult(
        buildCreateReservationOperationFingerprint(createInput()),
      );
      const offset = requiredResult(
        buildCreateReservationOperationFingerprint(
          createInput({
            fechaHoraInicio: "2026-09-01T10:00:00-05:00",
            fechaHoraFin: "2026-09-01T10:30:00-05:00",
          }),
        ),
      );

      expect(offset.payload.fechaHoraInicio).toBe(start);
      expect(offset.payload.fechaHoraFin).toBe(end);
      expect(offset.fingerprint).toBe(utc.fingerprint);
    });

    it("acepta Date válidas y nunca deja Date crudas en el payload", () => {
      const result = requiredResult(
        buildCreateReservationOperationFingerprint(
          createInput({
            fechaHoraInicio: new Date(start),
            fechaHoraFin: new Date(end),
          }),
        ),
      );

      expect(result.payload.fechaHoraInicio).toBe(start);
      expect(result.payload.fechaHoraFin).toBe(end);
    });

    it("trata notas undefined, null y vacías como equivalentes", () => {
      const fingerprints = [undefined, null, "   "].map(
        (notas) =>
          requiredResult(
            buildCreateReservationOperationFingerprint(createInput({ notas })),
          ).fingerprint,
      );

      expect(new Set(fingerprints).size).toBe(1);
    });

    it("trata fechaHoraFin ausente y null como equivalentes", () => {
      const withoutEnd = createInput();
      delete withoutEnd.fechaHoraFin;
      const absent = requiredResult(
        buildCreateReservationOperationFingerprint(withoutEnd),
      );
      const explicitNull = requiredResult(
        buildCreateReservationOperationFingerprint(
          createInput({ fechaHoraFin: null }),
        ),
      );

      expect(absent.payload.fechaHoraFin).toBeNull();
      expect(absent.fingerprint).toBe(explicitNull.fingerprint);
    });

    it("aplica PENDIENTE y false como defaults", () => {
      const implicitInput = createInput();
      delete implicitInput.estado;
      delete implicitInput.permitirSobrecupo;

      const implicit = requiredResult(
        buildCreateReservationOperationFingerprint(implicitInput),
      );
      const explicit = requiredResult(
        buildCreateReservationOperationFingerprint(createInput()),
      );

      expect(implicit.payload.estado).toBe(ReservationStatus.PENDIENTE);
      expect(implicit.payload.permitirSobrecupo).toBe(false);
      expect(implicit.fingerprint).toBe(explicit.fingerprint);
    });

    it.each([
      ["nombreCliente", "Beatriz Cliente"],
      ["telefonoCliente", "3011234567"],
      ["fechaHoraInicio", "2026-09-01T16:00:00.000Z"],
      ["fechaHoraFin", "2026-09-01T16:30:00.000Z"],
      ["notas", "Otra nota"],
      ["estado", ReservationStatus.CONFIRMADA],
      ["permitirSobrecupo", true],
    ])("cambia el fingerprint cuando cambia %s", (field, value) => {
      const baseline = requiredResult(
        buildCreateReservationOperationFingerprint(createInput()),
      );
      const changed = requiredResult(
        buildCreateReservationOperationFingerprint(
          createInput({ [field]: value }),
        ),
      );

      expect(changed.fingerprint).not.toBe(baseline.fingerprint);
    });

    it("rechaza inputs inválidos sin lanzar", () => {
      const invalidInputs = [
        createInput({ nombreCliente: "   " }),
        createInput({ telefonoCliente: "phone:3001234567" }),
        createInput({ telefonoCliente: "123" }),
        createInput({ fechaHoraInicio: "invalid" }),
        createInput({ fechaHoraFin: "invalid" }),
        createInput({ notas: 123 }),
        createInput({ estado: ReservationStatus.BLOQUEADA }),
        createInput({ permitirSobrecupo: "true" }),
      ];

      for (const input of invalidInputs) {
        expect(buildCreateReservationOperationFingerprint(input)).toBeNull();
      }
    });
  });

  describe("UPDATE factory", () => {
    it("incluye sólo cambios presentes y normalizados", () => {
      const result = requiredResult(
        buildUpdateReservationOperationFingerprint({
          reservaId: "  reservation-1  ",
          nombreCliente: "  Ana Actualizada  ",
          telefonoCliente: "300 123 4567",
          fechaHoraInicio: "2026-09-01T10:00:00-05:00",
          fechaHoraFin: null,
          notas: "   ",
          estado: ReservationStatus.CONFIRMADA,
        }),
      );

      expect(result.action).toBe(ReservationOperationAction.UPDATE);
      expect(result.payload).toEqual({
        reservaId: "reservation-1",
        cambios: {
          nombreCliente: "Ana Actualizada",
          telefonoCliente: "+573001234567",
          fechaHoraInicio: start,
          fechaHoraFin: null,
          notas: null,
          estado: ReservationStatus.CONFIRMADA,
        },
        permitirSobrecupo: false,
      });
    });

    it("distingue fechaHoraFin ausente de null explícito", () => {
      const absent = requiredResult(
        buildUpdateReservationOperationFingerprint({
          reservaId: "reservation-1",
          notas: "Misma nota",
        }),
      );
      const explicitNull = requiredResult(
        buildUpdateReservationOperationFingerprint({
          reservaId: "reservation-1",
          notas: "Misma nota",
          fechaHoraFin: null,
        }),
      );

      expect(absent.payload.cambios).not.toHaveProperty("fechaHoraFin");
      expect(explicitNull.payload.cambios).toHaveProperty("fechaHoraFin", null);
      expect(absent.fingerprint).not.toBe(explicitNull.fingerprint);
    });

    it("es independiente del orden de los cambios", () => {
      const first = requiredResult(
        buildUpdateReservationOperationFingerprint({
          reservaId: "reservation-1",
          nombreCliente: "Ana",
          notas: "Nota",
        }),
      );
      const second = requiredResult(
        buildUpdateReservationOperationFingerprint({
          notas: "Nota",
          nombreCliente: "Ana",
          reservaId: "reservation-1",
        }),
      );

      expect(first.fingerprint).toBe(second.fingerprint);
    });

    it("incluye reservaId en el fingerprint", () => {
      const first = requiredResult(
        buildUpdateReservationOperationFingerprint({
          reservaId: "reservation-1",
          notas: "Nota",
        }),
      );
      const second = requiredResult(
        buildUpdateReservationOperationFingerprint({
          reservaId: "reservation-2",
          notas: "Nota",
        }),
      );

      expect(first.fingerprint).not.toBe(second.fingerprint);
    });

    it("rechaza cambios vacíos", () => {
      expect(
        buildUpdateReservationOperationFingerprint({
          reservaId: "reservation-1",
        }),
      ).toBeNull();
      expect(
        buildUpdateReservationOperationFingerprint({
          reservaId: "reservation-1",
          permitirSobrecupo: true,
        }),
      ).toBeNull();
    });

    it("rechaza null/undefined donde el contrato exige valor", () => {
      const invalidInputs = [
        { reservaId: "reservation-1", nombreCliente: null },
        { reservaId: "reservation-1", telefonoCliente: null },
        { reservaId: "reservation-1", fechaHoraInicio: null },
        { reservaId: "reservation-1", fechaHoraFin: undefined },
        { reservaId: "reservation-1", notas: undefined },
        { reservaId: "reservation-1", estado: ReservationStatus.BLOQUEADA },
        {
          reservaId: "reservation-1",
          notas: "Nota",
          permitirSobrecupo: "false",
        },
      ];

      for (const input of invalidInputs) {
        expect(buildUpdateReservationOperationFingerprint(input)).toBeNull();
      }
    });
  });

  describe("CANCEL factory", () => {
    it("normaliza reservaId y motivo desde notas", () => {
      const result = requiredResult(
        buildCancelReservationOperationFingerprint({
          reservaId: "  reservation-1  ",
          notas: "  Cambio de planes  ",
        }),
      );

      expect(result.action).toBe(ReservationOperationAction.CANCEL);
      expect(result.payload).toEqual({
        reservaId: "reservation-1",
        motivo: "Cambio de planes",
      });
    });

    it("trata motivo undefined, null y vacío como equivalentes", () => {
      const fingerprints = [undefined, null, "   "].map(
        (notas) =>
          requiredResult(
            buildCancelReservationOperationFingerprint({
              reservaId: "reservation-1",
              notas,
            }),
          ).fingerprint,
      );

      expect(new Set(fingerprints).size).toBe(1);
    });

    it("cambia el fingerprint cuando cambia el motivo", () => {
      const first = requiredResult(
        buildCancelReservationOperationFingerprint({
          reservaId: "reservation-1",
          notas: "Motivo A",
        }),
      );
      const second = requiredResult(
        buildCancelReservationOperationFingerprint({
          reservaId: "reservation-1",
          notas: "Motivo B",
        }),
      );

      expect(first.fingerprint).not.toBe(second.fingerprint);
    });

    it("rechaza reservaId o motivo inválidos", () => {
      expect(
        buildCancelReservationOperationFingerprint({ reservaId: "   " }),
      ).toBeNull();
      expect(
        buildCancelReservationOperationFingerprint({
          reservaId: "reservation-1",
          notas: 123,
        }),
      ).toBeNull();
    });
  });

  it("es determinista para invocaciones repetidas", () => {
    const input = createInput();
    const fingerprints = Array.from(
      { length: 5 },
      () =>
        requiredResult(buildCreateReservationOperationFingerprint(input))
          .fingerprint,
    );

    expect(new Set(fingerprints).size).toBe(1);
  });

  it("permanece server-only, puro y sin infraestructura", () => {
    const source = readFileSync(
      join(process.cwd(), "src/reservas/lib/reservation-operation.ts"),
      "utf8",
    );

    expect(source).toMatch(/^import "server-only";/);
    expect(source).not.toContain('"use server"');
    expect(source).not.toMatch(
      /@\/lib\/prisma|new PrismaClient|\$query|\$execute/,
    );
    expect(source).not.toMatch(/\bauth\(|cookies\(|PUBLISHED|console\./);
    expect(source).not.toMatch(/capabilityId|tokenHash|managementUrl/);
  });
});
