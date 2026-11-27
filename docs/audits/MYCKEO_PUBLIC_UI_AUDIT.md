# Auditoría del frontend público de Myckeo

Auditoría inicial: 24 de noviembre de 2026. Segundo lote, geografía/paginación: 25 de noviembre de 2026 (véase el anexo al final). Alcance inicial: exploración pública, contacto, WhatsApp y entradas existentes de cuenta/carrito. No se desplegó, hizo push, ejecutaron migraciones ni modificaron registros remotos.

## Repositorio y entorno

- Raíz: `/home/nico/red-social`; remoto: `https://github.com/Nico3270/red-social.git`; paquete: `myckeo`.
- Rama inicial y final: `feat/premium-product-form-navigation`; HEAD de partida: `1f491ff8ce6f80e333f07548e299141fc863d993`.
- Se leyó el `AGENTS.md` raíz. No se encontraron instrucciones anidadas en los archivos del alcance.
- Había numerosos cambios locales, especialmente tarjetas/feed móviles, navegación, productos, onboarding y administración. Se conservaron. Los cambios de esta auditoría se hicieron sobre ese estado, no sobre una copia limpia de HEAD. [source-changes.patch](public-ui-evidence/source-changes.patch) registra exclusivamente el delta de implementación de este encargo respecto del estado recibido.
- Vercel MCP, solo lectura, confirmó proyecto `red-social`, framework Next.js, dominio `myckeo.com`, repositorio `Nico3270/red-social`. La versión de producción consultada tiene commit `3c8e51d03076d9158991abbd8d4d1d20f62b107c`, rama `main`, deployment `dpl_6PU6wLmz2SinUDUR6JFDVZ2LqjS5`. **Producción y árbol local difieren**. No se trabajó sobre `myckeo-admin`.
- Gestor `pnpm` 10.19.0, `pnpm-lock.yaml` y `pnpm-workspace.yaml`; Next 15.5.9, React 18.3, TypeScript 5.9, Jest/ts-jest y Playwright existentes. No se actualizaron dependencias.
- Las variables locales configuraban una base remota. No se imprimieron sus valores. El servidor de auditoría usó `DATABASE_URL` sintética en `127.0.0.1:1`, caché Next separada y fixtures existentes de `e2e/mobile-feed-implementation`. Las interacciones se interceptaron en Playwright; solo el carrito y preferencias locales del navegador cambiaron.
- Producción se inspeccionó sin autenticación mediante GET y las cuatro Server Actions de lectura del feed, cuyos argumentos identifican el tipo de contenido. Se bloquearon otras solicitudes de escritura, analítica y solicitudes a WhatsApp. No se enviaron correos, mensajes ni formularios.

## Regla geográfica que debe conservarse

**Ciudad actual/seleccionada primero; después otras ciudades para ampliar la oferta.** Ver un negocio de Tunja con Bogotá seleccionada no demuestra por sí mismo un error de geolocalización. El primer lote no alteró esa lógica. El segundo corrige su orden y continuación, manteniendo la ampliación y sin convertir la ciudad en un filtro estricto.

La implementación obtiene candidatos por ciudad, departamento sin esa ciudad y ámbito nacional, deduplica por ID y después vuelve a aplicar ranking. La ampliación está presente; la prioridad estricta final y la continuidad de páginas tienen defectos independientes, detallados más abajo.

## Hallazgos y priorización

P1: contacto equivocado o exploración incompleta. P2: contenido/confianza y estados de ruta. P3: mejora de conversión.

| ID / prioridad / clase | Ruta y responsable | Evidencia y reproducción | Causa e impacto | Corrección mínima / riesgo | Estado y comprobaciones |
| --- | --- | --- | --- | --- | --- |
| WA-01 / P1 / funcional | Feed, perfil, producto; `DiscoveryBusinessCard`, `DiscoveryServiceCard`, `BusinessCard`, `ProductCard`, `DetallesProducto`, header/guía/catálogo de perfil | Producción: abrir portada y extraer los `a[href*="wa.me"]`; aparece `/57573182293083`. Producto y perfil de referencia usan `/573182293083`. Endpoint público devuelve `telefonoContacto: "+573182293083"`. | Tarjetas de negocio/servicio anteponen `57` a un internacional ya completo. Otras superficies solo eliminaban separadores: un nacional quedaba sin país. Contactos inconsistentes y potencialmente incorrectos. | Helper compartido, país predeterminado CO explícito y conservación del internacional. Cambios puntuales en consumidores públicos; riesgo bajo, sin tocar datos guardados ni textos de mensajes. | **Aplicado localmente.** Unitarias de formatos/idempotencia y navegador sobre seis componentes reales; sin mensajes reales. Producción sigue pendiente de publicación fuera de este encargo. |
| ROUTE-01 / P1 / funcional | `/contacto`, `/[categoria]`, `/category/[slug]`; footer de `(catalogo)/layout.tsx` | Antes, local y producción: `/contacto` conserva URL y HTTP 200, muestra categoría vacía. URL inventada de un segmento también recibe 200. Capturas antes/después. | Footer correcto hacia una página inexistente; Next resuelve `[categoria]` sin validar slug. No hay middleware ni rewrite de contacto implicado; rewrite local previo solo afecta sitemap. | Página estática con correo ya publicado; `notFound()` para categorías ajenas al catálogo de navegación existente. Riesgo bajo; categorías reconocidas mantienen su feed. | **Aplicado localmente.** `/contacto` 200 y `mailto:soporte@myckeo.com`; comida/moda/negocios en ambos formatos 200; slugs inventados en ambos formatos 404. |
| COPY-01 / P2 / contenido de interfaz | `/`; `FeedRederer.tsx`, `DiscoveryPulseModule.tsx` | Producción sí muestra los tres fragmentos indicados. `rg` de las frases exactas no los encuentra en el árbol local; navegador local confirma ausencia. | Producción conserva explicaciones de composición. Cambios móviles **anteriores al encargo** ya simplificaron la introducción y dejaron de renderizar descripciones. Persisten algunos metadatos de copia interna, sin mostrarse como párrafos; títulos de módulos también sirven como `aria-label`. | No rehacer un arreglo existente ni cambiar estructura. Revisar metadatos accesibles en una pasada editorial posterior si procede. | **Resuelto previamente en el árbol local; pendiente en producción.** Capturas locales a cuatro anchos, sin módulos vacíos introducidos por este encargo. No se modificaron esos archivos. |
| DATA-01 / P2 / contenido persistido | Portada; publicación y servicio del perfil de referencia | Producción reproduce ambas frases. `production-content-records.json` registra IDs extraídos de las respuestas de lectura. `rg -i` no encuentra las frases en `src`, fixtures ni seeds versionados consultados. | Texto proviene de registros servidos por backend, no de un fallback de tarjeta. El texto de relleno no equivale automáticamente a una marca de prueba. | Revisión individual de registros por responsable de contenido. Riesgo de ocultar oferta legítima si se clasifica por nombre o palabras. | **Documentado, sin modificación de datos.** Reglas locales de visibilidad revisadas y cubiertas por pruebas existentes. No se certificaron las marcas reales del registro en la base remota. |
| GEO-01 / P1 / funcional | Portada/categorías; `feedRanking.ts`, `getFeedData*.ts`, `feedForYou.ts` | Test con un negocio local de baja puntuación y uno nacional con `orden:100`: el nacional se entrega primero. | El orden ciudad→departamento→nacional de candidatos se pierde al aplicar puntuación y diversidad globales; ciudad es un bonus 2.8, no un nivel de orden. “Para ti” vuelve a ordenar/mezclar y el renderer agrupa tipos. | Próximo lote: mantener nivel geográfico a través de ranking, mezcla y presentación; puntuar/diversificar dentro de cada nivel. Riesgo medio; requiere pruebas de composición y paginación. | **Corregido en lote 2 (25/11).** Evidencia anterior conservada; continuación y composición verificadas con fixtures. Véase anexo. |
| GEO-02 / P1 / funcional | Scroll de portada/categorías; `getFeedData.ts`, `getFeedDataByCategory.ts` | Con límite 2 y 12 candidatos locales, `nextCursor` referencia un candidato que no aparece en los dos elementos entregados. Test reproducible sin DB. | Se ordena una ventana con buffer, se toma cursor del último candidato y luego se recorta a `limit`. El cursor se aplica a las tres consultas con orden DB diferente del ranking; `seenIds` además excluye elementos. Riesgo de saltos y pérdida de candidatos entre páginas. | Próximo lote junto con GEO-01: contrato de continuación estable por nivel geográfico y candidatos pendientes; no basta cambiar una línea del cursor. Riesgo medio. | **Corregido en lote 2 (25/11).** Se conservan buffer y cursores separados por tramo; se verifican secuencias completas. Véase anexo. |
| GEO-03 / P2 / claridad | Portada y encabezado con ciudad; `FeedRederer` | “Descubre cerca de ti” junto a ciudad puede abarcar oferta nacional. Tarjetas de negocio sí indican su ciudad. | La interfaz puede sugerir que toda la oferta es local. No demuestra fallo del selector. | Propuesta breve: “Explora Bogotá y otras ciudades”; cuando se garantice GEO-01, separar “En Bogotá” / “Más ciudades” según ciudad real. No afirmar falta de oferta local sin consultar. | **Propuesta, no aplicada** para mantener el lote en dos problemas y no prometer prioridad aún no garantizada. |
| OWNER-01 / P3 / conversión | Portada → Perfil → Ingresar → `/auth/login` → `/auth/new-account` → Cuenta Negocio | Menú compartido usa `SideBar`, `signIn()` y la configuración real `auth.config.ts`. Registro tiene opción Cuenta Negocio; tras registro credenciales navega a `/crear_negocio/{id}`, luego edición. | El recorrido existe, pero requiere abrir Perfil y pasar por acceso para descubrir la opción de propietario. No se constató ausencia del registro. | Recomendar entrada visible “Tengo un negocio” hacia el registro existente, sin inventar planes ni ofertas. Revisar por separado paridad del camino OAuth: su callback no usa la misma bifurcación explícita de credenciales. | **Recorrido localizado**; revisión de UI y navegación sin crear cuentas. No se probó alta autenticada completa. |
| ROUTE-02 / P2 / funcional pendiente | `/producto/[slug]`, `/perfil/[slug]`, `/{categoria}/{seccion}/{slug}` | Inspección estática: producto no encontrado devuelve JSX de error, perfil devuelve error genérico; no llaman `notFound()`. `seccion/[slug]` e `/inicio` aún tienen placeholders. | Estados de error pueden responder 200, y una ruta de tres segmentos solo usa slug de producto. | Revisar 404 vs fallo de datos en siguiente lote; no convertir indiscriminadamente errores de conexión en “no encontrado”. | **Pendiente fuera del arreglo de contacto**. No se afirma ejecución local de fichas completas con base real. |

## Registros que requieren revisión editorial

Fuente: respuestas públicas de producción, no acceso directo a la base ni clasificación por apariencia.

| Entidad | ID | Negocio | Actuación pendiente |
| --- | --- | --- | --- |
| Publicación | `cmd8abuph000443wfzt9txx2e` | `parrilla-internacional-tunja-tunja-r3jq` | Revisar “Vamos a probar un carrusel con imagenes y videos”; corregir o decidir visibilidad de forma individual. |
| Servicio “Entregas express” | `484de355-eaf5-4698-b491-5e982787347e` | mismo perfil | Sustituir descripción Lorem ipsum por información validada o revisar su disponibilidad individual. |
| Negocio asociado | `5506619e-3b3a-4e87-adb4-325396a98c26` | “Pariila Internacional Tunja” en la respuesta pública | Revisar sus contenidos; el nombre no permite concluir que sea ficticio. |

Esquema real: `Negocio.estado`, `isTestData`, `archivedAt`; además estado de `Usuario`, `isPlaceholder` y `perfilCompleto`. `business-visibility-policy.ts` clasifica HIDDEN/UNLISTED/PUBLISHED. Feed global y por categoría exigen PUBLISHED. Acceso directo permite negocios visibles no listados mediante `publicBusinessVisibility.ts`, una distinción intencional que debe conservarse.

`Publicacion` tiene `visibilidad`, pero no un estado de aprobación ni una marca individual `isTestData`; el feed exige PUBLICA y tipos admitidos. `Servicio` tiene `status` y el feed exige `disponible`; no hay marca de prueba por servicio. No se identificó en las consultas locales del feed una omisión de esas reglas que justifique ocultar estos registros por código. También se inspeccionaron con `git show` las consultas y la política del commit desplegado: ya incorporaban PUBLISHED. No se consultaron directamente los flags actuales de esos registros en la base remota.

## Mapa acotado de rutas y componentes

Todas las rutas bajo `(catalogo)` comparten su layout, TopMenu/TopMenuMobile, SideBar, consentimiento y footer.

| Ruta | Página / componentes principales | Helpers, consultas y resolución de slug |
| --- | --- | --- |
| `/` | `(catalogo)/page.tsx` → `FeedComponent` → `FeedRederer` → ProductCard, DiscoveryBusiness/Service/PublicationCard y PulseModule | `getFeedDataByType`, `feedRanking`, `feedForYou`, `feed-ids`; preferencias Zustand y `useUserLocation`. Geolocalización/preferencia puede recurrir a Bogotá; no se atribuye la oferta de Tunja a un fallo de ese hook. |
| `/inicio` | `(catalogo)/inicio/page.tsx` | Placeholder “Titulo principal/secundario”; el Inicio de navegación enlaza `/`, no esta página. |
| `/category/comida`, `/category/moda`, `/category/negocios` y otras 15 categorías configuradas | `category/[slug]/page.tsx` → mismo feed, contexto category, pestaña inicial Productos | `initialData.categorias` es el catálogo de la navegación pública; `getFeedDataByCategory`. Slug desconocido ahora 404. |
| `/comida`, `/moda`, `/negocios` (alias de un segmento) | `[categoria]/page.tsx` → mismo feed | Ahora valida con el mismo catálogo y muestra nombre/icono. No se inventan categorías a partir del slug. |
| `/producto/[slug]` | `producto/[slug]/page.tsx` → ResponsiveSlideShow, DetallesProducto, ProductGridProduct, reseñas | `getProductBySlug`, política de visibilidad y status disponible, `getResenasProductoTestimonio`, `useQuickAddSelection`. Mensaje conserva nombre/precio/variante/URL y `encodeURIComponent`. Slug inexistente aún muestra error, pendiente ROUTE-02. |
| `/{categoria}/{seccion}/{slug}` | `[categoria]/[seccion]/[slug]/page.tsx` → detalle de producto | Alias heredado que solo consulta el último slug con `getProductBySlug`; categorías/sección no se validan aquí. Pendiente ROUTE-02. |
| `/perfil/[slug]` | `perfil/[slug]/page.tsx` → PerfilUsuarioHeader → landing, guía, productos, publicaciones, catálogo tradicional o CatalogGroups | `getInfoPerfilBySlugNegocio`, `getNegocioProductsBySlug`, `getPublicacionesNegocio`, `getConteosSecciones`, `preloadProfileCatalogData`. API `/api/productos/[slug]` recibe **slug de negocio**. Perfil inexistente aún muestra error genérico. |
| `/contacto` | Nueva `contacto/page.tsx`; footer existente sin cambio | `InfoEmpresa.email`, coincide con correo publicado en políticas. Página estática, sin formularios ni llamadas al backend. |
| `/politica-privacidad`, `/politica-cookies`, `/terminos-servicio`, `/politica-publicidad` | Páginas estáticas con esos nombres, enlaces del footer y consentimiento | Rutas explícitas existentes; las cuatro se revisaron mediante navegador. No se auditó el contenido jurídico. |
| `/favoritos` | FavoritesGrid → FavoritosCard | Store de favoritos; entrada existente en menús; se comprobó renderizado público. |
| `/carro` | ProductsInCart | `useCartCatalogoStore`; productos agrupados por negocio, cantidades y variantes; checkout fuera del alcance de escritura. |
| Perfil del menú → Ingresar | SideBar → NextAuth `signIn()` → `/auth/login` → LoginForm | Configuración real `src/auth.config.ts`, no el setup alternativo `src/auth.ts`. |
| `/auth/new-account` | Selector Cuenta Personal / Cuenta Negocio → RegisterForm | Registro de credenciales con flag negocio → `/crear_negocio/[id]`; página exige sesión e ID propio → CreateNegocioForm → `/dashboard/editar-perfil`. Se paró antes de enviar formularios. |

Filtros: las consultas por categoría mantienen el predicado en ciudad/departamento/nacional para productos, servicios, negocios y publicaciones. Preferencias y secciones del feed general son señales de ranking, no filtros estrictos. Se detectó además en `FeedRederer` que el filtro de categoría del tab Servicios devuelve `true` para todos los servicios: sus datos no incluyen categorías para filtrarlos. Dejarlo para el lote geográfico/filtros; no se corrigió como un tercer problema encubierto.

## Cambios del primer lote

1. **WhatsApp**: nuevo `src/lib/contact/phone.ts` y pruebas enfocadas. Forma canónica `+internacional`; conserva `+` para que normalizar dos veces sea idempotente incluso en internacionales de diez dígitos. Solo se asume CO para un nacional de diez dígitos cuando el consumidor pasa explícitamente `"CO"`. Se aceptan `+`, espacios, guiones, puntos y paréntesis; no se eliminan letras/extensiones para inventar destinatarios. `toWhatsAppNumber` convierte esa forma a los dígitos de `wa.me`. Comprueba estructura, no asignación real ni registro en WhatsApp. Un internacional sin `+` de exactamente diez dígitos es ambiguo y, con default CO, se interpreta como nacional; debe venir con `+` para ser inequívoco.
2. **Contacto/resolución**: nueva página de correo y guards en ambas rutas de categorías. No se mostraron teléfonos de soporte: configuración y menús tienen números diferentes, mientras el correo coincide con las páginas legales.

Consumidores de teléfono ajustados: `src/feed/componentes/{BusinessCard,DiscoveryBusinessCard,DiscoveryServiceCard}.tsx`, `src/ui/components/productos/{ProductCard,DetallesProducto}.tsx`, `src/ui/components/perfil-usuario-header/PerfilUsuarioHeader.tsx`, `src/perfil/componentes/{BusinessGuideSection,BusinessGuideResults}.tsx`, `src/perfil/guide/business-guide.ts` y `src/ui/components/dashboard/catalogGroups/RestaurantMenuItem.tsx`. Este último también sirve al catálogo público, aunque su carpeta se llame dashboard. Solo se cambiaron imports, normalización y prefijo; no disposición visual ni callbacks de acciones.

Soporte de auditoría añadido: `e2e/public-ui-audit`, pruebas de caracterización `publicGeography.audit.test.ts`, este informe y evidencia. Los tests GEO que documentan defectos **afirman el comportamiento observado**, no certifican que la regla de producto esté cumplida; sus comentarios indican sustituirlos por expectativas correctas al resolverlos.

## Evidencia y verificación del primer lote

Carpeta: [public-ui-evidence](public-ui-evidence/). Las imágenes del feed local usan datos sintéticos; no son capturas de producción. El cambio de contacto sí se ejecuta en la ruta real local. En pruebas, `/` se reescribe temporalmente al harness de desarrollo; los componentes de producto/perfil son reales pero reciben props sintéticas. La consulta a datos reales no queda certificada por esa comprobación.

Capturas representativas: contacto local [antes, 390 px](public-ui-evidence/before-contact-390.png) / [después, 390 px](public-ui-evidence/after-contact-390.png); [feed local después, 390 px](public-ui-evidence/after-feed-390.png); [portada de producción](public-ui-evidence/production-home.png). La carpeta también incluye 360, 430 y 1440 px.

- Antes local: 5 pruebas Playwright pasaron (360/390/430/1440 y categorías/slugs desconocidos). Capturas `before-*`.
- Después local: 5 pruebas equivalentes pasaron. Capturas `after-*`. Sin desbordamiento horizontal de documento en los cuatro anchos; estados vacíos de categorías comprobados. La barra de categorías se desplaza horizontalmente por diseño.
- Resultado final de navegador: **ocho comprobaciones aprobadas en dos ejecuciones**: siete en la principal y el recorrido de footer/favoritos/carrito/acceso/registro en una repetición con servidor reiniciado. `browser-results.txt` conserva ambas partes. El formulario de negocio se abrió sin enviarlo; el test espera la hidratación del selector antes de pulsarlo.
- Comprobación de teléfono en navegador: DiscoveryBusinessCard, BusinessCard, DiscoveryServiceCard, ProductCard, DetallesProducto y PerfilUsuarioHeader, usando nacional CO, internacional CO con/sin `+` y separadores, internacional de EE.UU. y vacío. Los mensajes de producto conservan nombre y enlace contextual al decodificarlos.
- Las pruebas de acciones usan el destino WhatsApp con solicitudes externas bloqueadas y el carrito local. No envían mensajes ni órdenes. Se comprueba que abrir WhatsApp no abre carrito ni navega al perfil, añadir al carrito no navega, y seguir anónimo solicita acceso sin enviar una mutación de seguimiento.
- `mobile-actions.json` registra acciones de 44 px, precio/WhatsApp/carrito en la misma fila y distintivo superpuesto al avatar en 360/390/430 px; escritorio se midió a 1440 px. No se alteró CSS.
- `pnpm typecheck` pasó antes y después de cambios. El helper no introduce hooks ni dependencias. Se revisaron las pautas de React sobre callbacks, estructura, accesibilidad e imports, conservando componentes/estilos existentes.
- Unitarias: `unit-results.txt` conserva el resultado de helpers, visibilidad y acciones del feed. Cobertura global desactivada para esta selección enfocada: no se anuncia cobertura global del proyecto.
- Las seis suites unitarias suman **84 pruebas aprobadas**. El lint enfocado de los 16 archivos de implementación/pruebas pasó sin errores ni advertencias (`lint-changed-files.txt`).
- Inspección de producción: `production-readonly.json`, `production-content-records.json` y capturas `production-contact.png`, `production-home.png`, `production-product.png`. Se esperó a que terminase la carga del feed. No se registró su carga inicial como bloqueo permanente.

Referencias públicas inspeccionadas: [portada](https://myckeo.com/), [contacto](https://myckeo.com/contacto), [producto](https://myckeo.com/producto/salchipapa-colombiano) y [perfil](https://myckeo.com/perfil/parrilla-internacional-tunja-tunja-r3jq). Las capturas identificadas como producción corresponden a esos destinos antes de cualquier despliegue de este lote.

### Reproducir las comprobaciones sin acceder a la base remota

```bash
pnpm exec jest src/lib/contact/phone.test.ts src/feed/actions/publicGeography.audit.test.ts src/feed/actions/getFeedData.test.ts src/feed/actions/getFeedDataByCategory.test.ts src/lib/business/business-visibility-policy.test.ts src/lib/business/publicBusinessVisibility.test.ts --runInBand --coverage=false
pnpm typecheck
node e2e/public-ui-audit/prepare.cjs
node e2e/mobile-feed-implementation/dev-server.cjs
# En otra terminal, con el servidor anterior listo:
pnpm exec playwright test --config=e2e/public-ui-audit/playwright.config.ts
# Detener el servidor de auditoría; después retirar solamente los fixtures temporales:
node e2e/mobile-feed-implementation/prepare.cjs --clean
```

Si Playwright no tiene su Chromium predeterminado instalado, se puede indicar un ejecutable existente mediante `AUDIT_CHROMIUM_PATH`. En esta sesión se usó Chromium 1193 ya disponible; no se descargaron navegadores ni dependencias. La preparación crea una ruta temporal protegida por `NODE_ENV=development` y `MYCKEO_FEED_REVIEW=1`; debe retirarse al acabar. No se ejecutó `smoke:fixtures` ni `smoke:ci`, porque pueden crear datos; tampoco build completo, cuya generación de perfiles consulta la base remota configurada.

El servidor Next de auditoría agotó el heap predeterminado de Node tras acumular compilaciones de las rutas y falló al compilar el registro; esto interrumpió la octava prueba, después de siete aprobadas. Se reinició solo el servidor temporal con `NODE_OPTIONS=--max-old-space-size=6144` para repetir ese recorrido. No se cambió la configuración de memoria del proyecto ni se atribuyó esa interrupción a producción.

El servidor temporal se detuvo y sus fixtures/caché se retiraron al terminar. `tsconfig.json`, `next-env.d.ts`, variables locales y los archivos de configuración de la aplicación quedaron sin cambios de este encargo. `pnpm lint` completo, repetido tras retirar los fixtures, falla por el enlace HTML en `src/app/myckeoAdmin/crearProductos/_componentes/AssistedProductCreationClient.tsx:3516`, archivo modificado antes de iniciar esta tarea y no tocado aquí; también emite advertencias previas. El lint de los archivos de este lote sí pasó. Evidencia: `lint-full-results.txt` y `lint-changed-files.txt`.

## Limitaciones y pendientes al cerrar el primer lote (histórico)

No se verificó destinatario mediante conversación, alta real de cuentas, OAuth completo, checkout, pedidos ni carga completa local de fichas desde una base real. Geografía se verificó mediante mocks/inspección, no mediante una población remota controlada. Las ubicaciones originales y flags de los registros editoriales requieren consulta autorizada posterior. No se ejecutó limpieza de producción.

La página 404 compartida solicita `/imgs/image_not_found.png`, ausente en `public` (existe `not_found.png`); se observó el 404 del recurso. El estado HTTP de las rutas corregidas es correcto, pero esa ilustración heredada requiere revisión fuera de este lote.

Siguiente lote, por impacto:

1. Resolver conjuntamente prioridad geográfica final y continuación estable; probar varias páginas con oferta local suficiente/escasa/ausente, puntuaciones adversarias, filtros y cambios de ciudad.
2. Revisar individualmente los dos contenidos persistidos señalados; comprobar marcas de visibilidad reales y validar textos con el propietario.
3. Resolver estados 404 reales de producto/perfil y placeholders públicos heredados, diferenciando inexistencia de errores de conexión.
4. Hacer visible el registro de propietarios mediante enlace al recorrido existente y revisar equivalencia de OAuth. Añadir aclaración de ciudades sin afirmar ausencia de oferta local.

Los cambios de WhatsApp y contacto quedan para revisión local. Publicarlos y trasladar los ajustes móviles previos a producción requiere una tarea posterior.

## Lote 2: prioridad geográfica y paginación — 25/11/2026

### Estado recuperado y reproducción

Se confirmó de nuevo `/home/nico/red-social`, rama `feat/premium-product-form-navigation`, HEAD `1f491ff8ce6f80e333f07548e299141fc863d993`. No se restauró a ningún commit: se partió del árbol con los cambios del usuario y del lote 1. Se releyó AGENTS.md. Las capturas/evidencias anteriores permanecen en `public-ui-evidence`; las nuevas se guardan en [geography-pagination-evidence](geography-pagination-evidence/).

GEO-01 y GEO-02 se reprodujeron antes de cambiar sus causas. Se conservaron las seis caracterizaciones anteriores y se ejecutaron además dos expectativas correctas contra copias temporales de las acciones recibidas, sin sustituir archivos de trabajo. Ambas fallaron: se entregó `businesses-dept-00` antes de un local y, de trece registros elegibles, la continuación solo recuperó dos. [Fallo normativo anterior](geography-pagination-evidence/before-regressions-failed.txt), [caracterización anterior](geography-pagination-evidence/before-characterization.txt). Las copias temporales se retiraron.

| Hallazgo | Causa reproducida | Corrección aplicada |
| --- | --- | --- |
| GEO-01, orden final | Se consultaba ciudad → departamento → país, pero ranking, mezcla de tipos y agrupación de tarjetas podían cruzar esos límites. Las cuatro consultas de “Para ti” tienen continuaciones independientes. | Se consume cada tramo antes del siguiente; se aplica el ranking existente dentro de cada ventana del tramo. “Para ti” reserva los externos recibidos hasta agotar los locales de todos los tipos; después hace lo mismo con departamento/resto del país. La composición y masonry se ejecutan por grupos geográficos. |
| GEO-02, omisiones entre páginas | El cursor era el último candidato del buffer, no un registro necesariamente entregado; un solo cursor se aplicaba a tres consultas distintas. `seenIds` cambiaba con cada respuesta. | Cursor opaco versionado que conserva tramo, posición de lectura de ese tramo, IDs pendientes ordenados del buffer y exclusiones iniciales. El buffer se consume antes de avanzar. Hay desempate explícito por ID y una lectura de anticipación que distingue página final de página con continuación. |
| Solapamiento nacional | La consulta nacional incluía otra vez candidatos locales/departamentales antes de deduplicar, consumiendo plazas del buffer. | Ciudad, departamento sin ciudad seleccionada y resto del país sin esos dos tramos son conjuntos excluyentes. Todos conservan sus filtros/visibilidad. |
| Caché/respuesta tardía | Las claves ya incluían ciudad, departamento, categoría y contexto: no se reprodujo un defecto independiente de claves de ciudad. | Se preservan esas dimensiones. Se versiona el prefijo de clave por el nuevo formato de cursor para evitar reutilizar resultados antiguos. La prueba retrasando una respuesta real confirma aislamiento tras cambiar ciudad. No se presenta esa prueba como un arreglo de un defecto de caché no demostrado. |

### Contrato implementado

- La ciudad se obtiene de `Negocio.ciudad` y `Negocio.departamento`; productos, servicios y publicaciones usan los campos de su relación `negocio`, ya incluidos en los selects. No se infiere por nombre, slug o apariencia. `locationTier` transporta ese nivel hasta el renderer, también para servicios cuyo DTO no tenía ciudad.
- Se mantiene la precedencia de consulta existente **ciudad → otras ciudades del departamento → resto del país**. La fórmula de puntuación, boosts, frescura, preferencias y diversidad no se modificó: `feedRanking.ts` y `feedForYou.ts` permanecen intactos. Se aplican dentro de los grupos en lugar de permitir que crucen la prioridad geográfica. No se promete una clasificación global de todos los registros por score: el producto ya ordenaba ventanas de candidatos; se conserva ese mecanismo.
- Se mantiene Prisma con cursor por ID y ventanas `limit + 10`; no se cambia a offset ni se carga el catálogo completo. `orden desc`, `createdAt desc`, `id asc` proporcionan una lectura determinista. El ID resuelve empates; el helper anterior ya contemplaba fecha como orden secundario, aunque no todas las consultas lo expresaban.
- `nextCursor` sigue siendo opcional y significa **existe otro elemento elegible**. No se inventa `total`. `hasMore` sigue derivándose de la existencia de continuación. `nextTier` indica el tramo del siguiente elemento, y desaparece junto al cursor al terminar. Una página completa que es la última no genera una página vacía adicional.
- El cursor `fg2` contiene IDs pendientes, no productos completos, y no crece con todos los resultados ya entregados. Las exclusiones iniciales se fijan al comenzar el recorrido: los IDs vistos que el cliente va agregando no invalidan candidatos pendientes. Se conserva la regla de “visto” al iniciar otro recorrido o pestaña; las pruebas de navegador contabilizan esa exclusión intencional.
- El cursor se vincula al tipo, ciudad/departamento, categoría, límite, usuario y señales de ranking. Uno de otra selección o formato se rechaza. Las claves de caché nuevas comienzan con `feed-v2-`; no se reutilizan cursores antiguos como si fuesen del nuevo protocolo.
- Se releen los candidatos pendientes con filtros públicos actuales. Una consulta local fallida produce error/reintento; no se interpreta como ausencia de oferta para avanzar silenciosamente a otras ciudades.
- Categoría, `disponible`, visibilidad PUBLICA, tipos de publicación y política PUBLISHED se mantienen en todas las consultas, incluidas las relecturas del buffer. Preferencias/secciones continúan siendo señales de ranking. La búsqueda del header usa `/api/search`, no estas acciones; no se cambió ese recorrido independiente. Tampoco se amplió este lote a los filtros secundarios de UI documentados históricamente que no participan en las rutas por categoría verificadas.

### Archivos de este lote

Implementación:

- Nuevos `src/feed/actions/feedPage.ts` y `src/feed/geography.ts`.
- `src/feed/actions/getFeedData.ts` y `getFeedDataByCategory.ts`: consultas excluyentes, lectura del cursor/buffer, desempate y metadatos de continuación. Se retiraron sus implementaciones duplicadas defectuosas de `fetchWithPriority`.
- `src/feed/feed.interfaces.ts`: `locationTier` y `nextTier` opcionales.
- `src/feed/componentes/FeedComponent.tsx`: coordinación de continuaciones por tramo, composición dentro de cada grupo y versión de caché. Se conserva el selector de ciudad y sus claves de selección.
- `src/publicaciones/componentes/FeedRederer.tsx`: misma cadencia y tarjetas por grupo; masonry separado por tramo para que una columna de escritorio no levante externos por encima del último local. Sin cambios CSS. Se añadió un atributo al sentinel para verificar el scroll real.

Pruebas/documentación:

- `publicGeography.audit.test.ts` sustituye las caracterizaciones de errores conocidos por regresiones que exigen el comportamiento correcto; se adaptan los tests existentes de ambas acciones a los cursores/nacional excluyente y se añade `geography.test.ts`.
- `e2e/geography-pagination`: fixtures en memoria, adaptador Prisma de pruebas, wrapper del servidor de auditoría y tres recorridos Playwright.
- `e2e/public-ui-audit/public-ui.spec.ts` solo recibe una variable para guardar la nueva ejecución de regresiones en otra carpeta; no sobrescribir las capturas del primer lote.

### Comprobaciones actuales (no cifras heredadas)

La selección actual de siete suites Jest pasó **103 pruebas**. Incluye acciones del feed, geografía, helper de teléfono y reglas de visibilidad: [resultado actual](geography-pagination-evidence/unit-results.txt). Los escenarios recorren todas las páginas, no solo una página ordenada:

| Caso | Datos y comprobación |
| --- | --- |
| A | 27 locales, 3 del departamento y 6 nacionales; límite 4. Los 36 registros se recuperan y ningún externo precede a los 27 locales. Se ejecuta para los cuatro tipos de contenido. |
| B | 5 locales, 3 del departamento y 5 nacionales; límite 4. La segunda página cruza el límite local: `[local, departamento, departamento, departamento]`. La concatenación coincide con todos los IDs elegibles, sin duplicados. |
| C | Sin oferta local/departamental y 9 nacionales; se recuperan los 9 en tres páginas, con fin correcto. |
| D | Una última página exactamente llena y un conjunto sin coincidencias elegibles. Se excluyen categoría incorrecta, negocios de prueba, contenidos no disponibles, publicaciones privadas y tipos no admitidos, incluso en la ampliación. Los estados usados corresponden al esquema real. |
| Empates | Se invierte el orden de entrada de los fixtures con la misma fecha/orden. La secuencia completa se mantiene. También se modifican los `seenIds` entre páginas como hace el cliente. |
| Más de 500 / sin departamento | 503 locales y 3 externos; límite 100. Se recuperan los 506 y los cursores siguen por debajo de 10 KB con ese conjunto. No dependen de acumular todos los IDs entregados en la lista del cliente. |
| Selección y fallos | Rechazo de cursor de otra ciudad, categoría, tipo o señales de ranking. Una lectura local fallida no se convierte en expansión por supuesta falta de locales. |

El navegador usa la aplicación y **Server Actions reales**, con un adaptador Prisma de memoria en el servidor y una URL de base inalcanzable. Las respuestas del feed no se sustituyen por arrays preordenados en Playwright: atraviesan las consultas, paginación, ranking, mapeo y serialización de la implementación. La portada se sirve a través del harness temporal existente con `FeedComponent`; `/category/comida` es la ruta real. Se bloquean solicitudes externas y cualquier mutación que no sea una acción de lectura del feed.

Los recorridos comprueban portada, varias páginas, cambio Tunja → Bogotá a través del selector real, y una continuación anterior retenida y liberada después de seleccionar Bogotá. Next serializa estas acciones: la respuesta antigua se libera antes de esperar las lecturas nuevas que quedan en cola. Se comprueba que el listado se vacía al cambiar selección y que el resultado final corresponde al nuevo recorrido y sus exclusiones iniciales. Se repite la paginación con categoría Comida y pestaña Productos, y después con “Para ti”.

La matriz de presentación mide 360, 390, 430 y 1440 px porque se separaron los grupos masonry. Se verifican el orden DOM y el orden vertical efectivo al terminar las animaciones existentes, final de listado, ausencia de desbordamiento, acciones de 44 px, precio/WhatsApp/carrito en fila y distintivo sobre el avatar móvil. Las regresiones del primer lote se vuelven a ejecutar en esta sesión, con nueva evidencia en `geography-pagination-evidence/first-batch-regression`.

Resultado actual: **3 pruebas nuevas de navegador aprobadas y 8 regresiones del primer lote ejecutadas otra vez y aprobadas**. Son once comprobaciones actuales, además de las 103 unitarias. [Navegador de geografía](geography-pagination-evidence/browser-results.txt), [regresión del lote 1](geography-pagination-evidence/first-batch-regression-results.txt), [medidas de los cuatro anchos](geography-pagination-evidence/geography-layout.json), [solicitudes y orden renderizado tras cambiar ciudad](geography-pagination-evidence/browser-real-actions.json), [categoría y páginas](geography-pagination-evidence/browser-category.json).

Las pruebas nuevas pasaron juntas en una ejecución; al volver a capturar evidencia de imágenes y conservar el orden renderizado sin ordenar el array de evidencia, un arranque en frío dejó la primera navegación sin hidratar. Ese recorrido se repitió con el servidor listo y pasó; categoría y matriz final también pasaron. Se conservan el [primer resultado completo](geography-pagination-evidence/browser-initial-all-pass.txt) y el [arranque en frío](geography-pagination-evidence/browser-cold-start.txt). No se presenta esa carga de desarrollo como un bloqueo permanente de la portada de producción. Las capturas de este lote son sintéticas y las de la matriz final esperan la carga de las imágenes visibles.

`pnpm typecheck` pasó con los fixtures retirados; el lint enfocado de los once archivos fuente/pruebas afectados pasó sin advertencias ni errores. `pnpm lint` completo se repitió y sigue fallando por el enlace `<a>` de `AssistedProductCreationClient.tsx:3516`, ya existente y no modificado en este lote. [Tipos](geography-pagination-evidence/typecheck-results.txt), [lint enfocado](geography-pagination-evidence/lint-changed-files.txt), [lint completo](geography-pagination-evidence/lint-full-results.txt). No se actualizó ninguna dependencia ni configuración para resolver ese error ajeno.

### Reproducir sin datos remotos

```bash
pnpm exec jest src/feed/actions/getFeedData.test.ts src/feed/actions/getFeedDataByCategory.test.ts src/feed/actions/publicGeography.audit.test.ts src/feed/geography.test.ts src/lib/contact/phone.test.ts src/lib/business/business-visibility-policy.test.ts src/lib/business/publicBusinessVisibility.test.ts --runInBand --coverage=false
node e2e/geography-pagination/prepare.cjs
NODE_OPTIONS=--max-old-space-size=6144 node e2e/geography-pagination/dev-server.cjs
# En otra terminal, con el servidor de pruebas listo:
pnpm exec playwright test --config=e2e/geography-pagination/playwright.config.ts
PUBLIC_UI_EVIDENCE_DIR=docs/audits/geography-pagination-evidence/first-batch-regression pnpm exec playwright test --config=e2e/public-ui-audit/playwright.config.ts
# Detener el servidor temporal; retirar únicamente sus fixtures y caché:
node e2e/mobile-feed-implementation/prepare.cjs --clean
pnpm typecheck
```

Se admite `AUDIT_CHROMIUM_PATH` para el Chromium existente. No se ejecutó generación de fixtures remotos, migraciones, push ni despliegue.

### Límites e integración

No hay instantánea entre solicitudes. Si cambian orden, ciudad, visibilidad o existencia de registros durante el recorrido, la secuencia puede variar; no se ha diseñado una garantía nueva para todas las modificaciones concurrentes. En particular, eliminar la fila usada como cursor de DB puede requerir reiniciar ese recorrido. Los tests de completitud usan datos fijos. Las relecturas del buffer vuelven a exigir visibilidad actual. No se afirma una prueba SQL contra PostgreSQL real: Prisma se valida por tipos y su interfaz se ejercita mediante el adaptador aislado; no se consultó ni escribió la base remota.

Separación del trabajo para revisión:

1. **Anterior a la auditoría:** tarjetas/estilos móviles, navegación, onboarding, administración y otros cambios ya existentes. No forman parte de la corrección de geografía. Los archivos de ranking y mezcla, selectores, esquema y configuración se preservan.
2. **Lote 1:** normalización de WhatsApp y consumidores, contacto y validación de categorías. Su delta original permanece en `public-ui-evidence/source-changes.patch`. No se modificaron sus consumidores ni helper en este lote.
3. **Lote 2:** archivos enumerados arriba. `FeedRederer.tsx` comparte cambios previos de diseño del usuario: el nuevo delta se aplica sobre ellos y no debe confundirse con todo el `git diff` desde HEAD. El backend de geografía no depende de WhatsApp/contacto; el arreglo completo de “Para ti” sí requiere integrar juntos backend, metadatos y coordinación/renderizado del cliente. El prefijo de caché y formato de cursor deben viajar en esa misma integración. El cambio de renderer debe adaptarse manualmente si se integra sobre otra versión de la UI.

No se concluye que toda la rama esté lista para integrar por haber pasado estas pruebas. Antes de publicar: revisar los deltas separados, resolver/aceptar explícitamente los errores ajenos de la rama, validar contra un entorno de datos aislado con Prisma/PostgreSQL real y preparar un despliegue como tarea posterior. Continúan fuera del lote los contenidos persistidos identificados, los 404 de fichas, el acceso comercial para propietarios y el error previo de lint de administración.

Para revisión: [delta exclusivo del segundo lote](geography-pagination-evidence/second-batch-changes.patch), [inventario de archivos y preservación de cambios previos](geography-pagination-evidence/change-inventory.json). El inventario compara 102 archivos recibidos y no detecta modificaciones ajenas al alcance declarado. Los fixtures, arte y caché temporales se retiran al finalizar; se conserva su preparación reproducible en `e2e/geography-pagination`.
