# Smoke Tests Readiness

## Objetivo

Esta base mantiene smoke tests reales sobre rutas públicas críticas con Playwright y fixtures generadas contra la base activa.

## Cómo se generan las fixtures

- El perfil tradicional se resuelve desde un negocio real con producto disponible y sin CatalogGroups activos.
- El perfil restaurante se resuelve desde un negocio real con CatalogGroups y modo restaurante.
- El perfil CatalogGroups no-restaurante se resuelve en este orden:
	1. negocio real ya existente en la base
	2. fixture estable bootstrap si se activa SMOKE_BOOTSTRAP_FIXTURES=1
	3. omisión explícita y documentada si ninguna de las dos opciones existe

La salida generada en e2e/smoke/.generated/fixtures.json ahora deja dos pistas útiles:

- catalogGroupsProfileStatus: existing, bootstrapped o missing
- catalogGroupsProfileReason: motivo exacto del estado anterior

## Cobertura actual

- Perfil público tradicional sin CatalogGroups.
- Guía pública del perfil con render, selección de preset y navegación básica hacia Productos.
- Detalle de producto público con WhatsApp y flujo básico de carrito.
- Perfil público con CatalogGroups no-restaurante y deep link válido.
- Fallback de grupo inválido hacia un grupo visible válido.
- Perfil restaurante premium con navegación de menú y CTA principal del item sample.
- Deep link válido del grupo inicial en restaurante premium.

Estado validado más reciente:

- `pnpm run smoke:ci`: OK
- suite actual: `7/7` casos smoke en verde
- la guía pública ya queda cubierta por `e2e/smoke/business-guide.spec.ts`

## Scripts

- pnpm smoke:install
- pnpm smoke:fixtures
- pnpm smoke:ci
- pnpm smoke
- pnpm smoke:headed
- pnpm env:check:smoke

`pnpm smoke:ci` fuerza `CI=true` al ejecutar Playwright para usar 1 worker y retries, evitando falsos fallos locales por concurrencia excesiva contra la base activa.

## Flujo local recomendado

1. Ejecutar pnpm smoke:install una vez por máquina o contenedor.
2. Ejecutar pnpm env:check:smoke.
3. Ejecutar pnpm smoke:fixtures para refrescar slugs reales desde la base activa.
4. Ejecutar pnpm smoke.

Si la base local no tiene un negocio real con CatalogGroups no-restaurante y quieres forzar cobertura completa, ejecuta:

SMOKE_BOOTSTRAP_FIXTURES=1 pnpm smoke:fixtures
pnpm smoke

Ese bootstrap crea o reutiliza un fixture estable y namespaced para smoke. No toca el schema y queda encapsulado dentro del generador.

## Variables soportadas

- SMOKE_BASE_URL: usa una app ya levantada y evita que Playwright inicie Next localmente.
- SMOKE_HOST: host del servidor local cuando Playwright levanta la app.
- SMOKE_PORT: puerto del servidor local cuando Playwright levanta la app.
- SMOKE_BOOTSTRAP_FIXTURES: cuando vale 1 o true, provisiona el fixture estable no-restaurante si no existe uno real.

## CI

El workflow de GitHub Actions vive en [.github/workflows/smoke-tests.yml](.github/workflows/smoke-tests.yml) y hace lo siguiente:

1. valida variables con `pnpm run env:check:smoke`
2. instala dependencias con pnpm
3. instala Chromium con dependencias del sistema mediante Playwright
4. genera fixtures
5. ejecuta la suite smoke
6. publica playwright-report y test-results/playwright como artefactos

La CI activa SMOKE_BOOTSTRAP_FIXTURES=1 para no depender de que la base ya tenga cargado un negocio no-restaurante con CatalogGroups.

Secretos mínimos esperados en CI:

- SMOKE_DATABASE_URL o DATABASE_URL

El workflow también inyecta valores dummy para Google/NextAuth, suficientes para arrancar la app durante los smoke tests sin abrir flujos de autenticación.

## Qué hacer si falla el caso no-restaurante

1. Revisa e2e/smoke/.generated/fixtures.json y valida catalogGroupsProfileStatus y catalogGroupsProfileReason.
2. Si el estado es missing en local, vuelve a generar con SMOKE_BOOTSTRAP_FIXTURES=1.
3. Si el estado es bootstrapped pero el test sigue fallando, inspecciona el negocio smoke-catalog-groups-no-restaurante y sus grupos/productos.
4. Si el estado es existing y falla, el problema ya no es ausencia de fixture sino regresión real del flujo público.

## Limitaciones actuales

La suite sigue enfocada en superficie pública crítica. No cubre autenticación, dashboard/admin, reservas, encuestas ni checkout completo.

## Nivel de protección

La base queda lista para piloto sobre lo más sensible del perfil público: carga de perfil, entrada a productos, detalle, CTA de contacto, CTA de carrito y resiliencia de deep links tanto para modo restaurante como para CatalogGroups no-restaurante.

Para la operación real del piloto y la preparación de negocios específicos, complementar con:

- [docs/PILOT_RUNBOOK.md](docs/PILOT_RUNBOOK.md)
- [docs/PILOT_BUSINESS_ONBOARDING_CHECKLIST.md](docs/PILOT_BUSINESS_ONBOARDING_CHECKLIST.md)
- [docs/PILOT_EXECUTION_PLAN.md](docs/PILOT_EXECUTION_PLAN.md)
- [docs/PILOT_METRICS_AND_FEEDBACK.md](docs/PILOT_METRICS_AND_FEEDBACK.md)
