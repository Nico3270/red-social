# Restauración de escritorio y acciones A/B

Los tests importan el ProductCard y FeedRenderer productivos, con Next.js real. Reutilizan el launcher y los interceptores de la fase B3+C2, sin cambiar configuración de la aplicación, APIs ni bases de datos. El servidor usa caché aislada, datos sintéticos y acciones remotas interceptadas.

```bash
node e2e/mobile-feed-responsive/prepare.cjs
pnpm exec playwright test --config=e2e/mobile-feed-responsive/playwright.config.ts
node e2e/mobile-feed-responsive/evidence.cjs
node e2e/mobile-feed-responsive/prepare.cjs --clean
pnpm typecheck
pnpm lint
```

Se instala temporalmente la ruta de fixtures protegida por modo development; en el proceso de pruebas se sirve bajo `/` para usar la navegación del feed. La limpieza retira la ruta, los assets y tipos/caché temporales. No queda una página de revisión en el producto.

Opciones del fixture:

- `?actions=separate`: A, dos botones independientes sobre foto.
- `?actions=split`: B, carrito en foto y WhatsApp junto a precio.
- `?one=1`: tarjeta individual; sin ese parámetro se muestran los módulos C2 existentes.
- `?view=cases&cardWidth=186`: estados y contenido extremo en tarjeta estrecha.
- `?category=1`: sección inicial de cuatro productos para verificar el layout de escritorio a 1920 px.
- `?view=live`: FeedComponent real con observer, queries, deduplicación y fetchNextPage; se usa el estilo predeterminado A.

La referencia de escritorio corresponde a los archivos de `docs/mobile-feed-b3-c2/b2-sources/`, anteriores a B3+C2. Para regenerarla:

```bash
node e2e/mobile-feed-responsive/prepare.cjs
node e2e/mobile-feed-responsive/capture-reference.cjs
```

Ese capturador sustituye temporalmente los tres archivos de presentación por la referencia y los restituye al salir. Después se ejecuta la suite actual. Las pruebas comparan todos los elementos visibles de las tarjetas, su geometría y estilos calculados, y los píxeles de las capturas PNG, sin tolerancia de diferencias. Sharp ya estaba instalado; no se añade ninguna dependencia.

Las medidas de foto distinguen el área pintada de los círculos de su objetivo táctil de 44 px. El área pintada se calcula desde las dimensiones reales y pseudo-elementos renderizados; excluye sombras y no equivale a porcentaje del objeto reconocido. Los datos completos y las capturas están en `docs/mobile-feed-responsive/`.
