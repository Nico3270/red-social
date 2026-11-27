# Myckeo — Refinamiento visual premium de `/dashboard`

17 de noviembre de 2026. Refinamiento de la [implementación anterior](../IMPLEMENTATION_REPORT.md), sin commit ni despliegue.

## Resultado y decisión visual

Se conserva la composición existente: encabezado, dos acciones rápidas y tres grupos de herramientas. El cambio añade identidad por categorías mediante iconos, encabezados descriptivos, estados de interacción y acentos locales. Las tarjetas siguen siendo blancas y compactas.

Se eligió **fondo general neutro y diferenciación en encabezados/iconos**, con separadores finos en pantallas amplias. No se añadieron paneles tintados grandes ni padding adicional alrededor de cada categoría. Esta opción mantiene el peso visual en las herramientas y evita acumular grandes superficies de color en móvil.

- **Marca / acciones rápidas:** rojo Myckeo `#BD2F43`, superficie casi blanca `#FFF9FA`, borde suave, un acento interior de 3 px y títulos rojos. Las dos tarjetas conservan sus dimensiones y enlaces.
- **Catálogo y oferta:** azul `#3974C6`, fondo de iconos `#EAF2FF`, encabezado con `Layers3` y descripción contextual.
- **Operación:** verde `#278459`, fondo `#E9F7EF`, encabezado con `ShoppingBag` y descripción contextual.
- **Presencia del negocio:** violeta `#8355C6`, fondo `#F2EDFF`, encabezado con `Store` y descripción contextual.
- **Encabezado principal:** identificador tipográfico «MYCKEO BUSINESS», un pequeño acento rojo, ajustes de tracking y espaciado, y mayor contraste del nombre del negocio. No se añade un logo ni un nombre ficticio.
- **Navegación:** pequeños chevrons en herramientas cuando el contenedor supera 620 px; se mantienen ocultos en móvil para conservar ancho de lectura. Hover y foco toman el acento de su categoría.

Los títulos de las herramientas siguen en 15 px, sus descripciones en 13 px y la ayuda conserva objetivos de 44×44 px. No se redujo texto para compensar la nueva información contextual. El color complementa los nombres y la agrupación; no es el único identificador de cada sección.

La evaluación visual se realizó sobre las capturas antes/después de escritorio y móvil. El acabado utiliza una familia iconográfica uniforme, cuatro acentos con propósito estable, superficies neutras y ausencia de efectos decorativos nuevos. No hay un color diferente por tarjeta, gradientes, glassmorphism ni ilustraciones.

## Cambios realizados

| Archivo | Alcance de este refinamiento |
| --- | --- |
| [dashboardMenu.module.css](../../../src/dashboard/componentes/dashboardMenu.module.css):100 | Variables cromáticas por categoría, encabezados/iconos, acciones rápidas, indicadores de navegación y estados visuales. Se conservan los breakpoints, mínimo útil de columnas, padding del menú y dimensiones de las entradas. |
| [DashboardSections.tsx](../../../src/dashboard/componentes/DashboardSections.tsx):64 | Mapa exclusivamente visual de iconos/descripciones, pequeño helper `SectionHeading`, atributos de categoría para CSS y chevrons. No cambian los contratos de props, destinos, handlers, hooks ni el subárbol de `Dialog`. |
| [validate-menu.cjs](../validate-menu.cjs) | La suite existente admite `DASHBOARD_MENU_EVIDENCE_DIR` y registra geometría/colores de encabezados. Se conservan sus aserciones y el destino habitual cuando no se proporciona la variable. Esto permite guardar ambos estados sin sobrescribir las evidencias históricas. |
| [compare-visual.cjs](./compare-visual.cjs), nuevo | Compara las dos ejecuciones, verifica colores/contrastes/alturas, protege el alcance mediante hashes y AST, y genera dos láminas comparativas. No es código de la aplicación. |

El único código productivo modificado en esta fase son **CSS y el componente local del menú**. `src/app/dashboard/page.tsx`, `src/dashboard/dashboardMenu.ts`, shell, formularios, páginas internas, APIs, Prisma y autenticación permanecen idénticos a como estaban al comenzar este refinamiento.

La [baseline](./source-baseline.json) incluye 797 archivos de `src`, `prisma` y `e2e`: solo cambian los dos archivos previstos y los otros **795 permanecen idénticos byte a byte**, incluidas las modificaciones previas del usuario. También se conservaron las [fuentes anteriores del componente](./DashboardSections.tsx.before.txt) y del [CSS](./dashboardMenu.module.css.before.txt) para revisar este cambio sin confundirlo con el rediseño anterior todavía sin commit.

## Comparación visual y responsive

Comparaciones directas:

- [Antes / después a 390 px](./comparison-390.png), a escala de captura móvil.
- [Antes / después a 1440 px](./comparison-1440.png), reducidos por igual para comparar la composición; las capturas originales están en la tabla.

Las ejecuciones usan el mismo montaje aislado y altura de referencia de 844 px. Renderizan el componente productivo, datos estáticos de navegación, CSS Module, MUI, Lucide, Next Link y la fuente Inter local existente. El contenedor reproduce la geometría actual del shell, sin renderizar sidebar/topbar y sin simular sesiones.

| Viewport | Columnas acciones / herramientas | Altura anterior → posterior | Diferencia | Tarjetas | Capturas |
| --- | --- | --- | --- | --- | --- |
| 320 px | 1 / 1 | 1450 → 1530 px | +80 px | Altura sin cambio | [Antes](./before/screenshots/menu-320.png) · [Después](./after/screenshots/menu-320.png) |
| 360 px | 1 / 1 | 1414 → 1493 px | +79 px | Altura sin cambio | [Antes](./before/screenshots/menu-360.png) · [Después](./after/screenshots/menu-360.png) |
| 390 px | 1 / 1 | 1414 → 1493 px | +79 px | Altura sin cambio | [Antes](./before/screenshots/menu-390.png) · [Después](./after/screenshots/menu-390.png) |
| 430 px | 2 / 1 | 1372 → 1451 px | +79 px | Altura sin cambio | [Antes](./before/screenshots/menu-430.png) · [Después](./after/screenshots/menu-430.png) |
| 768 px | 2 / 2 | 1069 → 1149 px | +80 px | Altura sin cambio | [Antes](./before/screenshots/menu-768.png) · [Después](./after/screenshots/menu-768.png) |
| 1024 px | 2 / 2 | 1091 → 1171 px | +80 px | Altura sin cambio | [Antes](./before/screenshots/menu-1024.png) · [Después](./after/screenshots/menu-1024.png) |
| 1440 px | 2 / 3 | 844 → 907 px | +63 px | Altura sin cambio | [Antes](./before/screenshots/menu-1440.png) · [Después](./after/screenshots/menu-1440.png) |

**Interpretación:** la altura de cada una de las once entradas es exactamente la misma en los siete anchos. El incremento del documento corresponde a los encabezados descriptivos. Se conserva el scroll natural, sin recortar texto, plegar secciones ni agrandar tarjetas. En escritorio siguen cabiendo tres herramientas por categoría; en tablet dos y en móviles una. Las acciones rápidas conservan su adaptación al ancho real del contenedor.

No se detectaron scroll horizontal, textos o encabezados recortados, intersecciones entre iconos y ayuda ni solapamientos de los objetivos interactivos. La geometría del contenido del menú sigue fuera del límite conocido de la sidebar en escritorio; se conserva también el resultado con sidebar colapsada.

Evidencias adicionales posteriores: [ayuda](./after/screenshots/help-390.png), [foco azul de Catálogo](./after/screenshots/keyboard-focus-390.png), [variante administrativa](./after/screenshots/administrative-menu-390.png).

## Colores y contraste

Se emplearon los tonos sugeridos sin ajustes, porque sus contrastes son suficientes para el uso **no textual** de iconos y acentos sobre estas superficies. Los títulos y descripciones conservan tinta oscura y gris de lectura; no se colorean textos largos de azul, verde o violeta.

| Categoría | Acento | Fondo de icono | Contraste calculado del icono |
| --- | --- | --- | --- |
| Catálogo | `#3974C6` | `#EAF2FF` | 4.15:1 |
| Operación | `#278459` | `#E9F7EF` | 4.20:1 |
| Presencia | `#8355C6` | `#F2EDFF` | 4.49:1 |

Todos superan 3:1. Los valores se calcularon a partir de los colores computados en Chromium y se verificaron en los siete anchos. Los títulos rojos de acciones rápidas mantienen contraste superior a 4.5:1 sobre su superficie clara. No se presenta esto como una certificación completa de accesibilidad.

La ayuda mantiene sus etiquetas accesibles, descripción completa, Escape y retorno de foco. El CSS respeta movimiento reducido. El foco de los enlaces adopta el color de su categoría; el diálogo conserva el acento Myckeo y sus interacciones anteriores.

## Validaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `pnpm typecheck --incremental false` | Código 0, sin errores del proyecto. [Log](./typecheck.log). |
| `pnpm lint --dir src/dashboard --file src/app/dashboard/page.tsx` | Código 0, sin warnings/errores de ESLint del área. Solo aparece el aviso de deprecación del comando Next ya existente. [Log](./lint.log). |
| `git diff --check` | Código 0. [Log](./diff-check.log). |
| Prettier de CSS, componente y scripts de validación | Correcto. |
| Suite existente antes del cambio | Código 0. [Resultados anteriores](./before/evidence/validation-results.json). |
| Suite existente después del cambio | Código 0. [Resultados posteriores](./after/evidence/validation-results.json). |
| Comparación visual y protección del alcance | Código 0. [Resultados](./visual-comparison.json). |
| Once destinos de negocio y dos administrativos | Conservados; clicks nativos interceptados con URLs correctas. No se ejecutan los módulos internos. |
| Trece ayudas | Descripciones y destinos correctos, foco inicial, contención de foco, Escape y retorno al origen. Cierre por botón/fondo también comprobado. |
| Navegación con teclado y CTA de ayuda | Correctos en la suite existente. |
| Siete anchos + nueve fronteras | Sin overflow horizontal ni objetivos superpuestos. Fronteras: 599/600, 639/640, 767/769, 899/900 y 1023 px. |
| Nombres largos y texto al doble de tamaño | Stress de componente correcto; no equivale a certificar zoom nativo o sesión real. |
| Preferencia de movimiento reducido y diálogo en 320×480 | Comprobados por la suite; sin regresiones. |
| JavaScript en Chromium | Cero errores en la ejecución final. |
| Encabezados por categoría | Icono, descripción y acento correctos; ningún título o texto contextual recortado. |
| Diálogo y comportamiento del componente | Subárbol completo de `Dialog`, handlers/destinos y hooks/callback de cierre idénticos mediante comparación AST con la baseline de esta fase. |

La revisión React comprueba que el nuevo helper sea puramente presentacional, los hooks sigan incondicionales y fuera de bucles, las keys y props de navegación permanezcan estables y no se añadan fetching, listeners propios, librerías o estado adicional.

### Reproducción

```bash
pnpm typecheck --incremental false
pnpm lint --dir src/dashboard --file src/app/dashboard/page.tsx
git diff --check
DASHBOARD_MENU_EVIDENCE_DIR=docs/dashboard-premium-redesign/visual-refinement/after node docs/dashboard-premium-redesign/validate-menu.cjs
node docs/dashboard-premium-redesign/visual-refinement/compare-visual.cjs
```

Las capturas `before` se generaron con el código anterior antes de modificarlo. Se preservan para comparar; no se regeneran usando los estilos posteriores. El comparador utiliza los resultados guardados y la baseline de esta fase. La variable `DASHBOARD_AUDIT_BROWSER` permite indicar otro Chromium ya instalado.

## Límites y riesgos pendientes

- Las capturas y las pruebas de interacción proceden de un montaje aislado fiel al menú, sin sesión inventada, llamadas de negocio ni datos ficticios. La validación autenticada de extremo a extremo sigue pendiente, como en la entrega anterior.
- El shell compartido y su desfase heredado de 250/200 px permanecen fuera del cambio. Este refinamiento conserva el padding local existente; no corrige la topbar ni otras pantallas.
- Se probó Chromium headless. Quedan fuera Safari, dispositivos físicos y lectores de pantalla. La compatibilidad de container queries y `:has` conserva la misma dependencia del rediseño anterior.
- Las descripciones de encabezado añaden alrededor de 80 px en móvil. Es el coste explícito de ofrecer más orientación, con alturas de tarjeta y tamaños de texto intactos.

**Confirmación:** no se modificaron rutas, APIs, base de datos, Prisma, autenticación, roles, permisos, formularios, shell ni módulos internos. No hay dependencias, estadísticas, consultas, commits o despliegues nuevos.

MYCKEO_DASHBOARD_VISUAL_REFINEMENT_READY
