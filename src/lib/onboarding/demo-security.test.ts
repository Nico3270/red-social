jest.mock("server-only", () => ({}), { virtual: true });
import {
  createDemoSession,
  readDemoSession,
  demoTokenHash,
  DEMO_TTL_MS,
} from "./demo-security";
import { randomBytes } from "node:crypto";

describe("demo capability isolation", () => {
  const previous = process.env.BUSINESS_DEMO_SESSION_SECRET;
  beforeAll(() => {
    process.env.BUSINESS_DEMO_SESSION_SECRET =
      "synthetic-demo-session-secret-32-bytes-minimum";
  });
  afterAll(() => {
    if (previous === undefined) delete process.env.BUSINESS_DEMO_SESSION_SECRET;
    else process.env.BUSINESS_DEMO_SESSION_SECRET = previous;
  });
  it("has a seven-day default and independent domain-separated hash", () => {
    const token = randomBytes(32).toString("base64url");
    expect(DEMO_TTL_MS).toBe(604800000);
    expect(demoTokenHash(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(demoTokenHash(token)).not.toContain(token);
  });
  it("encrypts the bearer and rejects tampering", () => {
    const token = randomBytes(32).toString("base64url"),
      session = createDemoSession(token, new Date(Date.now() + 60000));
    expect(session).not.toContain(token);
    expect(readDemoSession(session)).toBe(token);
    const parts = session.split(".");
    parts[1] = (parts[1][0] === "A" ? "B" : "A") + parts[1].slice(1);
    expect(readDemoSession(parts.join("."))).toBeNull();
    expect(readDemoSession(undefined)).toBeNull();
  });
  it("rejects expiration without extending capability lifetime", () => {
    const token = randomBytes(32).toString("base64url"),
      now = Date.now();
    const session = createDemoSession(token, new Date(now + 100));
    const clock = jest.spyOn(Date, "now").mockReturnValue(now + 100);
    expect(readDemoSession(session)).toBeNull();
    clock.mockRestore();
    expect(() => createDemoSession(token, new Date(now - 1))).toThrow();
  });
});
