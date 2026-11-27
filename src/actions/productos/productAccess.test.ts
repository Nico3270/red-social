jest.mock("server-only", () => ({}), { virtual: true });
const mockAuth = jest.fn();
const mockUser = jest.fn();
const mockFind = jest.fn();
const mockList = jest.fn();
const mockBusiness = jest.fn();
const mockBusinessUnique = jest.fn();
const mockWrite = jest.fn();
const mockRaw = jest.fn();
const mockTx = {
  $queryRaw: mockRaw,
  negocio: { findFirst: mockBusiness },
  product: { updateMany: mockWrite },
};
jest.mock("@/auth.config", () => ({ auth: mockAuth }));
jest.mock("@/actions/myckeoAdmin/revalidateAdminProductSurfaces", () => ({
  revalidateAdminProductSurfaces: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    usuario: { findUnique: mockUser },
    product: { findFirst: mockFind, findMany: mockList },
    negocio: { findFirst: mockBusiness, findUnique: mockBusinessUnique },
    $transaction: (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
  },
}));
import { getProductById } from "./getProductById";
import { getProductsByUser } from "./getProductsFromUser";
import { changeStatusProduct } from "./changeStatusProduct";

describe("private product action regression boundaries", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  function actor(role = "negocio") {
    mockAuth.mockResolvedValue({ user: { id: "owner-A" } });
    mockUser.mockResolvedValue({ id: "owner-A", role, estado: "activo" });
  }
  it.each(["read", "list", "write"])(
    "anonymous %s cannot reach product persistence",
    async (mode) => {
      mockAuth.mockResolvedValue(null);
      const result =
        mode === "read"
          ? await getProductById("private")
          : mode === "list"
            ? await getProductsByUser("owner-A")
            : await changeStatusProduct("private", "disponible");
      expect(result.ok).toBe(false);
      expect(mockFind).not.toHaveBeenCalled();
      expect(mockList).not.toHaveBeenCalled();
      expect(mockWrite).not.toHaveBeenCalled();
    },
  );
  it.each(["user", "negocio", "admin"])(
    "%s only queries its own private product",
    async (role) => {
      actor(role);
      mockFind.mockResolvedValue(null);
      expect((await getProductById("private")).ok).toBe(false);
      expect(mockFind.mock.calls[0][0].where).toEqual({
        id: "private",
        negocio: { is: { usuarioId: "owner-A" } },
      });
    },
  );
  it.each(["user", "negocio", "admin"])(
    "%s cannot list another owner",
    async (role) => {
      actor(role);
      expect((await getProductsByUser("owner-B")).ok).toBe(false);
      expect(mockBusinessUnique).not.toHaveBeenCalled();
    },
  );
  it("superadministrator retains cross-business reads and lists", async () => {
    actor("super_admin");
    mockFind.mockResolvedValue(null);
    await getProductById("private");
    expect(mockFind.mock.calls[0][0].where).toEqual({ id: "private" });
    mockBusinessUnique.mockResolvedValue({ id: "business-B" });
    mockList.mockResolvedValue([]);
    expect((await getProductsByUser("owner-B")).ok).toBe(true);
  });
  it("an owner can list its own hidden products", async () => {
    actor();
    mockBusinessUnique.mockResolvedValue({ id: "business-A" });
    mockList.mockResolvedValue([]);
    expect((await getProductsByUser("owner-A")).ok).toBe(true);
    expect(mockList.mock.calls[0][0].where).toEqual({
      negocioId: "business-A",
    });
  });
  it("different owner cannot modify a hidden product", async () => {
    actor();
    mockFind.mockResolvedValue(null);
    expect((await changeStatusProduct("private", "oculto")).ok).toBe(false);
    expect(mockWrite).not.toHaveBeenCalled();
  });
  it("suspended business rejects publishing before any product write", async () => {
    actor("super_admin");
    mockFind.mockResolvedValue({
      negocioId: "business-B",
      slug: "p",
      negocio: { slug: "b" },
    });
    mockBusiness
      .mockResolvedValueOnce({ id: "business-B" })
      .mockResolvedValueOnce(null);
    expect((await changeStatusProduct("private", "disponible")).ok).toBe(false);
    expect(mockWrite).not.toHaveBeenCalled();
  });
  it("rechecks publication after acquiring the business lock", async () => {
    actor("super_admin");
    mockFind.mockResolvedValue({
      negocioId: "business-B",
      slug: "p",
      negocio: { slug: "b" },
    });
    mockBusiness
      .mockResolvedValueOnce({ id: "business-B" })
      .mockResolvedValueOnce({ id: "business-B" })
      .mockResolvedValueOnce(null);
    expect((await changeStatusProduct("private", "disponible")).ok).toBe(false);
    expect(mockRaw).toHaveBeenCalledTimes(1);
    expect(mockWrite).not.toHaveBeenCalled();
  });
  it.each(["negocio", "super_admin"])(
    "%s can hide a product of an allowed business",
    async (role) => {
      actor(role);
      mockFind.mockResolvedValue({
        negocioId: "business-A",
        slug: "p",
        negocio: { slug: "b" },
      });
      mockBusiness.mockResolvedValue({ id: "business-A" });
      mockWrite.mockResolvedValue({ count: 1 });
      expect((await changeStatusProduct("private", "oculto")).ok).toBe(true);
      expect(mockWrite.mock.calls[0][0].where).toMatchObject({
        id: "private",
        negocioId: "business-A",
      });
    },
  );
  it("zero-row compare-and-set is a failure", async () => {
    actor();
    mockFind.mockResolvedValue({
      negocioId: "business-A",
      slug: "p",
      negocio: { slug: "b" },
    });
    mockBusiness.mockResolvedValue({ id: "business-A" });
    mockWrite.mockResolvedValue({ count: 0 });
    expect((await changeStatusProduct("private", "oculto")).ok).toBe(false);
  });
});
