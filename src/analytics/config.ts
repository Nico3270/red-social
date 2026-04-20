/**
 * Analytics Configuration
 *
 * Conecta Google Analytics 4 como primer provider real.
 * Si falta la variable pública, la app mantiene el fallback seguro actual.
 */

"use client";

import {
  configureAnalytics,
  type AnalyticsPayload,
  type AnalyticsProvider,
} from "@/analytics/events";

type AnalyticsScalar = string | number | boolean;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() ?? "";
const ANALYTICS_DEBUG_VALUE = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG?.trim().toLowerCase();
const ANALYTICS_DEBUG_ENABLED =
  ANALYTICS_DEBUG_VALUE === "1" ||
  ANALYTICS_DEBUG_VALUE === "true" ||
  ANALYTICS_DEBUG_VALUE === "yes" ||
  process.env.NODE_ENV === "development";

function toSnakeCase(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase();
}

function serializeAnalyticsValue(value: unknown): AnalyticsScalar | undefined {
  if (value === null || value === undefined) {
    return undefined;
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

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function serializeAnalyticsRecord(
  record: Record<string, unknown>
): Record<string, AnalyticsScalar> {
  return Object.entries(record).reduce<Record<string, AnalyticsScalar>>((acc, [key, value]) => {
    const serializedValue = serializeAnalyticsValue(value);

    if (serializedValue !== undefined) {
      acc[toSnakeCase(key)] = serializedValue;
    }

    return acc;
  }, {});
}

function serializeAnalyticsPayload(payload: AnalyticsPayload): Record<string, AnalyticsScalar> {
  const serializedPayload = serializeAnalyticsRecord(
    Object.fromEntries(
      Object.entries(payload).filter(([key]) => key !== "event")
    ) as Record<string, unknown>
  );

  if (ANALYTICS_DEBUG_ENABLED) {
    serializedPayload.debug_mode = true;
  }

  return serializedPayload;
}

function getAnalyticsWindow(): AnalyticsWindow | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window as AnalyticsWindow;
}

function ensureGa4Stub(): AnalyticsWindow | null {
  const analyticsWindow = getAnalyticsWindow();

  if (!analyticsWindow) {
    return null;
  }

  analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];

  if (!analyticsWindow.gtag) {
    analyticsWindow.gtag = (...args: unknown[]) => {
      analyticsWindow.dataLayer?.push(args);
    };
  }

  return analyticsWindow;
}

function createGa4Provider(measurementId: string): AnalyticsProvider {
  return {
    track(payload) {
      const analyticsWindow = ensureGa4Stub();

      if (!analyticsWindow?.gtag) {
        return;
      }

      analyticsWindow.gtag("event", payload.event, {
        send_to: measurementId,
        ...serializeAnalyticsPayload(payload),
      });
    },
    identify(userId, traits) {
      const analyticsWindow = ensureGa4Stub();

      if (!analyticsWindow?.gtag) {
        return;
      }

      analyticsWindow.gtag("config", measurementId, {
        user_id: userId,
        send_page_view: false,
        ...(ANALYTICS_DEBUG_ENABLED ? { debug_mode: true } : {}),
      });

      if (traits && Object.keys(traits).length > 0) {
        analyticsWindow.gtag(
          "set",
          "user_properties",
          serializeAnalyticsRecord(traits)
        );
      }
    },
    setContext(context) {
      const analyticsWindow = ensureGa4Stub();

      if (!analyticsWindow?.gtag) {
        return;
      }

      const serializedContext = serializeAnalyticsRecord(context);

      if (Object.keys(serializedContext).length === 0) {
        return;
      }

      analyticsWindow.gtag("set", serializedContext);
    },
  };
}

export function getGa4MeasurementId(): string | null {
  return GA4_MEASUREMENT_ID || null;
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(GA4_MEASUREMENT_ID);
}

export function isAnalyticsDebugEnabled(): boolean {
  return ANALYTICS_DEBUG_ENABLED;
}

export function setupAnalytics(): void {
  const analyticsEnabled = isAnalyticsEnabled();

  configureAnalytics({
    provider: analyticsEnabled ? createGa4Provider(GA4_MEASUREMENT_ID) : undefined,
    debug: ANALYTICS_DEBUG_ENABLED,
    enableAutoTracking: analyticsEnabled,
  });

  if (ANALYTICS_DEBUG_ENABLED && typeof window !== "undefined" && !analyticsEnabled) {
    console.info(
      "[Analytics] GA4 deshabilitado: falta NEXT_PUBLIC_GA4_MEASUREMENT_ID."
    );
  }
}

export function trackAnalyticsPageView(pathname: string, search = ""): void {
  const analyticsWindow = ensureGa4Stub();

  if (!analyticsWindow?.gtag || !GA4_MEASUREMENT_ID || typeof document === "undefined") {
    return;
  }

  const pagePath = search ? `${pathname}?${search}` : pathname;

  analyticsWindow.gtag("event", "page_view", {
    send_to: GA4_MEASUREMENT_ID,
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
    ...(ANALYTICS_DEBUG_ENABLED ? { debug_mode: true } : {}),
  });
}

export { configureAnalytics };
