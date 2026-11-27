jest.mock("server-only", () => ({}), { virtual: true });
const mockGuard = jest.fn(),
  mockBusiness = jest.fn(),
  mockProducts = jest.fn(),
  mockDemoCreate = jest.fn(),
  mockRevoke = jest.fn(),
  mockIssue = jest.fn(),
  mockProvision = jest.fn(),
  mockCreate = jest.fn(),
  mockLock = jest.fn(),
  mockUser = jest.fn();
const mockTx = {
  $queryRaw: mockLock,
  businessDemoLink: { updateMany: mockRevoke, create: mockDemoCreate },
  negocio: { findUnique: mockBusiness },
  product: { findMany: mockProducts },
};
jest.mock("@/lib/business/productAccess", () => ({
  requireSuperAdmin: mockGuard,
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    usuario: { findUnique: mockUser },
    negocio: { findUnique: mockBusiness },
    product: { findMany: mockProducts },
    businessDemoLink: { updateMany: mockRevoke },
    $transaction: (fn: (tx: typeof mockTx) => unknown) => fn(mockTx),
  },
}));
jest.mock("@/app/api/internal/onboarding/provision/route", () => ({
  POST: mockProvision,
}));
jest.mock("@/app/api/negocio/route", () => ({ POST: mockCreate }));
jest.mock("@/lib/auth/account-claim", () => ({ issueAccountClaim: mockIssue }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("./revalidateAdminProductSurfaces", () => ({
  revalidateAdminProductSurfaces: jest.fn(),
}));
import {
  createAssistedBusinessAction,
  generateBusinessDemoAction,
  revokeBusinessDemosAction,
  generateAssistedActivationAction,
  setAssistedPublicationAction,
} from "./assistedOnboarding";
import { demoTokenHash } from "@/lib/onboarding/demo-security";
const oldSite = process.env.SITE_URL;
afterAll(() => {
  if (oldSite === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = oldSite;
});
const businessId = "c49198ca-eecb-466a-ab80-417ae9271e01",
  productId = "8da19f44-b290-489f-ade8-afb69998b925";
const business = {
  id: businessId,
  usuarioId: "pending-user",
  slug: "synthetic",
  nombre: "Ensayo ficticio",
  descripcion: null,
  ciudad: "Bogotá",
  departamento: "Cundinamarca",
  direccion: null,
  telefonoContacto: null,
  fotoPerfil: null,
  fotoPortada: null,
  estado: "suspendido",
  archivedAt: null,
  isTestData: false,
  usuario: {
    id: "pending-user",
    isPlaceholder: true,
    perfilCompleto: false,
    estado: "activo",
    placeholderProvisioningKeyHash: "synthetic-reference-hash",
  },
};
beforeEach(() => {
  jest.resetAllMocks();
  process.env.SITE_URL = "https://myckeo.example.test";
  mockGuard.mockResolvedValue({ id: "superadmin", role: "super_admin" });
  mockBusiness.mockResolvedValue(business);
  mockProducts.mockResolvedValue([
    {
      id: productId,
      nombre: "Producto ficticio",
      descripcion: "Contenido autorizado",
      precio: 28000,
      imagenes: [{ url: "https://res.cloudinary.com/synthetic/image.png" }],
      variantes: [],
    },
  ]);
});
describe("assisted administrative operation boundaries", () => {
  const raw = new Proxy(
    {},
    {
      get() {
        throw new Error("Payload read before authorization");
      },
    },
  );
  it.each(["create", "demo", "revoke", "claim", "publish"])(
    "rejects unauthorized %s before inputs, data, provider calls or writes",
    async (operation) => {
      mockGuard.mockRejectedValue(new Error("No autorizado."));
      const result =
        operation === "create"
          ? await createAssistedBusinessAction(raw)
          : operation === "demo"
            ? await generateBusinessDemoAction(raw)
            : operation === "revoke"
              ? await revokeBusinessDemosAction(businessId)
              : operation === "claim"
                ? await generateAssistedActivationAction(businessId, true)
                : await setAssistedPublicationAction(raw);
      expect(result.ok).toBe(false);
      for (const effect of [
        mockBusiness,
        mockProducts,
        mockProvision,
        mockCreate,
        mockDemoCreate,
        mockRevoke,
        mockIssue,
      ])
        expect(effect).not.toHaveBeenCalled();
    },
  );
  it.each([false, undefined])(
    "requires affirmative content authorization (%p)",
    async (authorizationConfirmed) => {
      expect(
        (
          await generateBusinessDemoAction({
            businessId,
            productIds: [productId],
            authorizationConfirmed,
          })
        ).ok,
      ).toBe(false);
      expect(mockBusiness).not.toHaveBeenCalled();
      expect(mockDemoCreate).not.toHaveBeenCalled();
    },
  );
  it("snapshots only selected products and stores a hash, not the bearer", async () => {
    const result = await generateBusinessDemoAction({
      businessId,
      productIds: [productId],
      authorizationConfirmed: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected demo success");
    const token = new URL(result.url).hash.slice("#token=".length),
      data = mockDemoCreate.mock.calls[0][0].data;
    expect(data.tokenHash === demoTokenHash(token)).toBe(true);
    expect(JSON.stringify(data).includes(token)).toBe(false);
    expect(data.snapshot.businessId).toBe(businessId);
    expect(data.snapshot.products.map((p: { id: string }) => p.id)).toEqual([
      productId,
    ]);
    expect(data.snapshot).not.toHaveProperty("usuario");
    expect(mockProducts.mock.calls[0][0].where).toEqual({
      id: { in: [productId] },
      negocioId: businessId,
    });
    expect(mockLock).toHaveBeenCalledTimes(1);
    expect(mockRevoke).toHaveBeenCalledTimes(1);
  });
  it("cannot mix another business product into a demo", async () => {
    mockProducts.mockResolvedValue([]);
    expect(
      (
        await generateBusinessDemoAction({
          businessId,
          productIds: [productId],
          authorizationConfirmed: true,
        })
      ).ok,
    ).toBe(false);
    expect(mockDemoCreate).not.toHaveBeenCalled();
  });
  it("does not return a demo URL after a storage failure", async () => {
    mockDemoCreate.mockRejectedValue(new Error("Synthetic failure"));
    const result = await generateBusinessDemoAction({
      businessId,
      productIds: [productId],
      authorizationConfirmed: true,
    });
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty("url");
  });
  it("requires explicit manual verification before claim issuance", async () => {
    expect((await generateAssistedActivationAction(businessId, false)).ok).toBe(
      false,
    );
    expect(mockIssue).not.toHaveBeenCalled();
  });
  it("does not merge an existing activated account", async () => {
    mockBusiness.mockResolvedValue({
      ...business,
      usuario: { ...business.usuario, isPlaceholder: false },
    });
    expect((await generateAssistedActivationAction(businessId, true)).ok).toBe(
      false,
    );
    expect(mockIssue).not.toHaveBeenCalled();
  });
  it.each([
    { archivedAt: new Date() },
    { estado: "eliminado" },
    { usuario: { ...business.usuario, placeholderProvisioningKeyHash: null } },
  ])("rejects unavailable provisional identities (%p)", async (override) => {
    mockBusiness.mockResolvedValue({ ...business, ...override });
    expect((await generateAssistedActivationAction(businessId, true)).ok).toBe(
      false,
    );
    expect(mockIssue).not.toHaveBeenCalled();
  });
  it("activation of credentials is separate from permission to publish", async () => {
    expect(
      (
        await setAssistedPublicationAction({
          businessId,
          approved: true,
          productIds: [productId],
          authorizationConfirmed: true,
        })
      ).ok,
    ).toBe(false);
    expect(mockLock).not.toHaveBeenCalled();
    expect(mockIssue).not.toHaveBeenCalled();
  });
});
