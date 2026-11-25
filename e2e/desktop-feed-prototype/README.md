# Prototipo local del feed de escritorio

Base: `058d13329ba6a81414e140a33d08cb50475d009b`. No desplegar el harness.

## Revisión visual y funcional

```sh
pnpm install --offline --frozen-lockfile --ignore-scripts
node scripts/public-ui-pg/run.mjs command pnpm prisma:generate
node e2e/desktop-feed-prototype/prepare.cjs
NODE_OPTIONS=--max-old-space-size=6144 node e2e/desktop-feed-prototype/dev-server.cjs
```

Abre `http://127.0.0.1:3400/?scenario=balanced`. Variantes: `commerce`, `only-commerce`, `social`, `sparse`. `/?view=live` ejecuta el coordinador y las cuatro Server Actions existentes con el adaptador Prisma **en memoria**, nunca una base remota. La URL de DB del servidor es inalcanzable (`127.0.0.1:1`). Los escenarios fijos llaman al renderer real con DTO sintéticos; no se presentan como prueba SQL.

En otra terminal:

```sh
node e2e/desktop-feed-prototype/capture.cjs after
pnpm exec playwright test --config=e2e/desktop-feed-prototype/playwright.config.ts
```

Chromium existente en `~/.cache/ms-playwright/chromium-1193/chrome-linux/chrome`; se admite `AUDIT_CHROMIUM_PATH`. Playwright bloquea orígenes externos, simula la sesión anónima y permite únicamente las cuatro acciones de lectura del feed. No abrir el harness con variables remotas ni enviar formularios.

`/?scenario=balanced&compare=before` permite comparar en ejecución. El preparador extrae `FeedRederer.tsx` mediante `git show` del SHA base y lo coloca únicamente en la ruta temporal. Las tarjetas compartidas usan sus variantes predeterminadas; las reglas del prototipo no se activan y tampoco compactan la cabecera. `node e2e/desktop-feed-prototype/capture.cjs before` captura esa referencia reproducible sin cambiar archivos de aplicación. Tras una captura inicial y hacer coherentes ciudad/relaciones de los fixtures, se regeneró la comparación con el mismo conjunto final en ambos renderers.

Al terminar, detén solo el servidor de esta carpeta y ejecuta:

```sh
node e2e/mobile-feed-implementation/prepare.cjs --clean
pnpm typecheck
pnpm lint
```

El preparador crea ruta/arte temporales con marcador de propiedad y guard de desarrollo; el servidor instala el rewrite solo en su proceso. La configuración de aplicación no cambia. `--clean` retira exclusivamente esos recursos. El build final se verifica **sin** el harness.

## Build aislado con el esquema real

Verifica que no existe el contenedor/puerto antes de comenzar. No reutilices una instancia ajena. Los scripts existentes comprueban el destino local `127.0.0.1:55439/myckeo_public_audit` y su nombre mediante SQL.

```sh
node scripts/public-ui-pg/database.mjs create
node scripts/public-ui-pg/run.mjs prepare
node scripts/public-ui-pg/run.mjs command pnpm exec tsx e2e/desktop-feed-prototype/build-seed.ts
node e2e/desktop-feed-prototype/build.mjs
node scripts/public-ui-pg/database.mjs remove
```

Son fixtures mínimos para generación de páginas (12 negocios y 3 productos), no una nueva repetición de la matriz SQL anterior. `build.mjs` usa el entorno permitido existente, conexiones locales y el bloqueo HTTP externo; no lee `.env` de otros worktrees. No ejecutar seeds generales ni migraciones remotas.
