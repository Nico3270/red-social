type OperationalLogLevel = "info" | "warn" | "error";

export interface OperationalLogPayload {
  timestamp: string;
  level: OperationalLogLevel;
  area: string;
  event: string;
  message: string;
  runtime: "server" | "client";
  environment: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    cause?: string;
  };
}

interface OperationalLogProvider {
  captureException?: (error: Error, payload: OperationalLogPayload) => void;
  captureMessage?: (message: string, payload: OperationalLogPayload) => void;
}

interface OperationalLogInput {
  level: OperationalLogLevel;
  area: string;
  event: string;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
  dedupeKey?: string;
  dedupeWindowMs?: number;
}

const DEFAULT_DEDUPE_WINDOW_MS = 30_000;
const dedupeRegistry = new Map<string, number>();

let operationalProvider: OperationalLogProvider | undefined;

export function configureOperationalLogger(options: {
  provider?: OperationalLogProvider;
}): void {
  operationalProvider = options.provider;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function serializeError(error: unknown): OperationalLogPayload["error"] | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: typeof error.cause === "string" ? error.cause : undefined,
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : JSON.stringify(error),
  };
}

function normalizeContextValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => normalizeContextValue(item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 20)
        .map(([key, nestedValue]) => [key, normalizeContextValue(nestedValue)])
    );
  }

  return String(value);
}

function normalizeContext(
  context?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!context) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, normalizeContextValue(value)])
  );
}

function shouldSkipLog(key?: string, windowMs = DEFAULT_DEDUPE_WINDOW_MS): boolean {
  if (!key) {
    return false;
  }

  const now = Date.now();
  const previous = dedupeRegistry.get(key);

  if (previous && now - previous < windowMs) {
    return true;
  }

  dedupeRegistry.set(key, now);

  if (dedupeRegistry.size > 500) {
    for (const [entryKey, timestamp] of dedupeRegistry.entries()) {
      if (now - timestamp > windowMs * 2) {
        dedupeRegistry.delete(entryKey);
      }
    }
  }

  return false;
}

function emitToConsole(payload: OperationalLogPayload): void {
  const logger =
    payload.level === "error"
      ? console.error
      : payload.level === "warn"
        ? console.warn
        : console.info;

  if (process.env.NODE_ENV === "development") {
    logger(`[ops][${payload.area}][${payload.event}] ${payload.message}`, payload);
    return;
  }

  logger(JSON.stringify(payload));
}

export function logOperationalEvent(input: OperationalLogInput): void {
  if (shouldSkipLog(input.dedupeKey, input.dedupeWindowMs)) {
    return;
  }

  const payload: OperationalLogPayload = {
    timestamp: new Date().toISOString(),
    level: input.level,
    area: input.area,
    event: input.event,
    message: input.message,
    runtime: typeof window === "undefined" ? "server" : "client",
    environment: process.env.NODE_ENV ?? "development",
    context: normalizeContext(input.context),
    error: serializeError(input.error),
  };

  emitToConsole(payload);

  if (!operationalProvider) {
    return;
  }

  if (payload.error && operationalProvider.captureException) {
    const error =
      input.error instanceof Error
        ? input.error
        : new Error(payload.error.message);
    operationalProvider.captureException(error, payload);
    return;
  }

  if (operationalProvider.captureMessage) {
    operationalProvider.captureMessage(payload.message, payload);
  }
}

export function reportOperationalInfo(
  input: Omit<OperationalLogInput, "level">
): void {
  logOperationalEvent({
    ...input,
    level: "info",
  });
}

export function reportOperationalWarning(
  input: Omit<OperationalLogInput, "level">
): void {
  logOperationalEvent({
    ...input,
    level: "warn",
  });
}

export function reportOperationalError(
  input: Omit<OperationalLogInput, "level">
): void {
  logOperationalEvent({
    ...input,
    level: "error",
  });
}