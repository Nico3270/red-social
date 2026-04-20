/**
 * Hook de Analytics
 * 
 * Proporciona acceso seguro a la capa de tracking desde componentes.
 * Incluye contexto automático del negocio y modo de navegación.
 */

"use client";

import { useCallback, useMemo } from "react";
import {
  trackAnalyticsEvent,
  type AnalyticsPayload,
  type AnalyticsEventName,
  type NavigationMode,
  type EventSource,
  createBasePayload,
} from "./events";

/**
 * Props que se pasan al hook
 */
interface UseAnalyticsOptions {
  negocioSlug: string;
  navigationMode: NavigationMode;
  defaultSource?: EventSource;
}

/**
 * Interfaz del hook retornado
 */
interface UseAnalyticsReturn {
  /**
   * Rastrear un evento con contexto automático
   */
  track: (
    eventName: AnalyticsEventName,
    payload: Omit<AnalyticsPayload, "event" | "timestamp" | "negocioSlug" | "navigationMode" | "source">,
    source?: EventSource
  ) => void;

  /**
   * Negocio slug actual
   */
  negocioSlug: string;

  /**
   * Modo de navegación actual
   */
  navigationMode: NavigationMode;
}

/**
 * Hook de Analytics con contexto automático
 * 
 * Uso:
 * ```tsx
 * const { track } = useAnalytics({
 *   negocioSlug: "mi-negocio",
 *   navigationMode: "catalog_groups"
 * });
 * 
 * track("product_card_clicked", {
 *   productId: "123",
 *   productName: "Mi Producto"
 * }, "productos_tab");
 * ```
 */
export function useAnalytics(options: UseAnalyticsOptions): UseAnalyticsReturn {
  const { negocioSlug, navigationMode, defaultSource = "url" } = options;

  const track = useCallback(
    (
      eventName: AnalyticsEventName,
      payload: Omit<AnalyticsPayload, "event" | "timestamp" | "negocioSlug" | "navigationMode" | "source">,
      source?: EventSource
    ) => {
      const finalSource = source || defaultSource;

      const fullPayload: AnalyticsPayload = {
        ...createBasePayload(eventName, negocioSlug, navigationMode, finalSource),
        ...payload,
      } as AnalyticsPayload;

      trackAnalyticsEvent(fullPayload);
    },
    [negocioSlug, navigationMode, defaultSource]
  );

  return useMemo(
    () => ({
      track,
      negocioSlug,
      navigationMode,
    }),
    [track, negocioSlug, navigationMode]
  );
}

// ==============================================================================
// CONTEXTO DE ANALYTICS (OPCIONAL)
// ==============================================================================

import { createContext, useContext, ReactNode } from "react";
import { createElement } from "react";

/**
 * Contexto global de analytics (opcional, para casos avanzados)
 */
const AnalyticsContext = createContext<UseAnalyticsReturn | undefined>(undefined);

export interface AnalyticsProviderProps {
  children: ReactNode;
  negocioSlug: string;
  navigationMode: NavigationMode;
  defaultSource?: EventSource;
}

/**
 * Proveedor opcional para inyectar analytics en el árbol
 */
export function AnalyticsProvider({
  children,
  negocioSlug,
  navigationMode,
  defaultSource,
}: AnalyticsProviderProps) {
  const analytics = useAnalytics({
    negocioSlug,
    navigationMode,
    defaultSource,
  });

  return createElement(AnalyticsContext.Provider, { value: analytics }, children);
}

/**
 * Hook para consumir el contexto de analytics
 * Si se usa sin proveedor, retorna undefined
 */
export function useAnalyticsContext(): UseAnalyticsReturn | undefined {
  return useContext(AnalyticsContext);
}
