# Prototipo de jerarquía del feed de escritorio — 25/11/2026

**Estado actual: integrado y publicado; comprobación pública aprobada.** La versión funcional `569daa154030976cee971bdfb94cd7b652bcd802` está verificada en Production. Este cierre documental conserva exactamente el mismo código de aplicación. El anexo final distingue esta publicación de las evidencias históricas del prototipo.

Antecedente del prototipo revisado: propuesta local revisable; en aquella fase **sin integración en main, push ni despliegue**. Worktree `/home/nico/worktrees/myckeo-desktop-feed-20261125`, rama `prototype/desktop-feed-20261125`, base `058d13329ba6a81414e140a33d08cb50475d009b`.

Se comprobaron main local, referencia remota mediante `git ls-remote` y el deployment que sirve `myckeo.com`: `dpl_13YyTGgU4sSFjv7mgCEEhBF5XpXv`, proyecto red-social, READY, SHA 058d133 completo, ambos dominios asociados. Se leyó AGENTS.md del original; no hay instrucciones anidadas aplicables. El árbol original sucio permanece separado y no se cambió de rama en él.

## Diagnóstico focal

| Capa | Decisión actual y efecto | Propuesta |
|---|---|---|
| Composición | `FeedRederer`: arranque de productos; cadencia 2/2/3 y módulos de soporte. Un módulo aislado usa `max-w-5xl`/`6xl`, su tarjeta puede quedar limitada a `max-w-3xl`; módulos consecutivos pasan a CSS columns. Alternan bordes, número de columnas y puntos de inicio. | Principal estable y lateral dentro de cada tramo. La cadencia anterior sigue siendo la de móvil/categorías/otras pestañas. |
| Tarjetas | PublicationCard elige aspect-ratio según orientación. Una publicación que recibe gran anchura puede consumir gran altura. ProductCard ya ofrece nombre/precio/acciones; no necesita otra lógica comercial. | Variante explícita de publicación: medio máximo 320 px, `object-fit:contain`, resumen de tres líneas; modal completo existente. Variante compacta de producto: medio máximo 170 px, mismas acciones/callbacks. |
| Módulos | DiscoveryPulseModule combina rejillas de 1/2 tarjetas y rótulos, sin una principal persistente. | No se modifica este componente: permanece en los recorridos existentes y se omite en esta variante de escritorio. |
| Coordinación | FeedComponent coordina cuatro continuaciones, retiene tramos externos y marca los elementos expuestos al renderer. | **Sin cambios** en coordinador, consultas, ranking, protocolo fg2, claves feed-v2 ni reglas de visibilidad. |
| Cabecera | Fila de marca/búsqueda/ciudad/navegación, fila propia de Tengo un negocio y categorías verticales: 215 px sticky. | Tengo un negocio en la misma fila de controles, categorías horizontales compactas: **133 px**. En este prototipo la cabecera completa fluye con la página; ninguna parte queda fija. Libera lectura al desplazarse sin añadir otro scroll. Búsqueda, ciudad y navegación siguen disponibles arriba; hacer fija solo la fila esencial queda como decisión de revisión, no otra implementación oculta. |

## Variante y alcance

Solo portada + Para ti + viewport **≥1280 px**. A 1279 px y menos sigue la composición publicada. El breakpoint deja espacio holgado para 680 + 320 + 24 px, más 48 px de padding; ancho exterior máximo 1072 px centrado, idéntico a 1440/1920. Espacios de 20 px en la principal y 16 px entre comerciales. Las categorías de navegación siguen teniendo desplazamiento horizontal intencional; no es otro scroll vertical de contenido.

El opt-in del renderer controla también la compactación del header (`body:has([data-desktop-discovery])`). Al salir de Para ti o de la portada se restablece su cabecera anterior. No se crean dos copias de tarjetas para esconder una por CSS.

## Reparto, continuidad y geografía

1. Se toma exactamente el conjunto que ya entrega el coordinador; se agrupa con `groupFeedByLocation`.
2. Cada tramo renderiza una sección completa de dos zonas, antes del siguiente: **ciudad → otras ciudades del departamento → resto del país**. Encabezados derivados de los metadatos reales; no se afirma que falte oferta local.
3. Publicaciones en la principal, manteniendo su orden relativo. El resto conserva su secuencia de entrada al distribuirse entre lateral y parejas comerciales de la principal. No se vuelve a puntuar ni consultar. Los medios acotados permiten estimar altura (producto 400, negocio 360, servicio 250; publicación 530/reseña o texto 260) para llenar la zona más corta y terminar una pareja abierta.
4. Cuando hay más oferta comercial que publicaciones, continúa en parejas de la principal y en la lateral. Sin comerciales, la principal se centra; un único comercial nunca deja vacía la principal. No se descarta ni deduplica por negocio: varios artículos del mismo negocio siguen accesibles.
5. Cada identidad `tipo-ID` aparece una vez. Todas las tarjetas distribuidas se montan; no hay carrusel oculto, virtualización ni contenido reservado fuera del DOM. No se añaden marcados de visto. Se mantiene la política anterior de marcar el conjunto presentado, **no se promete medición de impresión en viewport**.
6. Sentinel, selección, cursores, buffers y `hasMore` permanecen en su implementación. El renderer no solicita inventario independiente por columna. La asignación ya presentada se conserva por identidad y tramo mientras continúa la misma selección. Las nuevas tarjetas llenan las zonas sin mover las anteriores; se actualizan sus DTO y se retiran IDs ausentes. El plan se reinicia al cambiar ciudad/departamento, pestaña, contexto o salir de esta variante. Una prueba mantiene abierto el diálogo comercial mientras llegan cuatro publicaciones y confirma que no se remonta la tarjeta.

La estimación no promete alturas idénticas ante todo contenido real. En los fixtures las diferencias finales entre zonas fueron 401 px (equilibrado), 1 px (24 productos/1 publicación), 266 px (sin publicaciones), 0 px (solo social) y 190 px (oferta escasa): como máximo aproximadamente una tarjeta comercial, sin huecos intermedios por filas sincronizadas. El escenario con ocho publicaciones y ningún comercial utiliza una sola zona.

## Reseñas y contenido: decisiones separadas

Las reseñas son **Publicacion tipo TESTIMONIO**. Se conservan `calificacion` y el `producto` que `mapItem.ts` obtiene de `productosEnPublicacion[0].producto`, con ID/nombre/slug seleccionados por `publicationSelect`. No hay consulta nueva ni feed independiente de reseñas, ni producto elegido por apariencia. El fixture de reseña tiene relación explícita al café y su enlace se comprueba; no acredita la calidad editorial de relaciones persistidas.

Lectura pública acotada, sin mutaciones: 33 tarjetas de la primera carga con Tunja, guardadas en [public-content-readonly.json](desktop-feed-evidence/public-content-readonly.json). **No se reprodujeron escapes literales** `\\n`/`\\r`/comillas escapadas en ese subconjunto. No se generaliza al catálogo entero. El renderer muestra los textos recibidos; no se añadió una sustitución indiscriminada de escapes.

Las imágenes de producto proceden de `product.imagenes`; las de publicación de su multimedia ordenada. **No se confirmó una asociación incorrecta** de imagen/producto mediante esta inspección. Los títulos y URLs públicos quedan registrados para una revisión individual si hay un ejemplo concreto; la apariencia de una foto no demuestra un error de relación. Los contenidos persistidos de prueba señalados en la auditoría anterior siguen siendo un asunto editorial, no una causa del cambio de anchuras. No se modificaron registros de producción.

## Comparación antes/después

[Comparador local interactivo](desktop-feed-evidence/comparison.html). Todas las capturas comparativas son **locales, con el mismo inventario y arte sintéticos**, no capturas de producción ni garantía de los textos/imágenes reales. La referencia anterior se capturó inicialmente antes de editar. Para la comparación final se regeneraron ambas vistas con ciudad y relaciones sintéticas coherentes: el harness extrae el renderer base de 058d133 mediante `git show`, utiliza las variantes predeterminadas compartidas (sin reglas nuevas activas) y permite abrir `?compare=before`. No se restaura código de trabajo para obtener la referencia. Altura de viewport 900 px; segunda captura con scroll de 950 px.

| Ancho | Primera pantalla | Después del scroll |
|---|---|---|
| 1440 | [Antes](desktop-feed-evidence/before-1440-top.png) · [Prototipo](desktop-feed-evidence/after-1440-top.png) | [Antes](desktop-feed-evidence/before-1440-scroll.png) · [Prototipo](desktop-feed-evidence/after-1440-scroll.png) |
| 1920 | [Antes](desktop-feed-evidence/before-1920-top.png) · [Prototipo](desktop-feed-evidence/after-1920-top.png) | [Antes](desktop-feed-evidence/before-1920-scroll.png) · [Prototipo](desktop-feed-evidence/after-1920-scroll.png) |
| 390 | [Antes](desktop-feed-evidence/before-390-top.png) · [Prototipo](desktop-feed-evidence/after-390-top.png) | [Antes](desktop-feed-evidence/before-390-scroll.png) · [Prototipo](desktop-feed-evidence/after-390-scroll.png) |

Móvil: los PNG antes/después son **idénticos byte por byte**, tanto primera pantalla como scroll. Cabecera 105 → 105 px. Ambos escritorios 215 → 133 px. Mismos 31 IDs en las tres comparaciones; sin desbordamiento horizontal del documento. [Medidas anteriores](desktop-feed-evidence/before-metrics.json) · [posteriores](desktop-feed-evidence/after-metrics.json).

Inventario: [muchos productos](desktop-feed-evidence/inventory-commerce-1440.png), [solo comerciales](desktop-feed-evidence/inventory-only-commerce-1440.png), [solo social](desktop-feed-evidence/inventory-social-1440.png), [escaso](desktop-feed-evidence/inventory-sparse-1440.png), [medidas](desktop-feed-evidence/inventory.json).

## Comprobaciones de esta tarea

- Jest: **12/12** (10 de reparto nuevas + 2 existentes de geografía). Conjunto vacío, una tarjeta, inventario desequilibrado, negocios/servicios, identidad única y ausencia de mutación del input. [Salida](desktop-feed-evidence/unit.txt).
- Navegador: resultado final en [browser-final.txt](desktop-feed-evidence/browser-final.txt), sobre el código final y los fixtures coherentes. Los intentos iniciales se conservan como antecedentes: una expectativa usaba `role=dialog` en el modal heredado de publicación y otra un nombre de clase inexistente para el distintivo. Se corrigieron los selectores de prueba, sin modificar el modal ni FollowButton. La configuración tipada de Playwright se corrigió a `contextOptions.reducedMotion`; no se desactivaron controles.
- Coordinador y Server Actions reales con **adaptador Prisma en memoria**: 69 IDs elegibles, una vez cada uno, en Tunja y en Bogotá; 20 solicitudes, 8 continuaciones. Orden geográfico efectivo por bounding boxes de ambos carriles, fin de listado y selección nueva sin mezclar. [Evidencia](desktop-feed-evidence/continuation-city.json). No es otra ejecución de los 26 escenarios PostgreSQL previos.
- Escenarios estáticos: equilibrado 31 elementos, comercial 39, sin publicaciones 31, social 16 y escaso 10; se comprueban todos los IDs, límites de tramo, ausencia de scroll vertical interior y diferencias de altura. Varios artículos del mismo negocio no se eliminan.
- Acciones: favoritos cambia estado sin navegar; carrito abre su diálogo sin activar perfil; publicación abre su modal; enlace de perfil y producto/reseña correcto; WhatsApp normalizado conserva número y contexto, inspeccionado sin enviar mensajes. Móvil: fila precio/WhatsApp/carrito, áreas 44 px y distintivo sobre avatar. [Medidas](desktop-feed-evidence/actions-mobile.json). Seguimiento autenticado y pedidos no se ejecutaron; sus callbacks no se modificaron.
- Alcance ejecutado: 1279 px mantiene composición anterior; pestaña Productos restituye cabecera 215 px; categoría comida conserva renderer anterior.

Resultado final: **5/5 recorridos Playwright en una ejecución**, incluidos continuidad con diálogo abierto e inventarios, y **12/12 unitarias**. [Navegador final](desktop-feed-evidence/browser-final.txt) · [Continuidad](desktop-feed-evidence/append-continuity.json).

| Control final | Resultado/evidencia |
|---|---|
| `pnpm typecheck` | Correcto, con harness retirado. [Salida](desktop-feed-evidence/typecheck.txt). |
| `pnpm lint` | Correcto; único aviso heredado `_body` sin uso en ActivationBootstrap.test.tsx:347. [Salida](desktop-feed-evidence/lint.txt). El primer lint incluía fixtures temporales con `any`; se retiraron antes de repetir, sin exclusiones de reglas. |
| `next lint --file …` para helpers, tests y herramientas TS | Sin advertencias ni errores. [Salida](desktop-feed-evidence/lint-focused.txt). |
| `pnpm build`, mediante entorno aislado | Correcto, **74 páginas**, sin rutas/rewrites temporales. [Salida completa](desktop-feed-evidence/build.txt). Prisma 6.18.0, PostgreSQL 16.16; 12 negocios y 3 productos sintéticos para generación estática. [Preparación](desktop-feed-evidence/build-database.txt). HTTP externo bloqueado mediante el preload existente; ninguna conexión remota de datos. El primer build detectó la opción de Playwright mal tipada; se corrigió, no se ignoró el error. Avisos Upstash sin credenciales de los servicios externos no utilizados, igual que la validación previa. |
| Comparación móvil/identidades | PNG idénticos, 31 IDs en ambas vistas, sin desbordamientos. [Comparación verificable](desktop-feed-evidence/comparison-results.json). |
| Conservación del original | **2834/2834 archivos idénticos**, sin añadidos ni cambios; mismo HEAD y Git porcelain. [Comprobación](desktop-feed-evidence/original-preservation.json). |
| Limpieza | Servidor detenido, puertos 3400/55439 cerrados, contenedor propio y tmpfs eliminados; ruta/arte temporales retirados. [Comprobación](desktop-feed-evidence/cleanup.json). |

Las 103 unitarias, 26 escenarios SQL y recorridos de publicación anteriores son antecedentes; no se suman a estas cifras. El build actual consulta PostgreSQL real para generación de páginas, mientras que los cinco recorridos de interacción actuales usan el adaptador en memoria declarado. [Arranque y reproducción](../../e2e/desktop-feed-prototype/README.md).

## Archivos del prototipo

| Grupo | Archivos |
|---|---|
| Composición y continuidad de presentación | `src/publicaciones/componentes/FeedRederer.tsx`, nuevo `desktopDiscovery.module.css` en la misma carpeta; nuevo `src/feed/desktopDiscovery.ts` y sus pruebas. |
| Publicación/reseña | `src/feed/componentes/DiscoveryPublicationCard.tsx`, `discoveryCards.module.css`. Prop explícita; texto, relaciones y callbacks existentes. |
| Producto compacto | `src/ui/components/productos/ProductCard.tsx`, `feedProductCard.module.css`. Prop/clase de presentación; ningún callback o destino comercial cambiado. |
| Cabecera | `src/ui/components/topMenu/TopMenu.tsx`, `publicNavigation.module.css`. Wrapper de composición y reglas opt-in, sin cambiar destinos ni formularios. |
| Reproducción | `e2e/desktop-feed-prototype/{prepare.cjs,dev-server.cjs,capture.cjs,desktop.spec.ts,playwright.config.ts,build.mjs,build-seed.ts,README.md}`. |
| Documentación/evidencia | Este informe y `docs/audits/desktop-feed-evidence/`, incluido comparador HTML, capturas, medidas y salidas. |

`FeedComponent.tsx` y `DiscoveryPulseModule.tsx` se inspeccionaron y **no se modificaron**. Tampoco acciones/selects/mapItem/ranking, DTO del feed, protocolo/caché, teléfono/contacto/categorías, esquema, dependencias, configuración de aplicación o auth. El diff de implementación es exclusivamente presentación y su plan local de continuidad.

## Límites conservados y decisión pendiente

La propuesta necesita una decisión visual antes de integrar: valorar principal/lateral y la cabecera que deja de ser fija en este contexto. El reparto usa estimaciones, no una garantía de alturas iguales para cualquier texto o medio real. Las tarjetas presentadas conservan zona al continuar; un nuevo recorrido puede tener otra distribución. La prueba de continuidad añade publicaciones con el diálogo comercial abierto y comprueba la conservación del estado.

La evidencia SQL previa sigue siendo el respaldo de la semántica de consultas; no se anuncia como una nueva ejecución funcional PostgreSQL en esta tarea. Se mantiene el límite documentado del **cursor de DB eliminado**: reiniciar el recorrido sin cursor y sin exclusiones de IDs vistos para garantizar completitud. No hay instantánea general frente a modificaciones concurrentes.

No se ejecutaron seguimiento autenticado, mensajes, pedidos ni altas. No se corrigió contenido persistido ni se realizó una auditoría general. Public smoke sigue siendo un pendiente de validación de su entorno; el proyecto separado de staging no se tocó ni se certificó. No bloquean la revisión local de esta propuesta y no se cuentan como controles aprobados.


## Cabecera fija, integración y publicación — 25/11/2026

La dirección del prototipo `2d292f1bedb82cd55ba09990564b1bd5c36eeeb4` fue aprobada. El único cambio nuevo de aplicación es `src/ui/components/topMenu/publicNavigation.module.css`: en portada/Para ti desde 1280 px, fila superior fija de **72 px**, fondo blanco, reserva de la misma altura en el flujo y `scroll-padding-top:88px` para el foco. Categorías y pestañas se desplazan; no se duplican controles ni se crea otro scroll de contenido. El primer contenido mantiene su posición absoluta durante scroll 0/1/200/950. Se conserva la anchura interior de la fila revisada y el resto del diseño.

No hay cambios nuevos respecto a 2d292f1 en coordinador, reparto estable, variantes de tarjetas, consultas/ranking, cursores/caché, autenticación, esquema, configuración o dependencias. Los tramos geográficos y la limitación del cursor eliminado descritos arriba siguen vigentes.

### Validación nueva y evidencia reutilizada

- **3 pruebas nuevas Playwright aprobadas**: 1440, 1920 y transición 1279→1280→1279→1280→390. [Salida](desktop-feed-header-evidence/browser-header.txt). Búsqueda con respuesta sintética local, foco búsqueda→ciudad, selector y cambio de ciudad, menú Perfil, diálogo comercial, publicación, navegación a categoría y acceso real anónimo a registro de negocio. Sin enviar formularios ni mensajes. [1440](desktop-feed-header-evidence/header-1440.json) · [1920](desktop-feed-header-evidence/header-1920.json) · [límite/móvil](desktop-feed-header-evidence/boundary-mobile.json).
- Se ejecutaron otra vez **3 regresiones existentes y aprobaron**: acciones/móvil, coordinador real con varias páginas/cambio de ciudad y acción comercial abierta al llegar publicaciones. [Resultados individuales](desktop-feed-header-evidence/browser-first-pass.txt). Esa ejecución se interrumpió después para depurar la nueva prueba de overlays; no se anuncia como una suite completa de seis aprobadas. El modal comercial heredado se cierra con Cancelar: la prueba se corrigió para usar ese control, sin añadir manejo de Escape a la aplicación. Los seis casos aprobados corresponden a dos ejecuciones, no a la cifra histórica del prototipo.
- Interacciones locales: componentes y Server Actions reales, adaptador Prisma **en memoria** y destino DB inalcanzable. Se conserva esa distinción respecto a SQL. La ruta/rewrite de pruebas solo vive en el harness temporal, retirado antes de controles finales/build.
- **12/12 unitarias ejecutadas ahora**, reparto y geografía; no se atribuyen como nuevas las 103 unitarias anteriores. [Salida](desktop-feed-header-evidence/unit.txt).
- `pnpm typecheck`, `pnpm lint` y lint enfocado de herramientas: correctos; únicamente aviso previo `_body` en ActivationBootstrap.test.tsx:347. [Tipos](desktop-feed-header-evidence/typecheck.txt) · [lint](desktop-feed-header-evidence/lint.txt) · [enfocado](desktop-feed-header-evidence/lint-focused.txt).
- Se reutilizan los casos y capturas anteriores de inventario escaso, solo comercial y solo social: sus tarjetas/reparto no se modificaron. También la matriz SQL previa de 26 escenarios, **sin repetirla ni sumarla a esta validación**. El build actual utiliza el esquema real y fixtures mínimos solo en PostgreSQL local aislado, con HTTP externo bloqueado; no usa datos remotos ni artefactos prebuilt de prueba.

Capturas locales actuales: [1440 inicio](desktop-feed-header-evidence/local-1440-top.png) · [1440 scroll](desktop-feed-header-evidence/local-1440-scroll.png) · [1920 inicio](desktop-feed-header-evidence/local-1920-top.png) · [1920 scroll](desktop-feed-header-evidence/local-1920-scroll.png) · [390](desktop-feed-header-evidence/local-390-top.png). Son sintéticas; las capturas públicas finales se registran después de verificar el deployment.

### Referencia de publicación y recuperación

Antes de integrar, main local y origin/main confirmados en `058d13329ba6a81414e140a33d08cb50475d009b`, prototipo limpio en 2d292f1. Proyecto red-social `prj_iB5Hr9oHgsqEAwnvsTqo5EyUuruy`, equipo `team_iDtsndfHbJjkJqyQspXbeFHR`. Deployment previo efectivo: **dpl_13YyTGgU4sSFjv7mgCEEhBF5XpXv**, Production READY, Git/main, SHA 058d133, asociado a ambos dominios. [Referencia](desktop-feed-header-evidence/prior-deployment.json). La API de GitHub devolvió main no protegida (404) y reglas de repositorio vacías; no se omitieron controles obligatorios ni se habilitó force push.

**Build final aprobado**, 74 páginas: [salida](desktop-feed-header-evidence/build.txt). PostgreSQL 16.16/Prisma 6.18.0, 12 negocios y 3 productos sintéticos únicamente para generación de páginas. No hay ruta temporal en el manifiesto final. Recursos temporales retirados y puertos cerrados: [limpieza](desktop-feed-header-evidence/cleanup.json). Original conservado: [comparación de 2834 archivos y estado Git](desktop-feed-header-evidence/original-preservation.json).

### Integración y publicación funcional completadas

Se integraron mediante **fast-forward** los commits `2d292f1bedb82cd55ba09990564b1bd5c36eeeb4` (prototipo aprobado) y `569daa154030976cee971bdfb94cd7b652bcd802` (cabecera fija) sobre main en `/home/nico/worktrees/myckeo-public-main-integration-20261125`, partiendo de 058d133. Árbol limpio e idéntico a la versión validada. Se actualizó origin/main justo antes del push; sin avances ajenos ni conflictos. Push normal del SHA funcional exacto, sin force.

Vercel construyó desde **Git/main**, con su configuración existente y datos reales; no se subió el build local ni sus fixtures. Deployment funcional **dpl_BNL83P5HB2Ed3Wnkvgso9mMdJaZt**, Production **READY**, commit 569daa1 completo, alias myckeo.com y www.myckeo.com confirmados individualmente. [Inspección](https://vercel.com/nico-rodriguezs-projects-63a84b64/red-social/BNL83P5HB2Ed3Wnkvgso9mMdJaZt) · [registro](desktop-feed-header-evidence/production-deployment.json). El commit documental posterior transporta únicamente este informe/evidencia; no altera el árbol de aplicación validado.

### Comprobación pública con fotos y textos existentes

Resultado **aprobado** en 1440, 1920 y 390 px sobre https://myckeo.com, con navegador real, sin interceptar datos del feed ni simular sesión. [Resultado y medidas](desktop-feed-header-evidence/production-results.json).

- Escritorio: fila superior de 72 px fija al inicio y tras scroll; categorías/pestañas fluyen. Principal/lateral y medios acotados con imágenes reales. Sin desbordamientos. Los tres controles de viewport conservaron sus dimensiones esperadas.
- En 1440 se observaron cinco cargas incrementales: **33→59→79→99→111→121** elementos, sin IDs duplicados; se comprobaron los límites verticales de los tramos visibles. No se agotó el inventario completo ni se certifica completitud del catálogo real con este recorrido breve. La completitud bajo datos fijos continúa respaldada por la validación aislada previa.
- Cambio real a Bogotá desde la cabecera fija: 32 elementos del recorrido nuevo, sin IDs de las páginas anteriores en ese conjunto observado; solicitudes con ciudad nueva y orden de tramos verificado. La ampliación sigue disponible y no se considera error que haya resultados de otras ciudades.
- Búsqueda real de salchipapa: dos resultados. Diálogo comercial abierto/cerrado sin enviar compra; enlaces comerciales/WhatsApp inspeccionados, sin prefijo duplicado. Tengo un negocio abrió el registro de negocio existente, sin enviar el formulario.
- Móvil: fila precio/WhatsApp/carrito y distintivo sobre avatar conservados. Sin desbordamiento nuevo.
- **Cero errores de página, cero respuestas HTTP fallidas** durante el recorrido. Se permitieron únicamente las cuatro Server Actions de lectura y GET/HEAD; no se enviaron cuentas, pedidos, mensajes ni otras mutaciones. 28 solicitudes de lectura registradas; no se usan sus indicadores de cursor para contar continuaciones (véase nota de serialización en el JSON).
- Logs de runtime del deployment funcional: consulta de errores/fatales Production, últimos diez minutos, agrupada por ruta, **sin grupos de errores**. Build remoto correcto, 87 páginas reales; generación Prisma y Next build existentes, sin migraciones/seeds remotos. No se detectó regresión grave atribuible; **no hubo rollback** y la referencia anterior permanece registrada.

Capturas de **producción**, diferentes de las sintéticas anteriores:

| Ancho | Inicio | Después del scroll |
|---|---|---|
| 1440 | [Captura](desktop-feed-header-evidence/production-1440-top.png) | [Captura](desktop-feed-header-evidence/production-1440-scroll.png) |
| 1920 | [Captura](desktop-feed-header-evidence/production-1920-top.png) | [Captura](desktop-feed-header-evidence/production-1920-scroll.png) |
| 390 | [Captura](desktop-feed-header-evidence/production-390-top.png) | [Captura](desktop-feed-header-evidence/production-390-scroll.png) |

Public smoke volvió a fallar en **Validate smoke environment** en el run GitHub `45697577760`; Generate smoke fixtures y Run smoke suite quedaron omitidos. No se presenta como aprobado, no se alteraron secretos y no bloquea una revisión obligatoria configurada (no hay protección/rulesets obligatorios). No se modificó el proyecto separado de staging. El texto persistido de prueba reaparece en una publicación real de las capturas: es DATA-01 histórico, no una regresión de composición ni motivo para borrar contenido o revertir.

Permanece el límite del cursor eliminado, las estimaciones de altura y las demás limitaciones documentadas. El original conserva sus 2834 archivos, HEAD y estado Git; no se modificaron datos de producción, esquema, infraestructura ni dependencias. Recursos temporales propios retirados. La actualización documental posterior no requiere repetir pruebas funcionales de código idéntico; se verifica su deployment/SHA/dominios efectivos al cerrar la entrega. Los pendientes históricos (Public smoke por entorno, contenido persistido, 404/ilustración y staging separado) no se presentan como pruebas aprobadas ni se corrigen en este lote.
