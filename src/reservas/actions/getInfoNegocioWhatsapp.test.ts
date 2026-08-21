const mockFindNegocio = jest.fn();

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    negocio: { findUnique: mockFindNegocio },
    reservation: { findUnique: jest.fn() },
  },
}));

import { getInfoNegocioWhatsapp } from "./getInfoNegocioWhatsapp";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getInfoNegocioWhatsapp", () => {
  it("devuelve únicamente los datos reales de un negocio existente", async () => {
    mockFindNegocio.mockResolvedValue({
      nombre: "Panadería Central",
      slug: "panaderia-central",
      telefonoContacto: "+573001112233",
    });

    await expect(getInfoNegocioWhatsapp("negocio-1")).resolves.toEqual({
      ok: true,
      message: "Información del negocio obtenida correctamente",
      nombreNegocio: "Panadería Central",
      slugNegocio: "panaderia-central",
      telefonoNegocio: "+573001112233",
    });
  });

  it("devuelve null cuando el negocio no existe", async () => {
    mockFindNegocio.mockResolvedValue(null);

    await expect(getInfoNegocioWhatsapp("negocio-inexistente")).resolves.toBeNull();
  });

  it("conserva ausente el teléfono opcional de un negocio existente", async () => {
    mockFindNegocio.mockResolvedValue({
      nombre: "Panadería Central",
      slug: "panaderia-central",
      telefonoContacto: null,
    });

    const result = await getInfoNegocioWhatsapp("negocio-1");

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        nombreNegocio: "Panadería Central",
        slugNegocio: "panaderia-central",
        telefonoNegocio: undefined,
      }),
    );
  });

  it("propaga un error de DB sin convertirlo en información ficticia", async () => {
    const dbError = new Error("DB no disponible");
    mockFindNegocio.mockRejectedValue(dbError);

    await expect(getInfoNegocioWhatsapp("negocio-1")).rejects.toBe(dbError);
  });

  it("devuelve null para un ID ausente sin consultar Prisma", async () => {
    await expect(getInfoNegocioWhatsapp("")).resolves.toBeNull();
    expect(mockFindNegocio).not.toHaveBeenCalled();
  });
});
