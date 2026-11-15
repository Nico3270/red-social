# Myckeo — Revisión del header, búsqueda, modal Crear y composición de productos

**Estado: `MYCKEO_HEADER_CREATE_MODAL_UX_READY_FOR_REVIEW`**

Fecha: 15 de noviembre de 2026.

## Alcance y método

Esta iteración reordena Componentes dentro del formulario aprobado y corrige la distribución del header público, la presentación de búsqueda y el diálogo Crear. Myckeo Ruby permanece como paleta definitiva del formulario.

Se inspeccionaron los consumidores antes de editar. La evidencia visual procede de Chromium local con **componentes reales**, layout público real, fuentes e iconos locales; sesión, navegación y respuestas de búsqueda están simuladas. El contenido central que acompaña al header es una maqueta identificada en las capturas. No es una captura de producción ni una sesión autenticada. No hay archivos adjuntos de las capturas originales disponibles en este entorno: los defectos se reproducen desde el código anterior.

Los recorridos interceptan la red. No se consultaron registros reales ni se guardaron productos, preferencias, imágenes o descripciones en producción.

## Auditoría de impacto y consumidores

| Componente | Consumidores y alcance |
| --- | --- |
| `TopMenu.tsx` | `src/app/(catalogo)/layout.tsx` y `src/app/empty/layout.tsx`, cuando el viewport CSS supera 768 px. |
| `TopMenuMobile.tsx` | Los mismos layouts, hasta 768 px inclusive. Header fijo superior, navegación inferior y selector de ubicación. |
| `SearchBar.tsx` | Exclusivamente los dos headers anteriores, con `compact` en descubrimiento. No lo utiliza el dashboard. |
| `Crear.tsx` / `CrearModal` | Exclusivamente los dos headers. Cada uno conserva su estado local y su condición original de apertura. |
| `SideBar.tsx` | Drawer de perfil abierto por ambos headers. Se inspeccionó y se utiliza sin modificaciones. |
| `MenuSectionBar.tsx` | Franja de categorías del header. Conserva su scroll horizontal intencionado y sus destinos. No se modificó. |
| Dashboard | Usa su propio layout/`TopBarDashBoard`, sin dependencia de estos headers. No se cambió. |

Rutas cubiertas por el layout público: `/`, `/inicio`, `/category/[slug]`, `/[categoria]`, `/[categoria]/[seccion]/[slug]`, `/seccion/[slug]`, `/producto/[slug]`, `/perfil`, `/perfil/[slug]`, `/favoritos`, `/carro`, `/checkout`, `/checkout/[slug]`, `/address`, `/address/[slug]`, `/encuestas/[slug]`, `/reservas/[slug]`, `/reservas/gestionar`, `/reservas/eliminar/[id]`, `/crear_negocio/[id]`, `/carrusel`, `/not_authorized`, `/politica-privacidad`, `/politica-cookies`, `/politica-publicidad` y `/terminos-servicio`. `/empty` utiliza el segundo layout. Se conservaron las redirecciones de onboarding de ambos layouts.

### Sesiones y roles: reglas existentes conservadas

| Sesión | Header de escritorio | Navegación móvil |
| --- | --- | --- |
| Sin sesión | Inicio, Carro, Favoritos, Perfil, Ayuda; sin Crear. Perfil permite iniciar sesión. | Mismos accesos; sin Crear. |
| `user` | Sin Crear; perfil con acceso al dashboard. | Crear disponible. |
| `negocio` | Crear disponible; perfil con dashboard y perfil comercial. | Mi negocio lleva a `/dashboard`, en lugar de Crear. |
| `admin` / `super_admin` | Sin Crear; opciones específicas del drawer conservadas. | Crear disponible por la condición existente de sesión sin rol negocio. |

La diferencia de disponibilidad de Crear entre escritorio y móvil **ya existía**. Esta revisión no cambia permisos ni reglas de negocio. Los roles adicionales usan la misma condición original; el drawer conserva su fallback existente.

Carro mantiene `/carro` cuando hay elementos y `/empty` cuando está vacío. Favoritos conserva `/favoritos`. Ayuda conserva sus enlaces WhatsApp. Ubicación conserva Zustand, GPS, ciudades/departamentos y `updateUserPreferences`; no se cambió el guardado.

## Causas y correcciones

### Header y búsqueda

**Antes:** una sola fila Flexbox reunía logo de 100 px, marca de 24 px, grupo de búsqueda `w-full` con márgenes y máximos de ancho, ubicación y hasta seis acciones de 56 px con separaciones. Los hijos flex y el input conservaban mínimos intrínsecos (`min-width: auto`), sin una política coordinada de reducción. En anchos intermedios, la suma mínima superaba el espacio disponible; el buscador invadía la marca o desplazaba controles. El menú de resultados imponía 400 px desde `md`, independientemente del ancho de su columna.

La medición anterior a 1024 px confirma que el texto de marca ocupaba `x=120…222,44`, mientras la superficie de búsqueda comenzaba en `x=146,44`: unos 76 px de invasión. El enlace de marca se había reducido a un ancho menor que su texto; medir solo el enlace habría ocultado el defecto.

La búsqueda anterior no diferenciaba foco/blur ni aportaba navegación de sugerencias con flechas, semántica de combobox o cierre con Escape. Su carga era diferida 300 ms; una respuesta anterior podía llegar después de otra más reciente.

**Después:** una cuadrícula `auto minmax(0, 1fr) auto` reserva marca, zona central y acciones. Logo a 44 px; se conserva el nombre y su tipografía de 24 px. Grupo central y campo tienen `min-width: 0`; ubicación tiene límite local y nombre completo accesible. Las acciones tienen 48 × 48 px y mantienen etiquetas y destinos.

- Desde 1200 px, campo en línea con ancho fluido hasta 360 px. El foco resalta el campo sin agrandar la fila ni invadir controles. Resultados al 100 % de su columna y con altura limitada.
- Entre 769 y 1199 px, botón de búsqueda de 44 × 44 px abre una capa con campo completo. No se fuerza una expansión horizontal que compita con ubicación o acciones.
- Hasta 768 px, marca y ubicación ocupan la primera fila; búsqueda ocupa la segunda. Los accesos permanecen en la navegación inferior con objetivos táctiles de al menos 44 px.
- La capa utiliza `Dialog` existente de MUI: portal, foco contenido, Escape, backdrop, botón de cierre y altura limitada con `100dvh`. Se mantiene estable si se cruza 1200 px mientras está abierta, sin duplicar el input.
- Combobox/listbox, etiquetas accesibles, flechas/Enter, estados de carga/vacío/error y cierre por blur/clic exterior en escritorio. Se conserva el debounce de 300 ms y el endpoint; se abortan respuestas obsoletas. Es posible volver a buscar después de navegar o cerrar sugerencias.

El contrato sigue siendo `GET /api/search?query=…&limit=10`. Se conservan las cinco clases de resultado y sus destinos: producto, negocio, usuario, servicio y categoría. No se alteró el endpoint.

### Modal Crear

**Antes:** el overlay `fixed inset-0` se renderizaba dentro del header de escritorio con `backdrop-blur`. Ese `backdrop-filter` establece un bloque contenedor para descendientes fijos: el modal quedaba centrado respecto al header, de poca altura, y no respecto al viewport. Su parte superior quedaba en coordenadas negativas: el título se midió en `y=-150 px` tanto a 1024 como a 1440 px. El `max-height: 80vh` y el scroll del panel no corregían ese origen de coordenadas.

En móvil el modal era hermano del header y no sufría exactamente el mismo bloque contenedor. Aun así, compartía las carencias de semántica de diálogo, foco contenido/restaurado, Escape y bloqueo del scroll de fondo. El cierre no tenía nombre accesible.

**Después:** se reutiliza `Dialog` de MUI con portal fuera del header, ancho máximo `sm`, margen de 12 px y altura máxima `calc(100dvh - 24px)`. Título y cierre de 44 px permanecen disponibles; `DialogContent` tiene `min-height: 0` y scroll interno. El fondo blanco del header elimina el filtro que originaba el problema; no se cambia el tema global.

Las opciones forman una columna a 320 px, dos desde 360 px y tres desde 600 px. Las tarjetas conservan iconos, textos y rutas. El portal utiliza un z-index local superior al banner de consentimiento existente; no se modificó la escala global. Se respetan foco, Tab/Shift+Tab, Escape, backdrop, restauración del foco y del scroll, y `prefers-reduced-motion`.

| Opción conservada | Destino exacto |
| --- | --- |
| Nueva Publicación | `/dashboard/crear-publicacion` |
| Nuevo Servicio | `/dashboard/servicios` |
| Nuevo Producto | `/dashboard/productos/nuevo_producto` |
| Nuevo Pedido | `/dashboard/orders` |
| Nueva Transacción | `/dashboard/transacciones` |
| Crear Encuesta | `/dashboard/encuestas` |
| Crear Reservas | `/dashboard/reservas` |

### Formulario de producto

El único editor de Componentes está ahora **dentro de Información del producto, inmediatamente después de Nombre y antes de Descripción**. Sigue siendo un bloque propio, siempre visible, con acento Ruby. El orden restante es Descripción → IA opcional → Descripción corta → Categoría y Secciones → Precio e inventario → Variantes → Detalles adicionales → Crear producto; Fotografías continúa primero.

No cambian `componentesInput`, el array `componentes`, los handlers, el tratamiento de vacíos/duplicados ni la validación. IA recibe el mismo array como tercer argumento. Creación añade cada elemento mediante `formData.append("componentes", componente)` sin depender de IA. El resumen dentro de IA sigue siendo exclusivamente de lectura. Descripción manual, propuestas revisables y payload se conservan.

## Archivos de esta iteración

| Archivo | Cambio |
| --- | --- |
| `src/ui/components/productos/CreateNewProduct.tsx` | Mover el bloque existente entre Nombre y Descripción; composición únicamente. |
| `src/ui/components/productos/newProduct/newProduct.module.css` | Separación local y sutil del bloque de componentes dentro de Información. |
| `src/ui/components/topMenu/TopMenu.tsx` | Distribución de escritorio, marca, zona central y etiquetas de controles. |
| `src/ui/components/topMenuMobile/TopMenuMobile.tsx` | Distribución de dos filas, compensación de altura y acciones táctiles. |
| `src/ui/components/topMenu/publicNavigation.module.css` | Reglas locales de distribución, tamaños y foco. |
| `src/busqueda/componentes/SearchBar.tsx` | Campo adaptable, capa de búsqueda, accesibilidad y estados locales. |
| `src/busqueda/componentes/searchBar.module.css` | Estilos locales del campo, activador, foco y resultados. |
| `src/ui/components/topMenu/Crear.tsx` | Diálogo accesible con las siete opciones originales. |
| `src/ui/components/topMenu/createModal.module.css` | Cuadrícula adaptable y estilos discretos de las opciones. |
| `e2e/public-navigation/` | Harness aislado, límites simulados, configuración y pruebas de navegación. |
| `e2e/new-product/new-product.spec.ts` | Aserción explícita Nombre → Componentes → Descripción en las pruebas focalizadas existentes. |
| Este informe y `test-results/public-navigation/` | Evidencias de esta revisión. |

Los cambios previos del rediseño en `page.tsx`, `AutoUploadMedia.tsx`, documentos y pruebas ya estaban en el árbol de trabajo. **No son modificaciones nuevas de esta iteración.** No se cambian Server Actions, Prisma, Cloudinary, generación de IA del servidor, editor de productos, dashboard, infraestructura ni dependencias.

## Validación

**16 pruebas de navegación PASS y 7 pruebas focalizadas de producto PASS.**

| Ancho CSS | Header y roles | Búsqueda y resultados | Crear: opciones, cierre y límites |
| --- | --- | --- | --- |
| 320 px | PASS | PASS, capa | PASS, una columna y scroll cuando hace falta |
| 360 px | PASS | PASS, capa | PASS, dos columnas |
| 390 px | PASS | PASS, capa | PASS, dos columnas |
| 430 px | PASS | PASS, capa | PASS, dos columnas |
| 768 px | PASS | PASS, capa | PASS, tres columnas |
| 1024 px | PASS | PASS, activador compacto y capa | PASS, tres columnas |
| 1280 px | PASS | PASS, campo en línea | PASS, tres columnas |
| 1440 px | PASS | PASS, campo en línea | PASS, tres columnas |
| 1920 px | PASS | PASS, campo en línea | PASS, tres columnas |

La matriz recorre sin sesión, `user` y `negocio` en los nueve anchos. Se prueban además perfiles `admin` y `super_admin` a 390 y 1440 px; rutas de categoría, producto y perfil comercial a 390/1024/1440 px; carrito vacío y con elementos; drawer de perfil; y los siete destinos de Crear tanto en móvil como en escritorio.

**80 comprobaciones geométricas del diseño corregido:** ancho del documento, límites horizontales de controles, intersecciones entre marca/búsqueda/ubicación/acciones, objetivos táctiles y límites del diálogo. Ningún desbordamiento de página, superposición de controles principales, objetivo principal menor de 44 px ni diálogo fuera del viewport. La franja de categorías conserva su scroll y las etiquetas limitadas a dos líneas existentes: sus elementos fuera del área de scroll se distinguen del overflow accidental y no se contabilizan como controles principales recortados.

Pruebas funcionales adicionales:

- Sugerencias de cinco tipos, destinos exactos, flechas/Enter, carga, resultados vacíos, errores, respuestas obsoletas y cierre exterior/blur.
- Volver a buscar después de una navegación y de Escape; conservar el texto al cerrar la capa; pasar de 1024 a 1280 px con la capa abierta, sin duplicar el campo y devolviendo el foco al campo en línea al cerrar.
- Crear: todas las opciones alcanzables mediante scroll, cierre por botón/Escape/backdrop, Tab/Shift+Tab contenidos, foco de regreso al activador, bloqueo de scroll y misma posición de página al cerrar.
- Zoom **nativo de Chromium al 200 %**, mediante preferencias del navegador, sin simularlo con CSS: ventanas físicas de 1440 y 1920 px producen viewports CSS de 720 y 960 px, con `devicePixelRatio=2`. Header, búsqueda y Crear permanecen dentro del viewport.
- Ubicación: apertura/cierre en móvil y escritorio, título dentro del viewport y ninguna escritura de preferencias. La comprobación complementaria de capturas/zoom también pasa ([log](../test-results/public-navigation/zoom-browser.log)).
- Ventana corta de 320 × 420 px: Crear y búsqueda caben, el contenido se desplaza internamente y el cierre está visible. Se prueba `prefers-reduced-motion: reduce`.
- Formulario a 320/390/768/1440 px: orden Nombre → Componentes → Descripción, chips largos con wrap, IA abierta/cerrada, sin overflow ni regresiones de controles.
- Producto: agregar individualmente y por líneas, vacíos y duplicados conservados, eliminar por teclado, editar otros campos, error/reintento, payload con componentes sin abrir IA, creación sin componentes, contexto de IA, error de generación y descripción manual hasta aplicar la propuesta.

La revisión visual de las capturas confirma la marca completa, separación de controles, disposición móvil y todas las opciones de Crear accesibles. Las ventanas cortas muestran una parte de las opciones y permiten llegar al resto mediante scroll, sin perder título o cierre.

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS, con la advertencia previa de `_body` no usado en `src/app/activar/ActivationBootstrap.test.tsx:347` y el aviso de deprecación de `next lint`.
- `git diff --check`: PASS.
- Comparación de preservación: handlers/preparación del producto anteriores al render idénticos; los dos componentes locales de ubicación idénticos; servidor, schema, APIs, uploader y dashboard comprobados sin cambios respecto al inicio de esta iteración.

No se ejecutaron build, smoke con BD, pruebas de infraestructura ni operaciones destructivas: la validación se limita a composición, componentes, navegador local, TypeScript y lint.

Evidencias: [resultados de navegación](../test-results/public-navigation/results.json), [80 mediciones de layout y referencias anteriores](../test-results/public-navigation/layout-measurements.json), [preservación](../test-results/public-navigation/preservation-check.json), [log de navegador](../test-results/public-navigation/browser.log), [TypeScript](../test-results/public-navigation/typecheck.log), [lint](../test-results/public-navigation/lint.log), [resultados del formulario](../test-results/new-product/components-independent/results.json), [log del formulario de esta iteración](../test-results/public-navigation/product-browser.log).

```bash
# PRODUCT_TEST_BROWSER permite usar un Chromium local ya instalado.
pnpm exec playwright test --config=e2e/public-navigation/playwright.config.ts
pnpm exec playwright test --config=e2e/new-product/components-independent.config.ts
pnpm typecheck
pnpm lint
```

## Comparación visual

Todas las capturas siguientes están **simuladas y claramente identificadas**, con el mismo viewport y rol antes/después de navegación. La referencia anterior se obtiene de los cuatro componentes originales en `6e849626c6b3e77266bacf8dd9d5d69532395a51`, coincidentes con el estado anterior a esta iteración. Los componentes de formulario usan la versión aprobada más el ajuste de orden.

| Caso | Antes | Después |
| --- | --- | --- |
| Header, portátil 1024 px | [Antes](../test-results/public-navigation/1024-header-before.png) | [Después](../test-results/public-navigation/1024-header-after.png) |
| Crear, portátil 1024 px | [Antes](../test-results/public-navigation/1024-create-before.png) | [Después](../test-results/public-navigation/1024-create-after.png) |
| Header, escritorio 1440 px | [Antes](../test-results/public-navigation/1440-header-before.png) | [Después](../test-results/public-navigation/1440-header-after.png) |
| Crear, escritorio 1440 px | [Antes](../test-results/public-navigation/1440-create-before.png) | [Después](../test-results/public-navigation/1440-create-after.png) |
| Header, móvil 390 px | [Antes](../test-results/public-navigation/390-header-before.png) | [Después](../test-results/public-navigation/390-header-user-after.png) |
| Crear, móvil 390 px | [Antes](../test-results/public-navigation/390-create-before.png) | [Después](../test-results/public-navigation/390-create-after.png) |

Búsqueda: [320 px](../test-results/public-navigation/320-search-after.png), [1024 px](../test-results/public-navigation/1024-search-after.png), [1440 px](../test-results/public-navigation/1440-search-after.png).

Ventana corta: [Crear a 320 × 420 px](../test-results/public-navigation/320-create-short-after.png). Zoom nativo al 200 %: [ventana de 1440 px](../test-results/public-navigation/1440-zoom-200.png), [ventana de 1920 px](../test-results/public-navigation/1920-zoom-200.png).

Formulario, con el orden final: [320 px](../test-results/new-product/components-independent/320-components-visible.png), [390 px](../test-results/new-product/components-independent/390-components-visible.png), [768 px](../test-results/new-product/components-independent/768-components-visible.png), [1440 px](../test-results/new-product/components-independent/1440-components-visible.png).

## Límites de la evidencia

La validación de navegación verifica los href y las órdenes de navegación simuladas; no ejecuta las operaciones de las siete pantallas de destino. El formulario verifica el FormData hacia `createProduct` simulado y el contexto hacia IA simulada; la persistencia real no se ejercita contra BD. Los contratos y las implementaciones del servidor se mantienen intactos.

Se comprueban Chromium, zoom real y viewport de altura reducida; no se dispone de teclado virtual de iOS/Android ni de sesión autenticada real en este entorno. La altura dinámica y el scroll están implementados, pero la interacción con esos teclados físicos queda fuera de la evidencia local.

Sin commits, pushes, merges ni despliegues.
