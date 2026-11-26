# Myckeo — Mobile Premium V1, revisión local

Worktree: `/home/nico/worktrees/myckeo-mobile-premium-v1-20261125`.
Rama: `prototype/mobile-premium-v1-20261125`. Base: `89f2741578ec666fbcdcabb1e1d23126b5609f31`.

No ejecutar deploy, migraciones, seeds generales ni fixtures contra datos remotos. Este harness usa un adaptador Prisma en memoria, inventario público congelado y Server Actions de lectura reales; las sesiones de las pruebas son respuestas de navegador simuladas, no cuentas reales.

## Abrir el prototipo funcional

Desde este worktree, con las dependencias del lockfile instaladas mediante pnpm:

```bash
cd /home/nico/worktrees/myckeo-mobile-premium-v1-20261125
node e2e/mobile-premium-v1/prepare.cjs
node e2e/mobile-premium-v1/dev-server.cjs
```

Abrir `http://127.0.0.1:3400/?scenario=balanced` con emulación móvil. El servidor fija una base inalcanzable como defensa adicional y utiliza solo el adaptador en memoria, sin copiar `.env`. El primer arranque de Next puede tardar; esperar la compilación. Antes de abrir el navegador puede precalentar el compilador con `curl --silent --show-error http://127.0.0.1:3400/?scenario=balanced -o /dev/null`; la caché privada nueva evita reutilizar chunks de revisiones anteriores. No activar una sesión real ni realizar escrituras remotas. La caché de build del harness es independiente de `.next`.

- `?scenario=commerce`: 23 productos/negocios/servicios del inventario público.
- `?scenario=social`, `?scenario=media`: publicaciones del mismo inventario.
- `?scenario=reviews`: cinco reseñas públicas relacionadas, preservadas del prototipo previo.
- `?scenario=sparse`: dos elementos del inventario.
- `?scenario=balanced&append=1`: diez elementos iniciales; en consola `window.__centeredAppend()` añade los demás sin alterar los anteriores.
- `?scenario=sparse&state=empty|loading|pending-types|error`: estados controlados de presentación. `error` representa resolución fallida, no una respuesta backend real.
- `?view=live`: coordinador y lecturas existentes con inventario sintético en memoria, 69 elementos por ciudad. Usar este recorrido para cambio de ciudad y continuación.

La entrada manual es anónima; las sesiones personal, propietario e incompleto se ejercitan con Playwright. No se implementan rutas de autenticación falsas en la aplicación. El banner de consentimiento conserva su comportamiento: en revisión manual aceptar/rechazar antes de evaluar la barra inferior.

## Pruebas enfocadas y capturas

Con el servidor anterior abierto:

```bash
pnpm exec playwright test --config=e2e/mobile-premium-v1/playwright.config.ts
node e2e/mobile-premium-v1/capture.cjs after
node e2e/mobile-premium-v1/capture-flows.cjs after
node e2e/mobile-premium-v1/capture-states.cjs after
node e2e/mobile-premium-v1/capture-desktop.cjs after
```

`AUDIT_CHROMIUM_PATH` permite seleccionar el ejecutable en el config y herramientas que lo admiten; las capturas entregadas usan Chromium 1193 instalado en este equipo. El browser helper bloquea destinos externos y escrituras, sirve fotografías cacheadas, simula búsqueda/sesiones y permite las cuatro lecturas de feed y la comprobación de seguimiento en memoria. Abrir WhatsApp solo verifica su URL con una respuesta local, sin enviar mensajes. El video conserva MP4 original; este Chromium no dispone de H.264. El teclado e insets son simulaciones explícitas.

La comparación anterior se capturó en un worktree temporal separado en la base publicada, con el mismo harness y puertos privados 3402/3400. No utilizar el renderer histórico 8ce como sustituto de la referencia 89f: las capturas entregadas usan el FeedRederer real del HEAD de cada worktree. Ese archivo histórico existe solo por reutilización del preparador previo y no es la variante seleccionada.

Para repetir el antes, crear otro worktree temporal en 89f, copiar únicamente este harness y activos adicionales, compartir dependencias del prototipo y ajustar 3400→3402 solo en las copias privadas de browser helpers/servidor/URLs. No modificar los worktrees conservados. El inventario y fotografías permanecen idénticos; las sesiones y orden están fijados por el caso, sin forzar publicaciones al inicio.

## Cerrar el harness y controles de código

Detener el servidor antes de limpiar:

```bash
node e2e/mobile-premium-v1/prepare.cjs --clean
pnpm typecheck
pnpm lint
pnpm exec jest src/feed/desktopDiscovery.test.ts src/feed/geography.test.ts --runInBand --coverage=false
```

No incluir `src/app/(catalogo)/feed-implementation-review`, `public/__feed-implementation-art`, `test-results`, `.next`, variables de entorno ni rewrites del harness en el commit de aplicación o en un despliegue.

El build reutiliza los runners seguros existentes: `scripts/public-ui-pg/database.mjs create`, `scripts/public-ui-pg/run.mjs prepare`, `scripts/public-ui-pg/run.mjs command pnpm exec tsx e2e/desktop-feed-prototype/build-seed.ts`, `e2e/desktop-feed-prototype/build.mjs`, y retirada del contenedor propio. Valida exclusivamente 127.0.0.1:55439/myckeo_public_audit, aplica el esquema solo a esa base tmpfs y bloquea HTTP externo al compilar. En esta ejecución Docker Desktop rechazó publicar 55439; se utilizó un contenedor propio en 25439 con un proxy TCP local en 55439, sin cambiar los guards ni la configuración del repositorio. Los registros identifican el fallo inicial y el resultado posterior. No ejecutar este flujo sobre los contenedores ya existentes del usuario.

## Paquete portable

`node e2e/mobile-premium-v1/compare-evidence.cjs` comprueba equivalencia de los 15 casos, entrada pública y píxeles de escritorio. `node e2e/mobile-premium-v1/bundle-review.cjs` genera el comparador HTML y manifiesto de 42 pares. Con el commit local final creado, añadir `--package` crea una carpeta y ZIP nuevos fuera del repositorio, sin sobrescribir una entrega existente. El ZIP contiene imágenes, HTML, informe y registros; no es un servidor ni un build instalable.

Extraer `/home/nico/worktrees/myckeo-mobile-premium-v1-review-20261125.zip` y abrir su `index.html`; todos los PNG y enlaces de revisión son relativos. `revision.json` registra rama, commit y base.
