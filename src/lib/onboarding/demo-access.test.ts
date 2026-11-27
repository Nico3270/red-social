jest.mock("server-only", () => ({}), { virtual: true });
const mockLimit = jest.fn(),
  mockFind = jest.fn();
jest.mock("@upstash/redis", () => ({ Redis: { fromEnv: jest.fn() } }));
jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    jest.fn().mockImplementation(() => ({ limit: mockLimit })),
    { slidingWindow: jest.fn() },
  ),
}));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: { businessDemoLink: { findFirst: mockFind } },
}));
import { allowDemoRequest, findValidDemo } from "./demo-access";
import { demoTokenHash } from "./demo-security";

describe("private demo persistence and provider failure", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BUSINESS_DEMO_SESSION_SECRET =
      "synthetic-test-secret-with-at-least-thirty-two-bytes";
  });
  it("rejects malformed tokens before querying persistence", async () => {
    expect(await findValidDemo("../other-business")).toBeNull();
    expect(mockFind).not.toHaveBeenCalled();
  });
  it("queries only an unrevoked, unexpired link and an allowed business", async () => {
    const token = "A".repeat(43);
    mockFind.mockResolvedValue(null);
    await findValidDemo(token);
    const query = mockFind.mock.calls[0][0];
    expect(query.where.tokenHash).toBe(demoTokenHash(token));
    expect(query.where.revokedAt).toBeNull();
    expect(query.where.expiresAt.gt).toBeInstanceOf(Date);
    expect(query.where.negocio.is).toEqual({
      estado: { in: ["activo", "suspendido"] },
      archivedAt: null,
      usuario: { is: { estado: "activo" } },
    });
    expect(JSON.stringify(query)).not.toContain(token);
    expect(query.select.snapshot).toBe(true);
    expect(query.select.usuario).toBeUndefined();
  });
  it.each([null, { revokedAt: new Date() }])(
    "unavailable links never disclose a fallback profile (%p)",
    async () => {
      mockFind.mockResolvedValue(null);
      expect(await findValidDemo("B".repeat(43))).toBeNull();
    },
  );
  it("rate-limit identifiers contain no IP or token", async () => {
    mockLimit.mockResolvedValue({ success: true });
    expect(
      await allowDemoRequest(new Headers({ "x-forwarded-for": "192.0.2.1" })),
    ).toBe(true);
    expect(mockLimit.mock.calls[0][0]).toMatch(/^[0-9a-f]{64}$/);
  });
  it("denies excessive requests", async () => {
    mockLimit.mockResolvedValue({ success: false });
    expect(await allowDemoRequest(new Headers())).toBe(false);
  });
  it("fails closed when the Redis provider fails", async () => {
    mockLimit.mockRejectedValue(new Error("Provider unavailable"));
    expect(await allowDemoRequest(new Headers())).toBe(false);
  });
});
