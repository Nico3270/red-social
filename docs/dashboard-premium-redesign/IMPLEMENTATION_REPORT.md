# Myckeo — Menú premium de `/dashboard`

Implementación local, 17 de noviembre de 2026. Sin commit ni despliegue.

## Alcance y resultado

Se modernizó exclusivamente el menú que aparece al entrar en `/dashboard`, siguiendo la [auditoría previa](../dashboard-premium-audit/DASHBOARD_PREMIUM_UX_UI_AUDIT.md). Las páginas internas, el shell compartido, NextAuth, Prisma, APIs y reglas de acceso conservan su implementación anterior. No se añadieron dependencias, métricas, consultas de negocio ni endpoints.

La composición incluye:

- **Encabezado:** «Panel de gestión», subtítulo breve y nombre del negocio cuando lo proporciona la sesión. No se solicita información adicional para construirlo.
- **Acciones rápidas:** Nuevo Producto y Nueva Publicación, con un acento rojo discreto y sus enlaces actuales. No abren formularios duplicados.
- **Tres grupos:** Catálogo y oferta, Operación y Presencia del negocio. Las diez funcionalidades originales se conservan y se incorpora al menú principal Organización del Catálogo, cuya ruta ya existía en la sidebar. Son **once destinos de negocio distintos**, sin repeticiones.
- **Presentación:** filas compactas, iconos Lucide de la biblioteca instalada, títulos de 15 px, descripciones de 13 px sin truncado, bordes y sombras sutiles. Tokens CSS locales de neutros y rojo `#bd2f43`; el tema global no cambia.
- **Ayuda:** botón independiente del enlace, de 44×44 px; diálogo MUI con título, descripción, foco inicial, Escape y retorno de foco. La explicación completa se mantiene, revisando las promesas no verificadas de la auditoría.

La arquitectura se limita a un componente principal, un componente de entrada privado en el mismo archivo, metadatos tipados y un CSS Module. La página sigue siendo un Server Component y el menú mantiene su frontera cliente para la ayuda. Solo se pasan datos serializables e identidad de negocio ya disponible; no se pasa la sesión completa ni se añaden efectos de fetching.

## Archivos productivos modificados o añadidos

| Archivo | Cambio |
| --- | --- |
| [src/app/dashboard/page.tsx](../../src/app/dashboard/page.tsx):1–64 | Reemplaza las listas JSX incrustadas por metadatos importados y conecta las variantes de presentación. Conserva las llamadas a `auth()`, el predicado de restricción, las condiciones por rol y los estados alternativos. Pasa `negocioNombre` con fallback a `managedBusinessName`. |
| [src/dashboard/componentes/DashboardSections.tsx](../../src/dashboard/componentes/DashboardSections.tsx):38–255 | Sustituye tarjetas multicolor y modal manual por encabezado, navegación agrupada y `Dialog`. El enlace y la ayuda son hermanos. Reutiliza el archivo Inter local, cargando únicamente esa fuente en este menú. |
| [src/dashboard/dashboardMenu.ts](../../src/dashboard/dashboardMenu.ts):1–212, nuevo | Contratos de metadatos, dos acciones rápidas, tres grupos de negocio y dos accesos administrativos. Todas las rutas son existentes. |
| [src/dashboard/componentes/dashboardMenu.module.css](../../src/dashboard/componentes/dashboardMenu.module.css):1–356, nuevo | Paleta, tipografía, filas, tarjetas de acciones, ayudas, focus/hover/active, container queries y movimiento reducido. Sin selectores que alteren otras pantallas. |

La sustitución de los wrappers `<main>` de las dos variantes rediseñadas por `<div>` evita añadir otro landmark principal dentro del shell. No se cambió el wrapper de onboarding ni el aviso restringido. La duplicación de landmarks que ya existe entre los layouts compartidos permanece fuera de este alcance.

Artefactos de validación de esta carpeta:

- [validate-menu.cjs](./validate-menu.cjs): comprobaciones de contratos y navegador, reproducibles sin cuentas ni base de datos.
- [source-baseline.json](./source-baseline.json): hashes de los 795 archivos de `src`, `prisma` y `e2e` capturados antes de intervenir.
- [evidence/validation-results.json](./evidence/validation-results.json): geometría, rutas, interacciones, comprobaciones estáticas y hashes de fuentes finales.
- [evidence/typecheck.log](./evidence/typecheck.log), [evidence/lint.log](./evidence/lint.log) y diez capturas enlazadas más abajo.

## Navegación preservada

| Ubicación | Nombre visible actual | URL, sin cambio de destino |
| --- | --- | --- |
| Acciones rápidas | Nuevo Producto | `/dashboard/productos/nuevo_producto` |
| Acciones rápidas | Nueva Publicación | `/dashboard/crear-publicacion` |
| Catálogo y oferta | Gestión de Productos | `/dashboard/productos` |
| Catálogo y oferta | Organización del Catálogo | `/dashboard/organizacion-catalogo` — acceso existente incorporado a la portada |
| Catálogo y oferta | Servicios | `/dashboard/servicios` |
| Operación | Gestión de Pedidos | `/dashboard/orders` — antes «Gestión de Órdenes» |
| Operación | Reservas | `/dashboard/reservas` — antes «Módulo de Reservas» |
| Operación | Transacciones | `/dashboard/transacciones` |
| Presencia del negocio | Encuestas | `/dashboard/encuestas` — antes «Módulo de Encuestas» |
| Presencia del negocio | Código QR | `/dashboard/qr` |
| Presencia del negocio | Editar Negocio | `/dashboard/editar-perfil` — antes «Editar Perfil» |
| Variante administrativa | Panel Myckeo Admin | `/myckeoAdmin` |
| Variante administrativa | Editar usuario | `/dashboard/editar-usuario` |

Se comparó el conjunto de diez URLs originales con los nuevos once destinos de negocio: ninguno falta y la única incorporación es Organización del Catálogo. Cada destino tiene una página existente. La sidebar no se modificó: los accesos adicionales de cuenta, sitio público, Inicio y cierre de sesión siguen en su ubicación habitual.

Las explicaciones mantienen el propósito de cada módulo. Se retiraron o ajustaron afirmaciones no acreditadas: actualización de órdenes «en tiempo real», sincronización de calendarios externos, duración/requisitos estructurados de servicios y envío por email/resultados gráficos de encuestas. Publicación describe el selector real de carrusel/testimonio y la asociación de productos; QR describe generación, descarga y compartir, sin prometer un editor ni estadísticas.

## Roles y estados: qué se comprobó

| Contexto | Comportamiento preservado | Evidencia ejecutada |
| --- | --- | --- |
| `negocio` no restringido | Menú completo; Reservas y Encuestas siguen accesibles sin condicionar su enlace a flags de configuración. | Comparación AST de condiciones/variables de la página y montaje directo del menú con sus metadatos reales. |
| `super_admin` | Sus dos enlaces administrativos; sin acciones rápidas ni herramientas comerciales. | Comparación AST y montaje directo de `superAdminGroups`, navegación y ayuda. Esto no simula una sesión administrativa. |
| `user` y `admin` | Mismo `CrearNegocioInfo` con el mismo `userId` derivado de sesión. | Rama de retorno equivalente en AST al archivo inicial y componente de onboarding con hash intacto. No se ejecutó creación de negocio. |
| Negocio restringido por archivo/inactividad/test | Mismo `ArchivedBusinessDashboardState` y mismas props de nombre, motivo y fecha. | Comparación AST de toda la rama; helper, aviso y layout sin cambios de contenido. No se fabricaron sesiones para esos estados. |
| Rol `negocio` sin relación gestionada | Conserva el resultado del predicado existente; no se añadió un guard o redirect nuevo. | Condiciones y evaluación de restricción idénticas; no se reinterpretó este caso límite. |
| Sin sesión / rol excluido | Redirects del layout intactos. | Archivo del layout idéntico. Petición real anónima al servidor existente: HTTP **307**, `Location: /`. No se ejecutó una sesión de rol excluido. |

No se generaron tokens, cuentas, negocios ni sesiones de prueba. El nombre real se conecta por código a la sesión existente. Las capturas de negocio no inventan un nombre cuando ese dato no está disponible. Una prueba adicional pasa texto largo directamente a la prop `businessName` para comprobar ajuste; es una entrada controlada del componente, no un negocio autenticado.

**Pendiente:** comprobar estas experiencias de extremo a extremo con cuentas reales autorizadas. Las comprobaciones estáticas demuestran que las ramas no cambiaron, pero no certifican inicio de sesión, renovación JWT o autorización de los destinos.

## Responsive y alcance del shell

Las herramientas usan `auto-fit` con mínimo útil de 290 px y reducción a una columna cuando no cabe ese mínimo. En los anchos solicitados hay una, dos o tres columnas; no se fuerzan seis. Las acciones rápidas pasan a dos columnas a partir de 360 px **del contenedor**, con composición horizontal cuando este supera 620 px.

El espaciado interior local de 24 px desde viewport 769 px mantiene los textos y controles del menú fuera de los límites conocidos de la sidebar abierta. Esta regla solo afecta `.menu`; no modifica ancho, margen, posición ni estado del shell. En las mediciones con sidebar abierta, el contenido comienza a x=256 en 769 px y a x=264 en 1024/1440 px, después del límite lateral x=250. También se verificó la geometría con sidebar colapsada.

**Deuda compartida, fuera de esta implementación:** el shell aún dibuja 250 px de sidebar y reserva 200 px para contenido/topbar. Su desfase de 50 px, z-index, foco del drawer, cierre al navegar y comportamiento ante resize no se corrigieron. El menú principal queda apartado de esa zona mediante su propio padding; el encabezado global conserva sus problemas previos. No se trasladó esa corrección a otras páginas.

### Capturas y mediciones

Montaje aislado con altura de referencia **844 px**. Reproduce los márgenes/padding actuales del shell ya montado, sin dibujar sidebar ni topbar. Renderiza el componente productivo, CSS Module, MUI, Lucide, Next Link y la fuente Inter existente. La adaptación de `next/font/local` solo permite cargar ese archivo fuera del compilador Next. No sustituye auth ni datos.

| Ancho | Acciones rápidas / herramientas | Alto del documento aislado | Scroll horizontal / superposición entre controles | Captura |
| --- | --- | --- | --- | --- |
| 320 px | 1 / 1 columna | 1450 px | Ninguno detectado | [320](./screenshots/menu-320.png) |
| 360 px | 1 / 1 columna | 1414 px | Ninguno detectado | [360](./screenshots/menu-360.png) |
| 390 px | 1 / 1 columna | 1414 px | Ninguno detectado | [390](./screenshots/menu-390.png) |
| 430 px | 2 / 1 columna | 1372 px | Ninguno detectado | [430](./screenshots/menu-430.png) |
| 768 px | 2 / 2 columnas | 1069 px | Ninguno detectado | [768](./screenshots/menu-768.png) |
| 1024 px | 2 / 2 columnas | 1091 px | Ninguno detectado | [1024](./screenshots/menu-1024.png) |
| 1440 px | 2 / 3 columnas | 844 px | Ninguno detectado | [1440](./screenshots/menu-1440.png) |

En móvil se prioriza la lectura de cada herramienta en filas de aproximadamente 78 px, con expansión natural cuando el texto necesita más líneas. La estructura de encabezado, acciones y tres grupos requiere scroll vertical para recorrer el menú completo. No hay alturas máximas ni recortes de descripciones para forzar todos los accesos en la primera pantalla.

Capturas adicionales: [ayuda a 390 px](./screenshots/help-390.png), [foco de teclado](./screenshots/keyboard-focus-390.png), [variante administrativa](./screenshots/administrative-menu-390.png).

## Resultados de validación

| Comprobación ejecutada | Resultado |
| --- | --- |
| `pnpm typecheck --incremental false` | **Correcto**, código de salida 0; sin errores TypeScript en el proyecto. Se desactiva el fichero incremental para evitar escrituras innecesarias. |
| `pnpm lint --dir src/dashboard --file src/app/dashboard/page.tsx` | **Correcto**, código de salida 0; sin warnings/errores ESLint en el área modificada. El comando de Next muestra únicamente su aviso de deprecación; no se cambió la configuración de lint. |
| Prettier de los cuatro archivos productivos y script | **Correcto**, todos con formato consistente. |
| `git diff --check` | **Correcto**, sin errores de whitespace. |
| `node docs/dashboard-premium-redesign/validate-menu.cjs` | **Correcto**, código de salida 0; resultados en JSON. Última ejecución: `2026-11-17T18:37:45.694Z`. |
| Siete viewports solicitados | Once enlaces de negocio presentes en cada ancho; sin scroll horizontal, textos con overflow, controles anidados ni intersección icono/ayuda o enlace/ayuda. Targets de ayuda ≥44×44 y enlaces ≥44 px de alto. |
| Nueve fronteras adicionales | 599, 600, 639, 640, 767, 769, 899, 900 y 1023 px: misma comprobación geométrica satisfactoria. |
| Sidebar colapsada a 1024 px | Contenido dentro del viewport y fuera de su límite conocido de 64 px. No se modifica ni simula el store. |
| Trece enlaces principales | Click nativo en los once destinos de negocio y los dos administrativos, con URL exacta interceptada localmente. Se comprobó también Enter en Reservas y el CTA del diálogo. |
| Trece explicaciones | Once de negocio y dos administrativas: texto completo y destino correcto, foco inicial en cerrar, foco contenido, Escape y retorno al origen. En negocio se recorrieron múltiples Tab y Shift+Tab. |
| Cierre por botón/fondo y scroll | Comprobados; fondo bloqueado durante diálogo. No se necesita `preventDefault` para separar ayuda y navegación. |
| Focus visible | Outline rojo sólido de 2 px confirmado tras interacción de teclado, sin control superpuesto. |
| Movimiento reducido | `transition-duration: 0s` en tarjetas; diálogo operable con preferencia reducida y normal. |
| Ventana de 320×480 | Diálogo de Nuevo Producto dentro del viewport: y=60 a y=420; contenido accesible. |
| Texto ampliado | Stress CSS al doble del tamaño y line-height reales a 320 px, sin overflow horizontal ni superposición. No se presenta como certificación de zoom nativo. |
| Nombre largo | Ajuste de texto comprobado por prop controlada, sin cortar ni ampliar el ancho del documento. |
| Errores JavaScript | **0** en la ejecución final de Chromium. |
| Integridad del código ajeno | De 795 archivos iniciales, solo cambian `page.tsx` y `DashboardSections.tsx`; los otros **793 permanecen idénticos byte a byte**. Los únicos nuevos archivos productivos son metadatos y CSS locales. |

Los clics se interceptan en el dominio virtual del montaje. **No ejecutan las páginas internas ni sus guards** y no certifican transiciones SPA de Next con sesión real. No hubo llamadas a endpoints, analítica ni base de datos desde el montaje. La comprobación anónima sí utilizó el servidor Next existente y conservó el redirect esperado.

Contrastes calculados con los colores del CSS: texto blanco sobre acento 5.75:1 y sobre hover 7.19:1; texto secundario sobre blanco 5.97:1 y sobre las acciones 5.78:1; icono neutro sobre su superficie 6.89:1; rojo sobre superficie suave 5.24:1. Estos cálculos y las pruebas de teclado apoyan la accesibilidad, sin constituir una certificación WCAG completa.

Se aplicó la revisión de `vercel:react-best-practices`: hooks incondicionales, IDs y keys estables, metadatos serializables/readonly, helper de entrada fuera del componente principal, imports MUI directos, ausencia de listeners/fetching propios y ausencia de dependencia de Framer Motion en el nuevo menú. Se mantuvo MUI según el stack y alcance solicitados.

### Reproducción

```bash
pnpm typecheck --incremental false
pnpm lint --dir src/dashboard --file src/app/dashboard/page.tsx
node docs/dashboard-premium-redesign/validate-menu.cjs
```

El script utiliza las dependencias y Chromium ya instalados. `DASHBOARD_AUDIT_BROWSER` permite proporcionar otra ruta de ejecutable sin instalarlo. Escribe capturas/JSON en esta carpeta y CSS temporal en `/tmp`. La baseline está vinculada al checkout anterior al cambio; el script detecta modificaciones ajenas posteriores en vez de sobrescribirlas. La copia geométrica del shell debe revisarse si en el futuro cambia su implementación.

## Riesgos y validación pendientes

1. **Sesión real:** comprobar nombre del negocio, transiciones de navegación y variantes de rol/estado en un navegador autenticado autorizado. No se simularon como pruebas integradas.
2. **Shell heredado:** el desfase 250/200, topbar y accesibilidad de sidebar permanecen como deuda compartida. Esta entrega no altera sus comportamientos ni las páginas consumidoras.
3. **Dispositivos y tecnologías de apoyo:** se probó Chromium headless, no Safari, un teléfono físico ni lector de pantalla. El test de texto duplicado no sustituye esas verificaciones.
4. **Compatibilidad CSS:** container queries y `:has` se probaron en Chromium disponible. Si se requiere soportar navegadores antiguos, verificar esa matriz; sin container queries permanece la disposición base de una columna. No se declara cobertura universal.
5. **Rendimiento integrado:** no se ejecutó una compilación de producción ni se midieron LCP/CLS con sesión. La respuesta del servidor tras el cambio compila la ruta y conserva HTTP 307 anónimo; no reemplaza un build de producción. No se ejecutó `pnpm build`, cuyo script incluye generación de Prisma.

**Confirmación de alcance:** módulos internos, formularios, APIs, base de datos, Prisma, NextAuth, permisos, redirecciones y shell no fueron modificados. Las modificaciones previas del usuario permanecen intactas. No se hizo commit ni despliegue.

MYCKEO_DASHBOARD_MENU_PREMIUM_READY
