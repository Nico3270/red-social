jest.mock("server-only", () => ({}), { virtual: true });
const mockAuth = jest.fn(),
  mockUser = jest.fn(),
  mockBusiness = jest.fn();
jest.mock("@/auth.config", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    usuario: { findUnique: mockUser },
    negocio: { findFirst: mockBusiness },
  },
}));
import {
  productActor,
  privateProductScope,
  requireSuperAdmin,
  assertProductWriteBusiness,
} from "./productAccess";

describe("product ownership at action boundary", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it("rejects anonymous before touching persistence", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(productActor()).rejects.toThrow();
    expect(mockUser).not.toHaveBeenCalled();
  });
  it.each(["user", "negocio", "admin"])(
    "%s has only its own business scope",
    (role) =>
      expect(privateProductScope({ id: "owner-A", role })).toEqual({
        negocio: { is: { usuarioId: "owner-A" } },
      }),
  );
  it("superadministrator can inspect hidden products across businesses", () =>
    expect(privateProductScope({ id: "admin-A", role: "super_admin" })).toEqual(
      {},
    ));
  it("checks current account state and role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-A", role: "super_admin" },
    });
    mockUser.mockResolvedValue({
      id: "admin-A",
      estado: "activo",
      role: "user",
    });
    await expect(requireSuperAdmin()).rejects.toThrow();
    mockUser.mockResolvedValue({
      id: "admin-A",
      estado: "inactivo",
      role: "super_admin",
    });
    await expect(productActor()).rejects.toThrow();
  });
  it("permits draft preparation while suspended but never publication", async () => {
    mockBusiness.mockResolvedValueOnce({ id: "business-A" });
    await expect(
      assertProductWriteBusiness("business-A", "oculto"),
    ).resolves.toBeUndefined();
    mockBusiness
      .mockResolvedValueOnce({ id: "business-A" })
      .mockResolvedValueOnce(null);
    await expect(
      assertProductWriteBusiness("business-A", "disponible"),
    ).rejects.toThrow();
  });
  it("rejects deleted or archived businesses", async () => {
    mockBusiness.mockResolvedValue(null);
    await expect(
      assertProductWriteBusiness("business-A", "oculto"),
    ).rejects.toThrow();
  });
});
