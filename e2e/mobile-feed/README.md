# Validación local del feed compacto

Este entorno compila los componentes reales y usa fixtures sintéticos. No añade rutas a Next.js ni consulta la base de datos. Los stores de carrito, favoritos y publicaciones son los reales, con almacenamiento exclusivo del contexto aislado de Chromium. No se hacen escrituras productivas.

Desde la raíz:

```bash
node e2e/mobile-feed/build.cjs --before
node e2e/mobile-feed/build.cjs
pnpm exec playwright test --config=e2e/mobile-feed/playwright.config.ts
```

`--before` lee las fuentes con `git show` desde `1f491ff8ce6f80e333f07548e299141fc863d993`; no hace checkout ni escribe en `src`. Para otra referencia puede configurarse `FEED_BASELINE_REVISION`. La compilación normal incorpora las fuentes actuales. Ambas generan un manifiesto SHA-256 en `docs/mobile-feed-compact/before/` o `after/`.

El CSS del baseline incluye las clases históricas de esa revisión, aunque ya no aparezcan en el código actual; así la comparación conserva sus bordes, paddings y breakpoints originales.

Playwright usa Chromium instalado, descubierto en la caché local, o `PRODUCT_TEST_BROWSER`. No instala dependencias ni navegadores. El servidor escucha solo en `127.0.0.1:4401` y Playwright lo inicia y detiene. Para inspección manual:

```bash
node e2e/mobile-feed/serve.cjs
```

Abrir `/before/`, `/after/`, `/after/?view=cases`, `/after/?view=cases&role=user`, `/after/?view=cases&media=portrait` o `/after/?view=cases&media=video`. Las URL son relativas a `http://127.0.0.1:4401`. Los dibujos y las fuentes corresponden al contenido de la auditoría aprobada; la muestra WebM silenciosa es original, generada localmente con Canvas/MediaRecorder. `create-clip.cjs` permite regenerarla sin servicios externos.

Fronteras adaptadas:

- `next/image` conserva clases, dimensiones y posicionamiento `fill`, pero usa `<img>`: no prueba optimización, `srcset`, precarga o lazy loading reales de Next.
- `next/link` usa enlaces HTML; router inerte y sesión simulada. No prueba OAuth, login real ni navegación App Router.
- Preferencias de ciudad sintéticas; sin geolocalización. `FeedRenderer` recibe fixtures directamente: las consultas y el sentinel no hacen solicitudes a la base de datos.
- Follow y envío de interacciones usan respuestas en memoria; los componentes, actualizaciones optimistas, stores y modales son reales. Las consultas REST de comentarios se interceptan en Playwright y reciben páginas sintéticas vacías.
- Se sustituyen únicamente menú lateral/creación cerrados, analítica, diagnósticos y guardado de preferencias. `PublicationModal`, carruseles, reseñas y `Interactions` se renderizan sin modificar su código.
- El enum de reacciones se adapta en el bundle local para no incorporar Prisma. No se cambia Prisma en la aplicación.

Los casos cubren los nueve anchos solicitados, nombres/precios extensos, falta y fallo de imagen, variantes, agotados, persistencia local de favoritos, follow autenticado/anónimo, carrito y cantidades, medios de varias orientaciones, reproducción explícita de WebM, reseñas, reacción/comentario, servicios con/sin precio, zoom CSS al 200 %, viewport bajo y geometría de las variantes compartidas. La preferencia de movimiento reducido está configurada, aunque no certifica todos los efectos de animación de la aplicación.

El zoom CSS al 200 % es una emulación de reflow, no una prueba del zoom de la interfaz de Safari/iOS. Se prueba el feed a 640 px físicos (aproximadamente 320 px efectivos) y las tarjetas incluso a 320 px físicos. Hace falta comprobar dispositivos reales antes de publicar.

Evidencia en `docs/mobile-feed-compact/`: `results.json`, `measurements.json`, manifiestos, comparaciones HTML y capturas PNG. El área útil medida descuenta el header y la barra fija inferior. Las capturas `initial` muestran la llegada; `aligned` desplazan la primera tarjeta 8 px bajo el header. Las `full` conservan las barras fijas en su posición de captura y no representan una única pantalla de teléfono.

No ejecutar los scripts antiguos de `docs/mobile-feed-audit/` para reconstruir el “antes”: leerían las fuentes actuales. Esta suite usa explícitamente la revisión de la auditoría como baseline.
