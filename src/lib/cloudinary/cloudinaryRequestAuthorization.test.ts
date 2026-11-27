const mockAuth = jest.fn(),
  mockUser = jest.fn();
jest.mock("@/auth.config", () => ({ auth: mockAuth }));
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: { usuario: { findUnique: mockUser } },
}));
import {
  isSameOriginCloudinaryRequest,
  getCloudinaryActor,
} from "./cloudinaryRequestAuthorization";
const previous = process.env.SITE_URL;
afterAll(() => {
  if (previous === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = previous;
});
beforeEach(() => {
  jest.resetAllMocks();
  process.env.SITE_URL = "https://myckeo.example.test";
});
const request = (origin?: string, site = "same-origin") =>
  new Request("http://localhost:3000/api/cloudinary/upload-authorization", {
    headers: { ...(origin ? { origin } : {}), "sec-fetch-site": site },
  });
describe("canonical upload origin and active identity", () => {
  it("accepts the canonical browser origin behind an internal Next proxy", () =>
    expect(
      isSameOriginCloudinaryRequest(request("https://myckeo.example.test")),
    ).toBe(true));
  it.each([
    "https://evil.example",
    "https://myckeo.example.test.evil.example",
    "http://myckeo.example.test",
    "https://myckeo.example.test:8443",
    "null",
  ])("rejects %s", (origin) =>
    expect(isSameOriginCloudinaryRequest(request(origin))).toBe(false),
  );
  it("rejects cross-site fetches even with a matching origin", () =>
    expect(
      isSameOriginCloudinaryRequest(
        request("https://myckeo.example.test", "cross-site"),
      ),
    ).toBe(false));
  it("uses the request origin when SITE_URL is absent, preserving existing clients", () => {
    delete process.env.SITE_URL;
    expect(
      isSameOriginCloudinaryRequest(request("http://localhost:3000")),
    ).toBe(true);
  });
  it("fails closed for malformed configuration", () => {
    process.env.SITE_URL = "invalid";
    expect(isSameOriginCloudinaryRequest(request())).toBe(false);
  });
  it("rejects anonymous and deactivated upload callers", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await getCloudinaryActor()).toBeNull();
    mockAuth.mockResolvedValue({ user: { id: "u" } });
    mockUser.mockResolvedValue({ id: "u", estado: "inactivo" });
    expect(await getCloudinaryActor()).toBeNull();
  });
});
