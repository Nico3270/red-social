# Exploración de tarjetas Myckeo B2 / B3 / B4 / C1 / C2

Entorno estático aislado, con componentes y stores reales, datos sintéticos y límites de servidor simulados. No importa un servidor Next ni se conecta a una base de datos. No requiere librerías nuevas.

```bash
node e2e/mobile-feed-variants/build.cjs
node e2e/mobile-feed-variants/serve.cjs
```

Abrir `http://127.0.0.1:4402/review/` para la galería de capturas. Para interactuar, usar un viewport de 320–768 px y los enlaces de la galería. Por ejemplo: `http://127.0.0.1:4402/?design=b3`. La propuesta no está diseñada para adoptarse directamente en escritorio.

```bash
pnpm exec playwright test --config=e2e/mobile-feed-variants/playwright.config.ts
node e2e/mobile-feed-variants/typecheck.cjs
pnpm typecheck
pnpm lint
pnpm exec next lint --file e2e/mobile-feed-variants/variants.spec.ts --file e2e/mobile-feed-variants/playwright.config.ts
```

## Límites de presentación

- `ProductCard.tsx.txt`: copia de B2. Reubica el mismo JSX de acciones fuera del enlace de imagen; conserva callbacks, estados, modal y stores. No se importa desde `src/`.
- `feedProductCard.module.css`: estilos B2 + propuestas locales. El baseline B2 conserva su composición.
- `FeedRenderer.tsx.txt`: copia del renderer. C2 cambia únicamente el layout de los clusters existentes y hace que el producto impar abarque ambas columnas. C1 presenta los seis productos juntos como comparación de catálogo; sus bloques sociales quedan después. Esa agrupación existe solo en este archivo y no modifica el ranking ni la cadencia productivos. B2/B3/B4/C2 mantienen la secuencia mixta.
- `harness.tsx.txt`: mismos seis productos en las cinco variantes, con publicación, negocio y servicio. Casos largos, variantes, stock agotado, imágenes ausentes y fallidas. Las fotos son ilustraciones SVG locales, no fotografías productivas.
- `build.cjs`: esbuild/Tailwind ya instalados; registra hashes de fuentes, overrides y adaptadores en el manifiesto generado. El video sintético se comparte con el harness anterior.
- `serve.cjs`: HTTP estático en loopback. `/baseline/` sirve la referencia B2 congelada de la fase anterior; `/review/` sirve esta galería y evidencias.
- `source-state-before.json`: SHA-256 de todos los archivos de `src/` al iniciar la exploración. Las pruebas comprueban que no cambiaron.

Next Image/Link/navigation/auth/fonts se adaptan localmente. Favoritos y carrito usan los stores reales en localStorage. Follow y comentarios usan respuestas sintéticas; las solicitudes externas se bloquean durante Playwright. No se prueba persistencia de servidor, autenticación real, optimización Next Image/Cloudinary ni entrega comercial a WhatsApp.

Ver informe: [MYCKEO_MOBILE_FEED_VARIANTS_COMPARISON.md](../../docs/MYCKEO_MOBILE_FEED_VARIANTS_COMPARISON.md).
