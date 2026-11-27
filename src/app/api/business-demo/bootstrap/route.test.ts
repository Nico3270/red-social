jest.mock("server-only", () => ({}), { virtual: true });
const mockLimit = jest.fn(),
  mockFind = jest.fn();
jest.mock("@/lib/onboarding/demo-access", () => ({
  allowDemoRequest: mockLimit,
  findValidDemo: mockFind,
}));
import { POST } from "./route";
import { DEMO_COOKIE, readDemoSession } from "@/lib/onboarding/demo-security";
const token = "A".repeat(43),
  oldOrigin = process.env.SITE_URL,
  oldSecret = process.env.BUSINESS_DEMO_SESSION_SECRET;
beforeEach(() => {
  jest.resetAllMocks();
  process.env.SITE_URL = "https://demo.myckeo.test";
  process.env.BUSINESS_DEMO_SESSION_SECRET =
    "synthetic-demo-session-secret-for-tests-only";
  mockLimit.mockResolvedValue(true);
  mockFind.mockResolvedValue({ expiresAt: new Date(Date.now() + 60000) });
});
afterAll(() => {
  if (oldOrigin === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = oldOrigin;
  if (oldSecret === undefined) delete process.env.BUSINESS_DEMO_SESSION_SECRET;
  else process.env.BUSINESS_DEMO_SESSION_SECRET = oldSecret;
});
const request = (body: unknown, origin = "https://demo.myckeo.test") =>
  new Request("http://localhost/api/business-demo/bootstrap", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
describe("private demo bootstrap boundary", () => {
  it("exchanges a valid bearer for a scoped encrypted cookie without reflecting the token", async () => {
    const r = await POST(request({ token }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    const cookie = r.cookies.get(DEMO_COOKIE);
    expect(cookie?.value).not.toContain(token);
    expect(readDemoSession(cookie?.value)).toBe(token);
    expect(r.headers.get("set-cookie")).toContain("HttpOnly");
    expect(r.headers.get("set-cookie")).toContain("Path=/demo");
    expect(r.headers.get("cache-control")).toContain("no-store");
    expect(r.headers.get("referrer-policy")).toBe("no-referrer");
    expect(r.headers.get("x-robots-tag")).toContain("noindex");
  });
  it.each(["https://evil.test", "null", "https://demo.myckeo.test.evil.test"])(
    "rejects origin %s",
    async (origin) => {
      expect((await POST(request({ token }, origin))).status).toBe(403);
      expect(mockFind).not.toHaveBeenCalled();
    },
  );
  it.each([
    {},
    [],
    { token: "short" },
    { token, businessId: "another" },
    { token, password: "injected" },
  ])("rejects malformed payload %p", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mockFind).not.toHaveBeenCalled();
  });
  it.each(["revoked", "expired", "unknown"])(
    "returns no cookie for %s tokens",
    async () => {
      mockFind.mockResolvedValue(null);
      const r = await POST(request({ token }));
      expect(r.status).toBe(410);
      expect(r.cookies.get(DEMO_COOKIE)).toBeUndefined();
    },
  );
  it("denies rate limited callers before token lookup", async () => {
    mockLimit.mockResolvedValue(false);
    const r = await POST(request({ token }));
    expect(r.status).toBe(429);
    expect(mockFind).not.toHaveBeenCalled();
  });
  it("does not expose provider errors", async () => {
    mockFind.mockRejectedValue(new Error("sensitive-provider-details"));
    const r = await POST(request({ token }));
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain("sensitive");
    expect(r.cookies.get(DEMO_COOKIE)).toBeUndefined();
  });
});
