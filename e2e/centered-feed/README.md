# Prototipo local: principal centrada

Base publicada comprobada: `8ce16bc7779f846c386483a7d145369b51d8e461`. Herramientas de revisión; no forman parte del runtime de producción.

## Abrir el prototipo

Desde este worktree, con pnpm/Node del repositorio:

```sh
pnpm install --offline --frozen-lockfile --ignore-scripts
node scripts/public-ui-pg/run.mjs command pnpm prisma:generate
node e2e/centered-feed/prepare.cjs
NODE_OPTIONS=--max-old-space-size=6144 node e2e/centered-feed/dev-server.cjs
```

Abre `http://127.0.0.1:3400/?scenario=balanced`. `&compare=before` usa el renderer exacto de 8ce16bc obtenido por `git show`, con las mismas tarjetas/estilos por defecto. Escenarios: `balanced`, `sparse`, `commerce`, `social`, `reviews`. El último reutiliza cinco relaciones reales publicación-producto del muestreo público, sin inventarlas.

- Las fotos y pósteres públicos están cacheados en `photos/`, con URL y SHA-256 en `photo-manifest.json`. `browser-support.cjs` los sirve localmente a Playwright. El navegador de prueba no accede a servicios externos. Para navegación manual en navegador convencional, las URLs de las imágenes conservan sus destinos públicos; la comparación portable usa PNG y es completamente offline.
- `/?view=live` ejercita el coordinador y las acciones reales con el adaptador Prisma en memoria existente y una URL de DB inalcanzable (`127.0.0.1:1`). No es prueba SQL. Ese escenario usa los datos sintéticos geográficos anteriores, no los registros públicos.
- `?append=1` limita el lote inicial del renderer; el test añade el resto con `window.__centeredAppend()`. `?append=products-first` permite caracterizar el orden de llegada con productos primero. No modifica políticas de vistos ni consultas.
- La ruta y el rewrite existen solo en el harness de desarrollo. La optimización de imágenes se desactiva únicamente en el proceso privado de pruebas para servir la caché offline. `next.config.ts` permanece intacto.

En otra terminal:

```sh
pnpm exec playwright test --config=e2e/centered-feed/playwright.config.ts
node e2e/centered-feed/capture.cjs
```

Se admite `AUDIT_CHROMIUM_PATH`; se reutilizó Chromium instalado 1193. Las capturas solicitan scroll hasta 950 px; los inventarios cortos se detienen en su límite natural. Los tests no envían mensajes ni crean cuentas/pedidos.

Al terminar, detén solo este servidor y retira sus recursos:

```sh
node e2e/mobile-feed-implementation/prepare.cjs --clean
```

También puede retirarse `test-results/centered-feed`, generado por este preparador. No ejecutar el build con la ruta temporal presente.

## Procedencia de los datos, no requisito para abrir el comparador

`public-read.cjs` inspecciona una sesión pública anónima nueva con Tunja, otra pestaña y una recarga conservando storage. Solo permite GET/HEAD y las cuatro Server Actions de lectura. Lee los DTO públicos ya presentados por React para fijar el inventario; no accede a datos privados ni escribe en producción. `compose-fixture.cjs` separa el lote inicial de los cinco testimonios realmente vinculados; `cache-photos.cjs` descarga solo imágenes públicas reconocidas. No es necesario repetir esta inspección para reproducir las pruebas: los fixtures y la caché ya están incluidos.

## Build aislado

Se reutiliza el runner previo, sin volver a ejecutar su matriz de 26 pruebas SQL:

```sh
node scripts/public-ui-pg/database.mjs create
node scripts/public-ui-pg/run.mjs prepare
node scripts/public-ui-pg/run.mjs command pnpm exec tsx e2e/desktop-feed-prototype/build-seed.ts
node e2e/desktop-feed-prototype/build.mjs
node scripts/public-ui-pg/database.mjs remove
```

El runner valida `127.0.0.1:55439/myckeo_public_audit`. No reutilizar un contenedor ajeno ni ejecutar seeds generales. El build usa el esquema real y fixtures mínimos locales; HTTP externo bloqueado, sin variables ni datos de producción.
