# Myckeo V2 — Release readiness

**MYCKEO_MOBILE_PREMIUM_V2_RELEASE_CANDIDATE_READY**

**GO técnico para integración posterior.** No se hace merge, push ni despliegue. La validación física Safari iOS/Chrome Android sigue pendiente y no se presenta como superada.

Worktree: `/home/nico/worktrees/myckeo-mobile-premium-v2-20261126`. Rama: `prototype/mobile-premium-v2-brand-20261126`. Base aprobada: `547c5dd96c1de91729fb406338c1d003f40847bf`. Producción de referencia: `89f2741578ec666fbcdcabb1e1d23126b5609f31`. El SHA final se entrega y se registra en `revision.json` del paquete.

[Comparador corregido y fallback](mobile-premium-v2-release-evidence/index.html) · [Foto final, 390](mobile-premium-v2-release-evidence/candidate-review-390.png) · [Fallback final, 390](mobile-premium-v2-release-evidence/fallback-404-390.png) · [Lista física ejecutable](MYCKEO_MOBILE_PREMIUM_V2_DEVICE_CHECKLIST.md).

ZIP: `/home/nico/worktrees/myckeo-mobile-premium-v2-release-candidate-20261126.zip`. Extraer y abrir `index.html`. Es evidencia portable de esta corrección, no un despliegue ni un build instalable. Las entregas V1/V2 anteriores se conservan como archivo histórico.

## Causa demostrada de la reseña rota

La anomalía del comparador era **un bloqueo deliberado del harness por caché incompleta**. No se encontró una regresión de aplicación que impidiera mostrar la foto válida.

Elemento: `publication-cmga1qf3t000143or68yyssiz`; producto: `/producto/empanadas-boyacenses-9qzg`. Los tres commits —publicada, V1 y V2— contienen exactamente el mismo snapshot y registro de reseña, incluidos los dos medios y la relación de producto. [Datos y hashes](mobile-premium-v2-release-evidence/fixture-comparison.json).

Fuente original del primer medio:

```text
https://res.cloudinary.com/dkfsejtx9/image/upload/v1759447677/red-social/xfb8zlanoqlishcrfyfx.png
```

| Estado comprobado | Resultado |
|---|---|
| Original en CDN | HTTP 200, PNG, 1456 × 816. |
| `img.src`, publicada/V1/V2 | Variante `f_auto,q_auto:eco,c_fill,g_auto,w_720,h_540`; responde 200 y está en la caché antigua de fotografías. |
| `img.currentSrc`, móvil V1/V2 | El `<source media="(max-width:768px)">` selecciona `f_auto,q_auto:eco,c_limit,w_720,h_540`. Esa URL estaba fuera de la caché adicional. |
| Comparador anterior | Interceptor aborta la URL externa no cacheada: `net::ERR_FAILED`, sin respuesta HTTP. `complete=true`, pero `naturalWidth=0`, `naturalHeight=0`. No era un 404 del origen. |
| Misma aplicación V2 aprobada + bytes válidos | `complete=true`, `naturalWidth=720`, `naturalHeight=404`; la foto se muestra. |
| CDN real desde Chromium, sin fixture de imagen | HTTP 200, JPEG, `src=currentSrc` de la variante móvil, 720 × 404 y decodificación correcta. No es prueba de dispositivo físico. |

[HTTP directo de las tres URLs](mobile-premium-v2-release-evidence/origin-http.json) · [src/currentSrc y fallos de navegador antes de corregir](mobile-premium-v2-release-evidence/diagnosis.json) · [navegador contra CDN real](mobile-premium-v2-release-evidence/real-origin-browser.json).

El recolector recorría `snapshot.items` y omitía `snapshot.reviews`. Por eso estaba disponible el recorte publicado y faltaba la entrega móvil completa. También faltaba cobertura de medios de detalle de esas reseñas. Se amplía solo el recolector de pruebas: caché de 30 → 39 entradas, conservando los 30 registros y sus bytes anteriores. Las nueve entradas añadidas pertenecen a las mismas reseñas y activos públicos; no se cambia ningún dato de aplicación ni preset. [Corrección y hashes](mobile-premium-v2-release-evidence/cache-correction.json).

La recaptura ahora exige decodificación y dimensiones naturales positivas; `complete=true` o ausencia de `pageerror` no bastan para aprobar una imagen. Las referencias de publicada y V1 se ejecutaron en worktrees temporales con sus fuentes originales de aplicación y la misma caché corregida. [Referencias](mobile-premium-v2-release-evidence/reference-worktrees.json).

## Fallback mínimo: carencia histórica independiente

Una segunda prueba, inyectando HTTP 404, mostró que el componente tampoco tenía un fallback de transporte. El código publicado ya carecía de ese manejador para fotografías; no se atribuye esa carencia a V2 ni se confunde con el bloqueo del comparador.

Se añade únicamente a `DiscoveryPublicationCard.tsx`: estado de fallo vinculado a la URL del medio, manejador `onError` de la fotografía y marcador neutral accesible «Imagen no disponible». Se retira el `<picture>` fallido y se conserva su marco, texto, valoración, vínculo y apertura de publicación. No se elige otra foto, no se alteran presets y no se introducen peticiones de reintento ni botones nuevos. El cambio de medio rearma el estado. Los pósteres de video conservan su tratamiento anterior.

La rama sana conserva las proporciones y clases aprobadas. Todos los estilos, cabecera, navegación, productos, acciones comerciales, consultas, ranking, cursores, caché de aplicación, auth, esquema y dependencias permanecen intactos. La caché ampliada pertenece exclusivamente al harness. [951 archivos de aplicación/configuración sin cambios](mobile-premium-v2-release-evidence/scope.json).

## Verificación focalizada

| Comprobación | Evidencia y resultado |
|---|---|
| Reseña válida | Foto, autor y vínculo correctos a 320/390/430/1440; `naturalWidth>0`, `complete=true`, sin overflow o errores de página. [Candidata](mobile-premium-v2-release-evidence/candidate-review.json), [V1](mobile-premium-v2-release-evidence/v1-review.json), [publicada](mobile-premium-v2-release-evidence/published-review.json). |
| Fallo real controlado | HTTP 404 a 320/390/430, aborto e imagen con bytes inválidos a 390. Cinco casos aprobados: marcador visible, ningún `<img>` roto restante, una petición del recurso por caso, sin bucles, altura anterior/posterior idéntica, relación y diálogo accesibles. [Resultados](mobile-premium-v2-release-evidence/fallback.json) · [salida](mobile-premium-v2-release-evidence/fallback.txt). |
| Comida, calzado y moda | Fotos decodificadas a 320/390/430; precio/WhatsApp/carrito en su fila, controles de 44 px y distintivo de seguimiento conservados. Cabecera 64 px sin franja y seis destinos inferiores. [Regresión](mobile-premium-v2-release-evidence/regression.json). |
| Horizontal y póster vertical | Fuentes válidas y dimensiones positivas en esos tres anchos; se conservan marcos adaptativos y ausencia de overflow. [Misma regresión](mobile-premium-v2-release-evidence/regression.txt). |
| Escritorio | Principal de 680 px centrada. Comparación fresca publicada/candidata: 769 y 1440, inicio/scroll, **0 píxeles diferentes**. [Comparación](mobile-premium-v2-release-evidence/desktop-fresh-comparison.json). |
| Caché reproducible | Segunda ejecución con HTTP externo bloqueado: 39 activos reutilizados, sin necesitar red. [Salida](mobile-premium-v2-release-evidence/cache-offline.txt). |
| Tipos, lint y unitarias | Aprobados. 12/12 unitarias de reparto/geografía. Lint solo conserva `_body` heredada en ActivationBootstrap.test.tsx:347; sin reglas desactivadas. [Tipos](mobile-premium-v2-release-evidence/typecheck.txt) · [lint](mobile-premium-v2-release-evidence/lint.txt) · [enfocado](mobile-premium-v2-release-evidence/lint-focused.txt) · [unitarias](mobile-premium-v2-release-evidence/unit.txt). |
| Build | Aprobado con PostgreSQL propio desechable y runner seguro, HTTP externo bloqueado, 74 páginas y sin ruta de fixtures. No hay migraciones o datos remotos. [Build](mobile-premium-v2-release-evidence/build.txt) · [preparación](mobile-premium-v2-release-evidence/build-prepare.txt) · [fixtures mínimos](mobile-premium-v2-release-evidence/build-seed.txt). |
| Artefacto portable | Cuatro tríos corregidos y cinco capturas de fallos; imágenes/enlaces relativos comprobados sin red y ZIP extraído fuera del proyecto. [Resultado](mobile-premium-v2-release-evidence/portable-check.json). |

El primer ensayo contra un PNG archivado registró 1388 píxeles distintos. Se conserva la [salida inicial](mobile-premium-v2-release-evidence/regression-archived-pixel-baseline.txt). Se recapturó la referencia publicada para comparar ambas versiones en el mismo entorno y se reejecutó la regresión: los cuatro PNG completos coinciden. La [comparación final con el archivo aprobado](mobile-premium-v2-release-evidence/archival-pixel-difference.json) también da cero diferencias. No se enmascaran regiones ni se atribuye una causa de rasterización concreta sin evidencia.

Se reutilizan los recorridos V2 aprobados de sesiones, Perfil/Crear, ciudades, continuación, teclado/safe-area emulados y los contratos geográficos/relacionales previos. Se reejecuta la regresión de las superficies afectadas y las unitarias pertinentes; no se repite la matriz PostgreSQL de 26 casos. El adaptador en memoria y las sesiones de navegador no certifican autenticación ni checkout reales.

## Dispositivos y decisión

**No hay prueba física superada.** No hay acceso a un dispositivo físico conectado ni herramientas ADB/Xcode/idevice en este entorno. [Acceso disponible](mobile-premium-v2-release-evidence/device-access.json). Queda pendiente ejecutar la [lista breve Safari iOS y Chrome Android](MYCKEO_MOBILE_PREMIUM_V2_DEVICE_CHECKLIST.md): portada, búsqueda/teclado, ciudad, categorías, variantes, barra/safe-area, reproducción H.264 y controles no tapados. Se indican acceso local, pasos y datos que debe registrar el operador.

**GO para preparar la integración posterior**: anomalía demostrada y corregida, fallback acotado verificado, V2 sana y escritorio conservados. Este GO no equivale a publicación aprobada ni a validación física; IME, barras dinámicas, safe-area y H.264 deben cerrarse con dispositivos reales antes de decidir publicación.

Se mantienen documentados los pendientes históricos: Public smoke fallido en validación de entorno, staging separado sin certificar, asuntos editoriales/404, contenido de prueba persistido y límites de cursor eliminado/snapshot concurrente. No se anuncian como resueltos.

Original y otros worktrees preservados; main/origin/main siguen en 89f2741. Servidores, rutas/cachés temporales, referencia y contenedor propios retirados. [Preservación](mobile-premium-v2-release-evidence/preservation.json) · [referencias](mobile-premium-v2-release-evidence/references.json) · [limpieza](mobile-premium-v2-release-evidence/cleanup.json). No se hace push, merge ni despliegue.
