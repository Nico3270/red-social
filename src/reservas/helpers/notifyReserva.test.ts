const mockGetInfoNegocio = jest.fn();
const mockSendWhatsApp = jest.fn();
const mockSendWhatsAppMessage = jest.fn();
const mockFetch = jest.fn();

const originalAdminKey = process.env.MYCKEO_ADMIN_KEY;
const originalAdminUrl = process.env.MYCKEO_ADMIN_URL;
const originalSiteUrl = process.env.SITE_URL;
const originalNodeEnv = process.env.NODE_ENV;
const originalWhatsAppToken = process.env.WHATSAPP_TOKEN;
const originalOutboundNotificationsFlag =
  process.env.MYCKEO_DISABLE_OUTBOUND_NOTIFICATIONS;
const originalFetch = global.fetch;

const ADMIN_STAGING_ORIGIN = "https://admin.staging.test";
const SITE_STAGING_ORIGIN = "https://app.staging.test";
const TEST_MANAGEMENT_LINK =
  "https://app.staging.test/reservas/gestionar/test-capability";

process.env.MYCKEO_ADMIN_KEY = "test-admin-key";
process.env.MYCKEO_ADMIN_URL = ADMIN_STAGING_ORIGIN;
process.env.SITE_URL = SITE_STAGING_ORIGIN;

jest.mock("../actions/getInfoNegocioWhatsapp", () => ({
  getInfoNegocioWhatsapp: mockGetInfoNegocio,
}));
jest.mock(
  "@/reservas/interfaces/interfaces.whatsapp",
  () => jest.requireActual("../interfaces/interfaces.whatsapp"),
  { virtual: true },
);
jest.mock(
  "@/servicios/whatsapp/buildTemplateMessage",
  () => jest.requireActual("../../servicios/whatsapp/buildTemplateMessage"),
  { virtual: true },
);
jest.mock(
  "@/servicios/whatsapp/sender",
  () => ({
    sendWhatsApp: mockSendWhatsApp,
  }),
  { virtual: true },
);
jest.mock("./sendWhatsAppMessage", () => ({
  sendWhatsAppMessage: mockSendWhatsAppMessage,
}));

import { notifyReservaConfirmadaCliente } from "./notifyReserva";
import { PlantillaWhatsApp } from "../interfaces/interfaces.whatsapp";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const telefonoDestino = "+573001112233";

function mockWindow(isOpen: boolean) {
  mockFetch.mockImplementation(async (input: string | URL | Request) => {
    if (String(input).endsWith("/api/whatsapp/window")) {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ isOpen }),
      };
    }

    return { ok: true, status: 201 };
  });
}

function cancelacionProps() {
  return {
    to: telefonoDestino,
    nombre_cliente: "Cliente real",
    fechaHora: "12 de agosto de 2026 a las 10:00 a. m.",
    template: PlantillaWhatsApp.RESERVA_CANCELADA_USUARIO,
    negocioId: "negocio-1",
  };
}

function cancelacionNegocioProps() {
  return {
    to: telefonoDestino,
    nombre_cliente: "Cliente real",
    telefono_cliente: "+573004445566",
    fechaHora: "12 de agosto de 2026 a las 10:00 a. m.",
    template: PlantillaWhatsApp.RESERVA_CANCELADA_NEGOCIO,
    negocioId: "negocio-1",
  };
}

function confirmacionProps(descripcion?: string) {
  return {
    to: telefonoDestino,
    nombre_cliente: "Cliente real",
    fechaHora: "12 de agosto de 2026 a las 10:00 a. m.",
    enlace_cancelar: TEST_MANAGEMENT_LINK,
    descripcion,
    template: PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE,
    negocioId: "negocio-1",
  };
}

function pedidoNegocioProps(descripcion?: string) {
  return {
    to: telefonoDestino,
    nombre_cliente: "Cliente real",
    telefono_cliente: "+573004445566",
    datos_pedido: "1 producto real",
    valor_compra: "$20.000",
    direccion: "Calle real 1",
    descripcion,
    template: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO,
    negocioId: "negocio-1",
  };
}

const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
const infoSpy = jest.spyOn(console, "info").mockImplementation(() => undefined);
const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
const errorSpy = jest
  .spyOn(console, "error")
  .mockImplementation(() => undefined);

function serializedConsoleOutput() {
  return [logSpy, infoSpy, warnSpy, errorSpy]
    .flatMap((spy) => spy.mock.calls)
    .map((args) => JSON.stringify(args))
    .join("\n");
}

function expectNoExternalEffects() {
  expect(mockFetch).not.toHaveBeenCalled();
  expect(mockSendWhatsApp).not.toHaveBeenCalled();
  expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.MYCKEO_DISABLE_OUTBOUND_NOTIFICATIONS;
  process.env.MYCKEO_ADMIN_URL = ADMIN_STAGING_ORIGIN;
  process.env.SITE_URL = SITE_STAGING_ORIGIN;
  restoreEnv("NODE_ENV", "test");
  mockGetInfoNegocio.mockResolvedValue({
    ok: true,
    message: "Información obtenida",
    nombreNegocio: "Panadería Real",
    slugNegocio: "panaderia-real",
    telefonoNegocio: undefined,
  });
  mockSendWhatsApp.mockResolvedValue({
    ok: true,
    data: { messages: [{ id: "free-message-1" }] },
  });
  mockSendWhatsAppMessage.mockResolvedValue({
    ok: true,
    data: { messages: [{ id: "template-message-1" }] },
  });
  mockWindow(true);
  global.fetch = mockFetch as typeof fetch;
});

afterEach(() => {
  restoreEnv(
    "MYCKEO_DISABLE_OUTBOUND_NOTIFICATIONS",
    originalOutboundNotificationsFlag,
  );
});

afterAll(() => {
  restoreEnv("MYCKEO_ADMIN_KEY", originalAdminKey);
  restoreEnv("MYCKEO_ADMIN_URL", originalAdminUrl);
  restoreEnv("SITE_URL", originalSiteUrl);
  restoreEnv("NODE_ENV", originalNodeEnv);
  restoreEnv("WHATSAPP_TOKEN", originalWhatsAppToken);
  global.fetch = originalFetch;
  logSpy.mockRestore();
  infoSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

describe("notifyReserva without fictitious data", () => {
  it("usa exactamente los endpoints admin del origin explícito de staging", async () => {
    const result = await notifyReservaConfirmadaCliente(cancelacionProps());

    expect(result).toEqual(expect.objectContaining({ ok: true, free: true }));
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[0][0])).toBe(
      "https://admin.staging.test/api/whatsapp/window",
    );
    expect(String(mockFetch.mock.calls[1][0])).toBe(
      "https://admin.staging.test/api/events",
    );
  });

  it("con ventana abierta usa nombre y slug reales en el mensaje libre", async () => {
    const result = await notifyReservaConfirmadaCliente(cancelacionProps());

    expect(result).toEqual(expect.objectContaining({ ok: true, free: true }));
    expect(mockSendWhatsApp).toHaveBeenCalledTimes(1);
    expect(mockSendWhatsApp).toHaveBeenCalledWith({
      to: telefonoDestino,
      text: expect.stringContaining("Panadería Real"),
    });
    expect(mockSendWhatsApp.mock.calls[0][0].text).toContain(
      "https://app.staging.test/reservas/panaderia-real",
    );
    expect(mockSendWhatsApp.mock.calls[0][0].text).not.toContain("myckeo.com");
    expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("construye el dashboard de reservas desde SITE_URL para la cancelación del cliente", async () => {
    const result = await notifyReservaConfirmadaCliente(
      cancelacionNegocioProps(),
    );

    expect(result).toEqual(expect.objectContaining({ ok: true, free: true }));
    const message = mockSendWhatsApp.mock.calls[0][0].text;
    expect(message).toContain("https://app.staging.test/dashboard/reservas");
    expect(message).not.toContain("myckeo.com");
  });

  it("con negocio inexistente falla sin construir ni enviar contenido ficticio", async () => {
    mockGetInfoNegocio.mockResolvedValue(null);

    const result = await notifyReservaConfirmadaCliente(cancelacionProps());

    expect(result).toEqual(
      expect.objectContaining({ ok: false, status: "validation_error" }),
    );
    expect(result.errorMessage).toContain(
      "Información del negocio no encontrada",
    );
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
    expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("rechaza N/A como teléfono destinatario antes de consultar ventana o enviar", async () => {
    const result = await notifyReservaConfirmadaCliente({
      ...cancelacionProps(),
      to: "N/A",
    });

    expect(result).toEqual(
      expect.objectContaining({ ok: false, status: "validation_error" }),
    );
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
    expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("rechaza N/A como teléfono visible del cliente", async () => {
    const result = await notifyReservaConfirmadaCliente({
      to: telefonoDestino,
      nombre_cliente: "Cliente real",
      telefono_cliente: "N/A",
      fechaHora: "12 de agosto de 2026 a las 10:00 a. m.",
      template: PlantillaWhatsApp.CONFIRMAR_NEGOCIO_RESERVA,
      negocioId: "negocio-1",
    });

    expect(result).toEqual(
      expect.objectContaining({ ok: false, status: "validation_error" }),
    );
    expect(result.errorMessage).toContain("telefono_cliente");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
    expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("conserva exactamente el comentario real en el mensaje libre", async () => {
    const result = await notifyReservaConfirmadaCliente(
      confirmacionProps("Cliente solicita mesa junto a la ventana"),
    );

    expect(result).toEqual(expect.objectContaining({ ok: true, free: true }));
    expect(mockSendWhatsApp.mock.calls[0][0].text).toContain(
      "Notas adicionales: Cliente solicita mesa junto a la ventana",
    );
    expect(mockSendWhatsApp.mock.calls[0][0].text).not.toContain(
      "Sin comentarios adicionales",
    );
  });

  it("usa el texto neutro en el builder libre cuando no hay comentarios", async () => {
    const result = await notifyReservaConfirmadaCliente(confirmacionProps());

    expect(result).toEqual(expect.objectContaining({ ok: true, free: true }));
    expect(mockSendWhatsApp.mock.calls[0][0].text).toContain(
      "Notas adicionales: Sin comentarios adicionales",
    );
    expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("usa el texto neutro como variable del template cerrado", async () => {
    mockWindow(false);

    const result = await notifyReservaConfirmadaCliente(pedidoNegocioProps());

    expect(result).toEqual(expect.objectContaining({ ok: true, free: false }));
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
    expect(mockSendWhatsAppMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        templateName: PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO,
        variables: expect.arrayContaining(["Sin comentarios adicionales"]),
      }),
    );
  });

  it("con ventana cerrada conserva el envío mediante template", async () => {
    mockWindow(false);

    const result = await notifyReservaConfirmadaCliente(cancelacionProps());

    expect(result).toEqual(expect.objectContaining({ ok: true, free: false }));
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
    expect(mockSendWhatsAppMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        to: telefonoDestino,
        templateName: PlantillaWhatsApp.RESERVA_CANCELADA_USUARIO,
        variables: expect.arrayContaining([
          "Panadería Real",
          "https://app.staging.test/reservas/panaderia-real",
        ]),
      }),
    );
  });

  it("no escribe PII, comentarios ni fragmentos de la admin key en console", async () => {
    const telefonoSensible = "+573009876543";
    const nombreSensible = "NOMBRE_PRIVADO_MARCADOR";
    const comentarioSensible = "COMENTARIO_PRIVADO_MARCADOR";
    mockGetInfoNegocio.mockResolvedValue({
      ok: true,
      message: "Información obtenida",
      nombreNegocio: "NEGOCIO_PRIVADO_MARCADOR",
      slugNegocio: "negocio-privado-marcador",
    });

    const result = await notifyReservaConfirmadaCliente({
      ...confirmacionProps(comentarioSensible),
      to: telefonoSensible,
      nombre_cliente: nombreSensible,
    });

    expect(result.ok).toBe(true);
    const output = serializedConsoleOutput();
    expect(output).not.toContain(telefonoSensible);
    expect(output).not.toContain(nombreSensible);
    expect(output).not.toContain(comentarioSensible);
    expect(output).not.toContain("NEGOCIO_PRIVADO_MARCADOR");
    expect(output).not.toContain("negocio-privado-marcador");
    expect(output).not.toContain("test-admin-key");
    expect(output).toContain(PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE);
    expect(output).toContain("Ventana ABIERTA");
    expect(output).toContain("Resultado envío GRATIS");
  });

  it("en rechazo del provider registra solo clasificación técnica segura", async () => {
    const textoPrivadoProvider = "RESPUESTA_PRIVADA_DEL_PROVIDER";
    mockSendWhatsApp.mockResolvedValue({
      ok: false,
      status: 400,
      error: {
        code: "bad_request",
        type: "OAuthException",
        message: textoPrivadoProvider,
      },
    });

    const result = await notifyReservaConfirmadaCliente(cancelacionProps());

    expect(result).toEqual(
      expect.objectContaining({ ok: false, status: "free_failed" }),
    );
    const output = serializedConsoleOutput();
    expect(output).not.toContain(textoPrivadoProvider);
    expect(output).toContain("bad_request");
    expect(output).toContain("OAuthException");
    expect(output).toContain("400");
    expect(output).toContain("no confirmó la aceptación del mensaje libre");
  });
});

describe("notifyReserva environment isolation", () => {
  it("suprime todo outbound cuando el flag es true", async () => {
    process.env.MYCKEO_DISABLE_OUTBOUND_NOTIFICATIONS = "true";

    const result = await notifyReservaConfirmadaCliente(cancelacionProps());

    expect(result).toEqual({
      ok: false,
      free: false,
      message: null,
      errorMessage: null,
      result: null,
      status: "SUPPRESSED_BY_ENV",
      providerAccepted: false,
    });
    expect(mockGetInfoNegocio).not.toHaveBeenCalled();
    expectNoExternalEffects();
  });

  it("falla cerrado sin outbound cuando el flag es inválido", async () => {
    process.env.MYCKEO_DISABLE_OUTBOUND_NOTIFICATIONS = "invalid";

    const result = await notifyReservaConfirmadaCliente(cancelacionProps());

    expect(result).toEqual({
      ok: false,
      free: false,
      message: null,
      errorMessage: null,
      result: null,
      status: "SUPPRESSED_INVALID_ENV",
      providerAccepted: false,
    });
    expect(mockGetInfoNegocio).not.toHaveBeenCalled();
    expectNoExternalEffects();
  });

  it("mantiene el flujo normal cuando el flag es false", async () => {
    process.env.MYCKEO_DISABLE_OUTBOUND_NOTIFICATIONS = "false";

    const result = await notifyReservaConfirmadaCliente(cancelacionProps());

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        status: "free_sent",
        providerAccepted: true,
      }),
    );
    expect(mockGetInfoNegocio).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockSendWhatsApp).toHaveBeenCalledTimes(1);
    expect(mockSendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it("falla cerrado cuando MYCKEO_ADMIN_URL está ausente", async () => {
    delete process.env.MYCKEO_ADMIN_URL;

    const result = await notifyReservaConfirmadaCliente(cancelacionProps());

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        status: "validation_error",
        errorMessage: "MYCKEO_ADMIN_URL inválida",
      }),
    );
    expect(mockGetInfoNegocio).not.toHaveBeenCalled();
    expectNoExternalEffects();
  });

  it.each([
    ["vacía", ""],
    ["con whitespace exterior", ` ${ADMIN_STAGING_ORIGIN} `],
    ["con path", `${ADMIN_STAGING_ORIGIN}/foo`],
    ["con query", `${ADMIN_STAGING_ORIGIN}?x=1`],
    ["con hash", `${ADMIN_STAGING_ORIGIN}/#x`],
    ["con userinfo", "https://user:pass@admin.staging.test"],
    ["con protocolo no HTTP", "ftp://admin.staging.test"],
  ])(
    "falla cerrado con MYCKEO_ADMIN_URL %s",
    async (_caseName, invalidAdminUrl) => {
      process.env.MYCKEO_ADMIN_URL = invalidAdminUrl;

      const result = await notifyReservaConfirmadaCliente(cancelacionProps());

      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          status: "validation_error",
          errorMessage: "MYCKEO_ADMIN_URL inválida",
        }),
      );
      expect(mockGetInfoNegocio).not.toHaveBeenCalled();
      expectNoExternalEffects();
    },
  );

  it("falla cerrado antes de admin cuando SITE_URL falta para un link público", async () => {
    delete process.env.SITE_URL;

    const result = await notifyReservaConfirmadaCliente(
      cancelacionNegocioProps(),
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        status: "validation_error",
        errorMessage: "SITE_URL inválida",
      }),
    );
    expect(mockGetInfoNegocio).not.toHaveBeenCalled();
    expectNoExternalEffects();
  });

  it.each([
    ["vacía", ""],
    ["con whitespace exterior", ` ${SITE_STAGING_ORIGIN} `],
    ["con path", `${SITE_STAGING_ORIGIN}/foo`],
    ["con query", `${SITE_STAGING_ORIGIN}?x=1`],
    ["con hash", `${SITE_STAGING_ORIGIN}/#x`],
    ["con userinfo", "https://user:pass@app.staging.test"],
    ["con protocolo no HTTP", "ftp://app.staging.test"],
  ])(
    "falla cerrado con SITE_URL %s cuando la plantilla necesita link",
    async (_caseName, invalidSiteUrl) => {
      process.env.SITE_URL = invalidSiteUrl;

      const result = await notifyReservaConfirmadaCliente(cancelacionProps());

      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          status: "validation_error",
          errorMessage: "SITE_URL inválida",
        }),
      );
      expect(mockGetInfoNegocio).not.toHaveBeenCalled();
      expectNoExternalEffects();
    },
  );

  it("no exige SITE_URL para una plantilla que no construye links", async () => {
    delete process.env.SITE_URL;

    const result = await notifyReservaConfirmadaCliente(pedidoNegocioProps());

    expect(result).toEqual(expect.objectContaining({ ok: true, free: true }));
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockSendWhatsApp).toHaveBeenCalledTimes(1);
  });

  it("acepta origins de producción cuando se configuran explícitamente", async () => {
    restoreEnv("NODE_ENV", "production");
    process.env.MYCKEO_ADMIN_URL = "https://admin.production.test";
    process.env.SITE_URL = "https://app.production.test";

    try {
      const result = await notifyReservaConfirmadaCliente(
        cancelacionNegocioProps(),
      );

      expect(result).toEqual(expect.objectContaining({ ok: true, free: true }));
      expect(String(mockFetch.mock.calls[0][0])).toBe(
        "https://admin.production.test/api/whatsapp/window",
      );
      expect(mockSendWhatsApp.mock.calls[0][0].text).toContain(
        "https://app.production.test/dashboard/reservas",
      );
    } finally {
      restoreEnv("NODE_ENV", "test");
    }
  });

  it("permite loopback fuera de producción", async () => {
    restoreEnv("NODE_ENV", "development");
    process.env.MYCKEO_ADMIN_URL = "http://localhost:3000";
    process.env.SITE_URL = "http://127.0.0.1:3001";

    try {
      const result = await notifyReservaConfirmadaCliente(cancelacionProps());

      expect(result).toEqual(expect.objectContaining({ ok: true, free: true }));
      expect(String(mockFetch.mock.calls[0][0])).toBe(
        "http://localhost:3000/api/whatsapp/window",
      );
      expect(mockSendWhatsApp.mock.calls[0][0].text).toContain(
        "http://127.0.0.1:3001/reservas/panaderia-real",
      );
    } finally {
      restoreEnv("NODE_ENV", "test");
    }
  });

  it("rechaza admin loopback en producción", async () => {
    restoreEnv("NODE_ENV", "production");
    process.env.MYCKEO_ADMIN_URL = "http://localhost:3000";

    try {
      const result = await notifyReservaConfirmadaCliente(cancelacionProps());

      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          errorMessage: "MYCKEO_ADMIN_URL inválida",
        }),
      );
      expectNoExternalEffects();
    } finally {
      restoreEnv("NODE_ENV", "test");
    }
  });

  it("rechaza SITE_URL loopback en producción antes de consultar admin", async () => {
    restoreEnv("NODE_ENV", "production");
    process.env.SITE_URL = "http://127.0.0.1:3000";

    try {
      const result = await notifyReservaConfirmadaCliente(
        cancelacionNegocioProps(),
      );

      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          errorMessage: "SITE_URL inválida",
        }),
      );
      expectNoExternalEffects();
    } finally {
      restoreEnv("NODE_ENV", "test");
    }
  });

  it("con config válida degrada a template si falla remotamente window", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("window remote failure"))
      .mockResolvedValueOnce({ ok: true, status: 201 });

    const result = await notifyReservaConfirmadaCliente(cancelacionProps());

    expect(result).toEqual(expect.objectContaining({ ok: true, free: false }));
    expect(mockSendWhatsApp).not.toHaveBeenCalled();
    expect(mockSendWhatsAppMessage).toHaveBeenCalledTimes(1);
    expect(String(mockFetch.mock.calls[1][0])).toBe(
      "https://admin.staging.test/api/events",
    );
  });

  it("mantiene /api/events best-effort cuando su request falla", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ isOpen: true }),
      })
      .mockRejectedValueOnce(new Error("events remote failure"));

    const result = await notifyReservaConfirmadaCliente(cancelacionProps());

    expect(result).toEqual(expect.objectContaining({ ok: true, free: true }));
    expect(mockSendWhatsApp).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("no registra secretos, teléfono ni raw env inválido al fallar config", async () => {
    const invalidRawUrl = " https://admin.invalid.test/secret-path ";
    const whatsappSecret = "WHATSAPP_TOKEN_PRIVADO_MARCADOR";
    process.env.MYCKEO_ADMIN_URL = invalidRawUrl;
    process.env.WHATSAPP_TOKEN = whatsappSecret;

    const result = await notifyReservaConfirmadaCliente(cancelacionProps());

    expect(result.ok).toBe(false);
    const output = serializedConsoleOutput();
    expect(output).not.toContain(invalidRawUrl);
    expect(output).not.toContain("test-admin-key");
    expect(output).not.toContain(whatsappSecret);
    expect(output).not.toContain(telefonoDestino);
    expectNoExternalEffects();
  });

  it("no conserva literales productivos en el helper", () => {
    const source = readFileSync(
      join(process.cwd(), "src/reservas/helpers/notifyReserva.ts"),
      "utf8",
    );

    expect(source).not.toContain("myckeo-admin.vercel.app");
    expect(source).not.toContain("https://myckeo.com");
    expect(source).not.toContain("https://www.myckeo.com");
  });
});
