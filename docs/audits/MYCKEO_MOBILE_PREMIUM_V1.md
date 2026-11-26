# Myckeo — Mobile Experience Premium V1

**Prototipo local para revisión; no integrado, enviado ni desplegado.** Fecha de trabajo: 25 de noviembre de 2026, America/Bogota.

- Worktree: `/home/nico/worktrees/myckeo-mobile-premium-v1-20261125`.
- Rama: `prototype/mobile-premium-v1-20261125`.
- Base publicada y main/origin/main comprobadas: `89f2741578ec666fbcdcabb1e1d23126b5609f31`.
- [Comparador portable antes/después](mobile-premium-v1-evidence/index.html), 42 pares y enlaces relativos. El commit local exacto se entrega junto al ZIP y queda en `revision.json` dentro del paquete.
- ZIP de revisión: `/home/nico/worktrees/myckeo-mobile-premium-v1-review-20261125.zip`. Extraer y abrir `index.html`.

## Diagnóstico enfocado

Se inspeccionaron TopMenuMobile, BusinessEntryLink, publicNavigation.module.css, MenuSectionBar/DiscoveryCategories, FeedRederer, DiscoveryPublicationCard/BusinessCard, ProductCard, feedProductCard.module.css y sus estilos directos. La navegación inferior real vivía en TopMenuMobile; Perfil utiliza SideBar/MUI Drawer, Crear utiliza CrearModal/MUI Dialog, búsqueda utiliza SearchBar/MUI Dialog y los diálogos de publicaciones, seguimiento y pedido rápido eran personalizados.

No se atribuye una regresión a una imagen a medio cargar. Se contrastaron fuente publicada, medidas tras hidratación, inventario recibido y acciones reales de los componentes. [Entrada pública anónima](mobile-premium-v1-evidence/public-baseline-390.png) · [medidas y lecturas públicas](mobile-premium-v1-evidence/public-baseline.json) · [referencias](mobile-premium-v1-evidence/references.json).

| Prioridad y clase | Evidencia confirmada en la base | Decisión del prototipo |
|---|---|---|
| P1, aprovechamiento visual | Cabecera fija de 105 px a 390: logo/búsqueda/ciudad y segunda fila comercial fija. Barra inferior de 69 px. | Primera fila fija de 64 px; acceso comercial de 48 px en el flujo inicial. Se recuperan 41 px durante el scroll, manteniendo el acceso comercial persistente en la barra inferior. |
| P1, claridad de navegación | Anónimos: cinco destinos; personales/propietarios: seis. Perfil y Ayuda cambian de posición. Iconos de estilos distintos y sin `aria-current`. | Seis posiciones estables, iconos Lucide uniformes, etiquetas y activo visible. Una posición contextual cambia su función según sesión; las otras cinco conservan posición. |
| P1, funcional/accesibilidad | Cierre de ubicación sin nombre, 24 px; cierre de publicación, 20 px. Diálogos personalizados sin contención/restauración de foco. El efecto de cada ProductCard cerrada podía escribir `body.overflow=unset` al añadir contenido. | Cierres de 44 px, ubicación con MUI Dialog, foco/Escape/restauración en diálogos personalizados. Solo el diálogo abierto administra el bloqueo del documento; añadir tarjetas conserva el pedido abierto. |
| P1, funcional de presentación | La barra fija no reservaba su altura al final del documento ni contemplaba safe-area. | Reserva inferior de 64 px + inset + 8 px; footer y último control alcanzables. Insets superiores/inferiores y visualViewport para overlays. |
| P2, fotografía/jerarquía | El preset recibido ya recorta a cuadrado (`c_fill`); `contain` solo no recuperaría los bordes perdidos. Algunos formatos cuadrados además se ampliaban con `scale(1.4)`. | Fuente móvil del mismo activo con `c_limit`, sin cambiar presets compartidos. Imagen completa, sin ampliación, marco acotado y tipografía compacta. Fuente de escritorio intacta. |
| P2, claridad social | Publicaciones altas, texto truncado y cifras sociales sin etiquetas. Comprender todo el texto requería abrir el diálogo. | Identidad, medio acotado, texto ampliable en la tarjeta, etiquetas de las cifras reales y acceso existente al diálogo. No se inventan interacciones. |
| P2, estados | El final móvil podía ilustrarse aunque las fuentes aún no estuvieran resueltas. Vacío y error compartían una presentación ambigua. | La señal existente `isFeedSettled` distingue final y vacío resueltos. Con contenido, final compacto; sin contenido y sin resolución, aviso neutral, conservando el toast de error existente del coordinador. |
| P3, preferencia visual | Bordes, fondos y acentos poco uniformes entre módulos. | Grises legibles, tarjetas contenidas, acento rosa de marca y foco visible. Es una decisión de diseño, no un defecto funcional de producción. |

El primer render publicado elegía escritorio antes del efecto móvil. El prototipo reserva desde CSS la geometría móvil y oculta esa cabecera de escritorio mientras hidrata, sin montar árboles de navegación duplicados. Las trazas iniciales y finales están en [antes](mobile-premium-v1-evidence/before-metrics.json) y [después](mobile-premium-v1-evidence/after-metrics.json). No se promete navegación interactiva antes de cargar JavaScript ni ausencia universal de CLS ajeno a estos componentes.

## Propuesta elegida

La primera fila conserva logo, búsqueda y ciudad con objetivos de al menos 44 px. La ciudad mantiene su nombre completo en el nombre accesible/title aunque se acorte visualmente. «Tengo un negocio» aparece al entrar en una franja del documento y permanece localizable en la barra inferior. Conserva el enlace `/config/completePerfil?negocio=1` y su resolución existente de registro/gestión. El propietario conserva Mi negocio durante el scroll y gana un acceso complementario a Crear en la franja inicial. Perfil mantiene Dashboard y el enlace al perfil del negocio existentes.

Las categorías conservan los 18 destinos activos, iconos y rutas. Cerradas ocupan una tira horizontal; abiertas forman dos columnas en el documento. Se puede llegar al último enlace con teclado sin quedar bajo la cabecera o barra. Inicio ya existe en la barra inferior y no se repite como una categoría adicional.

No se adopta automáticamente Inicio/Explorar/Carro/Favoritos/Perfil: Explorar duplicaría el descubrimiento existente y desplazaría Ayuda o la acción contextual a un paso adicional. La propuesta conserva estas posiciones:

| Posición | Anónimo | Personal / incompleto no placeholder | Propietario |
|---|---|---|---|
| 1 | Inicio `/` | Igual | Igual |
| 2 | Carro `/empty` o `/carro` según contenido | Igual | Igual |
| 3 | Favoritos `/favoritos` | Igual | Igual |
| 4 | Negocio → acceso comercial existente | Crear → diálogo existente | Negocio → `/dashboard` |
| 5 | Perfil → SideBar existente | Igual, con opciones de sesión | Igual, con Dashboard y perfil del negocio existentes |
| 6 | Ayuda → WhatsApp existente | Igual | Igual |

Carro y Favoritos muestran sus cantidades; durante la resolución de sesión se reserva el mismo espacio y se deshabilitan las opciones pendientes. No se modifica autenticación. El placeholder mantiene el guard existente hacia editar perfil. En la base, el propietario tenía Mi negocio en la barra y el usuario personal tenía Crear. Ambos conservan ese acceso directo durante el scroll; el Crear añadido a la franja inicial del propietario es complementario. Se mantiene ayuda directa sin enviar mensajes en las pruebas.

Los productos conservan la fila precio/WhatsApp/carrito y controles de 44 × 44, favoritos, distintivo de seguimiento y acciones independientes. Se conservan las dos columnas cuando caben: 390/430 y anchos superiores; 320/360 mantienen el umbral existente de una columna para no comprimir las acciones. El nombre admite dos líneas y el importe gana jerarquía sin hacer tarjetas altas. El nombre largo de negocio sigue abreviado visualmente cuando hace falta; el enlace conserva el nombre accesible completo.

Las publicaciones usan un medio de altura limitada, imagen completa, autor identificable y texto ampliable localmente. Los likes/comentarios mostrados proceden del DTO y siguen siendo indicadores de lectura, sin botones ficticios. El video conserva póster, fuente original y controles nativos en su diálogo. Las reseñas conservan el producto/negocio y sus enlaces reales; el caso de cinco reseñas vinculadas procede del inventario previo, no de asociaciones inventadas para esta propuesta.

El final compacto exige contenido existente, continuación agotada, ausencia de carga y fuentes resueltas. Sentinel, hasMore, políticas y solicitudes de datos no cambian. La carga mantiene sus skeletons/indicadores, el vacío resuelto conserva su mensaje y el estado no resuelto evita declarar que el inventario se agotó. El motivo y Reintentar del error siguen a cargo del toast existente: el renderer no inventa un diagnóstico a partir de una señal de resolución.

## Comparación y verificación

Ambas versiones se ejecutaron con fuentes reales separadas: referencia en el commit publicado y propuesta en el worktree nuevo. La referencia no tiene cambios de aplicación. Se reutiliza el inventario público congelado: 33 elementos (10 productos, 10 publicaciones, 10 negocios y 3 servicios), más cinco reseñas relacionadas para su caso específico. Sus activos originales se conservan; 46 fotos/pósteres previos y 30 entregas públicas adicionales para imágenes completas y medios del diálogo. Las URLs y hashes están en los manifiestos de `e2e/centered-feed` y `e2e/mobile-premium-v1`.

La entrada pública real con Tunja recibió los mismos 33 elementos y realizó las cuatro lecturas existentes. Comenzó con productos y tenía publicaciones elegibles más abajo. No se forzó una publicación inicial ni se cambió la política de vistos. Es una comprobación acotada de entrada, no una auditoría general ni una certificación de todas las posibles sesiones públicas.

| Verificación nueva | Resultado / evidencia |
|---|---|
| 320, 360, 390, 430, 768, 769, 1440: inicio y scroll | Mismos IDs entre cada par, sin duplicados ni overflow. [Equivalencia](mobile-premium-v1-evidence/inventory-equivalence.json). |
| Cabecera/barra, categorías y footer | 64 px fijos, seis objetivos ≥44 px, 18 categorías accesibles y footer por encima de la barra. Escritorio a 1440 conserva principal 680 px centrada y navegación sticky a 88 px. [Medidas](mobile-premium-v1-evidence/shell-categories.json). |
| Pedido, continuación y acciones | Pedido de variantes abierto al pasar de 10 a 33 tarjetas; selección y bloqueo conservados. Precio/WhatsApp/carrito en una fila, seguimiento sobre avatar, favorito independiente y carrito con cantidad 2. [Resultados](mobile-premium-v1-evidence/commerce-actions.json). |
| Sesiones | Anónimo, personal, propietario e incompleto: seis posiciones iguales, ayuda, Perfil, siete rutas de Crear y gestión existentes. Placeholder solicita editar perfil. [Resultados](mobile-premium-v1-evidence/sessions.json). |
| Búsqueda, ubicación y diálogos | Búsqueda con un resultado controlado, selector real, cierre de 44 px, Escape, Tab/Shift+Tab y devolución de foco. Insets simulados 24/20 y viewport visual 470 px; búsqueda y confirmación de carrito accesibles. [Resultados](mobile-premium-v1-evidence/keyboard-dialogs.json). |
| Pestañas y fotografía | Productos/Negocios/Publicaciones/Servicios → Para ti conserva los 33 IDs. Fotos públicas cuadradas y horizontales con `contain`, sin transformación; prueba explícita de geometría vertical con la ilustración existente, identificada como sintética. [Resultados](mobile-premium-v1-evidence/tabs-photographs.json). |
| Coordinador existente | 69 IDs únicos en Tunja, 69 en Bogotá; ciudad → departamento → país. Vacío, carga, fuentes pendientes, error y final diferenciados. Adaptador Prisma en memoria, sin nueva certificación SQL. [Resultados](mobile-premium-v1-evidence/continuation-states.json) · [Estados visuales](mobile-premium-v1-evidence/after-states.json). |
| Regresión visual 769/1440 | Cero píxeles diferentes en los cuatro PNG comparados (inicio y scroll de ambos anchos), tras esperar decodificación de imágenes. Resultados en [comparación de píxeles](mobile-premium-v1-evidence/desktop-pixel-comparison.json); el diseño y las fuentes de escritorio se conservan. |
| Unitarias | 12/12 de reparto y geografía. [Salida](mobile-premium-v1-evidence/unit.txt). |
| Typecheck y lint | Aprobados. [Tipos](mobile-premium-v1-evidence/typecheck.txt) · [lint](mobile-premium-v1-evidence/lint.txt) · [enfocado](mobile-premium-v1-evidence/lint-focused.txt). Advertencia heredada `_body` en ActivationBootstrap.test.tsx:347, sin reglas desactivadas. |
| Build aislado | Resultado final en [build](mobile-premium-v1-evidence/build.txt), con base local desechable, fixtures mínimos y HTTP externo bloqueado. |

Son seis historias funcionales distintas aprobadas en ejecuciones separadas: [cinco recorridos](mobile-premium-v1-evidence/browser-second.txt), [comercio con viewport de teclado](mobile-premium-v1-evidence/browser-commerce-tabs.txt) y [pestañas/fotografías final](mobile-premium-v1-evidence/browser-tabs-final.txt). No se presentan como una única ejecución de seis pruebas. El segundo archivo conserva un intento de la prueba de pestañas con nombre accesible incompleto; se corrigió su selector y se aprobó por separado. La última comprobación de etiquetas accesibles del selector se revalida en los [dos recorridos de ciudad/diálogos](mobile-premium-v1-evidence/browser-city-final.txt).

El [primer ensayo](mobile-premium-v1-evidence/browser-first.txt) detectó dos defectos reales del prototipo: menú de Select detrás del diálogo de ciudad y desbloqueo del body al montar tarjetas cerradas. Ambos corregidos. También hubo timeout de hidratación del harness, aserción de destino autenticado incompatible con una sesión simulada sin cookie firmada y medida tomada durante la animación de apertura; se corrigieron las esperas/aserciones sin alterar políticas para obtener una captura. La limpieza nueva del harness retira también sus declaraciones de tipos: el helper heredado no las conocía y el primer control tras cerrar el servidor quedó apuntando a la ruta temporal borrada. Se conserva ese [fallo de tipos](mobile-premium-v1-evidence/typecheck-stale-harness.txt) y [build](mobile-premium-v1-evidence/build-stale-harness.txt); se corrigió la limpieza propia, sin cambiar tsconfig ni reglas, y se repitieron los controles. La captura inicial a 320 registró un error de parseo en el arranque frío del harness de desarrollo; se separó su caché de la heredada y se esperó la compilación antes de abrir el navegador. El mismo inventario se recapturó sin recarga ni errores. El fallo inicial se conserva en [métricas iniciales](mobile-premium-v1-evidence/after-metrics-initial.json), y la comprobación final del mismo inventario queda en [salida](mobile-premium-v1-evidence/capture-320-final.txt).

## Capturas y portabilidad

El [comparador](mobile-premium-v1-evidence/index.html) reúne inicio/scroll de los siete anchos, inventario comercial/social/escaso, publicaciones con medios, reseñas y tres sesiones adicionales; categorías, búsqueda, ciudad, variantes, publicación, video y menú de propietario; vacío/carga/pendiente/error/final. En categorías se distingue la tira horizontal anterior del listado desplegado nuevo.

[Inicio 390 antes](mobile-premium-v1-evidence/before-390-top.png) · [después](mobile-premium-v1-evidence/after-390-top.png) · [scroll 390](mobile-premium-v1-evidence/after-390-scroll.png) · [categorías](mobile-premium-v1-evidence/after-categories-390.png) · [final compacto](mobile-premium-v1-evidence/after-state-settled-390.png) · [teclado/búsqueda simulado](mobile-premium-v1-evidence/after-keyboard-search-390.png) · [teclado/carrito simulado](mobile-premium-v1-evidence/after-keyboard-cart-390.png).

El ZIP contiene todos los PNG, el HTML, el informe y registros de evidencia; no requiere servidor, CDN ni rutas de este equipo para comparar. Se verifica su extracción, referencias relativas y carga de los 42 pares sin red. El ZIP es un paquete de revisión visual, no un build de aplicación. El código funcional y herramientas de reproducción están en el worktree y commit local.

## Aislamiento, evidencia reutilizada y límites

Se leyeron las instrucciones aplicables y se conservan el original y los worktrees previos: [hashes/HEAD/estado Git](mobile-premium-v1-evidence/preservation.json). Se comprobaron 270 archivos protegidos sin cambios: backend, APIs, auth, librerías, stores, contratos de feed/coordinador, esquema, dependencias, configuración y workflows. [Delimitación](mobile-premium-v1-evidence/scope.json). Las modificaciones visuales están acotadas a los componentes señalados, sus overlays y estilos relacionados; no hay rediseño de escritorio.

El build aprobado genera 74 páginas, sin ruta temporal de revisión. Reutiliza la configuración de la aplicación y avisa de Upstash ausente en este entorno deliberadamente sin credenciales; no impide compilar. Usa PostgreSQL propio en tmpfs y fixtures mínimos anteriores (12 negocios, 3 productos). El primer intento de Docker Desktop no pudo publicar el puerto 55439 por una restricción del host; se conserva [fallo inicial](mobile-premium-v1-evidence/build-database-first.txt). Se utilizó el puerto local 25439 con reenvío exclusivo de 127.0.0.1:55439, manteniendo la validación del runner contra la base desechable. [Preparación](mobile-premium-v1-evidence/build-prepare.txt) · [fixtures mínimos](mobile-premium-v1-evidence/build-seed.txt). No se copiaron secretos ni se ejecutaron migraciones/operaciones en producción. Los servidores de prueba, ruta/arte temporales, cachés generadas y contenedor propios quedaron retirados. [Limpieza](mobile-premium-v1-evidence/cleanup.json).

Se reutilizan el inventario/fotos, pruebas de relaciones comerciales y la matriz previa de 26 casos PostgreSQL documentados en `MYCKEO_CENTERED_FEED_PROTOTYPE.md`, `MYCKEO_DESKTOP_FEED_PROTOTYPE.md` y `MYCKEO_CENTERED_DESKTOP_FEED_FINAL.md`. No se suman como pruebas nuevas ni se repite la matriz SQL por esta presentación.

Límites explícitos:

- El teclado IME, navegador con barras dinámicas y safe-area se simulan mediante viewport/insets; queda revisión en Safari iOS y Chrome Android reales. No es una certificación completa de accesibilidad o rendimiento en dispositivos.
- El navegador instalado no ofrece H.264: `canPlayType` del códec devuelve vacío. Se conservan los MP4 originales y controles; no se certifica reproducción. El mismo límite aparece antes y después. [Capacidad](mobile-premium-v1-evidence/video-capability.json) · [antes](mobile-premium-v1-evidence/before-flows.json) · [después](mobile-premium-v1-evidence/after-flows.json).
- Las fotos públicas de producto congeladas tienen formatos cuadrados/horizontales. La orientación vertical se comprueba como geometría controlada, no como una nueva fotografía pública de un producto ni como sustitución del inventario.
- Sesiones, búsqueda y estados excepcionales son fixtures de presentación. El coordinador y Server Actions de lectura se ejercitan con adaptador en memoria; autenticación real, seguimiento autenticado, escritura de preferencias remota, compras y envío de WhatsApp no se ejecutan.
- La base publicada se ejecuta localmente con optimización de imágenes desactivada solo en el servidor de revisión y activos cacheados para ambos lados. Producción sigue en 89f2741; no contiene este prototipo. No se certifican tiempos de CDN, carga de red móvil ni todo el sitio.
- Se mantienen los pendientes históricos: Public smoke fallido en validación de entorno, staging separado sin certificar, asuntos editoriales/404 y contenido de prueba persistido. Persiste el límite del cursor eliminado y la falta de una instantánea general ante cambios concurrentes. Esta tarea no los modifica ni los presenta como resueltos.

Se aplicó la revisión React de hooks, efectos/limpieza, accesibilidad, tipos y coste de render. Se reutiliza MUI y las dependencias presentes, sin migración de librerías ni duplicación de controles. Las reglas visuales nuevas quedan hasta 768 px; los cambios compartidos de diálogos añaden semántica/foco y eliminan escrituras de overflow de tarjetas cerradas, conservando la presentación aprobada de escritorio.

**Recomendación:** merece pasar a revisión de producto y prueba en dispositivos reales antes de integrar. La propuesta reduce ocupación fija, hace estable la navegación y conserva las acciones comerciales. No se autoriza ni realiza publicación desde este prototipo.

Reproducción segura: `e2e/mobile-premium-v1/README.md`. Resultado de la tarea: **MYCKEO_MOBILE_PREMIUM_V1_READY_FOR_REVIEW**.
