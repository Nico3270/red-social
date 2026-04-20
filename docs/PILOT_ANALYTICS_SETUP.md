# Pilot Analytics Setup

## Objetivo

Dejar activa una primera integración real de analytics para pilotos usando Google Analytics 4 sobre la instrumentación tipada que ya existe en Myckeo.

## Provider elegido

- provider: Google Analytics 4
- motivo: no requiere SDK adicional, encaja con la interfaz actual de provider, funciona bien en cliente con App Router y es simple de operar en pilotos

## Variables de entorno

### Requerida para activar analytics real

- `NEXT_PUBLIC_GA4_MEASUREMENT_ID`

### Requerida para entorno piloto completo

- `SITE_URL`

`SITE_URL` no activa GA4 por sí sola, pero sí es obligatoria para considerar el entorno listo para piloto porque alimenta URLs canónicas, metadata pública y sitemap.

### Opcional para validación

- `NEXT_PUBLIC_ANALYTICS_DEBUG=true`

## Comportamiento por entorno

- con `NEXT_PUBLIC_GA4_MEASUREMENT_ID`: la app carga `gtag`, envía `page_view` por ruta y reenvía los eventos custom instrumentados a GA4
- sin `NEXT_PUBLIC_GA4_MEASUREMENT_ID`: la app no carga scripts externos, mantiene el fallback actual y no rompe SSR ni rutas públicas
- con `NEXT_PUBLIC_ANALYTICS_DEBUG=true`: los eventos salen marcados para facilitar revisión en GA4 DebugView

## Eventos clave ya visibles en GA4

### Guía

- `guide_preset_clicked`
- `guide_result_clicked`
- `guide_navigation_to_products`

### Catálogo y grupos

- `products_tab_opened`
- `catalog_group_preview_clicked`
- `catalog_group_changed`
- `catalog_group_invalid_url_fallback`
- `group_deep_link_opened`

### Restaurante premium

- `restaurant_menu_group_selected`
- `restaurant_menu_item_clicked`
- `restaurant_menu_featured_clicked`

### Producto y conversión

- `product_card_clicked`
- `product_detail_viewed`
- `product_whatsapp_clicked`
- `product_add_to_cart_clicked`

### Navegación base

- `page_view`

## Cómo habilitarlo

1. Define `NEXT_PUBLIC_GA4_MEASUREMENT_ID` en el entorno donde vas a correr el piloto.
2. Opcionalmente define `NEXT_PUBLIC_ANALYTICS_DEBUG=true` durante QA o pilotaje controlado.
3. Define `SITE_URL` con el dominio real del piloto.
4. Ejecuta `pnpm run env:check:pilot` para confirmar configuración mínima del entorno.
5. Levanta la app normalmente.

## Qué se puede validar localmente

- que la app sigue estable si falta `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- que `AnalyticsBootstrap` no inyecta scripts externos si falta esa variable
- que con `NEXT_PUBLIC_GA4_MEASUREMENT_ID` presente se carga `gtag`
- que al navegar entre perfil y detalle se dispara la ruta de `page_view`
- que los componentes del flujo público siguen emitiendo `products_tab_opened`, `product_card_clicked`, `product_detail_viewed`, `product_whatsapp_clicked`, `product_add_to_cart_clicked` y `catalog_group_changed`

## Qué solo se puede validar con una propiedad real de GA4

- que los eventos aparecen en GA4 Realtime
- que los eventos aparecen en GA4 DebugView
- que el property correcto está recibiendo los eventos del entorno del piloto
- que no solo sale `page_view`, sino también los eventos custom del catálogo

## Cómo validar que funciona

### Validación rápida local o staging

1. Abre GA4 Realtime o DebugView del property configurado.
2. Navega a un perfil público.
3. Entra a `Productos`.
4. Abre un producto desde una card.
5. Haz clic en WhatsApp o en agregar al carrito.

### Qué deberías ver

- un `page_view` al abrir perfil y otro al entrar a detalle
- `products_tab_opened` al entrar a la pestaña de productos
- `product_card_clicked` al abrir un detalle desde el catálogo
- `product_detail_viewed` en detalle o apertura de flujo equivalente
- `product_whatsapp_clicked` y `product_add_to_cart_clicked` al usar CTAs reales

## Checklist operativa de validación en piloto

1. Confirmar que `pnpm run env:check:pilot` pasa sin faltantes.
2. Abrir GA4 Realtime o DebugView del property conectado.
3. Abrir un perfil público real del piloto.
4. Entrar en `Productos`.
5. Si el negocio usa grupos, cambiar de grupo al menos una vez.
6. Abrir un producto desde una card.
7. Ya dentro del detalle, disparar WhatsApp o agregar al carrito.
8. Verificar en GA4:
	- `page_view` del perfil
	- `products_tab_opened`
	- `catalog_group_changed` si hubo cambio de grupo
	- `product_card_clicked`
	- `product_detail_viewed`
	- `product_whatsapp_clicked` o `product_add_to_cart_clicked`

## Si solo ves `page_view` pero no eventos custom

- el script de GA4 está cargando, pero los emisores custom no están llegando al provider
- revisar si el flujo probado realmente pasa por los componentes instrumentados del catálogo público
- revisar si el clic fue navegación real a detalle o una ruta alternativa no instrumentada
- revisar consola del navegador en desarrollo por warnings del layer analytics
- revisar en DebugView si aparece el dispositivo pero solo con navegación base

## Errores típicos a revisar

- `NEXT_PUBLIC_GA4_MEASUREMENT_ID` ausente: no se carga `gtag` y no hay entrega real
- `SITE_URL` ausente: el entorno no está listo para piloto aunque la app pueda levantar
- property equivocado: los requests pueden salir, pero los eventos no aparecerán en el GA4 esperado
- validación en Realtime sin `NEXT_PUBLIC_ANALYTICS_DEBUG=true`: puede costar más aislar la sesión en DebugView
- flujo de prueba incompleto: si no entras a `Productos` o no haces clic en una card, no verás eventos custom de producto
- bloqueo de navegador o extensiones: ad blockers pueden impedir la carga de `gtag`

## Notas operativas

- la integración es cliente-only y SSR-safe
- no se cambió el naming de eventos ya instrumentados
- el provider serializa payloads a parámetros compatibles con GA4 sin exigir refactor de los emisores actuales
- `identify` y `setContext` quedan soportados a nivel de provider, aunque hoy no haya flujos activos que los llamen