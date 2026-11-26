# Cierre del feed centrado de escritorio

Solo presentación sobre el prototipo aprobado `d98e409`. El worktree revisado permanece intacto.

## Comprobación local aislada

Sin archivos `.env` remotos, con las dependencias del lockfile existente:

```sh
pnpm install --offline --frozen-lockfile --ignore-scripts
node scripts/public-ui-pg/run.mjs command pnpm prisma:generate
node e2e/centered-desktop-final/prepare.cjs
NODE_OPTIONS=--max-old-space-size=6144 node e2e/centered-feed/dev-server.cjs
```

Abre `http://127.0.0.1:3400/?scenario=balanced`. Este harness usa el renderer real con inventario público congelado y fotos cacheadas. `scenario=sparse`, `commerce`, `social` y `reviews` conservan los escenarios anteriores. `state=empty`, `loading`, `more`, `loading-with-content`, `pending-types` o `error` caracteriza las condiciones de finalización, sin modificar consultas. Los dos últimos proporcionan una señal de presentación no resuelta aunque haya contenido y no haya cursor. `?view=live` usa coordinador y Server Actions reales con el adaptador Prisma en memoria y DB inalcanzable, nunca una base remota.

En otra terminal:

```sh
pnpm exec playwright test --config=e2e/centered-desktop-final/playwright.config.ts
```

Las cuatro pruebas del prototipo se vuelven a ejecutar junto a las cuatro nuevas de sticky, categorías altas, finalización y regreso entre pestañas/umbrales. Solo se ajusta el selector de fin del recorrido para la variante aprobada. Los resultados nuevos se escriben en `docs/audits/centered-desktop-final-evidence/`; la evidencia histórica permanece intacta.

Detén el servidor y retira la ruta temporal antes de tipos, lint o build:

```sh
node e2e/mobile-feed-implementation/prepare.cjs --clean
pnpm typecheck
pnpm lint
```

El build aislado utiliza los runners anteriores, su guard de destino PostgreSQL local y sus fixtures mínimos. No repetir la matriz SQL ni ejecutar seeds generales. No desplegar la ruta, rewrite, caché ni fixtures del harness.

## Comprobación pública

```sh
node e2e/centered-desktop-final/public-check.cjs
```

Ejecutar solo después de verificar el deployment y SHA de `https://myckeo.com` mediante Vercel. El script no intercepta respuestas del feed: permite GET/HEAD y únicamente las cuatro Server Actions de lectura. Bloquea mensajes, pedidos, altas y otras escrituras. Las sesiones son anónimas y sus cambios de ciudad/vistos solo afectan al almacenamiento del navegador de prueba. Captura contenido real a 1440/1920, categorías expandidas, cambio de ciudad/continuación y regresiones 1439/390. La finalización con inventario escaso se acredita localmente; no se afirma agotamiento del catálogo público si no ocurre en el recorrido acotado.
