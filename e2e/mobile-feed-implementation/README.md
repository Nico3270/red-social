# Validación B3 + C2 en Next.js de desarrollo

Este entorno importa **los componentes productivos actuales**. No compila copias alternativas de ProductCard/FeedRenderer, no adapta Next Image/Link y no aplica CSS de prototipos. Usa layout, fuentes, navegación, modales, stores y transporte de Server Actions reales de Next.js, con respuestas sintéticas interceptadas en Playwright.

```bash
node e2e/mobile-feed-implementation/prepare.cjs
pnpm exec playwright test --config=e2e/mobile-feed-implementation/playwright.config.ts
node e2e/mobile-feed-implementation/prepare.cjs --clean
```

`prepare.cjs` instala una ruta temporal protegida por `NODE_ENV=development` y `MYCKEO_FEED_REVIEW=1`, además de SVG/video sintéticos en `public/`. La limpieza elimina únicamente los directorios que llevan su marcador. No se conserva una ruta nueva en la aplicación entregada.

Playwright inicia y detiene su servidor Next en loopback `127.0.0.1:3400`. El launcher:

- Lee la configuración existente y usa una compilación separada en `test-results/playwright/next-feed-review`, para no compartir `.next` con otro servidor del usuario.
- Usa un tsconfig derivado dentro de `test-results/`, sin editar `tsconfig.json` ni `next.config.ts`; restituye la referencia generada de `next-env.d.ts` tras arrancar.
- Mapea `/` a la ruta temporal **solo en ese proceso de pruebas**, para ejercitar la navegación que depende del pathname real del feed. El componente de prueba inyecta datos, no estilos ni implementaciones alternativas.
- Establece `DATABASE_URL` en un puerto local sin servicio. Playwright intercepta las acciones antes de alcanzar el servidor y bloquea peticiones externas, incluidas las ventanas de WhatsApp. No se realizan escrituras remotas.

## Datos y escenarios

- Sin parámetros: seis productos, publicación, negocio y servicio. Se verifica la secuencia del renderer y los productos impares.
- `?one=1`: tarjeta individual B3, limitada a 480 px.
- `?view=cases&cardWidth=186`: tarjetas reales en un contenedor estrecho: nombres/precios largos, variantes, agotados, imágenes ausentes y fallidas.
- `?productMedia=portrait` / `landscape`: orientación del producto.
- `?media=video`: publicación con video manual.
- `?container=360`: viewport amplio con contenedor estrecho; C2 debe volver a una columna.
- `?view=live`: **FeedComponent real**, sus queries, ranking/deduplicación del cliente, observer y fetchNextPage. Las respuestas RSC sintéticas incluyen un producto repetido entre páginas para comprobar la deduplicación existente.

Los interceptores traducen `$undefined` del transporte RSC y devuelven el resultado sin ejecutar Server Actions. Esto valida integración cliente/UI, no persistencia de backend ni autenticación real.

## Referencia B2

La referencia está congelada en `docs/mobile-feed-b3-c2/b2-sources/` y se captura con el mismo servidor Next, datos y layout:

```bash
node e2e/mobile-feed-implementation/prepare.cjs
node e2e/mobile-feed-implementation/capture-baseline.cjs
# Restaura automáticamente los archivos B3/C2 actuales al finalizar.
pnpm exec playwright test --config=e2e/mobile-feed-implementation/playwright.config.ts
node e2e/mobile-feed-implementation/prepare.cjs --clean
```

La captura B2 sustituye temporalmente los tres archivos de presentación por su estado inicial de esta tarea y los restaura al salir. No usa variantes B3/B4/C1/C2 de la exploración anterior. El informe final y el manifiesto registran qué fuentes se entregan.

La suite cubre 320/360/390/430/768/1024/1440 px, zoom CSS al 200 %, interacción y scroll al paginar. El chrome de herramientas de desarrollo de Next se oculta durante las capturas; la navegación de Myckeo permanece visible. El consentimiento de cookies se marca aceptado para poder medir el feed.
