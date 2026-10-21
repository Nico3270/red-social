import { inspect } from "node:util";

type Effect = {
  setup: () => void | (() => void);
  deps?: readonly unknown[];
  cleanup?: () => void;
  pending: boolean;
};
const mockRefs: Array<{ current: unknown }> = [];
const mockEffects = new Map<number, Effect>();
let mockHookIndex = 0;

// Node-only hook harness: render registers effects; commit runs them afterwards.
// Replaying setup/cleanup preserves the refs of the same mounting instance.
jest.mock("react", () => ({
  ...jest.requireActual<typeof import("react")>("react"),
  useRef: (initial: unknown) => {
    const index = mockHookIndex++;
    if (!(index in mockRefs)) mockRefs[index] = { current: initial };
    return mockRefs[index];
  },
  useEffect: (setup: Effect["setup"], deps?: readonly unknown[]) => {
    const index = mockHookIndex++;
    const previous = mockEffects.get(index);
    if (
      previous &&
      deps &&
      previous.deps?.length === deps.length &&
      deps.every((value, position) => Object.is(value, previous.deps?.[position]))
    ) {
      return;
    }
    mockEffects.set(index, {
      setup,
      deps,
      cleanup: previous?.cleanup,
      pending: true,
    });
  },
}));

import ActivationBootstrap from "./ActivationBootstrap";

const ORIGIN = "https://myckeo-red-social-staging.vercel.app";
const ENDPOINT = "/api/account-activation/bootstrap";
const rawToken = "CLIENT_BOOTSTRAP_SYNTHETIC_".padEnd(43, "A");
const consoleMethods = ["log", "info", "warn", "error", "debug"] as const;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function reply(status = 200, body: unknown = { ok: true }) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(body),
  };
}

type FakeReply = ReturnType<typeof reply>;
let pendingFetch: ReturnType<typeof deferred<FakeReply>>;
let mockFetch: jest.Mock;
let consoleSpies: jest.SpyInstance[];
const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

function installGlobal(name: string, value: unknown): void {
  if (!originalGlobals.has(name)) {
    originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  }
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
}

function storage() {
  return {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(() => null),
    length: 0,
  };
}

function fakeBrowser(initialHash: string, search = "") {
  let hash = initialHash;
  let pathname = "/activar";
  let query = search;
  const events: string[] = [];
  const trace: string[] = [];
  const originalState = { navigation: "synthetic-history-state" };
  const localStorage = storage();
  const sessionStorage = storage();
  const cookieSetter = jest.fn();
  const hashSetter = jest.fn((value: string) => { hash = value; });
  const document = {};
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => "",
    set: cookieSetter,
  });
  const location = {
    origin: ORIGIN,
    get pathname() { return pathname; },
    get search() { return query; },
    get hash() {
      trace.push("readHash");
      return hash;
    },
    set hash(value: string) { hashSetter(value); },
    get href() { return `${ORIGIN}${pathname}${query}${hash}`; },
    replace: jest.fn(),
    assign: jest.fn(),
    reload: jest.fn(),
  };
  const history = {
    state: originalState,
    replaceState: jest.fn((state: typeof originalState, _title: string, url: string) => {
      events.push("replaceState");
      trace.push("replaceState");
      const next = new URL(url, ORIGIN);
      history.state = state;
      pathname = next.pathname;
      query = next.search;
      hash = next.hash;
    }),
    pushState: jest.fn(),
  };
  const window = {
    location, history, localStorage, sessionStorage, document,
    fetch: mockFetch,
  };
  return {
    window, location, history, originalState, localStorage, sessionStorage,
    document, cookieSetter, hashSetter, events, trace,
    // Inspect without adding artificial reads to the component's event trace.
    currentHash: () => hash,
  };
}

let browser: ReturnType<typeof fakeBrowser>;

function setBrowser(hash = `#token=${rawToken}`, search = ""): void {
  browser = fakeBrowser(hash, search);
  installGlobal("window", browser.window);
  installGlobal("location", browser.location);
  installGlobal("history", browser.history);
  installGlobal("document", browser.document);
  installGlobal("localStorage", browser.localStorage);
  installGlobal("sessionStorage", browser.sessionStorage);
}

function renderComponent(): void {
  mockHookIndex = 0;
  ActivationBootstrap();
}

function runSetup(effect: Effect): void {
  const cleanup = effect.setup();
  // React effects themselves must be synchronous, not async callbacks.
  expect(cleanup === undefined || typeof cleanup === "function").toBe(true);
  effect.cleanup = typeof cleanup === "function" ? cleanup : undefined;
  effect.pending = false;
}

function commitEffects(): void {
  for (const effect of mockEffects.values()) {
    if (!effect.pending) continue;
    effect.cleanup?.();
    runSetup(effect);
  }
}

function mount(): void {
  renderComponent();
  commitEffects();
}

function replayEffects(): void {
  for (const effect of mockEffects.values()) {
    effect.cleanup?.();
    runSetup(effect);
  }
}

function unmount(): void {
  for (const effect of mockEffects.values()) {
    effect.cleanup?.();
    effect.cleanup = undefined;
  }
}

async function flushPromises(): Promise<void> {
  for (let index = 0; index < 12; index++) await Promise.resolve();
}

async function settle(response = reply()): Promise<void> {
  pendingFetch.resolve(response);
  await flushPromises();
}

function expectCleanUrl(): void {
  expect(browser.currentHash()).toBe("");
  expect(browser.location.href).not.toContain(rawToken);
  expect(browser.hashSetter).not.toHaveBeenCalled();
}

function expectNoNavigation(): void {
  expect(browser.location.replace).not.toHaveBeenCalled();
  expect(browser.location.assign).not.toHaveBeenCalled();
  expect(browser.location.reload).not.toHaveBeenCalled();
}

function expectSinglePost(): void {
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch.mock.calls[0][0]).toBe(ENDPOINT);
}

async function expectFailureWithoutRetry(): Promise<void> {
  await flushPromises();
  // Allow scheduled work to run so a delayed retry cannot hide behind the test.
  await jest.advanceTimersByTimeAsync(60_000);
  expectSinglePost();
  expectCleanUrl();
  expectNoNavigation();
  expect(browser.history.replaceState).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
}

describe("ActivationBootstrap — fragment-to-body transport (Node browser mocks)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRefs.length = 0;
    mockEffects.clear();
    mockHookIndex = 0;
    pendingFetch = deferred<FakeReply>();
    mockFetch = jest.fn(() => {
      browser.events.push("fetch");
      browser.trace.push("fetch");
      // Check the observable URL at the exact instant transport begins.
      expect(browser.currentHash()).toBe("");
      return pendingFetch.promise;
    });
    installGlobal("fetch", mockFetch);
    setBrowser();
    consoleSpies = consoleMethods.map((method) =>
      jest.spyOn(console, method).mockImplementation(() => undefined),
    );
  });

  afterEach(() => {
    try {
      unmount();
      for (const spy of consoleSpies) {
        for (const args of spy.mock.calls) {
          expect(inspect(args, { depth: null, maxStringLength: null })).not.toContain(rawToken);
        }
      }
      expect(browser.localStorage.setItem).not.toHaveBeenCalled();
      expect(browser.sessionStorage.setItem).not.toHaveBeenCalled();
      expect(browser.cookieSetter).not.toHaveBeenCalled();
      expect(browser.history.pushState).not.toHaveBeenCalled();
      expect(inspect(browser.history.state)).not.toContain(rawToken);
      for (const args of browser.history.replaceState.mock.calls) {
        expect(inspect(args)).not.toContain(rawToken);
      }
    } finally {
      jest.restoreAllMocks();
      jest.useRealTimers();
      for (const [name, descriptor] of originalGlobals) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
      originalGlobals.clear();
      mockEffects.clear();
      mockRefs.length = 0;
    }
  });

  describe("synchronous sanitization and transport", () => {
    it("does not read the browser or start transport during render", () => {
      renderComponent();
      expect(browser.trace).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(browser.history.replaceState).not.toHaveBeenCalled();
    });

    it("can render on the server without window and without running effects", () => {
      Reflect.deleteProperty(globalThis, "window");
      Reflect.deleteProperty(globalThis, "location");
      Reflect.deleteProperty(globalThis, "history");
      Reflect.deleteProperty(globalThis, "document");
      expect(renderComponent).not.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("a valid fragment starts exactly one bootstrap", () => {
      expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      mount();
      expectSinglePost();
    });

    it("reads hash then sanitizes before fetch, synchronously before any await", () => {
      mount();
      // Intentionally no await/flush: even `await Promise.resolve()` before
      // sanitization or transport would leave these assertions unsatisfied.
      expect(browser.events).toEqual(["replaceState", "fetch"]);
      expect(browser.trace.indexOf("readHash")).toBeGreaterThanOrEqual(0);
      expect(browser.trace.indexOf("readHash")).toBeLessThan(
        browser.trace.indexOf("replaceState"),
      );
      expectCleanUrl();
    });

    it("preserves pathname, search and existing history state when clearing hash", () => {
      setBrowser(`#token=${rawToken}`, "?lang=es");
      mount();
      expect(browser.history.replaceState).toHaveBeenCalledTimes(1);
      expect(browser.history.replaceState).toHaveBeenCalledWith(
        browser.originalState, "", "/activar?lang=es",
      );
      expect(browser.history.state).toBe(browser.originalState);
      expect(browser.location.pathname).toBe("/activar");
      expect(browser.location.search).toBe("?lang=es");
      expectCleanUrl();
    });

    it("sends exactly the token JSON body to the fixed relative endpoint", () => {
      mount();
      expectSinglePost();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).not.toContain(rawToken);
      expect(new URL(url, ORIGIN).search).toBe("");
      expect(new URL(url, ORIGIN).hash).toBe("");
      expect(options.body).toBe(JSON.stringify({ token: rawToken }));
      expect(JSON.parse(options.body)).toEqual({ token: rawToken });
      const { body: _body, ...rest } = options;
      expect(inspect(rest, { depth: null })).not.toContain(rawToken);
    });

    it("uses method POST", () => {
      mount();
      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    });

    it("uses only the Content-Type application/json header, without a bearer header", () => {
      mount();
      const headers = new Headers(mockFetch.mock.calls[0][1].headers);
      expect(Array.from(headers.entries())).toEqual([["content-type", "application/json"]]);
      expect(inspect(Array.from(headers.entries()))).not.toContain(rawToken);
    });

    it("uses credentials same-origin", () => {
      mount();
      expect(mockFetch.mock.calls[0][1].credentials).toBe("same-origin");
    });

    it("uses cache no-store", () => {
      mount();
      expect(mockFetch.mock.calls[0][1].cache).toBe("no-store");
    });

    it("uses referrerPolicy no-referrer", () => {
      mount();
      expect(mockFetch.mock.calls[0][1].referrerPolicy).toBe("no-referrer");
    });

    it("does not navigate while bootstrap is pending", async () => {
      mount();
      await flushPromises();
      expectNoNavigation();
      expectCleanUrl();
    });

    it("does not persist the bearer in localStorage", async () => {
      mount();
      await settle();
      expect(browser.localStorage.setItem).not.toHaveBeenCalled();
    });

    it("does not persist the bearer in sessionStorage", async () => {
      mount();
      await settle();
      expect(browser.sessionStorage.setItem).not.toHaveBeenCalled();
    });

    it("does not write client cookies", async () => {
      mount();
      await settle();
      expect(browser.cookieSetter).not.toHaveBeenCalled();
    });

    it("does not put the bearer in history state", async () => {
      mount();
      await settle();
      expect(browser.history.state).toBe(browser.originalState);
      expect(browser.history.replaceState.mock.calls[0][0]).toBe(browser.originalState);
    });
  });

  describe("strict fragments", () => {
    it("does nothing for an empty hash", async () => {
      setBrowser("");
      mount();
      await flushPromises();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(browser.history.replaceState).not.toHaveBeenCalled();
      expectNoNavigation();
    });

    it.each([
      ["bare fragment", "#"],
      ["empty token", "#token="],
      ["wrong key", `#foo=${rawToken}`],
      ["short token", `#token=${rawToken.slice(0, 42)}`],
      ["long token", `#token=${rawToken}A`],
      ["leading whitespace", `#token= ${rawToken}`],
      ["trailing whitespace", `#token=${rawToken} `],
      ["embedded whitespace", `#token=${"A".repeat(21)} ${"B".repeat(21)}`],
      ["invalid character", `#token=${"A".repeat(42)}+`],
      ["base64 padding", `#token=${"A".repeat(42)}=`],
      ["trailing newline", `#token=${rawToken}\n`],
      ["extra field", `#token=${rawToken}&foo=bar`],
      ["field before token", `#foo=bar&token=${rawToken}`],
      ["multiple tokens", `#token=${rawToken}&token=${rawToken}`],
      ["encoded token character", `#token=%43${rawToken.slice(1)}`],
      ["encoded parameter name", `#%74oken=${rawToken}`],
      ["encoded fragment", `#token%3D${rawToken}`],
      ["double encoded value", `#token=%2543${rawToken.slice(1)}`],
      ["second hash", `##token=${rawToken}`],
      ["trailing ampersand", `#token=${rawToken}&`],
      ["case variation", `#Token=${rawToken}`],
    ])("synchronously clears %s without fetching", async (_name, hash) => {
      setBrowser(hash);
      mount();
      expect(browser.events).toEqual(["replaceState"]);
      expect(browser.history.replaceState).toHaveBeenCalledWith(browser.originalState, "", "/activar");
      expectCleanUrl();
      await flushPromises();
      expect(mockFetch).not.toHaveBeenCalled();
      expectNoNavigation();
    });
  });

  describe("bootstrap response", () => {
    it("success navigates once to /activar without token, query or fragment", async () => {
      setBrowser(`#token=${rawToken}`, "?lang=es");
      mount();
      await settle();
      expectSinglePost();
      expect(browser.location.replace).toHaveBeenCalledTimes(1);
      expect(browser.location.replace).toHaveBeenCalledWith("/activar");
      expect(inspect(browser.location.replace.mock.calls)).not.toContain(rawToken);
      expect(browser.location.assign).not.toHaveBeenCalled();
      expect(browser.location.reload).not.toHaveBeenCalled();
      expectCleanUrl();
    });

    it.each([400, 403, 429, 500])(
      "HTTP %s never navigates or retries, even if the response body says ok",
      async (status) => {
        mount();
        await settle(reply(status, { ok: true }));
        await expectFailureWithoutRetry();
      },
    );

    it.each([
      ["null", null],
      ["array", [{ ok: true }]],
      ["empty object", {}],
      ["false ok", { ok: false }],
      ["string ok", { ok: "true" }],
      ["number ok", { ok: 1 }],
      ["string body", "ok"],
    ])("HTTP 200 with %s body does not navigate or retry", async (_name, body) => {
      mount();
      await settle(reply(200, body));
      await expectFailureWithoutRetry();
    });

    it("invalid response JSON is handled without logging bearer or retrying", async () => {
      const response = reply();
      response.json.mockRejectedValue(new Error(`Synthetic JSON error ${rawToken}`));
      mount();
      await settle(response);
      await expectFailureWithoutRetry();
    });

    it("network rejection is handled without logging bearer or retrying", async () => {
      mount();
      pendingFetch.reject(new Error(`Synthetic network error ${rawToken}`));
      await expectFailureWithoutRetry();
    });

    it("success never logs the bearer through any console method", async () => {
      mount();
      await settle();
      for (const spy of consoleSpies) {
        expect(inspect(spy.mock.calls, { depth: null })).not.toContain(rawToken);
      }
    });
  });

  describe("effect lifecycle", () => {
    it("re-render of the same instance does not duplicate POST", async () => {
      mount();
      renderComponent();
      commitEffects();
      await settle();
      expectSinglePost();
      expect(browser.history.replaceState).toHaveBeenCalledTimes(1);
      expect(browser.location.replace).toHaveBeenCalledTimes(1);
    });

    it("StrictMode setup-cleanup-setup preserves refs and sends only one POST", async () => {
      mount();
      replayEffects();
      expectSinglePost();
      expect(browser.history.replaceState).toHaveBeenCalledTimes(1);
      await settle();
      // Deduplication must not accidentally disable the first response forever.
      expect(browser.location.replace).toHaveBeenCalledTimes(1);
      expect(browser.location.replace).toHaveBeenCalledWith("/activar");
    });

    it("effect replay after failure does not retry the cleared bearer", async () => {
      mount();
      await settle(reply(429, { ok: false }));
      replayEffects();
      await expectFailureWithoutRetry();
    });

    it("unmount while pending does not navigate, refetch or restore the fragment", async () => {
      mount();
      unmount();
      await settle();
      expectSinglePost();
      expectCleanUrl();
      expectNoNavigation();
      expect(browser.history.replaceState).toHaveBeenCalledTimes(1);
    });

    it("rejection after unmount does not log the bearer or schedule retries", async () => {
      mount();
      unmount();
      pendingFetch.reject(new Error(`Synthetic pending request error ${rawToken}`));
      await expectFailureWithoutRetry();
    });
  });
});
