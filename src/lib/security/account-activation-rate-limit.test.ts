const mockFromEnv = jest.fn();
const mockLimiterLimit = jest.fn();
const mockSlidingWindow = jest.fn((count: number, window: string) => ({
  count,
  window,
}));
const mockRatelimit = jest.fn().mockImplementation((config: { prefix: string }) => ({
  limit: (identifier: string) => mockLimiterLimit(config.prefix, identifier),
}));

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@upstash/redis", () => ({
  Redis: { fromEnv: mockFromEnv },
}));
jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(mockRatelimit, { slidingWindow: mockSlidingWindow }),
}));

type RateLimitModule = typeof import("./account-activation-rate-limit");

const originalSecret = process.env.ACCOUNT_ACTIVATION_SESSION_SECRET;
const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const secret = "S".repeat(32);
const csrfNonce = "N".repeat(43);
const bootstrapPrefix = "myckeo:account-activation:bootstrap-ip";
const submitIpPrefix = "myckeo:account-activation:submit-ip";
const submitSessionPrefix = "myckeo:account-activation:submit-session";

let rateLimit: RateLimitModule;

function allowed(reset = Date.now() + 15 * 60 * 1000) {
  return { success: true, reset };
}

function blocked(reset = Date.now() + 15 * 60 * 1000) {
  return { success: false, reset };
}

function identifierFor(prefix: string): string {
  const call = mockLimiterLimit.mock.calls.find(([usedPrefix]) => usedPrefix === prefix);
  expect(call).toBeDefined();
  return call?.[1] as string;
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

beforeEach(() => {
  jest.resetModules();
  mockFromEnv.mockReset().mockReturnValue({});
  mockLimiterLimit.mockReset().mockImplementation(async () => allowed());
  mockSlidingWindow.mockClear();
  mockRatelimit.mockClear();
  process.env.ACCOUNT_ACTIVATION_SESSION_SECRET = secret;
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "synthetic-test-token";
  rateLimit = require("./account-activation-rate-limit") as RateLimitModule;
});

afterAll(() => {
  restoreEnv("ACCOUNT_ACTIVATION_SESSION_SECRET", originalSecret);
  restoreEnv("UPSTASH_REDIS_REST_URL", originalRedisUrl);
  restoreEnv("UPSTASH_REDIS_REST_TOKEN", originalRedisToken);
});

describe("client IP extraction", () => {
  it("prefers x-vercel-forwarded-for", async () => {
    await rateLimit.checkAccountActivationBootstrapRateLimit(
      new Headers({
        "x-vercel-forwarded-for": "1.2.3.4",
        "x-forwarded-for": "5.6.7.8",
        "x-real-ip": "9.8.7.6",
      }),
    );
    const preferred = identifierFor(bootstrapPrefix);

    mockLimiterLimit.mockClear();
    await rateLimit.checkAccountActivationBootstrapRateLimit(
      new Headers({ "x-vercel-forwarded-for": "1.2.3.4" }),
    );
    expect(identifierFor(bootstrapPrefix)).toBe(preferred);
  });

  it("uses x-forwarded-for and only its first list entry", async () => {
    await rateLimit.checkAccountActivationBootstrapRateLimit(
      new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }),
    );
    const first = identifierFor(bootstrapPrefix);

    mockLimiterLimit.mockClear();
    await rateLimit.checkAccountActivationBootstrapRateLimit(
      new Headers({ "x-forwarded-for": "1.2.3.4" }),
    );
    expect(identifierFor(bootstrapPrefix)).toBe(first);
  });

  it("falls back to x-real-ip", async () => {
    await rateLimit.checkAccountActivationBootstrapRateLimit(
      new Headers({ "x-real-ip": "2001:db8::1" }),
    );
    const realIp = identifierFor(bootstrapPrefix);

    mockLimiterLimit.mockClear();
    await rateLimit.checkAccountActivationBootstrapRateLimit(
      new Headers({ "x-forwarded-for": "2001:DB8::1" }),
    );
    expect(identifierFor(bootstrapPrefix)).toBe(realIp);
  });

  it("buckets absent, control-character, oversized and invalid IPs as unknown", async () => {
    await rateLimit.checkAccountActivationBootstrapRateLimit(new Headers());
    const unknown = identifierFor(bootstrapPrefix);

    for (const value of ["1.2.3.4\r\n", "x".repeat(300), "not-an-ip", ""]) {
      mockLimiterLimit.mockClear();
      const malformedHeaders = {
        get: (name: string) => name === "x-forwarded-for" ? value : null,
      } as Headers;
      await rateLimit.checkAccountActivationBootstrapRateLimit(malformedHeaders);
      expect(identifierFor(bootstrapPrefix)).toBe(unknown);
    }
  });

  it("falls through an invalid preferred header to a valid lower-priority header", async () => {
    await rateLimit.checkAccountActivationBootstrapRateLimit(
      new Headers({
        "x-vercel-forwarded-for": "invalid",
        "x-forwarded-for": "1.2.3.4",
      }),
    );
    const fallback = identifierFor(bootstrapPrefix);

    mockLimiterLimit.mockClear();
    await rateLimit.checkAccountActivationBootstrapRateLimit(
      new Headers({ "x-forwarded-for": "1.2.3.4" }),
    );
    expect(identifierFor(bootstrapPrefix)).toBe(fallback);
  });
});

describe("lazy limiters and privacy", () => {
  it("initializes independent sliding windows only on first use", async () => {
    expect(mockFromEnv).not.toHaveBeenCalled();
    await rateLimit.checkAccountActivationBootstrapRateLimit(new Headers());
    await rateLimit.checkAccountActivationBootstrapRateLimit(new Headers());

    expect(mockFromEnv).toHaveBeenCalledTimes(1);
    expect(mockSlidingWindow.mock.calls).toEqual([
      [20, "10 m"],
      [5, "15 m"],
      [5, "15 m"],
    ]);
    expect(mockRatelimit.mock.calls.map(([config]) => config.prefix)).toEqual([
      bootstrapPrefix,
      submitIpPrefix,
      submitSessionPrefix,
    ]);
  });

  it("passes only opaque HMAC identifiers to Redis limiters", async () => {
    await rateLimit.checkAccountActivationSubmitRateLimit(
      new Headers({ "x-forwarded-for": "1.2.3.4" }),
      csrfNonce,
    );

    for (const [, identifier] of mockLimiterLimit.mock.calls) {
      expect(identifier).toMatch(/^[a-f0-9]{64}$/);
      expect(identifier).not.toContain("1.2.3.4");
      expect(identifier).not.toContain(csrfNonce);
      expect(identifier).not.toContain(secret);
    }
  });

  it("uses stable, domain-separated identifiers that change with IP or nonce", async () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4" });
    await rateLimit.checkAccountActivationSubmitRateLimit(headers, csrfNonce);
    const firstIp = identifierFor(submitIpPrefix);
    const firstSession = identifierFor(submitSessionPrefix);
    expect(firstIp).not.toBe(firstSession);

    mockLimiterLimit.mockClear();
    await rateLimit.checkAccountActivationSubmitRateLimit(headers, csrfNonce);
    expect(identifierFor(submitIpPrefix)).toBe(firstIp);
    expect(identifierFor(submitSessionPrefix)).toBe(firstSession);

    mockLimiterLimit.mockClear();
    await rateLimit.checkAccountActivationSubmitRateLimit(
      new Headers({ "x-forwarded-for": "5.6.7.8" }),
      "M".repeat(43),
    );
    expect(identifierFor(submitIpPrefix)).not.toBe(firstIp);
    expect(identifierFor(submitSessionPrefix)).not.toBe(firstSession);
  });
});

describe("bootstrap rate limit", () => {
  it("allows a successful Upstash check", async () => {
    await expect(
      rateLimit.checkAccountActivationBootstrapRateLimit(new Headers()),
    ).resolves.toEqual({ allowed: true });
    expect(mockLimiterLimit).toHaveBeenCalledTimes(1);
  });

  it("denies a limited check with a positive integer retry", async () => {
    mockLimiterLimit.mockResolvedValue(blocked(Date.now() + 5_500));
    const result = await rateLimit.checkAccountActivationBootstrapRateLimit(new Headers());
    expect(result).toMatchObject({ allowed: false, reason: "LIMITED" });
    expect(result.allowed === false && result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(result.allowed === false && Number.isInteger(result.retryAfterSeconds)).toBe(true);
  });

  it("clamps stale reset timestamps to one second", async () => {
    mockLimiterLimit.mockResolvedValue(blocked(Date.now() - 1000));
    await expect(
      rateLimit.checkAccountActivationBootstrapRateLimit(new Headers()),
    ).resolves.toEqual({ allowed: false, reason: "LIMITED", retryAfterSeconds: 1 });
  });
});

describe("submit rate limit", () => {
  it("checks both IP and session even when both are allowed", async () => {
    await expect(
      rateLimit.checkAccountActivationSubmitRateLimit(new Headers(), csrfNonce),
    ).resolves.toEqual({ allowed: true });
    expect(mockLimiterLimit.mock.calls.map(([prefix]) => prefix)).toEqual([
      submitIpPrefix,
      submitSessionPrefix,
    ]);
  });

  it.each([
    ["IP", submitIpPrefix],
    ["session", submitSessionPrefix],
  ])("denies when %s alone is blocked", async (_label, blockedPrefix) => {
    mockLimiterLimit.mockImplementation(async (prefix: string) =>
      prefix === blockedPrefix ? blocked() : allowed(),
    );
    const result = await rateLimit.checkAccountActivationSubmitRateLimit(
      new Headers(), csrfNonce,
    );
    expect(result).toMatchObject({ allowed: false, reason: "LIMITED" });
    expect(mockLimiterLimit).toHaveBeenCalledTimes(2);
  });

  it("uses the longer retry when both buckets are blocked", async () => {
    mockLimiterLimit.mockImplementation(async (prefix: string) =>
      blocked(Date.now() + (prefix === submitIpPrefix ? 2_000 : 20_000)),
    );
    const result = await rateLimit.checkAccountActivationSubmitRateLimit(
      new Headers(), csrfNonce,
    );
    expect(result).toMatchObject({ allowed: false, reason: "LIMITED" });
    expect(result.allowed === false && result.retryAfterSeconds).toBeGreaterThanOrEqual(19);
    expect(mockLimiterLimit).toHaveBeenCalledTimes(2);
  });
});

describe("fail-closed behavior", () => {
  it.each([undefined, "short", ` ${secret}`, `${secret} `])(
    "rejects missing, short or untrimmed secrets",
    async (value) => {
      restoreEnv("ACCOUNT_ACTIVATION_SESSION_SECRET", value);
      await expect(
        rateLimit.checkAccountActivationBootstrapRateLimit(new Headers()),
      ).resolves.toEqual({
        allowed: false,
        reason: "UNAVAILABLE",
        retryAfterSeconds: 60,
      });
      expect(mockFromEnv).not.toHaveBeenCalled();
    },
  );

  it("rejects an invalid session nonce before touching Upstash", async () => {
    await expect(
      rateLimit.checkAccountActivationSubmitRateLimit(new Headers(), "invalid"),
    ).resolves.toMatchObject({ allowed: false, reason: "UNAVAILABLE" });
    expect(mockFromEnv).not.toHaveBeenCalled();
  });

  it.each(["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"])(
    "rejects missing %s",
    async (name) => {
      delete process.env[name];
      await expect(
        rateLimit.checkAccountActivationBootstrapRateLimit(new Headers()),
      ).resolves.toMatchObject({ allowed: false, reason: "UNAVAILABLE" });
      expect(mockFromEnv).not.toHaveBeenCalled();
    },
  );

  it("contains Redis initialization failure", async () => {
    mockFromEnv.mockImplementation(() => { throw new Error("synthetic Redis failure"); });
    await expect(
      rateLimit.checkAccountActivationBootstrapRateLimit(new Headers()),
    ).resolves.toMatchObject({ allowed: false, reason: "UNAVAILABLE" });
  });

  it("contains Upstash network failure for bootstrap", async () => {
    mockLimiterLimit.mockRejectedValue(new Error("synthetic network failure"));
    await expect(
      rateLimit.checkAccountActivationBootstrapRateLimit(new Headers()),
    ).resolves.toMatchObject({ allowed: false, reason: "UNAVAILABLE" });
  });

  it("contains Upstash network failure for submit", async () => {
    mockLimiterLimit.mockImplementation(async (prefix: string) => {
      if (prefix === submitSessionPrefix) throw new Error("synthetic network failure");
      return allowed();
    });
    await expect(
      rateLimit.checkAccountActivationSubmitRateLimit(new Headers(), csrfNonce),
    ).resolves.toMatchObject({ allowed: false, reason: "UNAVAILABLE" });
    expect(mockLimiterLimit).toHaveBeenCalledTimes(2);
  });
});
