# Myckeo: principal centrada y navegación lateral — 25/11/2026

Propuesta local funcional para revisión visual. No integrada, subida ni desplegada. Continúa el prototipo publicado descrito en el informe anterior `docs/audits/MYCKEO_DESKTOP_FEED_PROTOTYPE.md`, sin reabrir su auditoría funcional.

## Referencias y aislamiento

- Base publicada confirmada al inicio y al cierre: `8ce16bc7779f846c386483a7d145369b51d8e461`; antecedente funcional `569daa154030976cee971bdfb94cd7b652bcd802`.
- Worktree propio: `/home/nico/worktrees/myckeo-centered-feed-20261125`; rama `prototype/centered-feed-navigation-20261125`. El commit de esta propuesta es el que incorpora este informe; no se registra su propio SHA dentro del mismo commit.
- `main`, `origin/main` y la referencia remota leída con `git ls-remote` permanecen en la base. Vercel confirma `red-social`, Production READY, deployment `dpl_WsisrcEjNXhCmA3Bj3FMFpfcJX7K`, SHA base y dominios publicados. [Referencias permitidas, sin credenciales](centered-feed-evidence/references.json).
- Se leyó `/home/nico/red-social/AGENTS.md`, también suministrado por el usuario; no hay instrucciones anidadas aplicables. El worktree publicado está limpio. El original sigue en su rama y HEAD previos: comparación de 2834 archivos y estado Git idénticos al inicio, sin cambios ni añadidos. [Conservación](centered-feed-evidence/original-preservation.json).
- Dependencias propias del worktree, instaladas offline con lockfile congelado. No se copiaron `.env`. pnpm 10.17.1, Next 15.5.9 y Prisma 6.18.0 existentes; sin actualizaciones.

## Decisiones y alcance

El conjunto anterior centraba 680 + 24 + 320 px. Por ello el centro de la principal quedaba 172 px a la izquierda del centro de pantalla. Se reserva ahora un espacio equivalente a la izquierda para navegación, conservando los anchos de lectura y tarjetas.

| Ancho | Principal publicada: centro X | Propuesta: centro X | Ancho principal |
|---|---:|---:|---:|
| 1440 | 548 | 720 | 680 |
| 1920 | 788 | 960 | 680 |
| 1439 | 547,5 | 547,5 | 680 |

La variante se activa exclusivamente en portada → Para ti desde **1440 px**. El contenedor máximo es 1416 px, incluidos 48 px de padding: navegación reservada 320, separación 24 y contenido de 1024 (680 + 24 + 320). La navegación visible ocupa como máximo 260 px; no añade tarjetas grandes. Este umbral deja 12 px exteriores por lado sin comprimir la lectura. A más anchura se amplían solo los márgenes exteriores.

Se mantienen la fila superior fija de 72 px, búsqueda, ciudad, “Tengo un negocio” y accesos. Pestañas y categorías se presentan una sola vez a la izquierda mediante un destino de portal React; usan los mismos componentes, acciones, catálogo de 18 categorías y enlaces. Se muestran seis categorías y un disclosure nativo “Más categorías” para las restantes, con foco visible y enlaces accesibles. La navegación lateral se desplaza con el documento; no tiene scroll vertical propio ni una segunda cabecera fija. Al salir de Para ti, visitar categoría o bajar del umbral, el mismo acceso vuelve a la barra habitual.

Publicaciones y testimonios conservan su variante publicada, relaciones, controles y medios acotados. La principal mantiene 680 px aunque solo exista contenido social o comercial. Los bloques comerciales que el algoritmo previo ya coloca en la principal llevan ahora una identificación breve: “Productos, negocios y servicios”. No se añaden reglas para igualar alturas, ni rellenos inventados. El inventario corto termina naturalmente. Expandir todas las categorías no desplaza la primera tarjeta: se detectó durante la revisión un desplazamiento de unos 156 px por reparto automático de filas CSS, corregido definiendo las filas del contenedor; la prueba exige variación menor de 1 px.

## Continuación y contratos preservados

No cambia ningún archivo de `src/feed`, incluido el coordinador, `desktopDiscovery.ts`, consultas, ranking, cursores, metadatos o caché. Tampoco cambian esquema, dependencias, autenticación, configuración, tarjetas, WhatsApp ni resolución de rutas. La comparación del diff confirma esta delimitación.

El renderer sigue agrupando **ciudad → otras ciudades del departamento → resto del país**, y distribuye dentro de cada tramo antes de comenzar el siguiente. Se reutiliza el plan anterior por identidad para mantener las columnas de las tarjetas existentes cuando llegan más elementos. Cada elemento entregado queda montado una sola vez; este cambio de presentación no escribe IDs vistos ni crea consultas para rellenar zonas. Los wrappers permanecen estables al cambiar de ancho y durante continuación. Se comprobó un diálogo de producto abierto mientras se incorporaba el resto del lote: conserva su estado.

La ausencia de publicaciones no oculta oferta comercial. La ausencia de comercio mantiene la anchura y posición de la principal. No se promete ausencia absoluta de espacio libre con cualquier fotografía o texto: se conserva el reparto estable y por estimaciones existente, sin mover tarjetas para compensar alturas después de cargar imágenes.

## Arranque y revisita: observación acotada

Inspección anónima real de `https://myckeo.com`, Tunja, con storage inicialmente nuevo y conservado después. Se permitieron solo GET/HEAD y las cuatro acciones de lectura del feed, bloqueando WhatsApp, analítica y otras escrituras. No se crearon cuentas ni datos.

| Momento de esta sesión | Contenido recibido por el renderer | IDs vistos |
|---|---|---:|
| Primera tanda, 1,76 s | 10 publicaciones | 10 |
| Tanda estabilizada, 4,80 s | 10 productos, 10 publicaciones, 10 negocios, 3 servicios | 33 |
| Pestaña Publicaciones | 20 publicaciones | 53 |
| Regreso a Para ti | Mismo lote mixto de 33 | 53 |
| Recarga conservando storage | 10 productos, 10 publicaciones, 6 negocios | 79 |

La entrada pública nueva **no reprodujo productos primero**. No se presenta la carga parcial como falta de publicaciones. El límite existente es 10 por tipo en Para ti y 20 en la pestaña específica; los IDs vistos se acumulan según su política actual. [Observación y solicitudes](centered-feed-evidence/public-startup.json), [captura pública](centered-feed-evidence/public-initial-1440.png).

Se caracterizó por separado una llegada controlada: ocho productos primero, después publicaciones y el resto. Tanto el renderer publicado como la propuesta conservan el primer producto; al salir a Publicaciones y volver, el plan se reconstruye y empieza con una publicación. Esto explica una posibilidad respaldada por el código y el experimento, no demuestra la causa de una inspección pública anterior. No se alteraron carga, vistos, límites o ranking para favorecer la captura. [Caracterización comparada](centered-feed-evidence/reviews-and-arrival.json).

## Comparación visual equivalente

El “antes” ejecuta el renderer exacto de `8ce16bc…`, extraído por `git show`; el “después” ejecuta la implementación propuesta. Ambos reciben **el mismo lote y fotografías**, con la misma sesión anónima y ciudad. Son capturas locales de componentes reales con DTO públicos congelados, no dos momentos distintos de producción.

- Inventario mixto inicial: 33 elementos públicos (10 productos, 10 publicaciones, 10 negocios y 3 servicios). Se conserva su orden de entrada. [Muestra inicial](centered-feed-evidence/public-sample.json).
- Oferta escasa: una publicación y un producto del mismo inventario. Comercial: los 23 elementos no publicados como publicación. Social: las 10 publicaciones.
- Reseñas: escenario separado de cinco publicaciones realmente relacionadas con producto, obtenidas en los otros estados observados. No se hacen pasar por parte del lote inicial de 33. Se comprueban nombre, calificación y enlace real del producto. [Fixture comparativo](centered-feed-evidence/comparison-sample.json).
- 46 imágenes/pósteres públicos cacheados, sin sustituir sus asociaciones; manifiesto con URL y SHA-256 en `e2e/centered-feed/photo-manifest.json`. Durante pruebas locales se sirven desde disco y se bloquea la comunicación externa. No se prueba la reproducción completa de vídeo.

**[Abrir comparador portable](centered-feed-evidence/comparison.html)**. Incluye antes/después, inicio/scroll, cinco inventarios a 1440 y 1920, más 1439 y 390 px con inventario mixto: 48 capturas comparativas. Scroll solicitado hasta 950 px, limitado por el final natural de páginas cortas. Abrir el PNG permite verlo al tamaño original.

| Vista | Antes | Propuesta |
|---|---|---|
| 1440, inicio | [PNG](centered-feed-evidence/before-1440-top.png) | [PNG](centered-feed-evidence/after-1440-top.png) |
| 1440, scroll | [PNG](centered-feed-evidence/before-1440-scroll.png) | [PNG](centered-feed-evidence/after-1440-scroll.png) |
| 1920, inicio | [PNG](centered-feed-evidence/before-1920-top.png) | [PNG](centered-feed-evidence/after-1920-top.png) |
| 1920, scroll | [PNG](centered-feed-evidence/before-1920-scroll.png) | [PNG](centered-feed-evidence/after-1920-scroll.png) |
| 390, inicio | [PNG](centered-feed-evidence/before-390-top.png) | [PNG](centered-feed-evidence/after-390-top.png) |
| 390, scroll | [PNG](centered-feed-evidence/before-390-scroll.png) | [PNG](centered-feed-evidence/after-390-scroll.png) |

A 1439 px y en móvil se conservan geometría y acciones. La captura tras scroll a 1439 px es idéntica; otras capturas presentan diferencias de rasterización de imágenes, por lo que no se afirma igualdad binaria general. [Comparación de píxeles](centered-feed-evidence/fallback-pixels.json). [Medidas de referencia](centered-feed-evidence/comparison-metrics.json), [recaptura final de la propuesta](centered-feed-evidence/final-after-metrics.json), [reseñas](centered-feed-evidence/reviews-metrics.json).

## Comprobaciones ejecutadas en esta iteración

| Comprobación actual | Resultado / evidencia |
|---|---|
| Playwright focalizado final | 4/4, [salida final](centered-feed-evidence/browser-final.txt). Inventarios y ancho central; límite 1439↔1440; categorías y pestañas sin duplicación; categorías válidas; diálogo/carrito abierto durante append; relaciones reales de reseñas y caracterización de llegada. |
| Continuación y cambio de ciudad | Coordinador y acciones reales con adaptador Prisma en memoria: 69 identidades únicas en Tunja y 69 en Bogotá; todos los elegibles, final de recorrido, límites verticales entre tramos, primera agrupación correcta tras cambiar ciudad. [IDs y geometría](centered-feed-evidence/continuation-city.json). No es nueva prueba PostgreSQL. |
| Conservación de tarjetas y móvil | Columnas existentes idénticas al añadir elementos, diálogo conservado, fila precio/WhatsApp/carrito y distintivo superpuesto a 390; sin desbordamiento ni errores de página. [Medidas](centered-feed-evidence/boundary-append-mobile.json). |
| Inventarios y navegación | Principal 680, centro exacto del viewport en ambos escritorios, todos los IDs una vez y los 18 destinos accesibles. Abrir categorías no desplaza el contenido. [Medidas](centered-feed-evidence/inventory-navigation.json). |
| Unitarias pertinentes | 12/12, dos suites existentes: `src/feed/desktopDiscovery.test.ts` y `src/feed/geography.test.ts`, `--runInBand --coverage=false`. [Salida](centered-feed-evidence/unit.txt). |
| Tipos | `pnpm typecheck`, correcto tras retirar el harness. [Salida](centered-feed-evidence/typecheck.txt). |
| Lint | `pnpm lint`, correcto con advertencia previa `_body` en `activar/ActivationBootstrap.test.tsx:347`; lint enfocado de componentes y nuevos specs sin advertencias. [Completo](centered-feed-evidence/lint.txt), [enfocado](centered-feed-evidence/lint-focused.txt). |
| Build final | `pnpm build`, correcto: Prisma generate + Next build, compilación, lint/tipos y generación de 74 páginas. Sin ruta temporal de auditoría. [Salida](centered-feed-evidence/build.txt). |

Los primeros ensayos y su fallo de importación JSON del harness se conservan como antecedentes; se corrigió usando import estático. No se suman a las cuatro pruebas finales ni se presentan como fallo de producción. Las capturas finales se repitieron después de corregir las filas CSS del inventario escaso.

Reproducción: [README y herramientas](../../e2e/centered-feed/README.md). El harness genera una ruta protegida de desarrollo y rewrite solo del proceso de pruebas; ambos se retiraron antes de tipos/build. No queda ninguna ruta, inyección ni arte temporal activa en la aplicación final.

## Build aislado y límites

El build utiliza el runner existente con entorno permitido y guard de destino PostgreSQL local `127.0.0.1:55439/myckeo_public_audit`, contenedor propio desechable, sin `.env` remotos. Se prepara el esquema real y se insertan únicamente los fixtures mínimos de build previos (12 negocios y 3 productos). Se bloquea HTTP externo. No se usan seeds generales, migraciones remotas ni artefactos de producción. Build aprobado con PostgreSQL 16.16; los avisos Upstash por servicios externos sin credenciales se mantienen visibles, sin ejecutar Redis en esta comprobación. El servidor y contenedor propios están detenidos y retirados; puertos 3400 y 55439 cerrados. [Limpieza](centered-feed-evidence/cleanup.txt). Preparación y destino quedan en [salida de preparación](centered-feed-evidence/build-prepare.txt) y [fixtures mínimos](centered-feed-evidence/build-seed.txt).

Se reutiliza la evidencia previa de las 26 comprobaciones SQL y del flujo de captación, sin anunciarlas como ejecuciones actuales. No cambian sus consultas ni autenticación. Tampoco se presenta `public smoke` pendiente de validar su entorno, ni el build del proyecto separado de staging, como controles aprobados en esta tarea.

Se mantiene el límite documentado: sin instantánea entre solicitudes; borrar la fila usada como cursor puede exigir comenzar un recorrido nuevo. Contenido persistido de prueba/Lorem, textos escapados o imágenes aparentemente dispares son asuntos de datos separados: se conservaron las relaciones devueltas y no se corrigieron registros por apariencia. No se amplió el alcance a revisión editorial, OAuth, escrituras autenticadas, reproducción completa de vídeos o infraestructura.

## Archivos y estado de entrega

Aplicación: `src/publicaciones/componentes/{FeedRederer.tsx,desktopDiscovery.module.css}`, `src/ui/components/menu-section-bar/{MenuSectionBar.tsx,DiscoveryCategories.tsx,categoryRail.module.css}`, `src/ui/components/topMenu/TopMenu.tsx`, `src/app/(catalogo)/layout.tsx`. Soporte: `e2e/centered-feed/`, este informe y `centered-feed-evidence/`. No se modifica el informe histórico para hacer pasar la propuesta por publicada.

El ZIP de revisión se genera fuera del árbol versionado, con este informe, comparador, PNG y enlaces relativos. Puede abrirse sin servidor ni conexión. La ubicación y el SHA del commit local se entregan en la respuesta; el ZIP no se incorpora al repositorio.

La propuesta permanece **local y lista para revisión visual**, sin integración en main, push ni despliegue. La decisión pendiente es aprobar o ajustar esta composición; las comprobaciones de esta tarea no autorizan una publicación.
