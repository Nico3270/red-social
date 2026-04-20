# Pilot Runbook

## Objetivo

Este documento define el flujo minimo para abrir, observar y sostener pilotos reales del perfil publico sin depender de infraestructura adicional.

## Alcance

Aplica a estos flujos:

- perfil publico del negocio
- pestaña de productos tradicional
- CatalogGroups no-restaurante
- menu restaurante premium
- detalle de producto
- CTA de carrito y WhatsApp
- feed publico y publicaciones

## Preflight tecnico

Ejecutar antes de abrir o reabrir un piloto:

1. `pnpm run env:check:pilot`
2. `pnpm run typecheck`
3. `pnpm run build:with-sitemap`
4. `pnpm run smoke:ci` si el entorno tiene Playwright y base disponible

Si el despliegue es nuevo o cambio el dominio del entorno:

1. confirmar `SITE_URL`
2. confirmar `AUTH_URL` o `NEXTAUTH_URL`
3. confirmar `AUTH_SECRET` o `NEXTAUTH_SECRET`
4. confirmar que `public/sitemap.xml` se genera con la URL esperada

## Variables criticas

- `DATABASE_URL`: obligatoria para perfil publico, fixtures smoke y sitemap dinamico.
- `SITE_URL`: obligatoria para deploy y piloto.
- `AUTH_SECRET` o `NEXTAUTH_SECRET`: obligatoria para sesiones estables.
- `AUTH_URL` o `NEXTAUTH_URL`: obligatoria en despliegues y pilotos reales.
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`: solo si el piloto usa login con Google.
- `SMOKE_BOOTSTRAP_FIXTURES`: recomendada para cobertura smoke completa cuando falta negocio no-restaurante real.

## Señales operativas a vigilar

Los logs operativos ahora salen con formato consistente por `area` y `event`.

Eventos que requieren revision:

- `public-profile / profile_tab_render_failed`
- `public-profile / profile_services_fetch_failed`
- `public-profile / catalog_group_invalid_url_fallback`
- `public-catalog / group_products_load_failed`
- `restaurant-catalog / restaurant_group_products_load_failed`
- `product-card / product_card_missing_business_slug`
- `product-detail / product_detail_missing_business_slug`
- `public-feed / feed_incremental_request_failed`
- `public-feed / feed_incremental_load_failed`
- `public-feed / publication_invalid_media_filtered`
- `public-feed / testimonial_invalid_business_slug`

Eventos de warning aceptables en bajo volumen:

- deep links de grupo invalido que terminan en fallback correcto
- media vieja o mal cargada que se reemplaza por placeholder
- timeouts de geolocalizacion externa que terminan en fallback seguro
- intentos de carrito sin slug cuando el dataset del negocio esta incompleto

Si cualquiera de esos warnings se vuelve recurrente para un mismo negocio, deja de ser ruido y debe abrirse correccion.

## Checklist de apertura de piloto

1. Validar que el negocio abre en [src/app/(catalogo)/perfil/[slug]/page.tsx](src/app/(catalogo)/perfil/[slug]/page.tsx) sin errores visibles.
2. Confirmar que la portada y avatar cargan sin warnings de imagen invalida.
3. Confirmar que la pestaña correcta abre con deep links validos e invalidos.
4. Confirmar que productos o grupos muestran contenido real y no estados vacios engañosos.
5. Confirmar detalle de producto, carrito y WhatsApp.
6. Confirmar que publicaciones y testimonios renderizan media real o placeholder seguro.
7. Registrar el slug del negocio, responsable comercial y fecha de apertura.

## Monitoreo de las primeras 48 horas

1. Revisar logs operativos por negocio al menos dos veces al dia.
2. Verificar que no aparezcan errores repetidos de carga de grupos, servicios o feed.
3. Confirmar que el negocio entiende como probar sus CTAs principales.
4. Documentar cualquier fallback recurrente de media o deep links.

## Triage rapido

### Error al cargar productos por grupo

1. revisar si el grupo existe y esta activo
2. revisar si el slug del negocio corresponde al grupo solicitado
3. abrir el perfil sin deep link y confirmar el grupo inicial resuelto

### Error al cargar servicios

1. abrir la pestaña Negocio en el perfil publico
2. revisar si el endpoint `/api/getServiciosBySlug` responde
3. validar que el negocio tenga servicios activos o aceptar estado vacio legitimo

### Error en feed o media publica

1. revisar si la publicacion tiene multimedia vacia, rota o mal tipada
2. confirmar si el fallback seguro resolvio la vista o dejo el bloque vacio
3. corregir los datos del negocio si el warning se repite

### Error de carrito o detalle

1. validar que el producto tenga `slugNegocio`
2. validar imagen principal y variante seleccionada
3. reprobar desde la tarjeta y desde el detalle

## Criterio de pausa del piloto

Pausar apertura de nuevos negocios si ocurre cualquiera de estos casos:

- fallos repetidos de render en tabs del perfil
- errores frecuentes de carga incremental del feed
- errores repetidos de carga de grupos en negocios activos
- fallos de carrito o detalle en productos destacados del negocio

## Referencias relacionadas

- [../PROFILE_QA_AND_DEPLOY_READINESS.md](../PROFILE_QA_AND_DEPLOY_READINESS.md)
- [../SMOKE_TESTS_READINESS.md](../SMOKE_TESTS_READINESS.md)
- [PILOT_BUSINESS_ONBOARDING_CHECKLIST.md](PILOT_BUSINESS_ONBOARDING_CHECKLIST.md)
- [PILOT_EXECUTION_PLAN.md](PILOT_EXECUTION_PLAN.md)
- [PILOT_METRICS_AND_FEEDBACK.md](PILOT_METRICS_AND_FEEDBACK.md)
