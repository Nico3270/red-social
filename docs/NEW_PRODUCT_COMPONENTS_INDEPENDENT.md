# Nuevo producto — Componentes independientes

**Estado: `NEW_PRODUCT_COMPONENTS_INDEPENDENT_READY_FOR_REVIEW`**

Ruta: `/dashboard/productos/nuevo_producto`. **Myckeo Ruby queda como diseño definitivo aprobado.** Este ajuste no compara paletas ni cambia la arquitectura del formulario.

## Cambio realizado

«Componentes del producto» es ahora una sección propia y siempre visible, después de Información del producto y antes de Precio e inventario.

Incluye la descripción solicitada —«Agrega los ingredientes, materiales o elementos que componen tu producto»—, campo de dos filas, botón «Agregar», chips eliminables y ayuda discreta sobre el guardado independiente de IA. Se reutilizan los estilos Ruby existentes, con superficie blanca e icono pequeño; no se añade una tarjeta coloreada ni un nuevo bloque desplegable.

El asistente de IA conserva únicamente un resumen de lectura de los componentes agregados. No contiene otro editor ni otra lista editable. Nombre, descripción manual, clasificación y demás secciones mantienen su organización.

## Independencia y persistencia

- Sigue existiendo un único `componentesInput` y un único array `componentes`.
- Los handlers de agregar/eliminar, generación y envío permanecen idénticos a los de la fase anterior.
- Se recortan espacios y omiten líneas vacías como antes. Los duplicados se conservan; no se añadió deduplicación.
- Cada componente sigue viajando a `createProduct` con la clave `componentes` de FormData, sin necesitar abrir o usar IA.
- La acción de IA sigue recibiendo el array como tercer argumento. Su contrato y su implementación no se modifican.
- Abrir/cerrar IA o Detalles adicionales, editar otros campos y recibir errores no borra los componentes.
- Se puede crear un producto sin componentes y sin IA.

Las pruebas verifican el payload hacia la acción simulada. La persistencia de servidor existente conserva sus campos y relaciones; no se hicieron escrituras reales en BD para esta validación.

## Archivos de esta fase

| Archivo | Cambio |
| --- | --- |
| [CreateNewProduct.tsx](../src/ui/components/productos/CreateNewProduct.tsx) | Reubicación del editor, sección visible y resumen de lectura para IA. Único archivo de aplicación modificado en este ajuste. |
| [new-product.spec.ts](../e2e/new-product/new-product.spec.ts) | Casos focalizados y adaptación de selectores a la ubicación independiente y al botón «Agregar». |
| [components-independent.config.ts](../e2e/new-product/components-independent.config.ts) | Ejecuta solo los casos de esta corrección y separa sus evidencias. |
| Este documento y [components-independent](../test-results/new-product/components-independent/) | Informe, capturas, mediciones y logs. |

La [comprobación de preservación](../test-results/new-product/components-independent/preservation-check.json) confirma que no cambiaron estilos, tokens Ruby, servidor, Prisma, uploader, endpoints Cloudinary, editor existente ni layout compartido. También compara los handlers locales de generación, componentes y envío con el estado previo.

## Pruebas ejecutadas

**7 pruebas Playwright PASS**, sin pruebas de infraestructura:

1. Sección visible con IA cerrada a 320 px; orden correcto, chips largos y apertura/cierre del asistente.
2. Mismo recorrido a 390 px.
3. Mismo recorrido a 768 px.
4. Mismo recorrido a 1440 px.
5. Agregar por líneas e individualmente, vacíos y duplicados, eliminación por teclado, cambios en otros campos, error/reintento de creación y payload con componentes sin abrir IA.
6. Contexto enviado a IA, fallo de generación, cierre/reapertura, descripción manual preservada hasta aplicar y creación con los componentes conservados.
7. Creación sin componentes y sin IA.

**10 comprobaciones de layout sin fallos:** IA cerrada/abierta en los cuatro anchos, más asistente y diálogo a 390 × 420 px. Se comprueban ancho del documento, límites de controles visibles, etiquetas, objetivos táctiles y solapamiento con el sidebar. No se detectaron desbordamientos ni recortes. Las capturas también se revisaron visualmente.

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS, con la advertencia previa de `_body` no usado en `src/app/activar/ActivationBootstrap.test.tsx:347` y el aviso de deprecación de `next lint`.
- `git diff --check`: PASS.

No se ejecutó build ni se repitieron las baterías de Cloudinary, infraestructura o comparación de paletas.

Evidencias: [resultados](../test-results/new-product/components-independent/results.json), [mediciones](../test-results/new-product/components-independent/responsive-measurements.json), [navegador](../test-results/new-product/components-independent/browser.log), [TypeScript](../test-results/new-product/components-independent/typecheck.log), [lint](../test-results/new-product/components-independent/lint.log).

```bash
# PRODUCT_TEST_BROWSER permite indicar un Chromium local instalado.
pnpm exec playwright test --config=e2e/new-product/components-independent.config.ts
pnpm typecheck
pnpm lint
```

## Capturas

Capturas **simuladas**, con el formulario y layout reales, datos ficticios y fronteras externas interceptadas. No acreditan una sesión autenticada ni una escritura real.

| Ancho | Componentes visibles, IA cerrada | Asistente abierto con resumen de lectura |
| --- | --- | --- |
| 320 px | [Ver](../test-results/new-product/components-independent/320-components-visible.png) | [Ver](../test-results/new-product/components-independent/320-assistant-open.png) |
| 390 px | [Ver](../test-results/new-product/components-independent/390-components-visible.png) | [Ver](../test-results/new-product/components-independent/390-assistant-open.png) |
| 768 px | [Ver](../test-results/new-product/components-independent/768-components-visible.png) | [Ver](../test-results/new-product/components-independent/768-assistant-open.png) |
| 1440 px | [Ver](../test-results/new-product/components-independent/1440-components-visible.png) | [Ver](../test-results/new-product/components-independent/1440-assistant-open.png) |

**Sin commits, pushes ni despliegues. Ajuste listo para la revisión final.**
