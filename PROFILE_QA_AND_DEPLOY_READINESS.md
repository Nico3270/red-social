# Profile QA And Deploy Readiness

## Objetivo

Este documento deja una guía corta para validar el perfil público antes de usarlo con negocios reales y para ejecutar despliegues sin mezclar migraciones, build y sitemap en un solo paso.

## Scripts recomendados

- `npm run typecheck`: valida TypeScript sin tocar la base de datos.
- `npm run build`: compila la app y genera cliente Prisma, pero no corre migraciones ni sitemap.
- `npm run build:with-sitemap`: compila la app y luego genera `public/sitemap.xml`.
- `npm run deploy:migrate`: ejecuta `prisma migrate deploy` y regenera Prisma Client.
- `npm run deploy:app`: compila la app y genera sitemap.
- `npm run deploy:full`: secuencia completa para despliegues con cambios ya aprobados en base de datos.
- `npm run sitemap:generate`: genera sitemap de forma explícita usando la base de datos activa.
- `pnpm run env:check:app`: valida variables mínimas para ejecutar la app.
- `pnpm run env:check:deploy`: valida variables críticas para despliegue.
- `pnpm run env:check:pilot`: valida variables para abrir pilotos reales.
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID`: habilita Google Analytics 4 real sin cambiar la instrumentación existente.

## Orden recomendado de despliegue

1. Ejecutar `npm run typecheck`.
2. Ejecutar `pnpm run env:check:deploy`.
3. Ejecutar `npm run build`.
4. Si el despliegue incluye cambios pendientes de Prisma ya versionados, ejecutar `npm run deploy:migrate`.
5. Ejecutar `npm run deploy:app`.
6. Verificar que `public/sitemap.xml` fue generado con la URL correcta del entorno.

## QA funcional mínimo antes de producción

### Perfil público tradicional

- Abrir un perfil sin CatalogGroups y confirmar que la pestaña de productos carga sin errores.
- Abrir un producto desde la tarjeta y validar detalle, WhatsApp y agregado al carrito.
- Confirmar que un producto sin stock no permite continuar con la compra.
- Confirmar que el CTA del modal muestra `Agregar al carrito` y no textos ambiguos.

### Perfil con CatalogGroups

- Abrir un negocio cuyo grupo raíz solo organiza subgrupos.
- Confirmar que el primer grupo visible con productos queda seleccionado automáticamente.
- Entrar con deep link `?tab=productos&group=...` válido e inválido.
- Confirmar que al cambiar de grupo no se generan estados vacíos engañosos.

### Perfil restaurante premium

- Confirmar que el menú abre en una sección realmente visible, no en un contenedor vacío.
- Validar productos simples con `Agregar`.
- Validar productos con variantes usando `Ver opciones`.
- Confirmar que productos agotados muestran estado visual claro y no permiten agregar.
- Confirmar que después de agregar aparece feedback visible en el botón.

### Contacto y conversión

- Probar enlaces de sitio web sin protocolo y confirmar que abren correctamente.
- Probar WhatsApp desde header, tarjeta y detalle de producto.
- Confirmar que enlaces sociales usan URLs válidas y no números o texto crudo.

### Analítica

- Si el entorno expone `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, confirmar en GA4 Realtime o DebugView que llegan eventos de:
  - apertura de detalle de producto
  - clic en tarjeta hacia detalle
  - clic en WhatsApp
  - agregado al carrito
  - cambio de grupo en catálogo
- Confirmar que también aparecen `page_view` en rutas públicas al navegar entre perfil y detalle.
- Si la variable no existe, verificar al menos que la app sigue estable y que el fallback no rompe rutas públicas.

## Riesgos operativos conocidos

- `generate-sitemap.js` depende de acceso real a la base de datos del entorno donde se ejecuta.
- `next-sitemap.config.js` sigue presente, pero el flujo activo actual para sitemap es `generate-sitemap.js`.
- Si el pipeline del proveedor ya ejecuta migraciones por separado, no conviene volver a correr `deploy:full` dentro de la etapa de build.
- Los warnings transitorios de geolocalización externa (`ETIMEDOUT`, `ECONNRESET` o fallos equivalentes del proveedor) no bloquean el piloto si terminan en fallback seguro y no se vuelven recurrentes para un mismo negocio o sesión.

## Recomendación para pruebas con negocios reales

Usar al menos tres negocios de prueba antes de abrir el flujo a usuarios reales:

1. Un negocio tradicional sin CatalogGroups.
2. Un negocio con CatalogGroups y subgrupos.
3. Un restaurante con productos simples, variantes y casos sin stock.

## Observabilidad y piloto

La fase de observabilidad ligera y pilot readiness queda documentada en:

- [docs/PILOT_RUNBOOK.md](docs/PILOT_RUNBOOK.md)
- [docs/PILOT_BUSINESS_ONBOARDING_CHECKLIST.md](docs/PILOT_BUSINESS_ONBOARDING_CHECKLIST.md)
- [docs/PILOT_EXECUTION_PLAN.md](docs/PILOT_EXECUTION_PLAN.md)
- [docs/PILOT_METRICS_AND_FEEDBACK.md](docs/PILOT_METRICS_AND_FEEDBACK.md)
- [docs/PILOT_ANALYTICS_SETUP.md](docs/PILOT_ANALYTICS_SETUP.md)
