import {
  geocodingErrorMessage,
  geolocationErrorMessage,
  LOCATION_MESSAGES,
  requestProfileLocation,
  validProfileLocation,
} from "./profileLocation";

describe("ubicación del perfil", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  afterAll(() => warn.mockRestore());

  it.each([
    [0, 0],
    [90, -180],
    [-90, 180],
    [6.24, -75.58],
  ])("acepta números válidos %s, %s", (lat, lng) => {
    expect(validProfileLocation(lat, lng)).toEqual({ lat, lng });
  });
  it.each([
    [null, null],
    [undefined, -74],
    [NaN, 3],
    [Infinity, 2],
    [91, 0],
    [0, -181],
    ["4.7", "-74"],
    ["", ""],
  ])("rechaza %s, %s sin convertir ausencia en cero", (lat, lng) => {
    expect(validProfileLocation(lat, lng)).toBeNull();
  });

  it("obtiene coordenadas en orden latitud, longitud con opciones limitadas", async () => {
    const getCurrentPosition = jest.fn((success) =>
      success({ coords: { latitude: 6.24, longitude: -75.58 } }),
    );
    await expect(
      requestProfileLocation({
        secureContext: true,
        geolocation: { getCurrentPosition },
      }),
    ).resolves.toEqual({ lat: 6.24, lng: -75.58 });
    expect(getCurrentPosition.mock.calls[0]).toEqual([
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    ]);
  });
  it.each([
    [1, LOCATION_MESSAGES.denied],
    [2, LOCATION_MESSAGES.unavailable],
    [3, LOCATION_MESSAGES.timeout],
    [0, LOCATION_MESSAGES.unexpected],
    [99, LOCATION_MESSAGES.unexpected],
  ])(
    "clasifica código %s sin necesitar constantes de instancia",
    async (code, message) => {
      const getCurrentPosition = jest.fn((_success, error) => error({ code }));
      await expect(
        requestProfileLocation({
          secureContext: true,
          geolocation: { getCurrentPosition },
        }),
      ).rejects.toThrow(message);
    },
  );
  it("trata API ausente", async () => {
    await expect(
      requestProfileLocation({ secureContext: true }),
    ).rejects.toThrow(LOCATION_MESSAGES.unsupported);
  });
  it.each([
    [{ secureContext: false }, LOCATION_MESSAGES.insecure],
    [{ secureContext: true, allowedByPolicy: false }, LOCATION_MESSAGES.policy],
  ])(
    "no solicita ubicación en contexto restringido",
    async (environment, message) => {
      const getCurrentPosition = jest.fn();
      await expect(
        requestProfileLocation({
          ...environment,
          geolocation: { getCurrentPosition },
        }),
      ).rejects.toThrow(message);
      expect(getCurrentPosition).not.toHaveBeenCalled();
    },
  );
  it("captura excepciones síncronas de la API", async () => {
    await expect(
      requestProfileLocation({
        secureContext: true,
        geolocation: {
          getCurrentPosition: () => {
            throw new Error("fallo de plataforma");
          },
        },
      }),
    ).rejects.toThrow(LOCATION_MESSAGES.unexpected);
    expect(geolocationErrorMessage(null)).toBe(LOCATION_MESSAGES.unexpected);
  });
  it("rechaza coordenadas inválidas entregadas por el proveedor", async () => {
    const getCurrentPosition = jest.fn((success) =>
      success({ coords: { latitude: NaN, longitude: -74 } }),
    );
    await expect(
      requestProfileLocation({
        secureContext: true,
        geolocation: { getCurrentPosition },
      }),
    ).rejects.toThrow(LOCATION_MESSAGES.unavailable);
  });
  it.each([
    "ZERO_RESULTS",
    "REQUEST_DENIED",
    "OVER_QUERY_LIMIT",
    "OVER_DAILY_LIMIT",
    "UNKNOWN_ERROR",
    undefined,
  ])("explica el error externo %s", (code) => {
    expect(geocodingErrorMessage({ code })).toMatch(/mapa|Colombia/);
    expect(geocodingErrorMessage(code)).toMatch(/mapa|Colombia/);
  });
});
