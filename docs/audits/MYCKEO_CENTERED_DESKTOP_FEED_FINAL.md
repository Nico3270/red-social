# Myckeo — cierre del feed centrado de escritorio

**Estado: MYCKEO_CENTERED_DESKTOP_FEED_PUBLISHED_AND_VERIFIED.** Integración y publicación funcional completadas; el cierre documental conserva el mismo código de aplicación.

## Referencias y conservación

Prototipo aprobado: `d98e40984a9574b0aa2ecdcc9ab6d816c476c94c`, rama `prototype/centered-feed-navigation-20261125`. Su worktree `/home/nico/worktrees/myckeo-centered-feed-20261125` se conserva sin cambios. Main local y remoto se comprobaron inicialmente en `8ce16bc7779f846c386483a7d145369b51d8e461`.

El trabajo final vive separado en `/home/nico/worktrees/myckeo-centered-desktop-final-20261125`, rama `feat/centered-desktop-feed-final-20261125`. El original `/home/nico/red-social` mantiene su rama y trabajo ajeno. La comprobación por hashes, HEAD y estado Git se registra al cierre. No se copiaron `.env` ni credenciales de producción.

Referencia de recuperación anterior: **dpl_WsisrcEjNXhCmA3Bj3FMFpfcJX7K**, red-social, Production READY, SHA `8ce16bc…`, origen Git/main y ambos dominios. [Registro](centered-desktop-final-evidence/prior-deployment.json). La API de GitHub devuelve main no protegida y rulesets vacíos; no se omiten controles obligatorios ni se emplea force push. [Protección](centered-desktop-final-evidence/main-protection.json) · [Reglas](centered-desktop-final-evidence/rulesets.json).

## Dos ajustes de presentación

Solo portada → Para ti desde 1440 px. Se mantienen principal de 680 px exactamente centrada, oferta de 320 px, contenedor máximo de 1416 px, cabecera fija de 72 px y “Tengo un negocio”.

La navegación izquierda utiliza `position:sticky; top:88px`: 16 px bajo la cabecera al desplazarse. Su altura máxima es viewport menos 104 px. Cuando las categorías expandidas no caben, únicamente la navegación admite overflow vertical; las tarjetas siguen en el scroll del documento. `overscroll-behavior-y:auto` permite continuar hacia el documento al llegar al extremo. No hay bloqueo del body, otra copia de controles ni scroll interior en la principal. Los 18 enlaces siguen accesibles por teclado, con foco dibujado dentro del área visible. El contenedor de sticky termina antes del footer; menús y diálogos mantienen su prioridad.

El final del recorrido sustituye la ilustración grande por **“Estás al día. Sigue explorando productos y negocios”**, en un estado discreto dentro del ancho principal. Solo aparece con contenido ya entregado, `hasMore=false`, sin carga siguiente y con todas las fuentes relevantes resueltas correctamente. El coordinador pasa una señal exclusivamente de presentación basada en los estados `isSuccess`/`isFetching` existentes: una fuente pendiente, con error o refrescando impide afirmar que el recorrido terminó. No cambia consultas, peticiones, cursores, ranking, exclusiones, caché ni reciclado de vistos. Sentinel y lógica de continuación permanecen iguales.

El estado vacío inicial conserva su ilustración y mensaje; la carga conserva los placeholders existentes. Por debajo de 1440, fuera de Para ti o en categoría, se conserva el final anterior. La señal nueva no modifica esas vistas.

Respecto al commit revisado solo cambian tres archivos de aplicación: CSS del renderer, su presentación de finalización y tres líneas del coordinador que pasan estados existentes. [Delimitación](centered-desktop-final-evidence/scope.json). Se revisaron estructura React, hooks, accesibilidad, tipos y coste de render: no hay hooks nuevos, dependencias, callbacks comerciales ni componentes duplicados.

## Evidencia local y verificación focal

El navegador ejecuta componentes reales y el inventario público congelado del prototipo, con sus fotografías cacheadas. No son dos capturas de momentos diferentes de producción. El recorrido `view=live` utiliza el coordinador y Server Actions reales con el adaptador Prisma en memoria; no se presenta como nueva prueba SQL.

| Comprobación | Resultado y evidencia |
|---|---|
| Sticky, medidas y overlays | 1440/1920 al inicio y scroll 180/950/2100; principal 680, centro exacto, lateral 320, header 72 y negocio visible. Menú Perfil y diálogo comercial por encima de la navegación. [Medidas](centered-desktop-final-evidence/sticky-columns.json). |
| Categorías expandidas | 1440/1920 × alturas 900/600/360. Los 18 destinos, foco del último enlace visible, Shift+Tab, scroll encadenado hacia documento, límite anterior al footer y ausencia de overflow horizontal. [Medidas](centered-desktop-final-evidence/expanded-navigation.json). |
| Final y estados diferenciados | Inventario escaso de dos elementos; final compacto sin ilustración. Vacío, carga inicial, continuación disponible, carga con contenido, fuentes pendientes y error no muestran finalización. Sentinel conservado. [Estados](centered-desktop-final-evidence/completion-states.json). |
| Navegación y regresiones | Salir a Publicaciones y volver restituye sticky y activo. A 1439/390 desaparece la variante nueva y permanece el final publicado. [Resultados](centered-desktop-final-evidence/tab-boundary-mobile.json). |
| Continuidad y ciudad | 69 identidades únicas en Tunja y 69 en Bogotá; fin real del inventario fijo y tramos ciudad → departamento → país. [Recorrido](centered-desktop-final-evidence/continuation-city.json). |
| Inventarios, relaciones y acciones | Regresiones del prototipo reejecutadas: comercial/social/escaso/mixto, principal estable, categorías sin duplicación, carrito abierto al añadir publicaciones, columnas conservadas, reseñas vinculadas y fila precio/WhatsApp/carrito + distintivo a 390. [Inventarios](centered-desktop-final-evidence/inventory-navigation.json) · [Continuidad/móvil](centered-desktop-final-evidence/boundary-append-mobile.json) · [Reseñas/llegada](centered-desktop-final-evidence/reviews-and-arrival.json). |
| Unitarias pertinentes | 12/12 de reparto y geografía. [Salida](centered-desktop-final-evidence/unit.txt). |
| Tipos y lint | `pnpm typecheck` y `pnpm lint` aprobados. Resultados en [tipos](centered-desktop-final-evidence/typecheck.txt), [lint](centered-desktop-final-evidence/lint.txt) y [enfocado](centered-desktop-final-evidence/lint-focused.txt). Advertencia heredada `_body` en ActivationBootstrap.test.tsx:347; ninguna regla desactivada. |
| Build | `pnpm build` aprobado mediante runner aislado, 74 páginas generadas, sin ruta temporal. [Salida](centered-desktop-final-evidence/build.txt). |

Son **cuatro recorridos nuevos y cuatro regresiones distintas aprobadas en ejecuciones separadas**, no ocho aprobadas en una única corrida. El primer ensayo conserva dos fallos de herramientas: timeout esperando hidratación durante el arranque del harness y selector `role=status` ambiguo con el feedback de FollowButton. Se corrigieron la espera y el selector. Después se reforzó la señal de finalización y se revalidaron estados y coordinador. [Primer ensayo](centered-desktop-final-evidence/browser-first.txt) · [Tres comprobaciones visuales finales](centered-desktop-final-evidence/browser-presentation.txt) · [Finalización y coordinador con señal resuelta](centered-desktop-final-evidence/browser-settled.txt).

## Capturas locales finales

| Ancho | Inicio | Scroll 950 |
|---|---|---|
| 1440 | [PNG](centered-desktop-final-evidence/local-1440-top.png) | [PNG](centered-desktop-final-evidence/local-1440-scroll.png) |
| 1920 | [PNG](centered-desktop-final-evidence/local-1920-top.png) | [PNG](centered-desktop-final-evidence/local-1920-scroll.png) |

[Categorías expandidas, 600 px de alto](centered-desktop-final-evidence/local-expanded-600.png) · [Ventana de 360 px](centered-desktop-final-evidence/local-expanded-360.png) · [Final compacto, 1440](centered-desktop-final-evidence/local-sparse-end-1440.png) · [Final compacto, 1920](centered-desktop-final-evidence/local-sparse-end-1920.png) · [Vacío](centered-desktop-final-evidence/local-empty-1440.png) · [Carga](centered-desktop-final-evidence/local-loading-1440.png).

## Build aislado, reutilización y límites

Se creó un PostgreSQL local desechable propio, comprobando que nombre y puerto no estuvieran ocupados. El runner valida `127.0.0.1:55439/myckeo_public_audit`, prepara el esquema real y los fixtures mínimos anteriores: 12 negocios y 3 productos. HTTP externo bloqueado durante build, sin variables ni datos remotos, seeds generales o migraciones de producción. [Destino](centered-desktop-final-evidence/build-database.txt) · [Preparación](centered-desktop-final-evidence/build-prepare.txt) · [Fixtures mínimos](centered-desktop-final-evidence/build-seed.txt).

Se reutilizan el análisis geográfico, la matriz previa de 26 escenarios SQL, la comparación con 46 fotos públicas y el comportamiento de tarjetas/relaciones documentados en `MYCKEO_CENTERED_FEED_PROTOTYPE.md` y `MYCKEO_DESKTOP_FEED_PROTOTYPE.md`. No se suman como pruebas nuevas ni se repite su matriz por este ajuste. Las fotos/pósteres no acreditan reproducción completa de vídeo.

Persisten los pendientes históricos: Public smoke por validación de entorno, staging separado sin certificar, contenido de prueba persistido y asuntos editoriales/404 históricos. No se modifican ni se presentan como aprobados. Sigue el límite del cursor eliminado y la ausencia de una instantánea general ante cambios concurrentes. No se ejecutan compras, seguimiento autenticado, mensajes ni altas. El final escaso se prueba de forma aislada; no se exige vaciar el catálogo público para obtener una captura.

Reproducción local: [instrucciones](../../e2e/centered-desktop-final/README.md). No desplegar el harness, sus rewrites, fixtures generados o build local. La publicación se realiza exclusivamente desde Git y se registra después en este informe.

Servidor y contenedor propios detenidos y retirados; ruta/arte temporales eliminados antes del build. [Limpieza](centered-desktop-final-evidence/cleanup.json) · [Conservación del original y del prototipo](centered-desktop-final-evidence/preservation-result.json).


## Integración y resultado público

Main y origin/main se volvieron a comprobar en 8ce16bc antes de integrar. Se aplicó fast-forward del prototipo aprobado y del commit funcional **`0f9d5df1682c123217ab4c8b696b1d34d45b28e6`**, seguido de push normal, sin conflictos, force push ni artefactos locales. [Registro](centered-desktop-final-evidence/integration.json).

Vercel construyó desde **Git/main**: deployment funcional **`dpl_25uB96GqEAddmayEeDszLoKVTk7q`**, red-social, Production **READY**, SHA funcional exacto. Se verificó cada alias por separado: **myckeo.com** y **www.myckeo.com**, ambos sobre ese deployment. [Deployment](centered-desktop-final-evidence/production-deployment.json) · [Dominios](centered-desktop-final-evidence/production-aliases.json) · [Build remoto](centered-desktop-final-evidence/production-build-summary.json). No se subió el build sintético local, ni se ejecutaron migraciones o seeds remotos.

La comprobación pública anónima real aprobó a **1440, 1920, 1439 y 390 px**. Conservó la principal de 680 px centrada, lateral de 320 px, cabecera fija de 72 px y Tengo un negocio. La navegación quedó visible durante varios desplazamientos; las categorías expandidas y su último enlace siguieron accesibles a 600 px de alto. Se comprobó pestaña Publicaciones → Para ti, continuación **33 → 59 → 79 → 99** con todas las tarjetas previas y sus columnas conservadas, sin duplicados, y cambio real a Bogotá con 29 elementos observados y solicitudes de lectura de la ciudad nueva. En móvil se conservaron fila precio/WhatsApp/carrito y distintivo sobre avatar. **Cero errores de página y cero respuestas HTTP fallidas** en este recorrido. No se agotó el catálogo público: el final compacto con oferta escasa se acredita mediante los estados controlados locales, sin manipular las políticas públicas para obtener la captura. [Resultado público](centered-desktop-final-evidence/production-results.json) · [Salida](centered-desktop-final-evidence/production-browser.txt).

Consulta de errores/fatales del deployment funcional, Production, últimos diez minutos, agrupada por ruta: sin grupos de errores. [Resultado](centered-desktop-final-evidence/production-runtime.txt). No se identificó una regresión grave atribuible y no se requirió rollback. La referencia de recuperación anterior sigue registrada.

**[Galería final con capturas públicas y estados locales](centered-desktop-final-evidence/index.html)**. Enlaces relativos; se distingue explícitamente la procedencia de cada imagen.

| Capturas públicas | Inicio | Scroll |
|---|---|---|
| 1440 | [PNG](centered-desktop-final-evidence/production-1440-top.png) | [PNG](centered-desktop-final-evidence/production-1440-scroll.png) |
| 1920 | [PNG](centered-desktop-final-evidence/production-1920-top.png) | [PNG](centered-desktop-final-evidence/production-1920-scroll.png) |

[Categorías expandidas en producción](centered-desktop-final-evidence/production-expanded-600.png) · [Regresión 1439](centered-desktop-final-evidence/production-1439-top.png) · [Regresión móvil](centered-desktop-final-evidence/production-390-top.png).

El pendiente histórico de **Public smoke** persiste: run **45747133425**, `Validate smoke environment` fallido; instalación, generación de fixtures y suite quedaron omitidas. No se anuncia como aprobado ni se alteran secretos, protección o reglas para eludirlo. [Pasos del run](centered-desktop-final-evidence/public-smoke-functional.json). La API del conector de workflows solo lista runs de PR; el run disparado por push se localizó por la API de GitHub y sus pasos se inspeccionaron con el conector. El proyecto separado de staging y los otros pendientes descritos arriba no forman parte de esta publicación.

El cierre documental posterior se integra y publica por el mismo flujo Git. Su SHA y deployment efectivos se verifican al entregar; no cambia el árbol de aplicación funcional ni exige repetir esta matriz. El worktree final para desarrollo local es **`/home/nico/worktrees/myckeo-centered-desktop-final-20261125`**. El worktree aprobado original sigue limpio en d98e409; el árbol original conserva sus 2740 archivos, HEAD y estado Git, y el prototipo aprobado sus 1365 archivos. [Conservación](centered-desktop-final-evidence/preservation-result.json).
