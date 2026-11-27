# Entorno aislado de la auditoría del feed

Documento principal: [MYCKEO_MOBILE_FEED_UX_AUDIT.md](../MYCKEO_MOBILE_FEED_UX_AUDIT.md).

Este directorio contiene documentación, fuentes de prototipos y evidencia local. No instala dependencias, no consulta datos reales y no añade rutas a Next.js. `prototype.tsx.txt` se compila explícitamente como TSX; queda fuera de los patrones TypeScript de la aplicación.

Desde la raíz del repositorio:

```bash
node docs/mobile-feed-audit/build.cjs
node docs/mobile-feed-audit/serve.cjs
```

Abrir `http://127.0.0.1:4399/?mode=current`, `?mode=A`, `?mode=B` o `?mode=C`. Los modos comparten tres productos, una publicación, un negocio y un servicio, en ese orden de presentación. Nombres, precios, cuentas y dibujos SVG son sintéticos. Las fuentes se leen de los archivos locales existentes. El servidor solo escucha en loopback; no publica el prototipo.

Para repetir las mediciones, con el servidor abierto o permitiendo que el script lo inicie:

```bash
node docs/mobile-feed-audit/measure.cjs
```

El script usa Playwright ya instalado y Chromium local. Su ruta predeterminada corresponde al navegador disponible durante esta auditoría; en otro entorno configurar `AUDIT_CHROMIUM=/ruta/al/chromium`. `AUDIT_PORT` cambia el puerto del servidor; `AUDIT_URL` cambia la URL del medidor. No requiere instalar navegadores ni acceder a Internet. Chromium y la apertura de puertos pueden requerir autorización del entorno de ejecución.

Casos: cuatro modos × siete anchos, cuatro casos de texto extenso a 320 × 568, cuatro variantes multimedia de la tarjeta actual a 390 × 844, dos roles simulados a 320 × 568 y un caso con cookies. Total: 39 escenarios de geometría. Además verifica guardar y abrir/cerrar una ficha ilustrativa en B. No verifica compras, sesiones ni interacciones sociales reales.

Parámetros adicionales del modo actual: `&tab=Productos`, `&tab=Publicaciones`, `&tab=Servicios`, `&tab=Negocios`, `&media=portrait`, `&media=square`, `&media=video`, `&media=none`, `&cookies=1`, `&role=user`, `&role=negocio`, `&stress=1`. La captura de video utiliza el estado sin póster de un recurso sintético inexistente: no reproduce video.

`build.cjs` lee directamente `FeedRederer`, las cuatro tarjetas activas, sus helpers de presentación, `FollowButton`, `AddFavorites`, ambos menús, categorías y buscador. Conserva Framer Motion, MUI y TanStack Query. Compila `globals.css` con el Tailwind del repositorio. No incluye `FeedRenderer.css`, porque la aplicación no lo importa.

Las fronteras con Next y datos están adaptadas:

- `next/image`: `<img>` con las dimensiones, clases y posicionamiento de `fill`; no reproduce optimización, `srcset`, precarga ni lazy loading de Next.
- `next/link` y navegación: enlaces HTML y router inerte. No se siguen enlaces de negocio, WhatsApp ni Maps durante las mediciones.
- Fuentes: clases equivalentes a `next/font` y archivos locales. La emulación no reproduce exactamente las métricas de fallback de Next.
- Sesión y stores: estado sintético estable, sin lectura del almacenamiento del usuario. Favoritos y carrito no persisten. Las acciones de follow y preferencias son inertes.
- Modales de publicación, menú lateral y creación: cerrados y sustituidos por componentes nulos. El modal de compra actual se importa, pero no se ejercita.
- `FeedComponent` y `CatalogoLayout`: se inspeccionan en el repositorio; su composición visual se reproduce sin sus consultas, geolocalización, redirecciones ni footer legal. `FeedRenderer` recibe fixtures directamente; no se mide paginación real.
- Consentimiento: se incorpora la misma librería, textos y estilos solo con `cookies=1`. No se replica el enlace real ni se prueba persistencia.
- Analítica y observabilidad: inertes; no se emiten eventos a servicios externos.

`measurements.json` conserva geometría de tarjetas, cabecera, medios, títulos, descripciones, acciones, objetivos táctiles pequeños, separación, overlays y conteos. Las coordenadas son relativas al viewport; `firstCardDocumentTop` añade el scroll. `initial` mide la llegada; `aligned` desplaza la primera tarjeta bajo el header, con 8 px de margen. El área útil descuenta header y navegación inferior y, cuando corresponde, el aviso de cookies. Los conteos suman todas las columnas; una tarjeta parcial no equivale a un contenido identificable. `meaningfulCards` exige al menos 48 px visibles, sin afirmar comprensión.

En varias columnas, `gapToNext` puede ser negativo: representa la diferencia de coordenadas siguiendo el DOM, no un solapamiento. Para separación entre filas hay que comparar tarjetas de la misma columna. Los bloques de texto pueden contener acciones; no sumar sus alturas sin revisar la estructura.

`source-manifest.json` registra revisión y SHA-256 de las fuentes productivas incorporadas al renderizado. Las capturas y comparaciones se guardan en `preview/screenshots/`; `comparison-390.html` y `comparison-430.html` muestran las cuatro capturas alineadas a tamaño natural.

Los controles de filtros y navegación de A/B/C representan diseño; no conectan con el catálogo. Guardar alterna estado local; “Ver producto” abre una explicación ilustrativa. La implementación futura debe conservar las fichas y flujos actuales, según el documento principal.
