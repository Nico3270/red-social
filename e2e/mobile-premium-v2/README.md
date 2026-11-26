# Myckeo Mobile Premium V2 — entorno local

Base V1: `251f29501891a6896d85dbbb0f4d4d95ab151ded`. Rama: `prototype/mobile-premium-v2-brand-20261126`.

```bash
cd /home/nico/worktrees/myckeo-mobile-premium-v2-20261126
node e2e/mobile-premium-v2/prepare.cjs
node e2e/mobile-premium-v2/dev-server.cjs
```

Esperar la compilación, precalentando desde otra terminal si hace falta:

```bash
curl --silent --show-error 'http://127.0.0.1:3400/?scenario=balanced' -o /dev/null
```

Abrir esa URL con emulación móvil. No copiar `.env` ni realizar login real: se usa el adaptador en memoria de V1 con una DATABASE_URL defensiva inalcanzable. La entrada manual es anónima y conserva el consentimiento original. Los estados de sesión de revisión se simulan mediante Playwright, sin alterar auth de aplicación.

Se reutilizan `e2e/mobile-premium-v1`, el inventario público congelado y sus activos de 33 elementos más cinco reseñas relacionadas. Escenarios: balanced, commerce, social, media, reviews, sparse. `?scenario=balanced&append=1` permite `window.__centeredAppend()` en consola para continuar; `?view=live` usa coordinador/lecturas reales con datos sintéticos en memoria (69 por ciudad) y permite cambio de ciudad. Los estados `?scenario=sparse&state=empty|loading|pending-types|error` son fixtures explícitos de presentación.

Con el servidor abierto:

```bash
pnpm exec playwright test --config=e2e/mobile-premium-v2/playwright.config.ts
node e2e/mobile-premium-v2/capture.cjs after
node e2e/mobile-premium-v2/capture-key.cjs v2
node e2e/mobile-premium-v2/capture-flows.cjs after
node e2e/mobile-premium-v2/capture-states.cjs after
node e2e/mobile-premium-v2/capture-desktop.cjs after
```

El helper bloquea escrituras y tráfico externo, devuelve sesiones/búsqueda controladas y sirve las mismas fotos cacheadas de V1. Permite las cuatro lecturas del feed y la comprobación de seguimiento en memoria. Favoritos y carrito modifican solo el estado local del navegador. No enviar WhatsApp, ejecutar compras o escribir datos remotos. `AUDIT_CHROMIUM_PATH` se admite en config y las herramientas que lo exponen; la evidencia usa Chromium 1193 de este equipo, sin H.264.

Para repetir las referencias, crear un worktree temporal separado en cada SHA, compartir solo las dependencias del V2 y copiar sus herramientas/activos de revisión. Cambiar 3400→3402 exclusivamente en las copias privadas del servidor generado y browser helpers. Seleccionar el renderer real del HEAD, sin `compare=before`. `capture-key.cjs published|v1` captura las mismas seis tarjetas. `capture-desktop.cjs before` recaptura 769/1440 inicio/scroll de la referencia. Las capturas generales publicada/V1 se reutilizan con procedencia registrada; no se reconstruyen a partir de V2 ni se retocan PNG.

Detener el servidor y limpiar antes de controles:

```bash
node e2e/mobile-premium-v2/prepare.cjs --clean
pnpm typecheck
pnpm lint
pnpm exec jest src/feed/desktopDiscovery.test.ts src/feed/geography.test.ts --runInBand --coverage=false
```

La limpieza retira ruta, arte, declaraciones/cachés y salidas temporales propias. No desplegar esos directorios ni los rewrites de revisión. El build reutiliza `scripts/public-ui-pg/run.mjs` y `e2e/desktop-feed-prototype/build.mjs`: valida la base local desechable, prepara esquema y fixtures mínimos y bloquea HTTP externo. En esta ejecución el contenedor propio `myckeo-mobile-v2-build-20261126`, etiqueta `myckeo.audit=mobile-premium-v2-20261126`, expone 127.0.0.1:25439 y un proxy TCP propio reenvía 127.0.0.1:55439. Se retira comprobando la etiqueta. No reutilizar contenedores del usuario ni bases remotas.

`compare-evidence.cjs` valida identidades, relaciones, medidas y cuatro PNG de escritorio; `bundle-review.cjs` genera el comparador triple; `verify-portable.cjs` abre sus 48 casos con red bloqueada. Con el commit local terminado, `bundle-review.cjs --package` crea carpeta/ZIP nuevos, rechaza sobrescritura y usa Python estándar. Extraer y abrir index.html. `revision.json` registra el SHA exacto. Las capturas complementarias de 280 px, badges, rutas activas y teclado son V2, claramente diferenciadas de los triples.
