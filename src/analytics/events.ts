/**
 * Analytics Events
 * 
 * Capa central de eventos tipados para medición real y conversión.
 * Provider-agnostic: funciona sin provider externo, fácil de conectar después
 * con Mixpanel, GA4, Plausible, Segment, etc.
 */

// ==============================================================================
// TIPOS DE EVENTOS
// ==============================================================================

/**
 * Todos los eventos soportados en la plataforma
 */
export type AnalyticsEventName =
  // Navegación editorial
  | "catalog_group_preview_clicked"
  | "catalog_group_tab_selected"
  | "catalog_group_changed"
  | "catalog_group_invalid_url_fallback"
  
  // Guía de negocio
  | "guide_preset_clicked"
  | "guide_result_clicked"
  | "guide_navigation_to_products"
  
  // Catálogo y producto
  | "product_card_clicked"
  | "product_quick_add_opened"
  | "product_quick_add_closed"
  | "product_variant_selected"
  | "product_variant_selection_required"
  | "product_quick_add_confirmed"
  | "product_card_direct_add_to_cart_clicked"
  | "product_detail_viewed"
  | "product_whatsapp_clicked"
  | "product_add_to_cart_clicked"
  | "catalog_order_submitted"
  
  // Menú de restaurante (premium experience)
  | "restaurant_menu_group_selected"
  | "restaurant_menu_item_clicked"
  | "restaurant_menu_featured_clicked"
  
  // Conversión suave
  | "group_deep_link_opened"
  | "products_tab_opened";

/**
 * Modo de navegación detectado
 */
export type NavigationMode = "traditional" | "catalog_groups";

/**
 * Contexto de dónde ocurrió el evento
 */
export type EventSource =
  | "inicio"
  | "productos_tab"
  | "grupo_preview"
  | "grupo_navegacion"
  | "guia"
  | "detalle_producto"
  | "carrito"
  | "url";

// ==============================================================================
// PAYLOAD BASE
// ==============================================================================

/**
 * Payload base para todos los eventos
 * Contiene información común y de contexto
 */
export interface BaseEventPayload {
  event: AnalyticsEventName;
  timestamp: number;
  negocioSlug: string;
  navigationMode: NavigationMode;
  source: EventSource;
}

// ==============================================================================
// PAYLOADS ESPECÍFICOS
// ==============================================================================

/**
 * Evento: grupo clickeado en preview de Inicio
 */
export interface CatalogGroupPreviewClickedPayload extends BaseEventPayload {
  event: "catalog_group_preview_clicked";
  groupId: string;
  groupSlug: string;
  groupName: string;
  totalGroups: number;
}

/**
 * Evento: cambio de tab (Inicio, Productos, Publicaciones, etc)
 */
export interface CatalogGroupTabSelectedPayload extends BaseEventPayload {
  event: "catalog_group_tab_selected";
  tab: string;
  previousTab?: string;
  groupSlug?: string;
}

/**
 * Evento: cambio de grupo dentro de la vista de Productos
 */
export interface CatalogGroupChangedPayload extends BaseEventPayload {
  event: "catalog_group_changed";
  groupId: string;
  groupSlug: string;
  groupName: string;
  previousGroupId?: string;
  hasSubgroups: boolean;
  productCount?: number;
}

/**
 * Evento: URL inválida de grupo, fallback a primer grupo válido
 */
export interface CatalogGroupInvalidUrlFallbackPayload extends BaseEventPayload {
  event: "catalog_group_invalid_url_fallback";
  requestedGroupSlug: string;
  fallbackGroupId: string;
  fallbackGroupSlug: string;
  fallbackGroupName: string;
}

/**
 * Evento: preset de guía seleccionado
 */
export interface GuidePresetClickedPayload extends BaseEventPayload {
  event: "guide_preset_clicked";
  presetId: string;
  presetLabel: string;
  presetKind: string; // "section", "price", "special", etc
}

/**
 * Evento: resultado de guía fue clickeado (producto sugerido)
 */
export interface GuideResultClickedPayload extends BaseEventPayload {
  event: "guide_result_clicked";
  presetId: string;
  presetLabel: string;
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  resultIndex: number;
}

/**
 * Evento: "explorar más" desde guía → navegación a Productos
 */
export interface GuideNavigationToProductsPayload extends BaseEventPayload {
  event: "guide_navigation_to_products";
  presetId: string;
  presetLabel: string;
  targetGroupId?: string;
  targetGroupSlug?: string;
  targetGroupName?: string;
}

/**
 * Evento: card de producto clickeada
 */
export interface ProductCardClickedPayload extends BaseEventPayload {
  event: "product_card_clicked";
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  position?: number; // índice en la lista
  groupId?: string;
  groupSlug?: string;
}

export interface ProductQuickAddOpenedPayload extends BaseEventPayload {
  event: "product_quick_add_opened";
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  hasVariants: boolean;
  availableVariantCount?: number;
  groupId?: string;
  groupSlug?: string;
}

export interface ProductQuickAddClosedPayload extends BaseEventPayload {
  event: "product_quick_add_closed";
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  hadVariantSelected: boolean;
  selectedVariantId?: string;
  quantity: number;
  closeReason: "dismissed" | "cancelled" | "completed";
  groupId?: string;
  groupSlug?: string;
}

export interface ProductVariantSelectedPayload extends BaseEventPayload {
  event: "product_variant_selected";
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  variantId: string;
  variantLabel: string;
  availableVariantCount?: number;
  groupId?: string;
  groupSlug?: string;
}

export interface ProductVariantSelectionRequiredPayload extends BaseEventPayload {
  event: "product_variant_selection_required";
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  availableVariantCount?: number;
  groupId?: string;
  groupSlug?: string;
}

export interface ProductQuickAddConfirmedPayload extends BaseEventPayload {
  event: "product_quick_add_confirmed";
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  variantId?: string;
  quantity: number;
  groupId?: string;
  groupSlug?: string;
}

export interface ProductCardDirectAddToCartClickedPayload extends BaseEventPayload {
  event: "product_card_direct_add_to_cart_clicked";
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  variantId?: string;
  quantity: number;
  groupId?: string;
  groupSlug?: string;
}

/**
 * Evento: modal de detalle de producto abierto
 */
export interface ProductDetailViewedPayload extends BaseEventPayload {
  event: "product_detail_viewed";
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  groupId?: string;
  groupSlug?: string;
  hasVariants: boolean;
}

/**
 * Evento: link de WhatsApp clickeado
 */
export interface ProductWhatsappClickedPayload extends BaseEventPayload {
  event: "product_whatsapp_clicked";
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  variantId?: string;
  quantity: number;
  groupId?: string;
  groupSlug?: string;
}

/**
 * Evento: producto agregado a carrito
 */
export interface ProductAddToCartClickedPayload extends BaseEventPayload {
  event: "product_add_to_cart_clicked";
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  variantId?: string;
  quantity: number;
  groupId?: string;
  groupSlug?: string;
}

export interface CatalogOrderSubmittedPayload extends BaseEventPayload {
  event: "catalog_order_submitted";
  orderType: "DELIVERY" | "ON_SITE";
  totalAmount: number;
  itemCount: number;
  hasVariants: boolean;
}

export interface RestaurantMenuGroupSelectedPayload extends BaseEventPayload {
  event: "restaurant_menu_group_selected";
  groupId: string;
  groupSlug: string;
  groupName: string;
  previousGroupId?: string;
}

export interface RestaurantMenuItemClickedPayload extends BaseEventPayload {
  event: "restaurant_menu_item_clicked";
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  groupId?: string;
  groupSlug?: string;
}

export interface RestaurantMenuFeaturedClickedPayload extends BaseEventPayload {
  event: "restaurant_menu_featured_clicked";
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  groupId?: string;
  groupSlug?: string;
}

/**
 * Evento: deep link de grupo abierto
 */
export interface GroupDeepLinkOpenedPayload extends BaseEventPayload {
  event: "group_deep_link_opened";
  groupId: string;
  groupSlug: string;
  groupName: string;
  urlParams: Record<string, string>;
}

/**
 * Evento: tab de Productos abierto
 */
export interface ProductsTabOpenedPayload extends BaseEventPayload {
  event: "products_tab_opened";
  fromTab: string;
  groupId?: string;
  groupSlug?: string;
  isDeepLink: boolean;
}

// ==============================================================================
// UNIÓN DE TODOS LOS PAYLOADS
// ==============================================================================

export type AnalyticsPayload =
  | CatalogGroupPreviewClickedPayload
  | CatalogGroupTabSelectedPayload
  | CatalogGroupChangedPayload
  | CatalogGroupInvalidUrlFallbackPayload
  | GuidePresetClickedPayload
  | GuideResultClickedPayload
  | GuideNavigationToProductsPayload
  | ProductCardClickedPayload
  | ProductQuickAddOpenedPayload
  | ProductQuickAddClosedPayload
  | ProductVariantSelectedPayload
  | ProductVariantSelectionRequiredPayload
  | ProductQuickAddConfirmedPayload
  | ProductCardDirectAddToCartClickedPayload
  | ProductDetailViewedPayload
  | ProductWhatsappClickedPayload
  | ProductAddToCartClickedPayload
  | CatalogOrderSubmittedPayload
  | RestaurantMenuGroupSelectedPayload
  | RestaurantMenuItemClickedPayload
  | RestaurantMenuFeaturedClickedPayload
  | GroupDeepLinkOpenedPayload
  | ProductsTabOpenedPayload;

// ==============================================================================
// TIPOS PARA PROVIDER
// ==============================================================================

/**
 * Interfaz del provider de analytics
 * Los proveedores (Mixpanel, GA4, etc) implementan esto
 */
export interface AnalyticsProvider {
  track(payload: AnalyticsPayload): void;
  identify?(userId: string, traits?: Record<string, unknown>): void;
  setContext?(context: Record<string, unknown>): void;
}

/**
 * Configuración global del proveedor
 */
export interface AnalyticsConfig {
  provider?: AnalyticsProvider;
  debug?: boolean;
  enableAutoTracking?: boolean;
}

// ==============================================================================
// UTILIDADES
// ==============================================================================

/**
 * Almacén global de configuración y provider
 * Inicializado en cliente, permitiendo multiple inicializaciones
 */
let globalConfig: AnalyticsConfig = {
  debug: process.env.NODE_ENV === "development",
  enableAutoTracking: true,
};

/**
 * Configurar el provider de analytics
 * Llamar una sola vez en la inicialización de la app
 */
export function configureAnalytics(config: AnalyticsConfig): void {
  globalConfig = {
    ...globalConfig,
    ...config,
  };

  if (globalConfig.debug && typeof window !== "undefined") {
    console.log("[Analytics] Configurado con provider:", config.provider ? "Sí" : "No");
  }
}

/**
 * Rastrear un evento de analytics
 * Emite al provider si existe, con fallback seguro en dev
 */
export function trackAnalyticsEvent(payload: AnalyticsPayload): void {
  if (typeof window === "undefined") {
    return; // SSR-safe: no tracking en servidor
  }

  try {
    // Si hay provider configurado, usarlo
    if (globalConfig.provider) {
      globalConfig.provider.track(payload);
    }

    // En desarrollo, loggear siempre para debugging
    if (globalConfig.debug) {
      console.log("[Analytics Event]", payload.event, {
        timestampIso: new Date(payload.timestamp).toISOString(),
        negocio: payload.negocioSlug,
        mode: payload.navigationMode,
        payload,
      });
    }
  } catch (error) {
    // Silenciar errores para no romper la app
    if (globalConfig.debug) {
      console.error("[Analytics] Error al rastrear evento:", error);
    }
  }
}

/**
 * Identificar usuario (si aplica)
 */
export function identifyAnalyticsUser(
  userId: string,
  traits?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  try {
    if (globalConfig.provider?.identify) {
      globalConfig.provider.identify(userId, traits);
    }

    if (globalConfig.debug) {
      console.log("[Analytics] Usuario identificado:", userId, traits);
    }
  } catch (error) {
    if (globalConfig.debug) {
      console.error("[Analytics] Error al identificar usuario:", error);
    }
  }
}

/**
 * Establecer contexto global de analytics
 */
export function setAnalyticsContext(context: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  try {
    if (globalConfig.provider?.setContext) {
      globalConfig.provider.setContext(context);
    }

    if (globalConfig.debug) {
      console.log("[Analytics] Contexto establecido:", context);
    }
  } catch (error) {
    if (globalConfig.debug) {
      console.error("[Analytics] Error al establecer contexto:", error);
    }
  }
}

/**
 * Obtener la configuración actual (útil para testing)
 */
export function getAnalyticsConfig(): AnalyticsConfig {
  return { ...globalConfig };
}

// ==============================================================================
// HELPERS PARA CONSTRUIR PAYLOADS
// ==============================================================================

/**
 * Payload base con timestamp
 */
export function createBasePayload(
  event: AnalyticsEventName,
  negocioSlug: string,
  navigationMode: NavigationMode,
  source: EventSource
): BaseEventPayload {
  return {
    event,
    timestamp: Date.now(),
    negocioSlug,
    navigationMode,
    source,
  };
}
