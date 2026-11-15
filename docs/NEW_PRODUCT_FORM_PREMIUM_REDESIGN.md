# Nuevo producto — Rediseño premium y validación

**Estado: `NEW_PRODUCT_FORM_PREMIUM_REDESIGN_READY_FOR_REVIEW`**

Ruta: `/dashboard/productos/nuevo_producto`. Implementación basada en la [auditoría aprobada](NEW_PRODUCT_FORM_UX_AUDIT.md). Sin commits, pushes, despliegues ni operaciones reales sobre productos, imágenes o bases de datos.

## Resultado visual

El formulario ahora tiene un encabezado sencillo, una única superficie de trabajo de hasta 960 px y secciones separadas por espacio y líneas suaves. Las fotografías aparecen primero. La descripción manual está visible desde el inicio; la asistencia con IA es secundaria y plegable. Precio, inventario y estado están juntos. Las variantes se activan y agregan en su propia sección. Componentes, atributos, palabras clave y slug quedan en Detalles adicionales.

Se reutilizan Inter y Montserrat Alternates locales, MUI, Tailwind y los iconos existentes en el proyecto. Inputs simples de aproximadamente 48–50 px, radios de 10–12 px en controles, fondos blancos/grises, texto oscuro y foco visible. No se cambia el tema global ni el editor de perfil.

| Antes | Después |
| --- | --- |
| Título con sombra y ayuda roja grande. | Título «Nuevo producto», regreso a Productos, subtítulo y ayuda discreta. |
| Fotografías después de categoría y secciones; previews rígidas. | Fotografías primero, CSS Grid adaptable, estados pendientes/subidas y error local. |
| Explicaciones sobre IA antes de la descripción manual. | Descripción manual primero; propuesta de IA revisable y aplicable de forma explícita. |
| Categorías y secciones como cajas clicables. | Categoría con búsqueda y teclado; multiselección de secciones con checkbox, búsqueda y chips. |
| Precio lejos del stock; variantes activadas dentro de inventario. | Precio, stock y estado agrupados; interruptor y alta de variantes juntos. |
| Validación RHF invisible y modal artesanal. | Errores junto a campos, nombres accesibles, foco y Dialog MUI para progreso/error/éxito. |
| Varios botones principales con el mismo peso. | «Crear producto» como único CTA principal; las otras acciones son secundarias. |

## Archivos modificados y añadidos

| Archivo | Cambio |
| --- | --- |
| [page.tsx](../src/app/dashboard/productos/nuevo_producto/page.tsx) | Composición del encabezado y contenedor local; conserva `force-dynamic`. |
| [CreateNewProduct.tsx](../src/ui/components/productos/CreateNewProduct.tsx) | Reorganización visual, selectores accesibles, errores inline, propuesta IA explícita, estados separados y bloqueo de reentrada. Se conserva el contrato FormData. |
| [AutoUploadMedia.tsx](../src/ui/components/autoUpload/AutoUploadMedia.tsx) | Prop opcional `presentation="productGallery"` y rama visual de galería. El comportamiento y el JSX de la presentación anterior se conservan fuera de esa rama. |
| [NewProductHeader.tsx](../src/ui/components/productos/newProduct/NewProductHeader.tsx) | Encabezado local y ayuda en diálogo accesible. |
| [NewProductField.tsx](../src/ui/components/productos/newProduct/NewProductField.tsx) | Etiquetas externas asociadas al control, completas incluso en anchos pequeños. |
| [newProduct.module.css](../src/ui/components/productos/newProduct/newProduct.module.css) | Estilos encapsulados, container queries para columnas, foco, objetivos táctiles y movimiento reducido. |
| [e2e/new-product](../e2e/new-product/) | Arnés y pruebas Playwright con fronteras simuladas. |
| [test-results/new-product](../test-results/new-product/) | Capturas, mediciones y resultados de validación. |

No se modifican Server Actions, APIs, esquema Prisma, seed, autorización Cloudinary, sidebar, topbar ni sus componentes compartidos. El arnés importa el **layout real del dashboard**, sustituyendo únicamente el contenido de navegación por contenido ficticio. Los estilos globales permanecen intactos. La [comparación del uploader](../test-results/new-product/preservation-check.json) confirma que su lógica existente y su render predeterminado permanecen idénticos.

## Capacidades conservadas

| Área | Datos y comportamiento conservados |
| --- | --- |
| Información | Nombre, descripción manual, descripción corta opcional, tags y slug generado de solo lectura; `prioridad=1` interno. |
| Clasificación | Las 18 categorías y 159 secciones del seed, una categoría y múltiples secciones dependientes. Cambiar categoría restablece secciones; elegir de nuevo la misma categoría ya no borra selecciones. |
| Fotografías | Selección múltiple, optimización existente, autorización firmada, subida, URLs completadas, mínimo una imagen y borrado autorizado. Sin portada ni orden persistido nuevo. |
| IA | Nombre, características y componentes como contexto; generación de descripción, descripción corta y palabras clave. Los resultados se muestran como propuesta antes de escribirlos en los campos. |
| Componentes y atributos | Agregar componentes por líneas, eliminarlos, agregar/quitar pares nombre–valor y conservarlos al plegar. Se avisa del texto de componentes aún sin agregar y de que solo se guardan pares completos. |
| Precio e inventario | COP explícito, precio cero válido, stock general limitado/ilimitado y cantidad cero válida. Los cuatro estados del producto siguen disponibles. |
| Variantes | Nombre, SKU, precio propio nullable/heredado, stock limitado/ilimitado, cantidad, activa/inactiva, imagen por URL y opciones descriptivas. No se generan combinaciones automáticamente. |
| Creación | Mismo `createProduct(FormData)`, mismas claves y relaciones; store auxiliar y destino público basado en la primera sección seleccionada. Éxito mantiene navegación automática a los 2 s o mediante «Ver producto». |

La fuente de verdad del negocio y la persistencia siguen en servidor. Las pruebas del rediseño comprueban el payload hacia la acción simulada; no sustituyen una comprobación real de persistencia autenticada.

## Usabilidad, accesibilidad y estados

- Campos obligatorios identificados y errores asociados mediante MUI/RHF; el primer error de RHF recibe foco. Fotografías, secciones y variantes tienen mensajes locales y regiones enfocables.
- Categoría buscable con Autocomplete, secciones múltiples y navegación por teclado. El estado del producto tiene etiqueta accesible explícita.
- Desplegables nativos `details/summary`: teclado, estado expandido y conservación de valores sin animación de altura.
- Papeleras con nombres accesibles para fotografía, variante, atributo y opción. Botones, resúmenes, chips y controles de selección con áreas táctiles verificadas.
- La IA conserva el texto manual al generar o fallar. «Usar propuesta» explica y ejecuta el reemplazo de los tres campos; «Descartar» no modifica el formulario.
- `mediaLoading` y envío separados. La galería indica pendientes/subidas y bloquea la creación durante la subida. Las fotografías pendientes no presentan una acción de cancelación de red inexistente; la eliminación se ofrece una vez subidas.
- Ref síncrona para bloquear reentrada de `onSubmit`, además de botón deshabilitado y bloqueo posterior al éxito. Esto protege la instancia del formulario; no introduce idempotencia entre pestañas o clientes externos.
- Durante el envío se conserva «Creando producto…». El diálogo no se cierra por Escape/backdrop mientras la petición continúa. Error permite regresar con todos los datos y reintentar; éxito permite ver el producto.
- Dialog MUI aporta semántica, gestión de foco y contención de teclado. Máximo de altura basado en `100dvh`; menús con altura limitada al espacio de pantalla. Foco visible y respeto de `prefers-reduced-motion`, también en diálogos y menú de estado.
- El CTA queda al final del formulario, en flujo normal y con ancho completo en móvil. No hay una barra flotante que cubra campos o compita con el teclado.

## Evidencia y límites del navegador

**Todas las capturas de este informe son simuladas y están identificadas en pantalla.** Renderizan los componentes reales con CSS/fuentes locales y el layout real del dashboard. Las solicitudes a Cloudinary se interceptan; las acciones de IA y creación son stubs. La imagen y los datos de café son ficticios. `next/image` se sustituye por un elemento de imagen con el mismo comportamiento de tamaño para este arnés; no se prueba el optimizador remoto de Next.

No se reutilizan cookies, perfiles autenticados ni registros productivos. La navegación de éxito se registra en el arnés. YouTube está bloqueado en las pruebas: se comprueba el diálogo de ayuda, no el contenido del video. No se declara validación autenticada en producción, en Safari/iOS ni en un teclado virtual físico.

### Capturas comparables

El formulario y uploader “antes” se obtienen del commit auditado `6e849626c6b3e77266bacf8dd9d5d69532395a51`. El encabezado anterior se reconstruye en el arnés a partir de su composición original; el contenido de navegación es ficticio en ambos casos. La comparación es reproducible, no una captura histórica de producción.

| Tamaño | Antes | Después |
| --- | --- | --- |
| Móvil · 390 px | [Formulario anterior](../test-results/new-product/390-before.png) | [Formulario rediseñado](../test-results/new-product/390-after-initial.png) |
| Escritorio · 1440 px | [Formulario anterior](../test-results/new-product/1440-before.png) | [Formulario rediseñado](../test-results/new-product/1440-after-initial.png) |
| Zoom real 200 % · ventana 1440 px | — | [Formulario con variantes](../test-results/new-product/1440-zoom-200.png) |

### Matriz responsive obligatoria

Cada ancho recorre estado inicial, galería con tres fotografías, menú de categoría, menú de secciones, variante abierta con opciones, atributo añadido, diálogo de progreso y diálogo de error. Se miden límites de elementos, ancho del documento, recorte de etiquetas, invasión del sidebar y tamaño de objetivos táctiles; se guardan capturas y se revisan visualmente.

| Ancho | Resultado | Inicial | Expandido | Diálogo | Categoría / secciones |
| --- | --- | --- | --- | --- | --- |
| 320 px | PASS | [Ver](../test-results/new-product/320-after-initial.png) | [Ver](../test-results/new-product/320-after-expanded.png) | [Ver](../test-results/new-product/320-after-dialog.png) | [Categoría](../test-results/new-product/320-category-menu.png) / [Secciones](../test-results/new-product/320-sections-menu.png) |
| 360 px | PASS | [Ver](../test-results/new-product/360-after-initial.png) | [Ver](../test-results/new-product/360-after-expanded.png) | [Ver](../test-results/new-product/360-after-dialog.png) | [Categoría](../test-results/new-product/360-category-menu.png) / [Secciones](../test-results/new-product/360-sections-menu.png) |
| 390 px | PASS | [Ver](../test-results/new-product/390-after-initial.png) | [Ver](../test-results/new-product/390-after-expanded.png) | [Ver](../test-results/new-product/390-after-dialog.png) | [Categoría](../test-results/new-product/390-category-menu.png) / [Secciones](../test-results/new-product/390-sections-menu.png) |
| 430 px | PASS | [Ver](../test-results/new-product/430-after-initial.png) | [Ver](../test-results/new-product/430-after-expanded.png) | [Ver](../test-results/new-product/430-after-dialog.png) | [Categoría](../test-results/new-product/430-category-menu.png) / [Secciones](../test-results/new-product/430-sections-menu.png) |
| 768 px | PASS | [Ver](../test-results/new-product/768-after-initial.png) | [Ver](../test-results/new-product/768-after-expanded.png) | [Ver](../test-results/new-product/768-after-dialog.png) | [Categoría](../test-results/new-product/768-category-menu.png) / [Secciones](../test-results/new-product/768-sections-menu.png) |
| 1024 px | PASS | [Ver](../test-results/new-product/1024-after-initial.png) | [Ver](../test-results/new-product/1024-after-expanded.png) | [Ver](../test-results/new-product/1024-after-dialog.png) | [Categoría](../test-results/new-product/1024-category-menu.png) / [Secciones](../test-results/new-product/1024-sections-menu.png) |
| 1440 px | PASS | [Ver](../test-results/new-product/1440-after-initial.png) | [Ver](../test-results/new-product/1440-after-expanded.png) | [Ver](../test-results/new-product/1440-after-dialog.png) | [Categoría](../test-results/new-product/1440-category-menu.png) / [Secciones](../test-results/new-product/1440-sections-menu.png) |

Resultados medidos: [responsive-measurements.json](../test-results/new-product/responsive-measurements.json). Sin desbordamiento horizontal, etiquetas recortadas, invasión del sidebar o objetivos de acción inferiores a 44 px en los estados medidos. Las tablas no sustituyen el navegador: estas mediciones proceden de Chromium renderizando los componentes.

Se verifica adicionalmente una altura disponible de 420 px a 390 px de ancho para contenido expandido, menús y diálogo de ayuda. El zoom al 200 % es una preferencia real de un perfil temporal de Chromium: `outerWidth=1440`, `innerWidth=720`, `devicePixelRatio=2`. No se usa `transform: scale` ni CSS `zoom` como sustituto. La preferencia por partición sigue el mecanismo de [Chromium](https://chromium.googlesource.com/chromium/src/+/3b81a4d7142d0a1061a6a3c862040fabc44fab6d/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc).

### Problemas detectados y corregidos durante la validación

| Problema | Corrección local y evidencia |
| --- | --- |
| Labels flotantes largos podían truncarse en anchos pequeños. | `NewProductField` usa etiquetas externas con salto de línea. La medición de labels y las capturas expandidas comprueban el resultado. |
| Flecha del Autocomplete quedaba desplazada verticalmente. | Se ajustó su transformación y alineación; se comprobaron menús y capturas. |
| Foco combinaba borde azul MUI y outline interior. | Borde oscuro y halo suave en el contenedor del campo; outline visible para acciones. |
| El sidebar heredado mide 250 px, pero el contenido deja 200 px. | Inset de 32 px solo en el contenedor de esta ruta entre 769 y 1279 px. Las pruebas usan el layout real y comprueban que no invada el formulario. No se modifica el layout global. |
| Una regla añadida de stock podía seguir exigiendo un campo oculto tras cambiar a ilimitado. | La validación consulta los valores actuales con `getValues`; prueba de cambio de modo, error, reintento y éxito. |
| El label visual de Estado requería asociación explícita con el select MUI. | `labelId` local y prueba por rol/nombre accesible con selección de Agotado. |
| Captura `fullPage` de Chromium recortaba el archivo al usar zoom nativo. | Captura mediante CDP con dimensiones DIP; se comprueba el ancho del PNG. Era un defecto de la evidencia, no un desbordamiento del DOM. |

## Pruebas ejecutadas

| Comprobación | Resultado |
| --- | --- |
| Playwright del formulario | 17 pruebas PASS: matriz de siete anchos, requeridos/foco/teclado, IA explícita y fallos, subida/borrado simulados, payload, doble envío, zoom/movimiento reducido, reintento, stock cero/estado y variantes con precio propio/inactivas. |
| Regresión existente de uploader/perfil | 8 pruebas PASS, incluyendo subida firmada, fallos, limpieza rechazada, asset en uso y desvinculación local de asset antiguo. |
| Jest Cloudinary | 3 suites / 44 pruebas PASS: `uploadAuthorizedMedia`, `temporaryUploadAuthorization`, `isCloudinaryAssetReferenced`. |
| TypeScript | `pnpm typecheck` PASS. |
| Lint | `pnpm lint` PASS. Advertencia previa en `src/app/activar/ActivationBootstrap.test.tsx:347` por `_body` no usado; aviso de deprecación de `next lint`. No se cambia configuración. |
| Build | `pnpm exec next build --experimental-build-mode compile` PASS. Compilación Next de integración, sin prerenderizado ni generación de fixtures. No se ejecuta un build completo con lectura estática de datos externos. |
| Diff | `git diff --check` PASS. Cambios productivos limitados a página, formulario, componentes locales y presentación opt-in del uploader. |

Los resultados y logs quedan en [test-results/new-product](../test-results/new-product/). No se añaden dependencias. Una ejecución inicial de TypeScript coincidió con la regeneración de `.next/types` durante build; se repitió de forma secuencial al terminar para evitar archivos generados transitorios.

### Reproducir las pruebas

```bash
# Si Chromium no está en la ubicación estándar de Playwright,
# establecer PRODUCT_TEST_BROWSER con la ruta de un Chromium local instalado.
pnpm exec playwright test --config=e2e/new-product/playwright.config.ts

# Regresiones del uploader (PROFILE_TEST_BROWSER permite el mismo override).
pnpm exec playwright test --config=e2e/profile-editor/playwright.config.ts --grep 'uploader|reemplazo fallido'

pnpm exec jest src/lib/cloudinary/uploadAuthorizedMedia.test.ts src/lib/cloudinary/temporaryUploadAuthorization.test.ts src/lib/cloudinary/isCloudinaryAssetReferenced.test.ts --runInBand --coverage=false
pnpm typecheck
pnpm lint
pnpm exec next build --experimental-build-mode compile
```

El arnés compila componentes con el esbuild ya disponible a través de `tsx`, genera CSS local y bloquea cualquier solicitud externa no simulada. La comparación “antes” necesita que el commit auditado esté disponible en el checkout. Las comprobaciones de TypeScript deben ejecutarse después del build, sin regenerar `.next` simultáneamente.

## Límites pendientes, sin ampliación de alcance

- No hay creación, persistencia, autorización de sesión ni subida real autenticada verificadas contra un entorno conectado. No se afirma equivalencia completa con producción; el servidor no se modificó.
- Safari/iOS, Android real, lectores de pantalla y teclado virtual físico quedan para revisión manual. La reducción de altura y el zoom real en Chromium aportan evidencia local, no una certificación de dispositivos.
- Se conserva el filtrado original de filas incompletas. Una variante con solo URL de imagen sigue siendo omitida por el filtro existente; ahora un conjunto sin variantes válidas muestra error local. No se cambió la regla comercial de serialización.
- Stock sigue respaldado por `Int` en Prisma; la acción existente no valida explícitamente enteros antes de persistir. El formulario expone paso entero y errores existentes, sin rediseñar el contrato numérico. La validación del signo del precio de variantes tampoco se cambia.
- La galería no promete portada, orden persistido, crop ni cancelación de upload. Los mecanismos internos compartidos de optimización, object URLs y limpieza no se refactorizan en esta fase.
- El contenido del video de ayuda y el posible desfase entre seed y BD siguen sin verificarse. No se corrigen ids/slugs del catálogo ni reglas de negocio desde esta tarea.

**Entrega preparada para revisión. No se ejecutaron commits, pushes ni despliegues.**
