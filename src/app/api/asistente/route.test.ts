import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Prisma,
  ReservationOperationAction,
  ReservationOperationOutcome,
  ReservationStatus,
} from "@prisma/client";

const TEST_ADMIN_KEY = "asistente-route-test-secret";
const TEST_SITE_ORIGIN = "https://reservas.staging.test";
const RESOLVED_BUSINESS_ID = "business-resolved-from-phone";

const mockNegocioFindFirst = jest.fn();
const mockBusinessAvailabilityFindUnique = jest.fn();
const mockReservationCount = jest.fn();
const mockReservationFindMany = jest.fn();
const mockReservationFindFirst = jest.fn();
const mockReservationCreate = jest.fn();
const mockReservationUpdate = jest.fn();
const mockReservationUpdateMany = jest.fn();
const mockReservationDelete = jest.fn();
const mockReservationDeleteMany = jest.fn();
const mockReservationOperationFindUnique = jest.fn();
const mockReservationOperationCreate = jest.fn();
const mockRevokeActiveReservationCapabilitiesInTx = jest.fn();
const mockRotateReservationCapabilityInTx = jest.fn();
const mockTransaction = jest.fn();
const mockOrderCount = jest.fn();
const mockOrderAggregate = jest.fn();
const mockOrderFindMany = jest.fn();
const mockOrderFindFirst = jest.fn();

const directVisibleWhere = {
  estado: "activo",
  isTestData: false,
  archivedAt: null,
  usuario: { is: { estado: "activo" } },
};
const mockBuildPublicBusinessVisibilityWhere = jest.fn(
  () => directVisibleWhere,
);

const mockTransactionClient = {
  businessAvailability: {
    findUnique: mockBusinessAvailabilityFindUnique,
  },
  reservation: {
    findMany: mockReservationFindMany,
    findFirst: mockReservationFindFirst,
    create: mockReservationCreate,
    update: mockReservationUpdate,
    updateMany: mockReservationUpdateMany,
  },
  reservationOperation: {
    findUnique: mockReservationOperationFindUnique,
    create: mockReservationOperationCreate,
  },
};

jest.mock("server-only", () => ({}), { virtual: true });

jest.mock(
  "@/reservas/lib/reservation-capability",
  () => ({
    revokeActiveReservationCapabilitiesInTx:
      mockRevokeActiveReservationCapabilitiesInTx,
    rotateReservationCapabilityInTx: mockRotateReservationCapabilityInTx,
  }),
  { virtual: true },
);

jest.mock(
  "@/reservas/lib/reservation-operation",
  () => jest.requireActual("../../../reservas/lib/reservation-operation"),
  { virtual: true },
);

jest.mock(
  "@/lib/prisma",
  () => ({
    __esModule: true,
    default: {
      negocio: { findFirst: mockNegocioFindFirst },
      businessAvailability: {
        findUnique: mockBusinessAvailabilityFindUnique,
      },
      reservation: {
        count: mockReservationCount,
        findMany: mockReservationFindMany,
        findFirst: mockReservationFindFirst,
        create: mockReservationCreate,
        update: mockReservationUpdate,
        updateMany: mockReservationUpdateMany,
        delete: mockReservationDelete,
        deleteMany: mockReservationDeleteMany,
      },
      order: {
        count: mockOrderCount,
        aggregate: mockOrderAggregate,
        findMany: mockOrderFindMany,
        findFirst: mockOrderFindFirst,
      },
      $transaction: mockTransaction,
    },
  }),
  { virtual: true },
);

jest.mock(
  "@/lib/business/publicBusinessVisibility",
  () => ({
    buildPublicBusinessVisibilityWhere: mockBuildPublicBusinessVisibilityWhere,
  }),
  { virtual: true },
);

const previousAdminKey = process.env.MYCKEO_ADMIN_KEY;
const previousSiteUrl = process.env.SITE_URL;
process.env.MYCKEO_ADMIN_KEY = TEST_ADMIN_KEY;
process.env.SITE_URL = TEST_SITE_ORIGIN;

let POST: typeof import("./route").POST;

const business = {
  id: RESOLVED_BUSINESS_ID,
  nombre: "Café Interno",
  slug: "cafe-interno",
  fotoPerfil: null,
  fotoPortada: null,
  ciudad: "Bogotá",
  direccion: "Calle 1",
  sitioWeb: null,
  urlGoogleMaps: null,
};

const reservationStart = new Date("2026-08-20T15:00:00.000Z");
const reservationEnd = new Date("2026-08-20T15:30:00.000Z");
const reservation = {
  id: "reservation-1",
  negocioId: RESOLVED_BUSINESS_ID,
  usuarioId: null,
  nombre: "Ana Cliente",
  telefono: "+573001112233",
  fechaHoraInicio: reservationStart,
  fechaHoraFin: reservationEnd,
  notas: "Mesa tranquila",
  estado: ReservationStatus.PENDIENTE,
  createdAt: new Date("2026-08-19T12:00:00.000Z"),
  updatedAt: new Date("2026-08-19T12:00:00.000Z"),
};

const validAvailability = {
  diasAtencion: ["Jueves"],
  franjaMananaInicio: "09:00",
  franjaMananaFin: "17:00",
  franjaTardeInicio: null,
  franjaTardeFin: null,
  intervaloMinutos: 30,
  capacidadPorIntervalo: 2,
  duracionMinimaIntervalos: 1,
};

type RequestBody = Record<string, unknown>;

function makeRequest(
  body: RequestBody,
  apiKey: string | null = TEST_ADMIN_KEY,
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (apiKey !== null) headers.set("x-api-key", apiKey);

  return new Request("http://localhost/api/asistente", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function bodyFor(action: string, extra: RequestBody = {}): RequestBody {
  return {
    action,
    telefono: "+57 300 999 8877",
    ...extra,
  };
}

function validCreateBody(extra: RequestBody = {}): RequestBody {
  return bodyFor("crear-reserva", {
    sourceReference: "wa:wamid.create-test:0",
    nombreCliente: "Ana Cliente",
    telefonoCliente: "+573001112233",
    fechaHoraInicio: reservationStart.toISOString(),
    fechaHoraFin: reservationEnd.toISOString(),
    notas: "Mesa tranquila",
    ...extra,
  });
}

function validUpdateBody(extra: RequestBody = {}): RequestBody {
  return bodyFor("modificar-reserva", {
    sourceReference: "wa:wamid.update-test:0",
    reservaId: reservation.id,
    notas: "Nota actualizada",
    ...extra,
  });
}

function validCancelBody(extra: RequestBody = {}): RequestBody {
  return bodyFor("cancelar-reserva", {
    sourceReference: "wa:wamid.cancel-test:0",
    reservaId: reservation.id,
    notas: "cambio de planes",
    ...extra,
  });
}

async function fingerprintForCreateBody(body: RequestBody): Promise<string> {
  const { buildCreateReservationOperationFingerprint } = await import(
    "@/reservas/lib/reservation-operation"
  );
  const result = buildCreateReservationOperationFingerprint({
    nombreCliente: body.nombreCliente,
    telefonoCliente: body.telefonoCliente,
    fechaHoraInicio: body.fechaHoraInicio,
    ...(Object.prototype.hasOwnProperty.call(body, "fechaHoraFin")
      ? { fechaHoraFin: body.fechaHoraFin }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "notas")
      ? { notas: body.notas }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "estado")
      ? { estado: body.estado }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "permitirSobrecupo")
      ? { permitirSobrecupo: body.permitirSobrecupo }
      : {}),
  });

  if (!result) throw new Error("Expected a valid CREATE fingerprint fixture.");
  return result.fingerprint;
}

async function fingerprintForUpdateBody(body: RequestBody): Promise<string> {
  const { buildUpdateReservationOperationFingerprint } = await import(
    "@/reservas/lib/reservation-operation"
  );
  const result = buildUpdateReservationOperationFingerprint({
    reservaId: body.reservaId,
    ...(Object.prototype.hasOwnProperty.call(body, "nombreCliente") &&
    body.nombreCliente !== undefined
      ? { nombreCliente: body.nombreCliente }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "telefonoCliente") &&
    body.telefonoCliente !== undefined
      ? { telefonoCliente: body.telefonoCliente }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "fechaHoraInicio") &&
    body.fechaHoraInicio !== undefined
      ? { fechaHoraInicio: body.fechaHoraInicio }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "fechaHoraFin") &&
    body.fechaHoraFin !== undefined
      ? { fechaHoraFin: body.fechaHoraFin }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "notas") &&
    body.notas !== undefined
      ? { notas: body.notas }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "estado") &&
    body.estado !== undefined
      ? { estado: body.estado }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "permitirSobrecupo") &&
    body.permitirSobrecupo !== undefined
      ? { permitirSobrecupo: body.permitirSobrecupo }
      : {}),
  });

  if (!result) throw new Error("Expected a valid UPDATE fingerprint fixture.");
  return result.fingerprint;
}

async function fingerprintForCancelBody(body: RequestBody): Promise<string> {
  const { buildCancelReservationOperationFingerprint } = await import(
    "@/reservas/lib/reservation-operation"
  );
  const result = buildCancelReservationOperationFingerprint({
    reservaId: body.reservaId,
    ...(Object.prototype.hasOwnProperty.call(body, "notas")
      ? { notas: body.notas }
      : {}),
  });

  if (!result) throw new Error("Expected a valid CANCEL fingerprint fixture.");
  return result.fingerprint;
}

async function responseBody(
  response: Awaited<ReturnType<typeof POST>>,
): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>;
}

const prismaMocks = [
  mockNegocioFindFirst,
  mockBusinessAvailabilityFindUnique,
  mockReservationCount,
  mockReservationFindMany,
  mockReservationFindFirst,
  mockReservationCreate,
  mockReservationUpdate,
  mockReservationUpdateMany,
  mockReservationDelete,
  mockReservationDeleteMany,
  mockReservationOperationFindUnique,
  mockReservationOperationCreate,
  mockRevokeActiveReservationCapabilitiesInTx,
  mockRotateReservationCapabilityInTx,
  mockTransaction,
  mockOrderCount,
  mockOrderAggregate,
  mockOrderFindMany,
  mockOrderFindFirst,
];

function expectNoPrismaCalls(): void {
  for (const prismaMock of prismaMocks) {
    expect(prismaMock).not.toHaveBeenCalled();
  }
}

function expectNoWrites(): void {
  expect(mockReservationCreate).not.toHaveBeenCalled();
  expect(mockReservationUpdate).not.toHaveBeenCalled();
  expect(mockReservationUpdateMany).not.toHaveBeenCalled();
  expect(mockReservationDelete).not.toHaveBeenCalled();
  expect(mockReservationDeleteMany).not.toHaveBeenCalled();
  expect(mockReservationOperationCreate).not.toHaveBeenCalled();
  expect(mockRevokeActiveReservationCapabilitiesInTx).not.toHaveBeenCalled();
  expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
}

async function expectSiteOriginFailure(
  requestBody: RequestBody,
  message: string,
): Promise<void> {
  const response = await POST(makeRequest(requestBody));

  expect(response.status).toBe(500);
  await expect(responseBody(response)).resolves.toEqual({
    ok: false,
    code: "INTERNAL_ERROR",
    error: message,
    mensaje: message,
  });
  expect(mockTransaction).not.toHaveBeenCalled();
  expect(mockReservationOperationFindUnique).not.toHaveBeenCalled();
  expectNoWrites();
}

describe("POST /api/asistente baseline", () => {
  beforeAll(async () => {
    ({ POST } = await import("./route"));
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-19T12:00:00.000Z"));
    jest.clearAllMocks();
    process.env.SITE_URL = TEST_SITE_ORIGIN;
    mockNegocioFindFirst.mockResolvedValue(business);
    mockBusinessAvailabilityFindUnique.mockResolvedValue(validAvailability);
    mockReservationCount.mockResolvedValue(0);
    mockReservationFindMany.mockResolvedValue([]);
    mockReservationFindFirst.mockResolvedValue(reservation);
    mockReservationCreate.mockResolvedValue(reservation);
    mockReservationUpdate.mockResolvedValue(reservation);
    mockReservationUpdateMany.mockResolvedValue({ count: 1 });
    mockReservationOperationFindUnique.mockResolvedValue(null);
    mockReservationOperationCreate.mockResolvedValue({ id: "operation-1" });
    mockRevokeActiveReservationCapabilitiesInTx.mockResolvedValue({
      revokedCount: 1,
      revokedAt: new Date("2026-08-19T12:00:00.000Z"),
    });
    mockRotateReservationCapabilityInTx.mockResolvedValue({
      capabilityId: "capability-1",
      token: "capability-token-A",
      expiresAt: new Date("2026-08-21T15:30:00.000Z"),
    });
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof mockTransactionClient) => unknown) =>
        callback(mockTransactionClient),
    );
    mockOrderCount.mockResolvedValue(0);
    mockOrderAggregate.mockResolvedValue({ _sum: { totalAmount: null } });
    mockOrderFindMany.mockResolvedValue([]);
    mockOrderFindFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    if (previousAdminKey === undefined) {
      delete process.env.MYCKEO_ADMIN_KEY;
    } else {
      process.env.MYCKEO_ADMIN_KEY = previousAdminKey;
    }
    if (previousSiteUrl === undefined) {
      delete process.env.SITE_URL;
    } else {
      process.env.SITE_URL = previousSiteUrl;
    }
  });

  it("acepta x-api-key válida y resuelve es-negocio por teléfono, no por un negocioId del cliente", async () => {
    const response = await POST(
      makeRequest(
        bodyFor("es-negocio", { negocioId: "business-client-controlled" }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({
      isBusiness: true,
      businessName: business.nombre,
    });
    expect(mockNegocioFindFirst).toHaveBeenCalledTimes(1);
    expect(mockNegocioFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          telefonoContacto: "+573009998877",
          ...directVisibleWhere,
        },
      }),
    );
    expect(mockNegocioFindFirst.mock.calls[0][0].where).not.toHaveProperty(
      "id",
    );
  });

  it("rechaza x-api-key incorrecta con 401, sin Prisma ni secretos en la respuesta", async () => {
    const response = await POST(
      makeRequest(bodyFor("es-negocio"), "incorrect-test-key"),
    );
    const payload = await responseBody(response);

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      error: "Unauthorized",
      mensaje: "Unauthorized",
    });
    expect(JSON.stringify(payload)).not.toContain(TEST_ADMIN_KEY);
    expectNoPrismaCalls();
  });

  it("rechaza credencial ausente con 401, sin Prisma ni secretos en la respuesta", async () => {
    const response = await POST(makeRequest(bodyFor("es-negocio"), null));
    const payload = await responseBody(response);

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      error: "Unauthorized",
      mensaje: "Unauthorized",
    });
    expect(JSON.stringify(payload)).not.toContain(TEST_ADMIN_KEY);
    expectNoPrismaCalls();
  });

  it("preserva el contrato de negocio inexistente y no escribe", async () => {
    mockNegocioFindFirst.mockResolvedValue(null);

    const response = await POST(makeRequest(bodyFor("nombre")));

    expect(response.status).toBe(404);
    await expect(responseBody(response)).resolves.toEqual({
      error: "Negocio no encontrado",
      mensaje: "Negocio no encontrado",
      isBusiness: false,
      businessName: null,
      datos: null,
    });
    expect(mockNegocioFindFirst).toHaveBeenCalledTimes(2);
    expectNoWrites();
  });

  it("mantiene operativo un negocio UNLISTED bajo el boundary interno", async () => {
    const unlistedBusiness = {
      ...business,
      nombre: "Negocio UNLISTED",
      visibility: "UNLISTED",
    };
    mockNegocioFindFirst.mockResolvedValue(unlistedBusiness);

    const response = await POST(makeRequest(bodyFor("nombre")));

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({
      isBusiness: true,
      businessName: unlistedBusiness.nombre,
      nombre: unlistedBusiness.nombre,
    });
    expect(mockBuildPublicBusinessVisibilityWhere).toHaveBeenCalled();
    const where = mockNegocioFindFirst.mock.calls[0][0].where;
    expect(where.usuario.is).not.toHaveProperty("perfilCompleto");
    expect(where.usuario.is).not.toHaveProperty("isPlaceholder");
  });

  it("crea PENDIENTE con campos normalizados, negocio server-side y sin usuarioId derivado", async () => {
    const response = await POST(
      makeRequest(
        bodyFor("crear-reserva", {
          sourceReference: "wa:wamid.authoritative:0",
          negocioId: "business-client-controlled",
          nombreCliente: "  Ana Cliente  ",
          telefonoCliente: "300 111 2233",
          fechaHoraInicio: reservationStart.toISOString(),
          fechaHoraFin: reservationEnd.toISOString(),
          notas: "  Mesa tranquila  ",
        }),
      ),
    );

    expect(response.status).toBe(201);
    expect(mockReservationCreate).toHaveBeenCalledTimes(1);
    const data = mockReservationCreate.mock.calls[0][0].data;
    expect(data).toEqual(
      expect.objectContaining({
        negocioId: RESOLVED_BUSINESS_ID,
        nombre: "Ana Cliente",
        telefono: "+573001112233",
        fechaHoraInicio: reservationStart,
        fechaHoraFin: reservationEnd,
        notas: "Mesa tranquila",
        estado: ReservationStatus.PENDIENTE,
      }),
    );
    expect(data.negocioId).not.toBe("business-client-controlled");
    expect(data).not.toHaveProperty("usuarioId");
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(mockRotateReservationCapabilityInTx).toHaveBeenCalledWith(
      mockTransactionClient,
      {
        reservationId: reservation.id,
        fechaHoraInicio: reservationStart,
        fechaHoraFin: reservationEnd,
      },
    );
    expect(mockReservationOperationCreate).toHaveBeenCalledTimes(1);
    const operationData = mockReservationOperationCreate.mock.calls[0][0].data;
    expect(operationData).toEqual({
      negocioId: RESOLVED_BUSINESS_ID,
      reservationId: reservation.id,
      action: ReservationOperationAction.CREATE,
      sourceReference: "wa:wamid.authoritative:0",
      requestFingerprint: expect.stringMatching(/^v1:[0-9a-f]{64}$/),
      managementLinkRequired: true,
      outcome: ReservationOperationOutcome.CREATED,
    });
    expect(operationData).not.toHaveProperty("token");
    expect(operationData).not.toHaveProperty("managementUrl");
    expect(operationData).not.toHaveProperty("nombre");
    expect(operationData).not.toHaveProperty("telefono");
    expect(operationData).not.toHaveProperty("notas");
  });

  it("preserva el contrato mínimo aditivo de la respuesta de creación", async () => {
    const response = await POST(
      makeRequest(
        bodyFor("crear-reserva", {
          sourceReference: "wa:wamid.contract:0",
          nombreCliente: reservation.nombre,
          telefonoCliente: reservation.telefono,
          fechaHoraInicio: reservationStart.toISOString(),
          fechaHoraFin: reservationEnd.toISOString(),
          notas: reservation.notas,
        }),
      ),
    );
    const payload = await responseBody(response);

    expect(response.status).toBe(201);
    expect(payload).toEqual(
      expect.objectContaining({
        isBusiness: true,
        businessName: business.nombre,
        ok: true,
        mensaje: expect.stringContaining("Reserva creada exitosamente"),
        reserva: expect.objectContaining({ id: reservation.id }),
        managementUrl:
          "https://reservas.staging.test/reservas/gestionar/capability-token-A",
      }),
    );
    expect(payload.mensaje).not.toContain("/reservas/gestionar/");
    expect(payload.mensaje).not.toContain("capability-token-A");
  });

  it("exige sourceReference en crear-reserva y no inicia transacción si falta", async () => {
    const requestBody = validCreateBody();
    delete requestBody.sourceReference;

    const response = await POST(makeRequest(requestBody));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "INVALID_SOURCE_REFERENCE",
      error: "La referencia de operación no es válida.",
      mensaje: "La referencia de operación no es válida.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it.each([
    ["whitespace inicial", " wa:wamid:0"],
    ["control", "wa:wamid:\n0"],
    ["tamaño", "x".repeat(256)],
  ])(
    "rechaza sourceReference inválida por %s sin writes",
    async (_caseName, invalidSourceReference) => {
      const response = await POST(
        makeRequest(
          validCreateBody({ sourceReference: invalidSourceReference }),
        ),
      );

      expect(response.status).toBe(400);
      expect(mockTransaction).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );

  it("busca ReservationOperation antes de disponibilidad dentro de la transacción", async () => {
    const callOrder: string[] = [];
    mockReservationOperationFindUnique.mockImplementation(async () => {
      callOrder.push("operation");
      return null;
    });
    mockBusinessAvailabilityFindUnique.mockImplementation(async () => {
      callOrder.push("availability");
      return validAvailability;
    });

    const response = await POST(makeRequest(validCreateBody()));

    expect(response.status).toBe(201);
    expect(callOrder).toEqual(["operation", "availability"]);
    expect(mockReservationOperationFindUnique).toHaveBeenCalledWith({
      where: {
        negocioId_action_sourceReference: {
          negocioId: RESOLVED_BUSINESS_ID,
          action: ReservationOperationAction.CREATE,
          sourceReference: "wa:wamid.create-test:0",
        },
      },
      include: { reservation: true },
    });
  });

  it("replay con mismo fingerprint no repite mutación/disponibilidad y rota capability", async () => {
    const requestBody = validCreateBody();
    const requestFingerprint = await fingerprintForCreateBody(requestBody);
    mockReservationOperationFindUnique.mockResolvedValue({
      id: "operation-existing",
      requestFingerprint,
      reservation,
    });
    mockRotateReservationCapabilityInTx.mockResolvedValue({
      capabilityId: "capability-B",
      token: "capability-token-B",
      expiresAt: new Date("2026-08-21T15:30:00.000Z"),
    });

    const response = await POST(makeRequest(requestBody));
    const payload = await responseBody(response);

    expect(response.status).toBe(201);
    expect(mockBusinessAvailabilityFindUnique).not.toHaveBeenCalled();
    expect(mockReservationFindMany).not.toHaveBeenCalled();
    expect(mockReservationCreate).not.toHaveBeenCalled();
    expect(mockReservationOperationCreate).not.toHaveBeenCalled();
    expect(mockRotateReservationCapabilityInTx).toHaveBeenCalledTimes(1);
    expect(payload.reserva).toEqual(
      expect.objectContaining({ id: reservation.id }),
    );
    expect(payload.managementUrl).toBe(
      "https://reservas.staging.test/reservas/gestionar/capability-token-B",
    );
  });

  it("response lost se recupera con token nuevo sin recuperar el token anterior", async () => {
    const requestBody = validCreateBody({
      sourceReference: "wa:wamid.response-lost:0",
    });
    const requestFingerprint = await fingerprintForCreateBody(requestBody);
    mockReservationOperationFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "operation-committed",
        requestFingerprint,
        reservation,
      });
    mockRotateReservationCapabilityInTx
      .mockResolvedValueOnce({
        capabilityId: "capability-A",
        token: "token-A",
        expiresAt: new Date("2026-08-21T15:30:00.000Z"),
      })
      .mockResolvedValueOnce({
        capabilityId: "capability-B",
        token: "token-B",
        expiresAt: new Date("2026-08-21T15:30:00.000Z"),
      });

    const firstResponse = await POST(makeRequest(requestBody));
    const replayResponse = await POST(makeRequest(requestBody));
    const firstPayload = await responseBody(firstResponse);
    const replayPayload = await responseBody(replayResponse);

    expect(firstPayload.managementUrl).toContain("/token-A");
    expect(replayPayload.managementUrl).toContain("/token-B");
    expect(replayPayload.managementUrl).not.toContain("token-A");
    expect(mockReservationCreate).toHaveBeenCalledTimes(1);
    expect(mockReservationOperationCreate).toHaveBeenCalledTimes(1);
    expect(mockRotateReservationCapabilityInTx).toHaveBeenCalledTimes(2);
  });

  it.each([ReservationStatus.CANCELADA, ReservationStatus.COMPLETADA])(
    "replay terminal %s conserva éxito pero no reemite managementUrl",
    async (estado) => {
      const requestBody = validCreateBody();
      const requestFingerprint = await fingerprintForCreateBody(requestBody);
      mockReservationOperationFindUnique.mockResolvedValue({
        id: "operation-existing",
        requestFingerprint,
        reservation: { ...reservation, estado },
      });

      const response = await POST(makeRequest(requestBody));
      const payload = await responseBody(response);

      expect(response.status).toBe(201);
      expect(payload.managementUrl).toBeNull();
      expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
      expect(mockReservationCreate).not.toHaveBeenCalled();
    },
  );

  it("replay fuera del horizon conserva éxito y no rota capability", async () => {
    const requestBody = validCreateBody();
    const requestFingerprint = await fingerprintForCreateBody(requestBody);
    mockReservationOperationFindUnique.mockResolvedValue({
      id: "operation-existing",
      requestFingerprint,
      reservation: {
        ...reservation,
        fechaHoraInicio: new Date("2026-08-17T15:00:00.000Z"),
        fechaHoraFin: new Date("2026-08-17T15:30:00.000Z"),
      },
    });

    const response = await POST(makeRequest(requestBody));
    const payload = await responseBody(response);

    expect(response.status).toBe(201);
    expect(payload.managementUrl).toBeNull();
    expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
  });

  it("mismo scope con fingerprint distinto retorna 409 sin writes ni disponibilidad", async () => {
    mockReservationOperationFindUnique.mockResolvedValue({
      id: "operation-existing",
      requestFingerprint: `v1:${"0".repeat(64)}`,
      reservation,
    });

    const response = await POST(makeRequest(validCreateBody()));

    expect(response.status).toBe(409);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "IDEMPOTENCY_CONFLICT",
      error:
        "La referencia de idempotencia ya fue utilizada con datos diferentes.",
      mensaje:
        "La referencia de idempotencia ya fue utilizada con datos diferentes.",
    });
    expect(mockBusinessAvailabilityFindUnique).not.toHaveBeenCalled();
    expect(mockReservationFindMany).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("reintenta P2034 una vez y completa en el segundo intento", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      "Serializable conflict",
      { code: "P2034", clientVersion: "6.18.0" },
    );
    mockTransaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(
        async (callback: (tx: typeof mockTransactionClient) => unknown) =>
          callback(mockTransactionClient),
      );

    const response = await POST(makeRequest(validCreateBody()));

    expect(response.status).toBe(201);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockReservationCreate).toHaveBeenCalledTimes(1);
  });

  it("agota tres P2034 con respuesta transitoria controlada", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      "Serializable conflict",
      { code: "P2034", clientVersion: "6.18.0" },
    );
    mockTransaction.mockRejectedValue(conflict);

    const response = await POST(makeRequest(validCreateBody()));
    const payload = await responseBody(response);

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      ok: false,
      code: "RESERVATION_CREATE_RETRY_EXHAUSTED",
      error: "No fue posible crear la reserva en este momento.",
      mensaje: "No fue posible crear la reserva en este momento.",
    });
    expect(JSON.stringify(payload)).not.toContain("P2034");
    expect(mockTransaction).toHaveBeenCalledTimes(3);
    expectNoWrites();
  });

  it("reintenta sólo el P2002 del unique compuesto de ReservationOperation", async () => {
    const requestBody = validCreateBody({
      sourceReference: "wa:wamid.concurrent:0",
    });
    const requestFingerprint = await fingerprintForCreateBody(requestBody);
    const race = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "6.18.0",
        meta: {
          modelName: "ReservationOperation",
          target: ["negocioId", "action", "sourceReference"],
        },
      },
    );
    mockReservationOperationFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "operation-winner",
        requestFingerprint,
        reservation,
      });
    mockReservationOperationCreate.mockRejectedValueOnce(race);
    mockRotateReservationCapabilityInTx
      .mockResolvedValueOnce({
        capabilityId: "rolled-back-capability",
        token: "rolled-back-token",
        expiresAt: new Date("2026-08-21T15:30:00.000Z"),
      })
      .mockResolvedValueOnce({
        capabilityId: "winner-replay-capability",
        token: "winner-replay-token",
        expiresAt: new Date("2026-08-21T15:30:00.000Z"),
      });

    const response = await POST(makeRequest(requestBody));
    const payload = await responseBody(response);

    expect(response.status).toBe(201);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockReservationCreate).toHaveBeenCalledTimes(1);
    expect(payload.managementUrl).toContain("winner-replay-token");
  });

  it("no reintenta un P2002 de otra unique", async () => {
    const unrelated = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "6.18.0",
        meta: { modelName: "Reservation", target: ["id"] },
      },
    );
    mockReservationCreate.mockRejectedValueOnce(unrelated);

    const response = await POST(makeRequest(validCreateBody()));
    const payload = await responseBody(response);

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      error: "No fue posible crear la reserva.",
      mensaje: "No fue posible crear la reserva.",
    });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("fail closed sin BusinessAvailability", async () => {
    mockBusinessAvailabilityFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest(validCreateBody()));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        code: "RESERVATION_NOT_AVAILABLE",
      }),
    );
    expect(mockReservationFindMany).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it.each([
    ["intervalo cero", { intervaloMinutos: 0 }],
    ["intervalo negativo", { intervaloMinutos: -30 }],
    ["capacidad inválida", { capacidadPorIntervalo: 0 }],
    ["franja parcial", { franjaMananaFin: null }],
  ])("fail closed ante config inválida: %s", async (_name, override) => {
    mockBusinessAvailabilityFindUnique.mockResolvedValue({
      ...validAvailability,
      ...override,
    });

    const response = await POST(makeRequest(validCreateBody()));

    expect(response.status).toBe(400);
    expectNoWrites();
  });

  it.each([
    [
      "inicio desalineado",
      {
        fechaHoraInicio: "2026-08-20T15:10:00.000Z",
        fechaHoraFin: "2026-08-20T15:40:00.000Z",
      },
      {},
    ],
    [
      "segundos en el inicio",
      {
        fechaHoraInicio: "2026-08-20T15:00:01.000Z",
        fechaHoraFin: "2026-08-20T15:30:01.000Z",
      },
      {},
    ],
    ["duración menor al mínimo", {}, { duracionMinimaIntervalos: 2 }],
    [
      "día local diferente",
      {
        fechaHoraInicio: "2026-08-21T04:30:00.000Z",
        fechaHoraFin: "2026-08-21T05:00:00.000Z",
      },
      {
        diasAtencion: ["Jueves"],
        franjaMananaInicio: "00:00",
        franjaMananaFin: "23:59",
      },
    ],
  ])(
    "rechaza horario inválido por %s",
    async (_name, bodyOverride, configOverride) => {
      mockBusinessAvailabilityFindUnique.mockResolvedValue({
        ...validAvailability,
        ...configOverride,
      });

      const response = await POST(makeRequest(validCreateBody(bodyOverride)));

      expect(response.status).toBe(400);
      expectNoWrites();
    },
  );

  it("rechaza fechaHoraInicio pasada", async () => {
    const response = await POST(
      makeRequest(
        validCreateBody({
          fechaHoraInicio: "2026-08-18T15:00:00.000Z",
          fechaHoraFin: "2026-08-18T15:30:00.000Z",
        }),
      ),
    );

    expect(response.status).toBe(400);
    expectNoWrites();
  });

  it("rechaza cualquier overlap con BLOQUEADA", async () => {
    mockReservationFindMany.mockResolvedValue([
      {
        fechaHoraInicio: new Date("2026-08-20T14:45:00.000Z"),
        fechaHoraFin: new Date("2026-08-20T15:15:00.000Z"),
        estado: ReservationStatus.BLOQUEADA,
      },
    ]);

    const response = await POST(makeRequest(validCreateBody()));

    expect(response.status).toBe(400);
    expect(mockReservationFindMany).toHaveBeenCalledWith({
      where: {
        negocioId: RESOLVED_BUSINESS_ID,
        estado: {
          in: [
            ReservationStatus.PENDIENTE,
            ReservationStatus.CONFIRMADA,
            ReservationStatus.BLOQUEADA,
          ],
        },
        fechaHoraInicio: { lt: reservationEnd },
        OR: [
          { fechaHoraFin: { gt: reservationStart } },
          {
            fechaHoraFin: null,
            fechaHoraInicio: { gte: reservationStart },
          },
        ],
      },
      select: {
        fechaHoraInicio: true,
        fechaHoraFin: true,
        estado: true,
      },
    });
    expectNoWrites();
  });

  it.each([ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA])(
    "%s consume capacidad con overlap real",
    async (estado) => {
      mockBusinessAvailabilityFindUnique.mockResolvedValue({
        ...validAvailability,
        capacidadPorIntervalo: 1,
      });
      mockReservationFindMany.mockResolvedValue([
        {
          fechaHoraInicio: new Date("2026-08-20T14:30:00.000Z"),
          fechaHoraFin: new Date("2026-08-20T15:15:00.000Z"),
          estado,
        },
      ]);

      const response = await POST(makeRequest(validCreateBody()));

      expect(response.status).toBe(400);
      expectNoWrites();
    },
  );

  it.each([ReservationStatus.CANCELADA, ReservationStatus.COMPLETADA])(
    "%s no consume capacidad",
    async (estado) => {
      mockBusinessAvailabilityFindUnique.mockResolvedValue({
        ...validAvailability,
        capacidadPorIntervalo: 1,
      });
      mockReservationFindMany.mockResolvedValue([
        {
          fechaHoraInicio: new Date("2026-08-20T14:30:00.000Z"),
          fechaHoraFin: new Date("2026-08-20T15:15:00.000Z"),
          estado,
        },
      ]);

      const response = await POST(makeRequest(validCreateBody()));

      expect(response.status).toBe(201);
      expect(mockReservationCreate).toHaveBeenCalledTimes(1);
    },
  );

  it("usa intervalo por duración mínima cuando fechaHoraFin es ausente", async () => {
    mockBusinessAvailabilityFindUnique.mockResolvedValue({
      ...validAvailability,
      intervaloMinutos: 30,
      duracionMinimaIntervalos: 2,
    });
    const requestBody = validCreateBody({
      sourceReference: "wa:wamid.default-end:0",
    });
    delete requestBody.fechaHoraFin;

    const response = await POST(makeRequest(requestBody));

    expect(response.status).toBe(201);
    expect(mockReservationCreate.mock.calls[0][0].data.fechaHoraFin).toEqual(
      new Date("2026-08-20T16:00:00.000Z"),
    );
    expect(mockReservationOperationCreate.mock.calls[0][0].data).toHaveProperty(
      "requestFingerprint",
      expect.stringMatching(/^v1:/),
    );
    const expectedFingerprint = await fingerprintForCreateBody(requestBody);
    expect(
      mockReservationOperationCreate.mock.calls[0][0].data.requestFingerprint,
    ).toBe(expectedFingerprint);
  });

  it.each([ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA])(
    "permite estado inicial %s",
    async (estado) => {
      const response = await POST(
        makeRequest(
          validCreateBody({
            sourceReference: `wa:wamid.status-${estado}:0`,
            estado,
          }),
        ),
      );

      expect(response.status).toBe(201);
      expect(mockReservationCreate.mock.calls[0][0].data.estado).toBe(estado);
    },
  );

  it.each([ReservationStatus.CANCELADA, ReservationStatus.COMPLETADA])(
    "rechaza estado inicial terminal %s",
    async (estado) => {
      const response = await POST(makeRequest(validCreateBody({ estado })));

      expect(response.status).toBe(400);
      expect(mockTransaction).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );

  it("rechaza permitirSobrecupo true sin consultar disponibilidad", async () => {
    const response = await POST(
      makeRequest(validCreateBody({ permitirSobrecupo: true })),
    );

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual(
      expect.objectContaining({ code: "OVERCAPACITY_NOT_ALLOWED" }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("no convierte permitirSobrecupo string a boolean", async () => {
    const response = await POST(
      makeRequest(validCreateBody({ permitirSobrecupo: "true" })),
    );

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual(
      expect.objectContaining({ code: "INVALID_RESERVATION_INPUT" }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("mantiene CREATE disponible para un negocio UNLISTED válido", async () => {
    mockNegocioFindFirst.mockResolvedValue({
      ...business,
      visibility: "UNLISTED",
    });

    const response = await POST(makeRequest(validCreateBody()));

    expect(response.status).toBe(201);
    expect(mockReservationCreate.mock.calls[0][0].data.negocioId).toBe(
      RESOLVED_BUSINESS_ID,
    );
  });

  it.each([
    ["ausente", undefined],
    ["vacía", ""],
    ["con whitespace exterior", ` ${TEST_SITE_ORIGIN} `],
    ["con path", `${TEST_SITE_ORIGIN}/app`],
    ["con query", `${TEST_SITE_ORIGIN}?x=1`],
    ["con hash", `${TEST_SITE_ORIGIN}/#x`],
    ["con userinfo", "https://user:pass@reservas.staging.test"],
    ["con protocolo no HTTP", "ftp://reservas.staging.test"],
    ["no parseable", "not-a-valid-url"],
  ])(
    "CREATE falla cerrado con SITE_URL %s antes de la transacción",
    async (_caseName, siteUrl) => {
      if (siteUrl === undefined) {
        delete process.env.SITE_URL;
      } else {
        process.env.SITE_URL = siteUrl;
      }

      await expectSiteOriginFailure(
        validCreateBody(),
        "No fue posible crear la reserva.",
      );
    },
  );

  it.each([
    [TEST_SITE_ORIGIN, TEST_SITE_ORIGIN],
    [`${TEST_SITE_ORIGIN}/`, TEST_SITE_ORIGIN],
    ["https://myckeo.com", "https://myckeo.com"],
  ])("CREATE acepta SITE_URL explícita %s", async (siteUrl, expectedOrigin) => {
    process.env.SITE_URL = siteUrl;

    const response = await POST(makeRequest(validCreateBody()));
    const payload = await responseBody(response);

    expect(response.status).toBe(201);
    expect(payload.managementUrl).toBe(
      `${expectedOrigin}/reservas/gestionar/capability-token-A`,
    );
  });

  it("CREATE permite loopback explícito fuera de producción", async () => {
    expect(process.env.NODE_ENV).toBe("test");
    process.env.SITE_URL = "http://localhost:3000";

    const response = await POST(makeRequest(validCreateBody()));
    const payload = await responseBody(response);

    expect(response.status).toBe(201);
    expect(payload.managementUrl).toBe(
      "http://localhost:3000/reservas/gestionar/capability-token-A",
    );
  });

  it("CREATE rechaza loopback en producción antes de la transacción", async () => {
    const replacedNodeEnv = jest.replaceProperty(
      process.env,
      "NODE_ENV",
      "production",
    );
    process.env.SITE_URL = "http://127.0.0.1:3000";

    try {
      await expectSiteOriginFailure(
        validCreateBody(),
        "No fue posible crear la reserva.",
      );
    } finally {
      replacedNodeEnv.restore();
    }
  });

  it("CREATE replay no reemite capability cuando SITE_URL falta", async () => {
    const requestBody = validCreateBody();
    const requestFingerprint = await fingerprintForCreateBody(requestBody);
    mockReservationOperationFindUnique.mockResolvedValue({
      id: "operation-existing",
      requestFingerprint,
      reservation,
    });
    delete process.env.SITE_URL;

    await expectSiteOriginFailure(
      requestBody,
      "No fue posible crear la reserva.",
    );
  });

  it("scopea detalle-reserva por reservaId y negocio resuelto", async () => {
    const response = await POST(
      makeRequest(
        bodyFor("detalle-reserva", {
          reservaId: reservation.id,
          negocioId: "business-client-controlled",
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(mockReservationFindFirst).toHaveBeenCalledTimes(1);
    expect(mockReservationFindFirst).toHaveBeenCalledWith({
      where: {
        id: reservation.id,
        negocioId: RESOLVED_BUSINESS_ID,
      },
    });
  });

  it("trata un detalle cross-business como Reserva no encontrada", async () => {
    mockReservationFindFirst.mockResolvedValue(null);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await POST(
      makeRequest(
        bodyFor("detalle-reserva", { reservaId: "reservation-from-other" }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      error: "Reserva no encontrada",
      mensaje: "Reserva no encontrada",
    });
    expect(mockReservationFindFirst).toHaveBeenCalledWith({
      where: {
        id: "reservation-from-other",
        negocioId: RESOLVED_BUSINESS_ID,
      },
    });
    expect(mockReservationUpdate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("exige sourceReference en modificar-reserva sin iniciar transacción", async () => {
    const requestBody = validUpdateBody();
    delete requestBody.sourceReference;

    const response = await POST(makeRequest(requestBody));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "INVALID_SOURCE_REFERENCE",
      error: "La referencia de operación no es válida.",
      mensaje: "La referencia de operación no es válida.",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it.each([" wa:update:0", "wa:update:\n0", "x".repeat(256)])(
    "rechaza sourceReference UPDATE inválida %p sin writes",
    async (sourceReference) => {
      const response = await POST(
        makeRequest(validUpdateBody({ sourceReference })),
      );

      expect(response.status).toBe(400);
      expect(mockTransaction).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );

  it("UPDATE falla cerrado sin SITE_URL antes de la transacción", async () => {
    delete process.env.SITE_URL;

    await expectSiteOriginFailure(
      validUpdateBody(),
      "No fue posible modificar la reserva.",
    );
  });

  it("rechaza UPDATE sin cambios antes de la transacción", async () => {
    const response = await POST(
      makeRequest(
        bodyFor("modificar-reserva", {
          sourceReference: "wa:wamid.update-empty:0",
          reservaId: reservation.id,
        }),
      ),
    );

    expect(response.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("trata una Reservation cross-business como no encontrada", async () => {
    mockReservationFindFirst.mockResolvedValue(null);

    const response = await POST(
      makeRequest(validUpdateBody({ negocioId: "business-client-controlled" })),
    );

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "RESERVATION_NOT_FOUND",
      error: "Reserva no encontrada",
      mensaje: "Reserva no encontrada",
    });
    expect(mockReservationFindFirst).toHaveBeenCalledWith({
      where: {
        id: reservation.id,
        negocioId: RESOLVED_BUSINESS_ID,
      },
    });
    expectNoWrites();
  });

  it.each([
    ReservationStatus.CANCELADA,
    ReservationStatus.COMPLETADA,
    ReservationStatus.BLOQUEADA,
  ])("rechaza UPDATE de Reservation actualmente %s", async (estado) => {
    mockReservationFindFirst.mockResolvedValue({ ...reservation, estado });

    const response = await POST(makeRequest(validUpdateBody()));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual(
      expect.objectContaining({ code: "RESERVATION_NOT_AVAILABLE" }),
    );
    expect(mockReservationOperationCreate).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it.each([ReservationStatus.CANCELADA, ReservationStatus.BLOQUEADA])(
    "rechaza target status %s antes de la transacción",
    async (estado) => {
      const response = await POST(
        makeRequest(validUpdateBody({ estado, notas: undefined })),
      );

      expect(response.status).toBe(400);
      expect(mockTransaction).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );

  it.each([
    [ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA],
    [ReservationStatus.CONFIRMADA, ReservationStatus.PENDIENTE],
  ])(
    "permite transición activa %s → %s sin rotación",
    async (currentStatus, targetStatus) => {
      const currentReservation = { ...reservation, estado: currentStatus };
      const updatedReservation = {
        ...currentReservation,
        estado: targetStatus,
      };
      mockReservationFindFirst.mockResolvedValue(currentReservation);
      mockReservationUpdate.mockResolvedValue(updatedReservation);

      const response = await POST(
        makeRequest(
          validUpdateBody({
            sourceReference: `wa:wamid.transition-${currentStatus}:0`,
            estado: targetStatus,
            notas: undefined,
          }),
        ),
      );
      const payload = await responseBody(response);

      expect(response.status).toBe(200);
      expect(payload.managementUrl).toBeNull();
      expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
      expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
      expect(
        mockRevokeActiveReservationCapabilitiesInTx,
      ).not.toHaveBeenCalled();
      expect(mockBusinessAvailabilityFindUnique).not.toHaveBeenCalled();
      expect(mockReservationOperationCreate.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          action: ReservationOperationAction.UPDATE,
          outcome: ReservationOperationOutcome.UPDATED,
          managementLinkRequired: false,
        }),
      );
    },
  );

  it.each([ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA])(
    "completa %s revocando capabilities sin rotar",
    async (currentStatus) => {
      const currentReservation = { ...reservation, estado: currentStatus };
      const completedReservation = {
        ...currentReservation,
        estado: ReservationStatus.COMPLETADA,
      };
      mockReservationFindFirst.mockResolvedValue(currentReservation);
      mockReservationUpdate.mockResolvedValue(completedReservation);

      const response = await POST(
        makeRequest(
          validUpdateBody({
            sourceReference: `wa:wamid.complete-${currentStatus}:0`,
            estado: ReservationStatus.COMPLETADA,
            notas: undefined,
          }),
        ),
      );
      const payload = await responseBody(response);

      expect(response.status).toBe(200);
      expect(payload.managementUrl).toBeNull();
      expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
      expect(mockRevokeActiveReservationCapabilitiesInTx).toHaveBeenCalledWith(
        mockTransactionClient,
        reservation.id,
      );
      expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
      expect(mockReservationOperationCreate.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          outcome: ReservationOperationOutcome.UPDATED,
          managementLinkRequired: false,
        }),
      );
    },
  );

  it.each([
    ["nombre", { nombreCliente: "Ana Nueva", notas: undefined }],
    ["notas", { notas: "Nota actualizada" }],
  ])("UPDATE efectivo de %s no rota capability", async (_field, changes) => {
    const updatedReservation = {
      ...reservation,
      ...("nombreCliente" in changes && changes.nombreCliente
        ? { nombre: changes.nombreCliente }
        : {}),
      ...(changes.notas ? { notas: changes.notas } : {}),
    };
    mockReservationUpdate.mockResolvedValue(updatedReservation);

    const response = await POST(
      makeRequest(
        validUpdateBody({
          sourceReference: `wa:wamid.non-rotating-${_field}:0`,
          ...changes,
        }),
      ),
    );
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(payload.managementUrl).toBeNull();
    expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
    expect(mockBusinessAvailabilityFindUnique).not.toHaveBeenCalled();
    expect(mockReservationFindMany).not.toHaveBeenCalled();
    expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
    expect(mockReservationOperationCreate.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        outcome: ReservationOperationOutcome.UPDATED,
        managementLinkRequired: false,
      }),
    );
  });

  it("rota capability cuando cambia efectivamente el teléfono canónico", async () => {
    const updatedReservation = {
      ...reservation,
      telefono: "+573009998888",
    };
    mockReservationUpdate.mockResolvedValue(updatedReservation);
    mockRotateReservationCapabilityInTx.mockResolvedValue({
      capabilityId: "capability-update-phone",
      token: "update-phone-token",
      expiresAt: new Date("2026-08-21T15:30:00.000Z"),
    });

    const response = await POST(
      makeRequest(
        validUpdateBody({
          sourceReference: "wa:wamid.phone-change:0",
          telefonoCliente: "300 999 8888",
          notas: undefined,
        }),
      ),
    );
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(mockReservationUpdate.mock.calls[0][0].data.telefono).toBe(
      "+573009998888",
    );
    expect(mockRotateReservationCapabilityInTx).toHaveBeenCalledWith(
      mockTransactionClient,
      {
        reservationId: reservation.id,
        fechaHoraInicio: updatedReservation.fechaHoraInicio,
        fechaHoraFin: updatedReservation.fechaHoraFin,
      },
    );
    expect(mockReservationOperationCreate.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        negocioId: RESOLVED_BUSINESS_ID,
        reservationId: reservation.id,
        action: ReservationOperationAction.UPDATE,
        sourceReference: "wa:wamid.phone-change:0",
        requestFingerprint: expect.stringMatching(/^v1:[0-9a-f]{64}$/),
        managementLinkRequired: true,
        outcome: ReservationOperationOutcome.UPDATED,
      }),
    );
    expect(payload.managementUrl).toBe(
      "https://reservas.staging.test/reservas/gestionar/update-phone-token",
    );
    expect(payload.mensaje).not.toContain("update-phone-token");
    expect(payload.mensaje).not.toContain("/reservas/gestionar/");
  });

  it("trata teléfono sintácticamente distinto pero equivalente como UNCHANGED", async () => {
    const response = await POST(
      makeRequest(
        validUpdateBody({
          sourceReference: "wa:wamid.phone-equivalent:0",
          telefonoCliente: "300 111 2233",
          notas: undefined,
        }),
      ),
    );
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        mensaje: "La reserva ya tiene esos datos.",
        managementUrl: null,
      }),
    );
    expect(mockReservationUpdate).not.toHaveBeenCalled();
    expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
    expect(mockReservationOperationCreate.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        outcome: ReservationOperationOutcome.UNCHANGED,
        managementLinkRequired: false,
      }),
    );
  });

  it("reprograma fecha, excluye la propia Reservation y rota capability", async () => {
    const nextStart = new Date("2026-08-20T16:00:00.000Z");
    const nextEnd = new Date("2026-08-20T16:30:00.000Z");
    const updatedReservation = {
      ...reservation,
      fechaHoraInicio: nextStart,
      fechaHoraFin: nextEnd,
    };
    mockReservationUpdate.mockResolvedValue(updatedReservation);
    mockRotateReservationCapabilityInTx.mockResolvedValue({
      capabilityId: "capability-update-date",
      token: "update-date-token",
      expiresAt: new Date("2026-08-21T16:30:00.000Z"),
    });

    const response = await POST(
      makeRequest(
        validUpdateBody({
          sourceReference: "wa:wamid.date-change:0",
          fechaHoraInicio: nextStart.toISOString(),
          fechaHoraFin: nextEnd.toISOString(),
          notas: undefined,
        }),
      ),
    );
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(mockBusinessAvailabilityFindUnique).toHaveBeenCalledTimes(1);
    expect(mockReservationFindMany).toHaveBeenCalledWith({
      where: {
        id: { not: reservation.id },
        negocioId: RESOLVED_BUSINESS_ID,
        estado: {
          in: [
            ReservationStatus.PENDIENTE,
            ReservationStatus.CONFIRMADA,
            ReservationStatus.BLOQUEADA,
          ],
        },
        fechaHoraInicio: { lt: nextEnd },
        OR: [
          { fechaHoraFin: { gt: nextStart } },
          { fechaHoraFin: null, fechaHoraInicio: { gte: nextStart } },
        ],
      },
      select: {
        fechaHoraInicio: true,
        fechaHoraFin: true,
        estado: true,
      },
    });
    expect(mockReservationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: reservation.id,
          negocioId: RESOLVED_BUSINESS_ID,
          estado: reservation.estado,
        },
      }),
    );
    expect(mockRotateReservationCapabilityInTx).toHaveBeenCalledTimes(1);
    expect(payload.managementUrl).toContain("update-date-token");
  });

  it("otra Reservation larga consume capacidad por overlap real", async () => {
    const nextStart = new Date("2026-08-20T16:00:00.000Z");
    const nextEnd = new Date("2026-08-20T16:30:00.000Z");
    mockBusinessAvailabilityFindUnique.mockResolvedValue({
      ...validAvailability,
      capacidadPorIntervalo: 1,
    });
    mockReservationFindMany.mockResolvedValue([
      {
        fechaHoraInicio: new Date("2026-08-20T15:30:00.000Z"),
        fechaHoraFin: new Date("2026-08-20T16:15:00.000Z"),
        estado: ReservationStatus.CONFIRMADA,
      },
    ]);

    const response = await POST(
      makeRequest(
        validUpdateBody({
          fechaHoraInicio: nextStart.toISOString(),
          fechaHoraFin: nextEnd.toISOString(),
          notas: undefined,
        }),
      ),
    );

    expect(response.status).toBe(400);
    expect(mockReservationUpdate).not.toHaveBeenCalled();
    expect(mockReservationOperationCreate).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("BLOQUEADA solapada impide reprogramación", async () => {
    mockReservationFindMany.mockResolvedValue([
      {
        fechaHoraInicio: new Date("2026-08-20T15:45:00.000Z"),
        fechaHoraFin: new Date("2026-08-20T16:15:00.000Z"),
        estado: ReservationStatus.BLOQUEADA,
      },
    ]);

    const response = await POST(
      makeRequest(
        validUpdateBody({
          fechaHoraInicio: "2026-08-20T16:00:00.000Z",
          fechaHoraFin: "2026-08-20T16:30:00.000Z",
          notas: undefined,
        }),
      ),
    );

    expect(response.status).toBe(400);
    expect(mockReservationOperationCreate).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("fechaHoraFin null recalcula, persiste end efectivo y rota si cambia", async () => {
    const recalculatedEnd = new Date("2026-08-20T16:00:00.000Z");
    mockBusinessAvailabilityFindUnique.mockResolvedValue({
      ...validAvailability,
      duracionMinimaIntervalos: 2,
    });
    mockReservationUpdate.mockResolvedValue({
      ...reservation,
      fechaHoraFin: recalculatedEnd,
    });

    const response = await POST(
      makeRequest(
        validUpdateBody({
          sourceReference: "wa:wamid.null-end-change:0",
          fechaHoraFin: null,
          notas: undefined,
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(mockReservationUpdate.mock.calls[0][0].data.fechaHoraFin).toEqual(
      recalculatedEnd,
    );
    expect(mockRotateReservationCapabilityInTx).toHaveBeenCalledTimes(1);
  });

  it("fechaHoraFin null equivalente produce UNCHANGED sin rotación", async () => {
    const response = await POST(
      makeRequest(
        validUpdateBody({
          sourceReference: "wa:wamid.null-end-equivalent:0",
          fechaHoraFin: null,
          notas: undefined,
        }),
      ),
    );
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(payload.managementUrl).toBeNull();
    expect(mockReservationUpdate).not.toHaveBeenCalled();
    expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
    expect(mockReservationOperationCreate.mock.calls[0][0].data.outcome).toBe(
      ReservationOperationOutcome.UNCHANGED,
    );
  });

  it("fechaHoraFin ausente preserva el valor actual al cambiar inicio", async () => {
    const earlierStart = new Date("2026-08-20T14:30:00.000Z");
    mockReservationUpdate.mockResolvedValue({
      ...reservation,
      fechaHoraInicio: earlierStart,
    });
    const requestBody = validUpdateBody({
      sourceReference: "wa:wamid.preserve-end:0",
      fechaHoraInicio: earlierStart.toISOString(),
      notas: undefined,
    });
    delete requestBody.fechaHoraFin;

    const response = await POST(makeRequest(requestBody));

    expect(response.status).toBe(200);
    expect(mockReservationUpdate.mock.calls[0][0].data.fechaHoraFin).toEqual(
      reservation.fechaHoraFin,
    );
    expect(mockRotateReservationCapabilityInTx).toHaveBeenCalledTimes(1);
  });

  it("fail closed sin BusinessAvailability cuando UPDATE cambia fechas", async () => {
    mockBusinessAvailabilityFindUnique.mockResolvedValue(null);

    const response = await POST(
      makeRequest(
        validUpdateBody({
          fechaHoraInicio: "2026-08-20T16:00:00.000Z",
          fechaHoraFin: "2026-08-20T16:30:00.000Z",
          notas: undefined,
        }),
      ),
    );

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual(
      expect.objectContaining({ code: "RESERVATION_NOT_AVAILABLE" }),
    );
    expect(mockReservationUpdate).not.toHaveBeenCalled();
    expect(mockReservationOperationCreate).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("campos presentes pero equivalentes consumen key como UNCHANGED", async () => {
    const requestBody = validUpdateBody({
      sourceReference: "wa:wamid.unchanged:0",
      nombreCliente: `  ${reservation.nombre}  `,
      notas: reservation.notas,
    });

    const response = await POST(makeRequest(requestBody));
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(payload.managementUrl).toBeNull();
    expect(mockReservationUpdate).not.toHaveBeenCalled();
    expect(mockReservationOperationCreate).toHaveBeenCalledTimes(1);
    expect(mockReservationOperationCreate.mock.calls[0][0].data).toEqual({
      negocioId: RESOLVED_BUSINESS_ID,
      reservationId: reservation.id,
      action: ReservationOperationAction.UPDATE,
      sourceReference: "wa:wamid.unchanged:0",
      requestFingerprint: expect.stringMatching(/^v1:[0-9a-f]{64}$/),
      managementLinkRequired: false,
      outcome: ReservationOperationOutcome.UNCHANGED,
    });
    expect(mockBusinessAvailabilityFindUnique).not.toHaveBeenCalled();
    expect(mockReservationFindMany).not.toHaveBeenCalled();
  });

  it("replay UPDATE sin link usa outcome persistido y no repite mutación", async () => {
    const requestBody = validUpdateBody({
      sourceReference: "wa:wamid.update-replay-no-link:0",
    });
    const requestFingerprint = await fingerprintForUpdateBody(requestBody);
    mockReservationOperationFindUnique.mockResolvedValue({
      reservationId: reservation.id,
      requestFingerprint,
      managementLinkRequired: false,
      outcome: ReservationOperationOutcome.UNCHANGED,
    });

    const response = await POST(makeRequest(requestBody));
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual(
      expect.objectContaining({
        mensaje: "La reserva ya tiene esos datos.",
        managementUrl: null,
      }),
    );
    expect(mockReservationOperationFindUnique).toHaveBeenCalledWith({
      where: {
        negocioId_action_sourceReference: {
          negocioId: RESOLVED_BUSINESS_ID,
          action: ReservationOperationAction.UPDATE,
          sourceReference: "wa:wamid.update-replay-no-link:0",
        },
      },
      select: {
        reservationId: true,
        requestFingerprint: true,
        managementLinkRequired: true,
        outcome: true,
      },
    });
    expect(mockReservationFindFirst).toHaveBeenCalledWith({
      where: {
        id: reservation.id,
        negocioId: RESOLVED_BUSINESS_ID,
      },
    });
    expect(mockBusinessAvailabilityFindUnique).not.toHaveBeenCalled();
    expect(mockReservationFindMany).not.toHaveBeenCalled();
    expect(mockReservationUpdate).not.toHaveBeenCalled();
    expect(mockReservationOperationCreate).not.toHaveBeenCalled();
    expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
  });

  it("replay UPDATE con link requerido rota y devuelve URL nueva", async () => {
    const requestBody = validUpdateBody({
      sourceReference: "wa:wamid.update-replay-link:0",
    });
    const requestFingerprint = await fingerprintForUpdateBody(requestBody);
    mockReservationOperationFindUnique.mockResolvedValue({
      reservationId: reservation.id,
      requestFingerprint,
      managementLinkRequired: true,
      outcome: ReservationOperationOutcome.UPDATED,
    });
    mockRotateReservationCapabilityInTx.mockResolvedValue({
      capabilityId: "replay-capability",
      token: "update-replay-token-B",
      expiresAt: new Date("2026-08-21T15:30:00.000Z"),
    });

    const response = await POST(makeRequest(requestBody));
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(payload.managementUrl).toBe(
      "https://reservas.staging.test/reservas/gestionar/update-replay-token-B",
    );
    expect(mockReservationUpdate).not.toHaveBeenCalled();
    expect(mockBusinessAvailabilityFindUnique).not.toHaveBeenCalled();
    expect(mockReservationOperationCreate).not.toHaveBeenCalled();
    expect(mockRotateReservationCapabilityInTx).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["ausente", undefined],
    ["inválida", `${TEST_SITE_ORIGIN}/app`],
  ])(
    "replay UPDATE con link no reemite capability cuando SITE_URL está %s",
    async (_caseName, siteUrl) => {
      const requestBody = validUpdateBody({
        sourceReference: "wa:wamid.update-replay-config:0",
      });
      const requestFingerprint = await fingerprintForUpdateBody(requestBody);
      mockReservationOperationFindUnique.mockResolvedValue({
        reservationId: reservation.id,
        requestFingerprint,
        managementLinkRequired: true,
        outcome: ReservationOperationOutcome.UPDATED,
      });
      if (siteUrl === undefined) {
        delete process.env.SITE_URL;
      } else {
        process.env.SITE_URL = siteUrl;
      }

      await expectSiteOriginFailure(
        requestBody,
        "No fue posible modificar la reserva.",
      );
    },
  );

  it.each([
    ReservationStatus.CANCELADA,
    ReservationStatus.COMPLETADA,
    ReservationStatus.BLOQUEADA,
  ])("replay UPDATE terminal %s no reemite link", async (estado) => {
    const requestBody = validUpdateBody();
    const requestFingerprint = await fingerprintForUpdateBody(requestBody);
    mockReservationOperationFindUnique.mockResolvedValue({
      reservationId: reservation.id,
      requestFingerprint,
      managementLinkRequired: true,
      outcome: ReservationOperationOutcome.UPDATED,
    });
    mockReservationFindFirst.mockResolvedValue({ ...reservation, estado });

    const response = await POST(makeRequest(requestBody));
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(payload.managementUrl).toBeNull();
    expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
    expect(mockReservationUpdate).not.toHaveBeenCalled();
  });

  it("replay UPDATE con horizon expirado no rota", async () => {
    const requestBody = validUpdateBody();
    const requestFingerprint = await fingerprintForUpdateBody(requestBody);
    mockReservationOperationFindUnique.mockResolvedValue({
      reservationId: reservation.id,
      requestFingerprint,
      managementLinkRequired: true,
      outcome: ReservationOperationOutcome.UPDATED,
    });
    mockReservationFindFirst.mockResolvedValue({
      ...reservation,
      fechaHoraInicio: new Date("2026-08-17T15:00:00.000Z"),
      fechaHoraFin: new Date("2026-08-17T15:30:00.000Z"),
    });

    const response = await POST(makeRequest(requestBody));
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(payload.managementUrl).toBeNull();
    expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
  });

  it("UPDATE conflict retorna 409 sin lookup Reservation ni writes", async () => {
    mockReservationOperationFindUnique.mockResolvedValue({
      reservationId: reservation.id,
      requestFingerprint: `v1:${"0".repeat(64)}`,
      managementLinkRequired: true,
      outcome: ReservationOperationOutcome.UPDATED,
    });

    const response = await POST(makeRequest(validUpdateBody()));

    expect(response.status).toBe(409);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "IDEMPOTENCY_CONFLICT",
      error:
        "La referencia de idempotencia ya fue utilizada con datos diferentes.",
      mensaje:
        "La referencia de idempotencia ya fue utilizada con datos diferentes.",
    });
    expect(mockReservationFindFirst).not.toHaveBeenCalled();
    expect(mockBusinessAvailabilityFindUnique).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("UPDATE reintenta P2034 y completa en segundo intento", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      "Serializable conflict",
      { code: "P2034", clientVersion: "6.18.0" },
    );
    mockTransaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(
        async (callback: (tx: typeof mockTransactionClient) => unknown) =>
          callback(mockTransactionClient),
      );

    const response = await POST(makeRequest(validUpdateBody()));

    expect(response.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
  });

  it("UPDATE agota tres P2034 con error transitorio controlado", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      "Serializable conflict",
      { code: "P2034", clientVersion: "6.18.0" },
    );
    mockTransaction.mockRejectedValue(conflict);

    const response = await POST(makeRequest(validUpdateBody()));
    const payload = await responseBody(response);

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      ok: false,
      code: "RESERVATION_UPDATE_RETRY_EXHAUSTED",
      error: "No fue posible modificar la reserva en este momento.",
      mensaje: "No fue posible modificar la reserva en este momento.",
    });
    expect(mockTransaction).toHaveBeenCalledTimes(3);
    expectNoWrites();
  });

  it("UPDATE reintenta P2002 exclusivo de ReservationOperation y entra a replay", async () => {
    const requestBody = validUpdateBody({
      sourceReference: "wa:wamid.update-race:0",
    });
    const requestFingerprint = await fingerprintForUpdateBody(requestBody);
    const race = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "6.18.0",
        meta: {
          modelName: "ReservationOperation",
          target: ["negocioId", "action", "sourceReference"],
        },
      },
    );
    mockReservationOperationFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        reservationId: reservation.id,
        requestFingerprint,
        managementLinkRequired: false,
        outcome: ReservationOperationOutcome.UPDATED,
      });
    mockReservationOperationCreate.mockRejectedValueOnce(race);

    const response = await POST(makeRequest(requestBody));

    expect(response.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
    expect(mockReservationOperationCreate).toHaveBeenCalledTimes(1);
    expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
  });

  it("UPDATE no reintenta P2002 ajeno", async () => {
    const unrelated = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "6.18.0",
        meta: { modelName: "Reservation", target: ["id"] },
      },
    );
    mockReservationUpdate.mockRejectedValueOnce(unrelated);

    const response = await POST(makeRequest(validUpdateBody()));

    expect(response.status).toBe(500);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("response lost UPDATE reemite link nuevo sin repetir update", async () => {
    const requestBody = validUpdateBody({
      sourceReference: "wa:wamid.update-response-lost:0",
      telefonoCliente: "300 999 8888",
      notas: undefined,
    });
    const requestFingerprint = await fingerprintForUpdateBody(requestBody);
    const updatedReservation = {
      ...reservation,
      telefono: "+573009998888",
    };
    mockReservationOperationFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        reservationId: reservation.id,
        requestFingerprint,
        managementLinkRequired: true,
        outcome: ReservationOperationOutcome.UPDATED,
      });
    mockReservationFindFirst
      .mockResolvedValueOnce(reservation)
      .mockResolvedValueOnce(updatedReservation);
    mockReservationUpdate.mockResolvedValue(updatedReservation);
    mockRotateReservationCapabilityInTx
      .mockResolvedValueOnce({
        capabilityId: "capability-A",
        token: "update-token-A",
        expiresAt: new Date("2026-08-21T15:30:00.000Z"),
      })
      .mockResolvedValueOnce({
        capabilityId: "capability-B",
        token: "update-token-B",
        expiresAt: new Date("2026-08-21T15:30:00.000Z"),
      });

    const firstResponse = await POST(makeRequest(requestBody));
    const replayResponse = await POST(makeRequest(requestBody));
    const firstPayload = await responseBody(firstResponse);
    const replayPayload = await responseBody(replayResponse);

    expect(firstPayload.managementUrl).toContain("update-token-A");
    expect(replayPayload.managementUrl).toContain("update-token-B");
    expect(replayPayload.managementUrl).not.toContain("update-token-A");
    expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
    expect(mockReservationOperationCreate).toHaveBeenCalledTimes(1);
    expect(mockRotateReservationCapabilityInTx).toHaveBeenCalledTimes(2);
  });

  it("COMPLETADA con cambio de teléfono revoca y nunca rota", async () => {
    const completedReservation = {
      ...reservation,
      telefono: "+573009998888",
      estado: ReservationStatus.COMPLETADA,
    };
    mockReservationUpdate.mockResolvedValue(completedReservation);

    const response = await POST(
      makeRequest(
        validUpdateBody({
          sourceReference: "wa:wamid.complete-with-phone:0",
          telefonoCliente: "300 999 8888",
          estado: ReservationStatus.COMPLETADA,
          notas: undefined,
        }),
      ),
    );
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(payload.managementUrl).toBeNull();
    expect(mockRevokeActiveReservationCapabilitiesInTx).toHaveBeenCalledTimes(
      1,
    );
    expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
    expect(
      mockReservationOperationCreate.mock.calls[0][0].data
        .managementLinkRequired,
    ).toBe(false);
  });

  it("UPDATE rechaza sobrecupo true sin transacción", async () => {
    const response = await POST(
      makeRequest(validUpdateBody({ permitirSobrecupo: true })),
    );

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual(
      expect.objectContaining({ code: "OVERCAPACITY_NOT_ALLOWED" }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("UPDATE permite negocio UNLISTED válido sin boundary PUBLISHED", async () => {
    mockNegocioFindFirst.mockResolvedValue({
      ...business,
      visibility: "UNLISTED",
    });

    const response = await POST(makeRequest(validUpdateBody()));

    expect(response.status).toBe(200);
    expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
  });

  it("scopea el lookup inicial de modificar-reserva por reservaId y negocio", async () => {
    const updatedReservation = {
      ...reservation,
      notas: "Nueva nota",
    };
    mockReservationUpdate.mockResolvedValue(updatedReservation);

    const response = await POST(
      makeRequest(
        bodyFor("modificar-reserva", {
          sourceReference: "wa:wamid.update-scope:0",
          reservaId: reservation.id,
          notas: "Nueva nota",
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(mockReservationFindFirst).toHaveBeenNthCalledWith(1, {
      where: {
        id: reservation.id,
        negocioId: RESOLVED_BUSINESS_ID,
      },
    });
    expect(mockReservationUpdate).toHaveBeenCalledTimes(1);
    expect(mockReservationUpdate).toHaveBeenCalledWith({
      where: {
        id: reservation.id,
        negocioId: RESOLVED_BUSINESS_ID,
        estado: reservation.estado,
      },
      data: {
        nombre: reservation.nombre,
        telefono: reservation.telefono,
        fechaHoraInicio: reservation.fechaHoraInicio,
        fechaHoraFin: reservation.fechaHoraFin,
        notas: "Nueva nota",
        estado: reservation.estado,
      },
    });
  });

  it.each([
    undefined,
    " leading-space",
    "trailing-space ",
    "tab\tinside",
    "x".repeat(256),
  ])(
    "CANCEL exige sourceReference válida antes de abrir una transacción (%p)",
    async (sourceReference) => {
      const requestBody = validCancelBody();
      if (sourceReference === undefined) {
        delete requestBody.sourceReference;
      } else {
        requestBody.sourceReference = sourceReference;
      }

      const response = await POST(makeRequest(requestBody));

      expect(response.status).toBe(400);
      await expect(responseBody(response)).resolves.toEqual({
        ok: false,
        code: "INVALID_SOURCE_REFERENCE",
        error: "La referencia de operación no es válida.",
        mensaje: "La referencia de operación no es válida.",
      });
      expect(mockTransaction).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );

  it.each([ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA])(
    "CANCEL convierte %s mediante updateMany scoped, revoca y registra CANCELLED",
    async (estado) => {
      const activeReservation = { ...reservation, estado };
      const cancelledReservation = {
        ...activeReservation,
        estado: ReservationStatus.CANCELADA,
        notas: "Mesa tranquila\nCancelada por asistente: cambio de planes",
      };
      mockReservationFindFirst
        .mockResolvedValueOnce(activeReservation)
        .mockResolvedValueOnce(cancelledReservation);

      const requestBody = validCancelBody({
        negocioId: "business-client-controlled",
      });
      const expectedFingerprint = await fingerprintForCancelBody(requestBody);
      const response = await POST(makeRequest(requestBody));
      const payload = await responseBody(response);

      expect(response.status).toBe(200);
      expect(payload).toEqual(
        expect.objectContaining({
          isBusiness: true,
          businessName: business.nombre,
          ok: true,
          reserva: expect.objectContaining({
            id: cancelledReservation.id,
            negocioId: cancelledReservation.negocioId,
            estado: ReservationStatus.CANCELADA,
            notas: cancelledReservation.notas,
          }),
          managementUrl: null,
        }),
      );
      expect(String(payload.mensaje)).not.toContain("/reservas/gestionar/");
      expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
      expect(mockReservationOperationFindUnique).toHaveBeenCalledWith({
        where: {
          negocioId_action_sourceReference: {
            negocioId: RESOLVED_BUSINESS_ID,
            action: ReservationOperationAction.CANCEL,
            sourceReference: requestBody.sourceReference,
          },
        },
        select: {
          reservationId: true,
          requestFingerprint: true,
          outcome: true,
        },
      });
      expect(mockReservationFindFirst).toHaveBeenNthCalledWith(1, {
        where: {
          id: reservation.id,
          negocioId: RESOLVED_BUSINESS_ID,
        },
      });
      expect(mockReservationUpdateMany).toHaveBeenCalledWith({
        where: {
          id: reservation.id,
          negocioId: RESOLVED_BUSINESS_ID,
          estado: {
            in: [ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA],
          },
        },
        data: {
          estado: ReservationStatus.CANCELADA,
          notas: cancelledReservation.notas,
        },
      });
      expect(mockRevokeActiveReservationCapabilitiesInTx).toHaveBeenCalledWith(
        mockTransactionClient,
        reservation.id,
      );
      expect(mockReservationOperationCreate).toHaveBeenCalledWith({
        data: {
          negocioId: RESOLVED_BUSINESS_ID,
          reservationId: reservation.id,
          action: ReservationOperationAction.CANCEL,
          sourceReference: requestBody.sourceReference,
          requestFingerprint: expectedFingerprint,
          managementLinkRequired: false,
          outcome: ReservationOperationOutcome.CANCELLED,
        },
      });
      expect(mockReservationUpdate).not.toHaveBeenCalled();
      expect(mockRotateReservationCapabilityInTx).not.toHaveBeenCalled();
      expect(mockReservationDelete).not.toHaveBeenCalled();
      expect(mockReservationDeleteMany).not.toHaveBeenCalled();
    },
  );

  it("CANCEL no exige SITE_URL y conserva managementUrl null", async () => {
    const cancelledReservation = {
      ...reservation,
      estado: ReservationStatus.CANCELADA,
    };
    mockReservationFindFirst
      .mockResolvedValueOnce(reservation)
      .mockResolvedValueOnce(cancelledReservation);
    delete process.env.SITE_URL;

    const response = await POST(makeRequest(validCancelBody()));
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual(
      expect.objectContaining({ ok: true, managementUrl: null }),
    );
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockRevokeActiveReservationCapabilitiesInTx).toHaveBeenCalledTimes(
      1,
    );
  });

  it.each([
    ["ausente", undefined],
    ["null", null],
    ["vacío", "   "],
  ])(
    "CANCEL canonicaliza motivo %s a null y conserva las notas previas",
    async (_label, notas) => {
      const cancelledReservation = {
        ...reservation,
        estado: ReservationStatus.CANCELADA,
        notas: "Mesa tranquila\nCancelada por asistente",
      };
      mockReservationFindFirst
        .mockResolvedValueOnce(reservation)
        .mockResolvedValueOnce(cancelledReservation);
      const requestBody = validCancelBody({
        sourceReference: `wa:wamid.cancel-${_label}:0`,
        notas,
      });
      if (notas === undefined) delete requestBody.notas;

      const response = await POST(makeRequest(requestBody));

      expect(response.status).toBe(200);
      expect(mockReservationUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            estado: ReservationStatus.CANCELADA,
            notas: cancelledReservation.notas,
          },
        }),
      );
    },
  );

  it("CANCEL usa el motivo canónico trim y lo anexa una sola vez", async () => {
    const cancelledReservation = {
      ...reservation,
      estado: ReservationStatus.CANCELADA,
      notas: "Mesa tranquila\nCancelada por asistente: cambio de planes",
    };
    mockReservationFindFirst
      .mockResolvedValueOnce(reservation)
      .mockResolvedValueOnce(cancelledReservation);

    const response = await POST(
      makeRequest(validCancelBody({ notas: "  cambio de planes  " })),
    );

    expect(response.status).toBe(200);
    expect(mockReservationUpdateMany.mock.calls[0][0].data.notas).toBe(
      cancelledReservation.notas,
    );
    expect(
      mockReservationUpdateMany.mock.calls[0][0].data.notas.match(
        /Cancelada por asistente/g,
      ),
    ).toHaveLength(1);
  });

  it("registra ALREADY_CANCELLED y revoca residuales una sola vez", async () => {
    const alreadyCancelled = {
      ...reservation,
      estado: ReservationStatus.CANCELADA,
      notas: "Cancelada históricamente",
    };
    mockReservationFindFirst.mockResolvedValue(alreadyCancelled);
    const requestBody = validCancelBody();
    const expectedFingerprint = await fingerprintForCancelBody(requestBody);

    const response = await POST(makeRequest(requestBody));
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        mensaje: "La reserva ya estaba cancelada.",
        reserva: expect.objectContaining({
          id: alreadyCancelled.id,
          negocioId: alreadyCancelled.negocioId,
          estado: ReservationStatus.CANCELADA,
          notas: alreadyCancelled.notas,
        }),
        managementUrl: null,
      }),
    );
    expect(mockReservationUpdateMany).not.toHaveBeenCalled();
    expect(mockRevokeActiveReservationCapabilitiesInTx).toHaveBeenCalledTimes(
      1,
    );
    expect(mockReservationOperationCreate).toHaveBeenCalledWith({
      data: {
        negocioId: RESOLVED_BUSINESS_ID,
        reservationId: reservation.id,
        action: ReservationOperationAction.CANCEL,
        sourceReference: requestBody.sourceReference,
        requestFingerprint: expectedFingerprint,
        managementLinkRequired: false,
        outcome: ReservationOperationOutcome.ALREADY_CANCELLED,
      },
    });
  });

  it.each([
    ReservationOperationOutcome.CANCELLED,
    ReservationOperationOutcome.ALREADY_CANCELLED,
  ])("replay CANCEL %s no repite ninguna mutación", async (outcome) => {
    const requestBody = validCancelBody();
    const fingerprint = await fingerprintForCancelBody(requestBody);
    const cancelledReservation = {
      ...reservation,
      estado: ReservationStatus.CANCELADA,
    };
    mockReservationOperationFindUnique.mockResolvedValue({
      reservationId: reservation.id,
      requestFingerprint: fingerprint,
      outcome,
    });
    mockReservationFindFirst.mockResolvedValue(cancelledReservation);

    const response = await POST(makeRequest(requestBody));
    const payload = await responseBody(response);

    expect(response.status).toBe(200);
    expect(payload.managementUrl).toBeNull();
    expect(mockReservationFindFirst).toHaveBeenCalledWith({
      where: {
        id: reservation.id,
        negocioId: RESOLVED_BUSINESS_ID,
      },
    });
    expectNoWrites();
  });

  it.each([ReservationStatus.COMPLETADA, ReservationStatus.BLOQUEADA])(
    "CANCEL rechaza Reservation actual %s sin consumir la key",
    async (estado) => {
      mockReservationFindFirst.mockResolvedValue({ ...reservation, estado });

      const response = await POST(makeRequest(validCancelBody()));

      expect(response.status).toBe(400);
      await expect(responseBody(response)).resolves.toEqual(
        expect.objectContaining({ code: "RESERVATION_NOT_AVAILABLE" }),
      );
      expectNoWrites();
    },
  );

  it("CANCEL no revela si una reserva pertenece a otro negocio", async () => {
    mockReservationFindFirst.mockResolvedValue(null);

    const response = await POST(makeRequest(validCancelBody()));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: "RESERVATION_NOT_FOUND",
      error: "Reserva no encontrada",
      mensaje: "Reserva no encontrada",
    });
    expectNoWrites();
  });

  it.each([
    ["motivo distinto", { notas: "otro motivo" }],
    ["reserva distinta", { reservaId: "reservation-2" }],
  ])(
    "CANCEL responde 409 si la misma sourceReference cambia %s",
    async (_label, change) => {
      const originalBody = validCancelBody();
      const originalFingerprint = await fingerprintForCancelBody(originalBody);
      mockReservationOperationFindUnique.mockResolvedValue({
        reservationId: reservation.id,
        requestFingerprint: originalFingerprint,
        outcome: ReservationOperationOutcome.CANCELLED,
      });

      const response = await POST(
        makeRequest(
          validCancelBody({
            sourceReference: originalBody.sourceReference,
            ...change,
          }),
        ),
      );

      expect(response.status).toBe(409);
      await expect(responseBody(response)).resolves.toEqual({
        ok: false,
        code: "IDEMPOTENCY_CONFLICT",
        error:
          "La referencia de idempotencia ya fue utilizada con datos diferentes.",
        mensaje:
          "La referencia de idempotencia ya fue utilizada con datos diferentes.",
      });
      expect(mockReservationFindFirst).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );

  it("CANCEL reintenta P2034 y completa en el segundo intento", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      "write conflict",
      { code: "P2034", clientVersion: "6.18.0" },
    );
    const cancelledReservation = {
      ...reservation,
      estado: ReservationStatus.CANCELADA,
    };
    mockTransaction
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(
        async (callback: (tx: typeof mockTransactionClient) => unknown) =>
          callback(mockTransactionClient),
      );
    mockReservationFindFirst
      .mockResolvedValueOnce(reservation)
      .mockResolvedValueOnce(cancelledReservation);

    const response = await POST(makeRequest(validCancelBody()));

    expect(response.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockReservationUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("CANCEL agota tres P2034 con 503 controlado", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      "write conflict",
      { code: "P2034", clientVersion: "6.18.0" },
    );
    mockTransaction.mockRejectedValue(conflict);

    const response = await POST(makeRequest(validCancelBody()));
    const payload = await responseBody(response);

    expect(response.status).toBe(503);
    expect(payload).toEqual(
      expect.objectContaining({
        code: "RESERVATION_CANCEL_RETRY_EXHAUSTED",
      }),
    );
    expect(JSON.stringify(payload)).not.toContain("P2034");
    expect(mockTransaction).toHaveBeenCalledTimes(3);
    expectNoWrites();
  });

  it("CANCEL pierde el P2002 idempotente, reintenta y entra a replay", async () => {
    const requestBody = validCancelBody();
    const fingerprint = await fingerprintForCancelBody(requestBody);
    const race = new Prisma.PrismaClientKnownRequestError("unique conflict", {
      code: "P2002",
      clientVersion: "6.18.0",
      meta: {
        modelName: "ReservationOperation",
        target: ["negocioId", "action", "sourceReference"],
      },
    });
    const cancelledReservation = {
      ...reservation,
      estado: ReservationStatus.CANCELADA,
    };
    mockReservationOperationFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        reservationId: reservation.id,
        requestFingerprint: fingerprint,
        outcome: ReservationOperationOutcome.CANCELLED,
      });
    mockReservationOperationCreate.mockRejectedValueOnce(race);
    mockReservationFindFirst
      .mockResolvedValueOnce(reservation)
      .mockResolvedValueOnce(cancelledReservation);

    const response = await POST(makeRequest(requestBody));

    expect(response.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockReservationUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockRevokeActiveReservationCapabilitiesInTx).toHaveBeenCalledTimes(
      1,
    );
    expect(mockReservationOperationCreate).toHaveBeenCalledTimes(1);
  });

  it("CANCEL no reintenta un P2002 ajeno", async () => {
    const unrelated = new Prisma.PrismaClientKnownRequestError(
      "other unique conflict",
      {
        code: "P2002",
        clientVersion: "6.18.0",
        meta: { modelName: "Reservation", target: ["id"] },
      },
    );
    mockReservationOperationCreate.mockRejectedValue(unrelated);

    const response = await POST(makeRequest(validCancelBody()));

    expect(response.status).toBe(500);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("CANCEL aborta si el updateMany condicionado pierde la carrera", async () => {
    mockReservationUpdateMany.mockResolvedValue({ count: 0 });

    const response = await POST(makeRequest(validCancelBody()));

    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual(
      expect.objectContaining({ code: "RESERVATION_NOT_AVAILABLE" }),
    );
    expect(mockRevokeActiveReservationCapabilitiesInTx).not.toHaveBeenCalled();
    expect(mockReservationOperationCreate).not.toHaveBeenCalled();
  });

  it("CANCEL no crea Operation si falla la revocación dentro de la transacción", async () => {
    mockRevokeActiveReservationCapabilitiesInTx.mockRejectedValue(
      new Error("revoke failed"),
    );

    const response = await POST(makeRequest(validCancelBody()));

    expect(response.status).toBe(500);
    expect(mockReservationUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockReservationOperationCreate).not.toHaveBeenCalled();
  });

  it("CANCEL falla cerrado si no puede crear la Operation", async () => {
    mockReservationOperationCreate.mockRejectedValue(new Error("write failed"));

    const response = await POST(makeRequest(validCancelBody()));

    expect(response.status).toBe(500);
    expect(mockReservationUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockRevokeActiveReservationCapabilitiesInTx).toHaveBeenCalledTimes(
      1,
    );
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("CANCEL recupera response lost mediante replay sin segunda mutación", async () => {
    const requestBody = validCancelBody();
    const fingerprint = await fingerprintForCancelBody(requestBody);
    const cancelledReservation = {
      ...reservation,
      estado: ReservationStatus.CANCELADA,
      notas: "Mesa tranquila\nCancelada por asistente: cambio de planes",
    };
    mockReservationOperationFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        reservationId: reservation.id,
        requestFingerprint: fingerprint,
        outcome: ReservationOperationOutcome.CANCELLED,
      });
    mockReservationFindFirst
      .mockResolvedValueOnce(reservation)
      .mockResolvedValueOnce(cancelledReservation)
      .mockResolvedValueOnce(cancelledReservation);

    const firstResponse = await POST(makeRequest(requestBody));
    const replayResponse = await POST(makeRequest(requestBody));

    expect(firstResponse.status).toBe(200);
    expect(replayResponse.status).toBe(200);
    expect((await responseBody(replayResponse)).managementUrl).toBeNull();
    expect(mockReservationUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockRevokeActiveReservationCapabilitiesInTx).toHaveBeenCalledTimes(
      1,
    );
    expect(mockReservationOperationCreate).toHaveBeenCalledTimes(1);
    expect(mockReservationDelete).not.toHaveBeenCalled();
    expect(mockReservationDeleteMany).not.toHaveBeenCalled();
  });

  it("preserva 404 y allowedActions para una acción desconocida", async () => {
    const response = await POST(makeRequest(bodyFor("accion-que-no-existe")));
    const payload = await responseBody(response);

    expect(response.status).toBe(404);
    expect(payload).toEqual(
      expect.objectContaining({
        ok: false,
        error: "Acción no encontrada",
        mensaje: "Acción no encontrada",
        allowedActions: expect.arrayContaining([
          "es-negocio",
          "reservas-hoy",
          "crear-reserva",
          "modificar-reserva",
          "cancelar-reserva",
        ]),
      }),
    );
    expectNoPrismaCalls();
  });

  it("scopea reservas-hoy por el negocio resuelto server-side", async () => {
    const response = await POST(
      makeRequest(
        bodyFor("reservas-hoy", {
          negocioId: "business-client-controlled",
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(mockReservationFindMany).toHaveBeenCalledTimes(1);
    expect(mockReservationFindMany).toHaveBeenCalledWith({
      where: {
        negocioId: RESOLVED_BUSINESS_ID,
        fechaHoraInicio: {
          gte: expect.any(Date),
          lt: expect.any(Date),
        },
      },
      orderBy: { fechaHoraInicio: "asc" },
      take: 20,
    });
    await expect(responseBody(response)).resolves.toEqual(
      expect.objectContaining({
        isBusiness: true,
        businessName: business.nombre,
        reservas: [],
      }),
    );
  });

  it("no introduce boundary PUBLISHED ni envío de WhatsApp/Meta", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/asistente/route.ts"),
      "utf8",
    );
    const imports = source
      .split("\n")
      .filter((line) => line.trimStart().startsWith("import "))
      .join("\n");

    expect(source).not.toContain("buildPublishedBusinessWhere");
    expect(imports).not.toMatch(/whatsapp|meta|notifier|notify|messaging/i);
  });
});

/*
 * KNOWN GAPS TO HARDEN:
 * - JSON se parsea antes de auth.
 * - body.key aún aceptado.
 * - secret se lee eager al importar.
 * - comparación de key no timing-safe.
 * - internal error expone error.message.
 */
