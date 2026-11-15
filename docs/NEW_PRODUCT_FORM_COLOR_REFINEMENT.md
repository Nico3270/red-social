# Nuevo producto — Componentes y comparación de paletas

**Estado: `NEW_PRODUCT_FORM_COLOR_REFINEMENT_READY_FOR_REVIEW`**

Refinamiento de `/dashboard/productos/nuevo_producto` sobre el [rediseño aprobado](NEW_PRODUCT_FORM_PREMIUM_REDESIGN.md). Se conserva su arquitectura, sus contratos y sus capacidades. Myckeo Ruby es la propuesta local inicial; la elección definitiva sigue pendiente de revisión. No hubo commits, pushes, despliegues ni operaciones reales en producción.

## 1. Nueva estructura del asistente

Dentro de Información del producto se mantienen el nombre y la descripción manual visibles. El desplegable «Ayúdame a escribir la descripción» contiene ahora, en este orden:

1. Explicación del funcionamiento de la propuesta.
2. Características principales.
3. Componentes del producto y botón «Agregar componentes».
4. Aviso de componentes pendientes de agregar, cuando corresponda.
5. Ayuda: **«Los componentes se guardan en la ficha del producto, aunque no uses IA.»**
6. Chips de componentes agregados, con eliminación y wrap.
7. «Generar descripción con IA».
8. Mensajes y propuesta para revisar, aplicar o descartar.

Se movió el bloque existente. No hay un segundo campo ni un segundo array: `componentesInput`, `componentes`, sus handlers y su serialización permanecen en el formulario. Detalles adicionales conserva atributos, palabras clave y slug; ya no contiene componentes ni los cuenta en su resumen.

### Persistencia independiente de IA

- Se puede agregar una entrada individual o varias líneas, y quitar componentes sin generar una descripción.
- Contraer el asistente no desmonta ni reinicia el estado. Las entradas agregadas sobreviven al cierre, reapertura y errores de IA o creación.
- `generateDescriptionFromText(nombre, caracteristicas, componentes)` sigue recibiendo el mismo array como tercer argumento.
- Crear producto sigue agregando cada componente a `FormData` bajo la clave `componentes`, aunque nunca se haya llamado a IA.
- El resultado de IA sigue siendo una propuesta. Generarlo no cambia la descripción manual; solo «Usar propuesta» reemplaza los tres campos, con el aviso existente.

La prueba verifica el payload de creación simulado y el código de persistencia existente permanece intacto. No se afirma una escritura real a base de datos durante esta fase.

## 2. Dos paletas, una implementación

La configuración vive en [newProductPalette.ts](../src/ui/components/productos/newProduct/newProductPalette.ts). Produce variables CSS locales para el formulario y sus portales MUI. Las dos alternativas usan exactamente los mismos componentes, dimensiones, datos y handlers.

| Token | Myckeo Ruby | Ocean Blue |
| --- | --- | --- |
| Acento | `#C93545` | `#2563EB` |
| Fondo suave | `#FFF0F1` | `#EFF6FF` |
| Texto principal | `#292C32` | `#1E293B` |
| Hover principal | `#AB2938` | `#1D4ED8` |
| Borde de acento | `#ECC5CB` | `#BFDBFE` |

Los acentos se aplican al CTA, iconos de sección, zona de fotografías, asistente, selecciones, switches, progreso y focos. Los inputs permanecen blancos y con bordes neutros en reposo. Se conservan los colores semánticos de error y éxito. No hay gradientes saturados ni sombras nuevas pesadas.

Se ajustaron las ayudas dentro del asistente a `#596273` para mantener legibilidad sobre los fondos suaves: contraste calculado de aproximadamente **5,55:1 en Ruby** y **5,64:1 en Ocean**. El texto blanco del CTA tiene contraste aproximado de **5,15:1** y **5,17:1**, respectivamente.

`DEFAULT_NEW_PRODUCT_PALETTE` está provisionalmente en `ruby`. La alternativa se solicita solo desde el arnés de revisión; no se añadió un selector, lectura de query de paleta ni almacenamiento de preferencias a la ruta de la aplicación. El [comparador local de capturas](../test-results/new-product/palette-comparison/index.html) es un artefacto de revisión independiente.

## 3. Comparación visual

Todas las capturas están en `test-results/new-product/palette-comparison/` y se identifican como **vistas simuladas**. Se renderizan el formulario y el layout real del dashboard; datos, imagen, navegación, IA y creación se simulan. No hay una sesión autenticada ni solicitudes reales a Cloudinary o al modelo.

| Vista | Myckeo Ruby | Ocean Blue |
| --- | --- | --- |
| Escritorio · 1440 px | [Inicial](../test-results/new-product/palette-comparison/ruby-1440-initial.png) · [Asistente abierto](../test-results/new-product/palette-comparison/ruby-1440-assistant.png) | [Inicial](../test-results/new-product/palette-comparison/ocean-1440-initial.png) · [Asistente abierto](../test-results/new-product/palette-comparison/ocean-1440-assistant.png) |
| Móvil · 390 px | [Inicial](../test-results/new-product/palette-comparison/ruby-390-initial.png) · [Asistente con chips y propuesta](../test-results/new-product/palette-comparison/ruby-390-assistant.png) | [Inicial](../test-results/new-product/palette-comparison/ocean-390-initial.png) · [Asistente con chips y propuesta](../test-results/new-product/palette-comparison/ocean-390-assistant.png) |

Comparaciones lado a lado: [escritorio](../test-results/new-product/palette-comparison/comparison-desktop.png), [móvil](../test-results/new-product/palette-comparison/comparison-mobile.png). Para abrir diferentes tamaños y estados sin tocar el formulario: [comparador HTML local](../test-results/new-product/palette-comparison/index.html).

**Recomendación: Myckeo Ruby.** Mantiene la relación con la identidad gris/rojo de Myckeo y da más personalidad a la acción principal y al asistente. Ocean ofrece una alternativa más fría y cercana a herramientas profesionales de gestión. Ambas conservan la misma jerarquía y legibilidad; la recomendación es estética, no una conclusión de investigación con usuarios.

## 4. Responsive verificado

Se recorren **ambas paletas** a 320, 360, 390, 430, 768, 1024 y 1440 px. Cada combinación comprueba:

- Estado inicial y acento del CTA.
- Asistente abierto, tres chips —uno con texto largo— y propuesta generada sin aplicar.
- Variante con stock limitado y opciones abiertas.
- Menús de categoría y secciones, incluidos los colores del menú portado fuera del formulario.
- Diálogo de progreso y error, con colores y dimensiones correctos.
- Ancho del documento, límites de elementos visibles, etiquetas, objetivos táctiles de al menos 44 px e invasión del sidebar.

Adicionalmente, a 390 × 420 px se prueban el asistente, su cierre/reapertura, la revisión y aplicación de IA, y el diálogo de resultado, con movimiento reducido activado. Se mantienen las estrategias responsive y de zoom del rediseño previo; no se repite su batería completa.

| Ancho | Ruby | Ocean | Evidencia con asistente abierto |
| --- | --- | --- | --- |
| 320 px | PASS | PASS | [Ruby](../test-results/new-product/palette-comparison/ruby-320-assistant.png) · [Ocean](../test-results/new-product/palette-comparison/ocean-320-assistant.png) |
| 360 px | PASS | PASS | [Ruby](../test-results/new-product/palette-comparison/ruby-360-assistant.png) · [Ocean](../test-results/new-product/palette-comparison/ocean-360-assistant.png) |
| 390 px | PASS | PASS | [Ruby](../test-results/new-product/palette-comparison/ruby-390-assistant.png) · [Ocean](../test-results/new-product/palette-comparison/ocean-390-assistant.png) |
| 430 px | PASS | PASS | [Ruby](../test-results/new-product/palette-comparison/ruby-430-assistant.png) · [Ocean](../test-results/new-product/palette-comparison/ocean-430-assistant.png) |
| 768 px | PASS | PASS | [Ruby](../test-results/new-product/palette-comparison/ruby-768-assistant.png) · [Ocean](../test-results/new-product/palette-comparison/ocean-768-assistant.png) |
| 1024 px | PASS | PASS | [Ruby](../test-results/new-product/palette-comparison/ruby-1024-assistant.png) · [Ocean](../test-results/new-product/palette-comparison/ocean-1024-assistant.png) |
| 1440 px | PASS | PASS | [Ruby](../test-results/new-product/palette-comparison/ruby-1440-assistant.png) · [Ocean](../test-results/new-product/palette-comparison/ocean-1440-assistant.png) |

Resultado: **102 comprobaciones de layout sin fallos** en los estados medidos. No se detectaron scroll horizontal, botones fuera de pantalla, recorte de etiquetas ni solapamiento con el menú lateral. Los chips largos envuelven el texto sin ensanchar la pantalla.

Durante la primera pasada se detectó que la selección del Autocomplete conservaba el azul predeterminado de MUI. Se corrigió la especificidad de los estilos locales del portal; ambas paletas ya verifican por navegador su color seleccionado. También se oscurecieron las ayudas sobre fondos suaves antes de generar las evidencias finales.

## 5. Validación ejecutada y alcance

| Comprobación | Resultado |
| --- | --- |
| Pruebas focalizadas Playwright | **16 PASS**: 14 combinaciones responsive y 2 flujos completos de componentes/IA, uno por paleta. |
| Guardado sin IA | Payload con componentes, `aiCalls=0`, error de creación y recuperación de datos verificados. |
| Generación y revisión | Se registran los argumentos de IA; componentes intactos tras fallo; manual intacto hasta aplicar. |
| Paletas | CTA, hover, foco, selección y progreso comprobados con colores computados. |
| TypeScript | `pnpm typecheck` PASS. |
| Lint | `pnpm lint` PASS. Persiste la advertencia previa de `_body` no usado en `src/app/activar/ActivationBootstrap.test.tsx:347` y la deprecación de `next lint`. |
| Límites de alcance | Comparación de hashes: servidor de productos, Prisma, endpoints Cloudinary, uploader, editor existente y layout compartido sin cambios en esta fase. Handlers de generación, componentes y envío idénticos a los previos. |

No se ejecutaron pruebas de infraestructura, Neon, migraciones, fixtures de BD, pruebas reales de subida ni un build completo. No se añadieron dependencias.

Evidencia: [resultados Playwright](../test-results/new-product/palette-comparison/results.json), [mediciones responsive](../test-results/new-product/palette-comparison/responsive-measurements.json), [alcance preservado](../test-results/new-product/palette-comparison/scope-preservation.json), [log de navegador](../test-results/new-product/palette-comparison/browser.log), [TypeScript](../test-results/new-product/palette-comparison/typecheck.log), [lint](../test-results/new-product/palette-comparison/lint.log).

Comando focalizado:

```bash
# PRODUCT_TEST_BROWSER puede señalar un Chromium local cuando sea necesario.
pnpm exec playwright test --config=e2e/new-product/palette-comparison.config.ts
pnpm typecheck
pnpm lint
```

El arnés registra los componentes enviados a IA únicamente en las pruebas. No añade observabilidad ni cambia la generación en la aplicación.

## 6. Archivos de esta fase

| Archivo | Refinamiento |
| --- | --- |
| [CreateNewProduct.tsx](../src/ui/components/productos/CreateNewProduct.tsx) | Bloque de componentes dentro del asistente, ayudas y presentación parametrizada. |
| [newProduct.module.css](../src/ui/components/productos/newProduct/newProduct.module.css) | Aplicación de tokens locales, asistentes/selecciones, focos y contraste de ayudas. |
| [newProductPalette.ts](../src/ui/components/productos/newProduct/newProductPalette.ts) | Única configuración Ruby/Ocean y propuesta inicial Ruby. |
| [NewProductHeader.tsx](../src/ui/components/productos/newProduct/NewProductHeader.tsx) | Tokens del encabezado y su diálogo local. |
| [harness.tsx](../e2e/new-product/harness.tsx) | Comparación de paleta solo en el entorno simulado. |
| [boundaries.tsx](../e2e/new-product/boundaries.tsx) | Registro simulado de argumentos de IA. |
| [new-product.spec.ts](../e2e/new-product/new-product.spec.ts) | Casos focalizados y ajuste de selectores de la prueba existente a la nueva ubicación/etiqueta. |
| [palette-comparison.config.ts](../e2e/new-product/palette-comparison.config.ts) | Ejecuta únicamente los casos `refinement-` y separa sus evidencias. |
| Este documento y [palette-comparison](../test-results/new-product/palette-comparison/) | Comparación visual, capturas y resultados. |

## 7. Límites pendientes

Las capturas y acciones son simuladas. Quedan fuera de esta fase la validación autenticada conectada, una escritura real a base de datos y pruebas en dispositivos físicos/Safari. No se modificaron los defectos funcionales ajenos al refinamiento ya documentados en el informe anterior.

**Listo para elegir la paleta definitiva. No se publicó ningún cambio.**
