# Myckeo — Auditoría UX/UI y arquitectura de `/dashboard`

Fecha: 17 de noviembre de 2026. Fase: **auditoría; rediseño pendiente de autorización**.

Referencia del checkout: `1f491ff8ce6f80e333f07548e299141fc863d993`. Se estudió el árbol de trabajo existente, incluidos sus cambios previos; no se presupone que coincida íntegramente con ese commit. Las líneas citadas corresponden al código inspeccionado en esta fecha.

## 1. Resumen ejecutivo

La portada actual es un directorio de herramientas, con diez tarjetas para el rol `negocio`, dos para `super_admin` y una invitación a crear negocio para `user` y `admin`. No es todavía un resumen operativo: no consulta pedidos, reservas ni indicadores comerciales. El problema principal es la ausencia de jerarquía entre tareas, contexto y navegación, acompañada de conflictos responsive y de accesibilidad que no se resuelven cambiando colores o sombras.

Los hallazgos más relevantes son:

1. **Responsive discontinuo.** La cuadrícula pasa de tres a seis columnas a 1024 px, aunque el contenido disponible después del menú y los márgenes es de aproximadamente 744 px. En una medición aislada del componente real, cada tarjeta mide unos 111 px y su botón de información se superpone al área del icono en las diez tarjetas.
2. **Geometría inconsistente del layout.** El menú lateral abierto ocupa 250 px, pero el contenido y el encabezado solo reservan 200 px. El código combina breakpoints Tailwind de 640/768/1024 px, MUI de 600/900/1200 px y una condición JavaScript `<= 768`.
3. **Accesibilidad insuficiente en interacciones principales.** Hay botones dentro de enlaces. El modal informativo no tiene semántica de diálogo ni gestión de foco: en Chromium, Escape no lo cerró y Tab continuó hacia la tarjeta siguiente detrás del modal. El botón del menú elimina el contorno sin definir otro indicador de foco.
4. **Navegación duplicada y nombres inconsistentes.** La misma pantalla se llama «Perfil» en el menú, mientras «Editar Perfil» abre el negocio y «Editar usuario» se encuentra en otro acceso. Organización del Catálogo y edición del usuario no tienen tarjeta para negocios.
5. **Existen datos aprovechables, con límites concretos.** Hay conteos públicos de productos disponibles, servicios y publicaciones; pedidos recientes paginados; reservas por día; y balance de transacciones. Sus semánticas, permisos, frescura y costes son distintos. Ninguno debe convertirse automáticamente en «ventas de hoy» o «pedidos pendientes».

**Recomendación:** alternativa **C, dashboard híbrido**, desplegada gradualmente. Primero una portada clara y compacta con las rutas actuales, contexto tomado de la sesión y ayuda accesible. Después, un resumen operativo pequeño, condicionado a resolver contratos de datos y frescura. No introducir gráficos, nuevas APIs ni consultas históricas masivas como requisito del rediseño visual.

### 1.1 Alcance, evidencia y limitaciones

Se distinguen tres clases de evidencia en el documento:

| Marca | Qué significa |
| --- | --- |
| **C — Código** | Comprobado leyendo implementación, dependencias o configuración local. |
| **V — Componente en navegador** | Comprobado con Chromium/Playwright sobre componentes productivos sin modificar, montados de forma aislada. No equivale a validar la ruta autenticada. |
| **P — Pendiente** | Necesita sesión real, ejecución integrada, lector de pantalla, otro navegador o medición de rendimiento/datos. |

El servidor Next existente escucha en `localhost:3000`. La comprobación `curl -sS -I --max-time 20 http://localhost:3000/dashboard` devolvió **HTTP 307, `Location: /`**, coherente con el layout sin sesión. No se usaron credenciales, no se crearon usuarios y no se fabricó una sesión de negocio.

Para aprovechar las herramientas disponibles sin introducir datos ficticios se ejecutó una prueba aislada con:

- `DashboardSections.tsx` sin editar y las dos listas estáticas extraídas de `src/app/dashboard/page.tsx` mediante el AST de TypeScript; no se inventaron títulos, módulos, contadores ni negocios.
- MUI/Emotion, Tailwind y CSS global existentes. Un contenedor de medición reproduce exclusivamente los márgenes y padding del shell después del montaje, con sidebar abierta en escritorio. **No renderiza sidebar, topbar ni la ruta protegida.**
- `next/link` real, sin adaptador; no se probaron clics de navegación. Un shim de `process.env` permite ejecutar ese componente fuera de Next. No sustituye autenticación ni datos.
- Peticiones del navegador interceptadas localmente; sin llamadas a APIs, base de datos, analítica o servicios externos. Las únicas interacciones son apertura/cierre de ayuda y teclado.
- Siete anchos, altura de referencia de **844 px**, escala CSS normal y preferencia de movimiento reducido. No se midieron dispositivos físicos ni zoom del sistema.

Evidencias: [mediciones, enlaces y hashes de fuentes](./evidence/component-measurements.json), [script de reproducción](./evidence/measure-components.cjs), capturas enlazadas en la sección 5. Ejecución registrada a las `2026-11-17T17:55:27.353Z`. La ejecución final no registró errores JavaScript. Se utilizó Chromium ya instalado; no se descargaron dependencias. El script escribe únicamente evidencias en esta carpeta y CSS temporal en `/tmp`.

Reproducción, con las dependencias actuales y un Chromium ya instalado: `node docs/dashboard-premium-audit/evidence/measure-components.cjs`. La variable opcional `DASHBOARD_AUDIT_BROWSER` permite indicar otra ruta de ejecutable sin descargarlo. Reejecutar actualiza las evidencias; el contenedor geométrico del script es una copia explícita de las reglas actuales, no una prueba que detecte por sí misma futuros cambios del shell.

No se ejecutaron `build`, migraciones, semillas, generación de fixtures, formularios, mutaciones, commits ni despliegues. Los smoke tests públicos no cubren esta portada y su generación de fixtures puede escribir datos; no eran una validación apropiada para esta fase. La auditoría añade solo documentación y evidencias.

## 2. Mapa de archivos y dependencias

### 2.1 Composición real de la ruta

```text
src/app/layout.tsx                                  [Server]
  globals.css
  Provider                                         [Client]
    SessionProvider, AnalyticsBootstrap
    QueryClientProvider
      ReactQueryProvider                           [Client; segundo proveedor]
        src/app/dashboard/layout.tsx               [Server; sesión y roles]
          LayoutDashboardComponent                 [Client; shell y restricción visual]
            SideBarDashboard                       [Client; sesión, pathname, Zustand]
            TopBarDashBoard                         [Client; sesión, menú, signOut]
            src/app/dashboard/page.tsx             [Server; segunda lectura auth]
              negocio restringido -> ArchivedBusinessDashboardState
              negocio             -> DashboardSections [Client]
              super_admin         -> DashboardSections [Client]
              otro rol admitido   -> CrearNegocioInfo    [Client]
```

`(catalogo)/layout.tsx` **no envuelve** `/dashboard`: es otra rama del App Router. La portada no utiliza el menú público `TopMenu` ni `TopMenuMobile`. No se encontró middleware de autenticación en el árbol inspeccionado; la protección relevante está en los layouts y las operaciones de servidor. No hay `loading.tsx` ni `error.tsx` propios de la rama dashboard.

| Referencia | Archivo y líneas | Responsabilidad / implicación |
| --- | --- | --- |
| R01 | [src/app/dashboard/page.tsx](../../src/app/dashboard/page.tsx), 19–119 y 121–159 | Definiciones de las diez tarjetas y las dos administrativas; selección de experiencia según rol/restricción. Server Component asíncrono. |
| R02 | [src/app/dashboard/layout.tsx](../../src/app/dashboard/layout.tsx), 7–38 | Roles permitidos, redirects, contexto de negocio restringido, wrapper compartido. Server Component. |
| R03 | [src/dashboard/componentes/DashboardSections.tsx](../../src/dashboard/componentes/DashboardSections.tsx), 18–50, 52–151 y 153–206 | Contrato de tarjeta, `styled(Card)`, grid Tailwind, Info, Badge, modal Framer Motion. Client Component. |
| R04 | [src/ui/components/dashboard/perfil/LayoutDashboardComponent.tsx](../../src/ui/components/dashboard/perfil/LayoutDashboardComponent.tsx), 30–55 y 60–130 | Montaje, resize, sidebar fija, overlay móvil, topbar y contenido MUI. Client Component. |
| R05 | [src/ui/components/dashboard/perfil/SideBarDashboard.tsx](../../src/ui/components/dashboard/perfil/SideBarDashboard.tsx), 32–55, 57–162 y 164–209 | Cinco inventarios de navegación según rol/estado; nombre/slug de negocio; resaltado por igualdad de pathname. Client Component. |
| R06 | [src/ui/components/dashboard/perfil/TopBarDashBoard.tsx](../../src/ui/components/dashboard/perfil/TopBarDashBoard.tsx), 13–49 y 52–82 | Estado previo al montaje, nombre/avatar, toggle y cierre de sesión. Client Component. |
| R07 | [src/store/sideBar/sideBar-store.tsx](../../src/store/sideBar/sideBar-store.tsx), 12–21 | Zustand con persistencia `sidebar`; apertura inicial `true`. El shell sobrescribe esa preferencia al montar/redimensionar. |
| R08 | [src/auth.config.ts](../../src/auth.config.ts), 11–94, 138–178, 213–261 y 265–306 | NextAuth real; snapshot de usuario/negocio, callbacks JWT/sesión, Google y Credentials. |
| R09 | [src/lib/business/businessSessionState.ts](../../src/lib/business/businessSessionState.ts), 8–33 | Predicado de restricción, etiquetas de motivo y rutas permitidas en estado restringido. |
| R10 | [src/ui/components/dashboard/perfil/ArchivedBusinessDashboardState.tsx](../../src/ui/components/dashboard/perfil/ArchivedBusinessDashboardState.tsx), 11–85 | Aviso restringido, fecha en Colombia y tres salidas. Sin directiva cliente; también se importa dentro del grafo cliente del shell. |
| R11 | [src/dashboard/componentes/CrearNegocioInfo.tsx](../../src/dashboard/componentes/CrearNegocioInfo.tsx), 29–96 y 102–171 | Onboarding alternativo: imagen, beneficios, CTA; MUI styled y Framer Motion. |
| R12 | [src/app/layout.tsx](../../src/app/layout.tsx), 39–74; [src/providers/Provider.tsx](../../src/providers/Provider.tsx), 13–23; [src/feed/componentes/ReactQueryProvider.tsx](../../src/feed/componentes/ReactQueryProvider.tsx), 8–25 | HTML español, CSS global, sesión cliente y dos proveedores Query anidados. El interior configura `staleTime` de cinco minutos. |
| R13 | [tailwind.config.ts](../../tailwind.config.ts), 3–18; [src/app/globals.css](../../src/app/globals.css), 5–25, 75–89 y 105–185 | Tokens parciales y utilidades globales; no hay configuración propia de breakpoints Tailwind. |
| R14 | [src/config/fonts.ts](../../src/config/fonts.ts), 1–49; [src/ui/components/productos/newProduct/newProductPalette.ts](../../src/ui/components/productos/newProduct/newProductPalette.ts), 3–44 | Fuentes locales y paleta Ruby/Ocean de Nuevo Producto. Precedentes existentes, no tema global del dashboard. |
| R15 | [src/app/admin/layout.tsx](../../src/app/admin/layout.tsx), 8–41; [src/app/myckeoAdmin/layout.tsx](../../src/app/myckeoAdmin/layout.tsx), 10–23 | `/admin` también consume el shell; `/myckeoAdmin` tiene otro layout y exige `super_admin`. Cambiar el shell tiene alcance mayor que la portada. |

### 2.2 Sistemas de estilos y tokens realmente activos

**C.** La ruta combina Tailwind 3.4, MUI 6.5, Emotion (`styled`/`sx`), `react-icons` y Framer Motion. `package.json` declara estos paquetes y Next 15.5.9/React 18.3.1. Existen Lucide, MUI Icons y otras bibliotecas en la app, pero no hace falta instalar otra para este rediseño.

No se encontró `ThemeProvider`, `createTheme` o `CssBaseline` aplicados en el recorrido de esta ruta. El shell y las tarjetas reciben el tema por defecto de MUI. La inspección de la dependencia instalada devuelve:

| Propiedad | Valor existente |
| --- | --- |
| MUI breakpoints | `xs:0`, `sm:600`, `md:900`, `lg:1200`, `xl:1536` |
| MUI spacing | 2 = 16 px; 3 = 24 px; 4 = 32 px |
| MUI tipografía | `Roboto, Helvetica, Arial, sans-serif`; no se encontró carga de Roboto en esta ruta |
| `subtitle2` | 14 px a raíz de 16 px; line-height 1.57; peso base 500 |
| Grid Tailwind | 2 columnas; `sm` 640 px: 3; `lg` 1024 px: 6 |
| Gaps Tailwind | 12 px; desde `md` 768 px: 16 px |
| Ancho máximo de la página | `max-w-7xl`, 1280 px, dentro del espacio del shell |
| Tarjetas | Blanco; radio 16 px; sombra `0 4px 12px rgba(0,0,0,.05)`; hover `translateY(-4px)` y sombra mayor |
| Padding efectivo de tarjeta medido | 16 px arriba/lados, 24 px abajo |
| Icono de sección | 48 px por `text-5xl` en R01; diez colores literales |

`--primary: #274494` convive con clases globales turquesa `#428f99`, rosa `#d44b7c` y tinta `#1c283c`. Tailwind expone `background`/`foreground` con variables que no están definidas en `:root` de ese archivo; las variables `*-rgb` son distintas. La portada no utiliza esas clases para resolver su paleta. No existe hoy un contrato único de marca que deba «respetarse» ciegamente.

Nuevo Producto ya utiliza fuentes locales, CSS Module, bordes sutiles, controles de 44 px y una paleta Ruby local. Es una referencia de continuidad visual, **no un componente genérico que se pueda importar sin acoplar la portada a un formulario**. Tampoco justifica cambiar el tema global, fuentes o estilos de otras páginas durante un rediseño de `/dashboard`.

**C.** Hay mezcla tipográfica: los títulos MUI declaran su propia familia; topbar/modal Tailwind heredan la pila global. Las clases `font-semibold` compiten con estilos MUI según especificidad/orden. La medición V confirma `font-size:14px` y familia declarada Roboto/Helvetica/Arial para las tarjetas, sin acreditar que Roboto esté instalada en el dispositivo.

`boxShadow: "md"` en el Box de la topbar (R04:100) no corresponde a un índice numérico estándar de sombras de MUI. No debe confundirse con la clase Tailwind `shadow-md` que sí utiliza la barra interior. Revisar esa declaración si se interviene el shell; la auditoría no atribuye toda la elevación a ese valor.

### 2.3 Autenticación, propietario, roles y negocio

**C.** El layout obtiene `auth()` de `@/auth.config`, nunca del setup separado `src/auth.ts`. Admite `admin`, `super_admin`, `negocio` y `user`. Sin usuario redirige a `/`; otros roles van a `/not_authorized`. La portada vuelve a invocar `auth()` para decidir su contenido. No se asume que ambas llamadas o la consulta cliente a sesión estén deduplicadas.

El callback JWT reconstruye el snapshot por email: usuario más negocio relacionado. Un negocio es operativo si existe, está `activo`, no es `isTestData` y carece de `archivedAt`. El snapshot conserva nombre/slug gestionado para explicar la restricción, pero pone `negocioId`, `negocioNombre` y `negocioSlug` en `null` cuando no es operativo. Para negocios operativos consulta además existencia de `BusinessAvailability` y `Encuesta` mediante dos `count`. Estos resultados son **configuración existente**, no cantidad de reservas, encuestas respondidas ni permisos independientes.

| Contexto | Portada | Sidebar | Contrato que conservar |
| --- | --- | --- | --- |
| Sin sesión | Redirect `/` desde layout | No debe renderizar experiencia privada | No sustituir por `/auth/login` incidentalmente. |
| Rol no admitido, incluidos `creador`/`navegante` | Redirect `/not_authorized` | Fuera del flujo admitido | No ampliar roles para uniformar el diseño. |
| `negocio` no restringido según R09 | Diez tarjetas, todas habilitadas | Quince entradas operativas | No filtrar por flags de configuración. |
| `negocio` con `hasManagedBusiness` y `businessOperational === false` | Aviso de negocio no operable | Inicio, Dashboard y Editar usuario | Motivos `archived`, `inactive`, `test_data`; no cargar resúmenes operativos. |
| `super_admin` | Dos tarjetas administrativas | Cuatro entradas propias | No mostrar por defecto el catálogo de módulos de negocio. |
| `user` | Invitación a crear negocio | Cuatro entradas de usuario | Mantener `userId` de sesión en el destino de creación. |
| `admin` | También invitación a crear negocio | Inicio y «Clientes» hacia `/dashboard` | La discrepancia es existente; cambiarla requiere decisión funcional separada. |

Caso límite relevante: R09 requiere `hasManagedBusiness` verdadero para restringir. Un rol `negocio` sin relación de negocio **no queda restringido por ese predicado**, y la portada conserva diez tarjetas, aunque los destinos pueden mostrar ausencia de negocio. No corregirlo dentro de una refactorización visual ni asumir que «no restringido» significa inequívocamente «negocio operativo».

`perfilCompleto` está disponible en sesión pero no condiciona las diez tarjetas. `configReservation` y `configEncuestas` tampoco las ocultan o deshabilitan: sus destinos resuelven la configuración inicial. La visibilidad pública tiene además política propia en [publicBusinessVisibility.ts](../../src/lib/business/publicBusinessVisibility.ts):5–24 y [business-visibility-policy.ts](../../src/lib/business/business-visibility-policy.ts):17–62; no es intercambiable con la operabilidad interna.

El shell bloquea visualmente rutas restringidas salvo `/dashboard` y prefijos de `/dashboard/editar-usuario`; en edición de usuario muestra un aviso compacto. Su rama previa al montaje devuelve `children` antes de aplicar ese bloqueo visual (R04:49–55). **No es una garantía de autorización de servidor.** Mantener validaciones en cada operación; esta auditoría no prueba una fuga ni modifica permisos.

## 3. Inventario funcional completo

Alcance del inventario: portada `/dashboard`, shell que la envuelve, estados alternativos y accesos adicionales descubiertos. Las pantallas de destino se inspeccionaron para verificar contratos y datos; no se presenta como auditoría recursiva de todos sus formularios.

### 3.1 Contrato común de las tarjetas

R01 define nombre, descripción, icono, URL y `habilitado`. R03 renderiza cada entrada con un `Link`, tarjeta MUI, botón Info, icono y título. `alertCount?: number` existe en el contrato, pero **ninguna entrada actual proporciona un contador**. No hay indicadores de pedidos, dinero, inventario o reservas en las tarjetas.

Para los módulos N01–N10, **visibilidad = rama `negocio` no restringida por R09; habilitado = `true`**. Esta regla compartida es parte de la ficha de cada módulo. No hay ordenamiento por popularidad, permisos individuales ni módulos ocultos por falta de configuración. Se preservan las diez entradas aunque solo algunas sean visibles inicialmente por altura de pantalla.

Todos tienen descripción contextual únicamente en el modal. El click de Info hace `preventDefault` y `stopPropagation`; navegar desde el cuerpo va al destino. El modal ofrece la misma URL mediante «Ir a la sección». `handleCardClick` no añade comportamiento real. La ruta puede tener validaciones adicionales que no deben trasladarse ni eliminarse al rediseñar la tarjeta.

### 3.2 Módulos de negocio: nombre, propósito, ruta, responsable e iconografía

| ID / nombre visible exacto | Propósito real / destino exacto | Responsable de definición y destino | Icono / color existente |
| --- | --- | --- | --- |
| N01 — Gestión de Productos | Listar y administrar catálogo. `/dashboard/productos` | R01:20–27 + R03; [productos/page.tsx](../../src/app/dashboard/productos/page.tsx):10–43 → `ShowProductsByUser` | `AiFillProduct`, `#eb5f35` |
| N02 — Nuevo Producto | Crear producto. `/dashboard/productos/nuevo_producto` | R01:28–35 + R03; [nuevo_producto/page.tsx](../../src/app/dashboard/productos/nuevo_producto/page.tsx):1–13 → `NewProductHeader` + `CreateNewProduct` | `FiPlusSquare`, `#38B2AC` |
| N03 — Gestión de Órdenes | Consultar/gestionar pedidos y entrada a creación. `/dashboard/orders` | R01:36–43 + R03; [orders/page.tsx](../../src/app/dashboard/orders/page.tsx):7–53 → `ListOrders` | `FaClipboardList`, `#5A67D8` |
| N04 — Transacciones | Registro de ingresos/gastos, listado y gráficos. `/dashboard/transacciones` | R01:44–51 + R03; [transacciones/page.tsx](../../src/app/dashboard/transacciones/page.tsx):25–60, 106–123 → tres secciones cliente con carga diferida | `FaChartLine`, `#4CAF50` |
| N05 — Nueva Publicación | Elegir publicación de carrusel o testimonio. `/dashboard/crear-publicacion` | R01:52–59 + R03; [crear-publicacion/page.tsx](../../src/app/dashboard/crear-publicacion/page.tsx):24–51 → `CrearPublicacionesNegocio` | `FaPlus`, `#ED64A6` |
| N06 — Módulo de Reservas | Operar agenda o configurar disponibilidad. `/dashboard/reservas` | R01:60–67 + R03; [reservas/page.tsx](../../src/app/dashboard/reservas/page.tsx):8–34 → `ReservasDashboard` | `FaCalendarCheck`, `#4299E1` |
| N07 — Servicios | Listar servicios y entrar a creación. `/dashboard/servicios` | R01:68–75 + R03; [servicios/page.tsx](../../src/app/dashboard/servicios/page.tsx):5–46 → `ListaServiciosNegocio` | `FaTools`, `#ECC94B` |
| N08 — Módulo de Encuestas | Crear/configurar preguntas del negocio. `/dashboard/encuestas` | R01:76–83 + R03; [encuestas/page.tsx](../../src/app/dashboard/encuestas/page.tsx):12–40 → `CrearEncuestaNegocio` | `FaPoll`, `#9F7AEA` |
| N09 — Código QR de tu negocio | Generar QR con datos del negocio, descargar y compartir imagen. `/dashboard/qr` | R01:84–91 + R03; [qr/page.tsx](../../src/app/dashboard/qr/page.tsx):9–68, 97–119 → `QRPersonalizado` y `getNegocioInfo` | `FaQrcode`, `#303a41` |
| N10 — Editar Perfil | Editar el negocio, no la cuenta de usuario. `/dashboard/editar-perfil` | R01:92–99 + R03; [editar-perfil/page.tsx](../../src/app/dashboard/editar-perfil/page.tsx):7–44 → `CompletePerfil` | `FaUserEdit`, `#48BB78` |

### 3.3 Contexto disponible, reutilización y restricciones por módulo

Las condiciones de visibilidad y habilitación de 3.1 se aplican individualmente a cada fila. Esta tabla completa la ficha de cada módulo sin confundir información disponible en sus fuentes con información que la portada ya esté mostrando.

| Módulo | Información contextual existente | Posibilidad de reutilización | Restricción específica para rediseñar |
| --- | --- | --- | --- |
| N01 Productos | Descripción estática; destino obtiene negocio por propietario y catálogo con `status`; conteo público disponible en sección 6. | Un mismo destino puede representarse en categoría Catálogo y acción de administración. Reutilizar definición/enlace; no incrustar el listado completo. | Mantener distinción con crear producto; no traducir `disponible` a «stock positivo» ni descargar todo el catálogo para contar. El destino valida negocio y muestra error/ausencia. |
| N02 Nuevo Producto | Descripción estática. No tiene cantidad, borrador ni progreso en la portada. La página de destino ya tiene diseño y formularios propios. | Acción rápida de alta mediante el enlace existente. | No abrir un formulario duplicado ni alterar upload, variantes, IA, validaciones o guardado. No asumir que sus CSS/tokens son globales. |
| N03 Órdenes | Descripción; `getOrdersByNegocio` devuelve página reciente, `total` y estados. No hay contador de pendientes en R01. | Enlace de operación; resumen reciente acotado como fase de datos. | Conservar `/dashboard/orders`; acordar vocabulario «pedidos/órdenes» sin cambiar URL. No sumar una página parcial como total de pendientes ni prometer tiempo real: el listado carga inicialmente y al pedir más. |
| N04 Transacciones | Descripción; tres secciones en destino: Agregar transacción, Transacciones y Gráficos. Fuentes por `usuarioId`. | Acceso financiero y eventual balance con período explícito. | No reemplazar por «ventas». No llevar tabs, gráficos o formulario a la portada. El destino inicia en «Agregar transacción», no en un resumen; un CTA genérico debe respetar eso. |
| N05 Publicación | Descripción; sesión, negocio y productos para asociar en destino. Dos opciones: Publicar Carrusel y Publicar Testimonio. | Acción rápida con la URL actual. | No eliminar el selector ni crear dos rutas imaginarias. Preservar contextos `negocio`, `TESTIMONIO` y datos iniciales del destino. |
| N06 Reservas | Descripción y flag `configReservation` en sesión. La ruta comprueba negocio y redirige a `/dashboard/reservas/crear` si no hay configuración. | Enlace operativo y texto «Configura tu agenda» cuando corresponda; datos reales de agenda solo en fase posterior. | **No deshabilitar si el flag es falso:** se impediría el onboarding. No prometer sincronización de calendarios externos; no se encontró integración que lo sustente en el flujo inspeccionado. Mantener redirecciones del destino. |
| N07 Servicios | Descripción; listado autenticado devuelve `status`, precio, moneda, tags y multimedia; conteo disponible. | Acceso bajo Catálogo/Oferta; reutilizar el enlace. | La tarjeta describe duración y requisitos, pero el modelo `Servicio` inspeccionado contiene título, descripción, precio, moneda, status y tags, sin campos estructurados de duración/requisitos. No prometerlos como capacidades nuevas del rediseño. Mantener `/dashboard/servicios/crear` dentro del flujo existente. |
| N08 Encuestas | Descripción y `configEncuestas`; carga preguntas admin/negocio. Sin número de respuestas en portada. | Acceso y estado textual de configuración. | No bloquear si falta configuración: la ruta redirige a `/dashboard/encuestas/crear`. La entrada inspeccionada es editor/configurador; no acredita por sí sola resultados gráficos o envío de emails. Revisar copy antes de reiterar esas promesas. |
| N09 QR | Descripción; consulta de datos de negocio y generación/captura de imagen en destino. Sin métrica de escaneos en portada. | Herramienta de difusión bajo Presencia del negocio. | No inventar estadísticas QR, URL nueva o descarga desde portada. Mantener generación con datos del negocio, descarga y compartir en su pantalla; no se observó un editor de personalización en esa ruta. |
| N10 Editar Perfil | Descripción; `negocioNombre`/`negocioSlug` en sesión, consulta de información mediante `editarPerfilNegocio`. | Enlace de contexto «Editar negocio» o herramienta de configuración; nombre propuesto sujeto a revisión de copy. | No confundir con `/dashboard/editar-usuario`. Mantener `CompletePerfil`, validaciones, retorno y estado de error del destino. `perfilCompleto` es del snapshot de usuario; no usarlo como porcentaje de completitud del negocio. |

### 3.4 Tarjetas de superadministración

Ambas se renderizan mediante R03, exclusivamente en la rama `userType === "super_admin"` de R01:146–150, con `habilitado: true` y sin `alertCount`.

| Nombre / propósito | Ruta y responsable | Iconografía | Contexto / reutilización / restricción |
| --- | --- | --- | --- |
| Panel Myckeo Admin — entrar a administración avanzada | `/myckeoAdmin`; R01:103–110; destino protegido por R15 | `FaChartLine`, `#303a41` | Solo descripción estática. Reutilizar enlace/presentación, sin métricas globales ni módulos de negocio. La protección real de destino sigue exigiendo `super_admin`. |
| Editar usuario — editar cuenta administrativa | `/dashboard/editar-usuario`; R01:111–118; [editar-usuario/page.tsx](../../src/app/dashboard/editar-usuario/page.tsx):13–48 | `FaUserEdit`, `#48BB78` | Sesión y datos de usuario en destino. Reutilizar el acceso de cuenta también presente en sidebar; no convertirlo en edición del negocio. |

Las dos URLs se comprobaron también en el DOM del montaje aislado. No se probaron autorizaciones administrativas con una cuenta real.

### 3.5 Sidebar: todos los accesos de negocio, incluidos los ausentes de la cuadrícula

R05:57–105 define estas **quince entradas**, sin flags individuales de habilitación. Todas son enlaces activos para el inventario operativo; el cambio completo de inventario ocurre por rol/restricción. El logo añade otro enlace a `/`.

| Nombre visible | Destino / propósito | Icono | Contexto y restricción de reutilización |
| --- | --- | --- | --- |
| Inicio | `/`, volver a Myckeo público | `FaHome` | Mantener salida al sitio; no confundir con la portada del dashboard. |
| Perfil | `/dashboard`, portada auditada | `FaUser` | Nombre ambiguo. Se puede proponer «Panel»/«Dashboard» conservando URL; no confundir con `/dashboard/perfil`. |
| Nombre del negocio o Mi negocio | `/perfil/${slug}`; si falta slug, `/dashboard` | `FaUser` | Usa `negocioNombre`/`negocioSlug` de sesión. Preservar fallback; mostrar «Ver mi negocio» solo si el destino público existe. |
| Nuevo producto | `/dashboard/productos/nuevo_producto` | `IoMdAddCircle` | Mismo propósito que N02, otra familia de iconos. No cambiar formulario. |
| Productos | `/dashboard/productos` | `FaBox` | N01; conservar acceso administrativo. |
| Organización del Catálogo | `/dashboard/organizacion-catalogo` | `FaFolderTree` | **No tiene tarjeta.** Organiza grupos mediante `CatalogGroupsAdmin`; destino obtiene negocio del propietario. Puede ganar visibilidad sin inventar una funcionalidad. |
| Nueva Publicación | `/dashboard/crear-publicacion` | `FaFilePen` | N05; preservar selector en destino. |
| Pedidos | `/dashboard/orders` | `FaShoppingCart` | N03; vocabulario distinto para la misma ruta. |
| Transacciones | `/dashboard/transacciones` | `FaMoneyBillTransfer` | N04; no reutilizar como sinónimo de ventas. |
| Reservas | `/dashboard/reservas` | `FaBook` | N06; incluye onboarding de configuración. |
| Servicios | `/dashboard/servicios` | `MdHomeRepairService` | N07. |
| Encuestas | `/dashboard/encuestas` | `FaListUl` | N08; incluye configuración inicial. |
| Editar usuario | `/dashboard/editar-usuario` | `FaUserEdit` | **No tiene tarjeta de negocio.** Datos de cuenta, distintos del negocio. |
| Editar Negocio | `/dashboard/editar-perfil` | `FaUserEdit` | N10 con denominación más precisa. |
| QR de tu negocio | `/dashboard/qr` | `FaQrcode` | N09 con nombre abreviado. |

Cada entrada tiene `aria-label` y resaltado visual cuando `pathname === item.path`. No usa `aria-current`. Las subrutas de creación/edición no resaltan a su módulo padre si la URL no coincide exactamente. Si falta slug, las entradas «Perfil» y «Mi negocio» pueden apuntar a `/dashboard` y repetir la clave React `item.path`; es un caso límite existente, no motivo para modificar permisos.

Otros inventarios de R05:

| Contexto | Entradas completas, iconos y destinos | Estado / restricción |
| --- | --- | --- |
| Negocio restringido, 107–115 | Inicio `FaHome` → `/`; Dashboard `FaUser` → `/dashboard`; Editar usuario `FaUserEdit` → `/dashboard/editar-usuario` | Tres enlaces; sin operación comercial. |
| `user`, 117–130 | Inicio `FaHome` → `/`; Perfil `FaUser` → `/dashboard`; Editar usuario `FaUserEdit` → `/dashboard/editar-usuario`; Crear Negocio `FaStore` → `/crear_negocio/${session.user.id}` | Todos activos. El ID proviene de sesión; no es una ruta literal vacía para el diseño. |
| `admin`, 132–135 | Inicio `FaHome` → `/`; Clientes `FaUser` → `/dashboard` | No hay destino de listado de clientes en esa entrada. No inventarlo. |
| `super_admin`, 137–150 | Inicio `FaHome` → `/`; Dashboard `FaUser` → `/dashboard`; Myckeo Admin `AdminPanelSettings` de MUI → `/myckeoAdmin`; Editar usuario `FaUserEdit` → `/dashboard/editar-usuario` | No reutilizar como navegación del negocio. |

### 3.6 Botones, ayuda y estados alternativos

| Control / propósito | Acción / responsable | Iconografía y contexto | Visibilidad / estado | Restricción al rediseñar |
| --- | --- | --- | --- | --- |
| Logo Myckeo | Link `/`; R05:169–187 | Imagen `/imgs/Logo Final (1).png`, 50×50; texto según apertura/viewport | Todas las variantes de sidebar | Conservar salida; imagen no es selector de negocio. |
| Abrir/Cerrar menú lateral | `toggleSidebar`; R06:56–63, R07 | `FaBars`; `aria-label` dinámico, sin `aria-expanded`/`aria-controls` | Shell montado; previo al montaje hay versión sin handler si topbar se monta por separado | Mantener función; definir foco/estado expandido en mejora accesible. |
| Cerrar Sesión | `signOut({ callbackUrl: "/" })`; R06:75–81 | `FaSignOutAlt`; texto solo desde Tailwind `md` 768 px | Shell montado; activo | No reemplazar por un enlace de navegación ni cambiar callback. No se pulsó durante auditoría. |
| Nombre y avatar del propietario | Presentación; R06:52–74 | `session.user.name || "Usuario"`; imagen usa `session.user.image` | Shell montado; **no son enlaces ni menú de cuenta** | Snapshot expone `fotoPerfil`, no asigna `image` en R08:218–259. Puede utilizar siempre fallback. Revisar consumo en UI en fase propia; no cambiar auth. |
| Fondo del menú móvil | `setSidebarOpen(false)` al click; R04:78–82 | Overlay negro 40%, sin icono | `isMobile && isSidebarOpen` | No es botón accesible ni cierre por Escape. Mantener cierre por fondo y añadir comportamiento accesible en fase del shell. |
| Información sobre cada tarjeta | Abre `selectedSection`; R03:55–60, 84–109 | `InfoOutlined`, verde, 36×36, etiqueta con nombre de módulo | Todas las tarjetas habilitadas | Preservar acceso a descripción; separar DOM del enlace para evitar anidamiento. |
| ✕ del modal | Borra selección; R03:172–177 | Símbolo visible; 32×32; sin `aria-label` | Modal abierto | Añadir nombre «Cerrar información», Escape, foco y área táctil; no eliminar explicación. |
| Fondo del modal | Cierra selección; R03:164–167 | Backdrop negro 40% y blur | Modal abierto | Mantener salida sin navegación, además de cierre por teclado. |
| Ir a la sección | Link al `selectedSection.url`, cierra modal; R03:193–201 | `FaHandPointer`; misma URL de tarjeta | Modal abierto | Usar un enlace estilizado, preservando navegación sin botón anidado. |
| Badge de aviso | Solo visual; R03:113–125 | MUI `Badge`, rojo; posición superior izquierda | Actualmente invisible: no se pasa `alertCount` | No activar con números inventados ni interpretar configuración como alarma. |
| Crear Negocio | `/crear_negocio/${userId}`; R11:164–166 | CTA sin icono propio, verde; imagen y nueve beneficios alrededor | Rama fallback `user`/`admin`; activo | Hay **un** CTA activo al final; el anterior está comentado, no debe contarse como control actual. No iniciar creación en auditoría. |
| Editar usuario (restricción) | `/dashboard/editar-usuario`; R10:65–70 | Texto, sin icono | Aviso restringido, incluso versión compacta | Conservar edición de cuenta; no habilita operación del negocio. |
| Volver al inicio (restricción) | `/`; R10:72–77 | Texto | Aviso restringido | Conservar salida. |
| Contactar soporte | `https://wa.me/573132492256?text=Hola,%20necesito%20ayuda%20con%20mi%20negocio%20archivado%20en%20Myckeo`; R10:78–85 | Texto; abre nueva pestaña con `rel="noreferrer"` | Aviso restringido | Mantener enlace/contexto; no enviar mensajes como parte de pruebas. El mensaje actual dice «archivado» incluso ante otros motivos. |

El onboarding R11 muestra una imagen y nueve beneficios, no nueve módulos interactivos. Los iconos son `SpeedOutlined`, `StorefrontOutlined`, `GroupOutlined`, `StarOutlined`, `QrCodeOutlined`, `EventSeat`, `MonetizationOnOutlined`, `LibraryBooks` y `Poll`. No corresponden a nueve botones ni justifican nuevas rutas.

### 3.7 Accesos posteriores y rutas que no deben inventarse como módulos de portada

| Acceso / existencia comprobada | Origen actual | Límite de alcance |
| --- | --- | --- |
| `/dashboard/orders/crear` | «Crear nuevo pedido» en `orders/page.tsx`:25–49 | Ruta real; creación continúa por `/dashboard/orders/address` y `/dashboard/orders/checkout`. No hay acceso rápido equivalente hoy en la portada. |
| `/dashboard/servicios/crear` | «Crear servicio» en `servicios/page.tsx`:37–44 | Ruta real, accesible desde el módulo. |
| `/dashboard/reservas/crear` | Redirect por falta de `configReservation` | Configuración, no tarjeta comercial deshabilitada. |
| `/dashboard/encuestas/crear` | Redirect por falta de configuración/preguntas | Mantener condiciones de destino. |
| `/dashboard/productos/modificar_producto/[id]` | Ruta real de edición de producto | Requiere producto/propietario; no es URL navegable sin ID. |
| `/dashboard/transaccioneslista` | Página real que compone `getTransactions` + `ShowTransactions` | No se encontró en los inventarios de portada/sidebar. No confundir con `/dashboard/transacciones`. |
| `/dashboard/carrusel` | Página real con `ModalPublicaciones` y `FormCrearCarruselImagenes` | No se encontró como acceso en portada/sidebar. El selector actual de publicación abre modales y no requiere navegar aquí. |
| `/dashboard/perfil` | Página real que imprime `session.user` en `<pre>` | No es el destino de «Perfil» en sidebar ni una propuesta para el nuevo resumen. No exponer ese volcado en el dashboard premium. |

No se encontró un acceso actual desde esta portada a estadísticas independientes, gestión de publicaciones históricas, una bandeja unificada de actividad o analítica de QR. Los conceptos posteriores no deben presentarlos como funcionalidades existentes.

## 4. Hallazgos UX/UI priorizados

Prioridad: **P1** afecta uso/comprensión/acceso de forma importante; **P2** perjudica consistencia y calidad; **P3** mejora incremental. No se asigna P0 ni se certifica WCAG con una inspección parcial.

| ID / prioridad / evidencia | Hallazgo vinculado a código | Efecto para el propietario | Orientación para una fase futura |
| --- | --- | --- | --- |
| H01 — P1 — C+V | R03:76 fuerza seis columnas a 1024 px; icono 48 px + Info 36 px en una tarjeta de ~111 px. Intersección de áreas medida en diez tarjetas. | El control de ayuda compite visualmente con el icono; nombres se fragmentan hasta tres líneas. | Responder al ancho útil: máximo 3–4 columnas en ese espacio; elegir filas compactas cuando falte ancho. |
| H02 — P1 — C; validación integrada P | R04:70 reserva 250 px de sidebar pero R04:89/101 solo 200 px de contenido/header. Padding de 40 px en esa zona deja el inicio de la primera tarjeta a x=240, dentro de una sidebar hasta x=250. | Posible ocultación de borde/contenido y barra superior invadiendo menú. | Una sola variable de ancho; alinear offsets y z-index en una fase del shell con regresión transversal. |
| H03 — P1 — C+V | R03:78–109 contiene `IconButton` dentro de `Link`; R03:193–201 vuelve a anidar botón en enlace. DOM con modal: 11 botones anidados en enlaces. | Interacciones ambiguas para teclado/tecnologías de apoyo y doble propósito dentro de un control. | Enlace principal y ayuda como hermanos, con áreas inequívocas; CTA del diálogo como enlace. |
| H04 — P1 — C+V | Modal R03:153–206 sin `role="dialog"`, `aria-modal`, título enlazado, traslado/trampa/restauración de foco ni Escape. Botón ✕ sin etiqueta. | Se navega detrás de la ayuda; cerrar no es evidente para lector de pantalla. Escape no funciona. | Reutilizar `Dialog` de MUI ya instalado; ayuda con nombre, foco inicial y devolución al origen. |
| H05 — P1 — C; P para pruebas asistivas | Menú móvil R04:78–82 usa overlay de click, sin Drawer/dialog, foco, inert, Escape ni bloqueo de scroll; links R05 no cierran al navegar. Topbar R06:58 tiene `focus:outline-none` sin anillo alternativo. | Usuarios de teclado pueden perderse y el menú puede seguir tapando la siguiente pantalla. | Mejora funcional de navegación accesible, aislada del cambio visual de portada. Verificar cierre por navegación, foco y teclado. |
| H06 — P1 — C | R01/R03 no contienen h1, título de página, nombre del negocio o agrupaciones. Todas las tarjetas tienen mismo peso y orden estático. | No responde «dónde estoy», «qué negocio gestiono» ni «qué hago primero». | H1 + contexto de sesión, acciones de alta identificables, categorías estables y enlaces completos. |
| H07 — P1 — C | R01 frente a R05: Perfil/Dashboard, Órdenes/Pedidos, Editar Perfil/Editar Negocio; catálogo organizado y cuenta ausentes de la cuadrícula. | Una persona con poca experiencia tiene que inferir que términos diferentes llevan al mismo sitio. | Revisión de nomenclatura visible y correspondencia uno a uno con URLs existentes; conservar accesibilidad de todos los accesos. |
| H08 — P2 — C+V | Tarjetas sin altura común, R03:112–147. En 390 px QR mide ~148 px frente a ~126 del vecino; grid estira enlace, no necesariamente la tarjeta interior. | Alineaciones inferiores irregulares; el aire no comunica prioridad. | Contenedor alineado y alturas por contenido equivalentes dentro de cada patrón; no fijar altura que recorte texto al ampliar. |
| H09 — P2 — C+V | Iconos de tres familias en portada y más familias en sidebar; diez colores literales sin significado de estado (R01, R05). Verde de Info y sombras añaden un segundo foco a cada tarjeta. | Apariencia de lanzador genérico y ruido cromático. | Iconos consistentes, escala menor, un acento de marca y color semántico solo para estados reales. |
| H10 — P1/P2 según control — C | Info verde `#4CAF50` sobre verde al 15% sobre blanco tiene contraste aproximado **2.42:1**. CTA Crear Negocio blanco sobre `#4CAF50`: **2.78:1** a texto de 16 px/peso 600. R03:92–95, R11:75–88. | Baja visibilidad del control informativo; CTA del onboarding con contraste de texto insuficiente. | Para Info, objetivo no textual 3:1 donde el icono identifica el control; para texto normal del CTA, 4.5:1. Verificar colores finales calculados y estados hover/focus. |
| H11 — P2 — C+V | R03:94–95 Info 36×36; cerrar 32×32; menú R06 icono 24 + padding 8 = 40 px; logout icono 20 + padding 8 = 36 px sin texto móvil. | Las tarjetas son fáciles de tocar, sus controles secundarios menos. | Objetivo de producto 44×44 con separación suficiente. 36/32 px no incumplen por sí solos el mínimo 24 px de WCAG 2.2 AA; evaluar también espaciado y solapamientos. |
| H12 — P2 — C; P para visual integrada | Topbar fija de 64 px con padding horizontal 24, nombre sin `min-width:0`, truncado ni wrap diseñado; avatar y salida compiten en móviles. R06:56–81. | Nombres largos y aumento de texto pueden comprimir o desbordar el encabezado. | Definir prioridad, espacio flexible y tratamiento accesible del nombre; probar sesiones reales y zoom. No afirmar que ya se observó con un nombre real. |
| H13 — P2 — C+V | Ayuda necesaria para entender el módulo vive tras un modal de varios párrafos; cada tarjeta repite Info. R03:84–109, 187–188. | Alto coste de exploración para usuarios novatos: abrir/cerrar para comprender cada opción. | Una línea orientativa visible, verbos claros y ayuda secundaria; no reducir funciones a iconos sin texto. |
| H14 — P2 — C | R01 descripciones mencionan «tiempo real», sincronización con calendarios externos y resultados/envíos de encuestas no acreditados por los flujos inspeccionados. | Expectativas que el destino puede no cumplir. | Copy vinculado a capacidades demostradas; revisar promesas antes de conservarlas en el nuevo diseño. |
| H15 — P2 — C | R04 monta primero contenido sin navegación, luego sidebar/topbar y cambia margen según viewport; R06 tiene un saludo distinto en su rama previa al montaje. No hay skeleton propio. | Riesgo de salto de posición y orientación tardía con JavaScript lento. | Reservar geometría estable; medir CLS en ruta real antes de afirmar su magnitud. No cambiar auth ni añadir spinners innecesarios al directorio estático. |
| H16 — P2 — C | Tres niveles `<main>` en layout de ruta, Box del shell y página; títulos de módulos MUI `subtitle2`, sin jerarquía documental explícita. R02:29, R04:108, R01:140. | Landmarks y lectura estructural confusos. | Un main principal por documento y h1/h2 coherentes, mediante ajuste localizado y verificación de consumidores. |
| H17 — P2 — C | Sin estados dedicados de carga/error de portada; `sections=[]` produciría grid vacío sin explicación. Fallo de `auth()` no tiene boundary propio. | Si se añaden datos sin separar estados, un fallo secundario puede inutilizar la navegación. | Resumen opcional con errores aislados; distinguir cero real, falta de configuración, error y restricción. |
| H18 — P3 — C | Soporte latente de tarjeta deshabilitada usa opacidad/pointer-events en Card, pero Link exterior sigue con `href="#"`, sin `aria-disabled`. R03:44–48, 78–86. | Si se activa en el futuro, el teclado podría encontrar enlaces que no explican su estado. | No introducir deshabilitados nuevos; si hacen falta, contrato semántico explícito. Actualmente todas están habilitadas. |
| H19 — P2 — C | `resize` vuelve a abrir/cerrar sidebar en cada evento; store persistido se sobrescribe. R04:38–45, R07. | En escritorio se pierde elección de colapsar; en móvil una variación del viewport puede cerrar el menú. | Cambiar estado solo al cruzar el breakpoint, en fase funcional del shell. No hacerlo como ajuste de espaciado. |
| H20 — P3 — C | Se anidan dos QueryClientProvider (R12); el directorio no necesita fetching cliente, pero todo R03 es client y carga animación/estilado. | Riesgo de multiplicar consultas/cachés si se añade otra capa de datos por tarjeta. | Mantener navegación mayoritariamente server; una única estrategia para el resumen. No reestructurar proveedores globales como requisito de esta auditoría. |

### 4.1 Interpretación visual y accesibilidad

**C+V.** Las tarjetas ya usan radio 16 y sombras suaves; el estándar premium no exige agrandarlos ni introducir más elevación. El conjunto pierde calidad por repetición cromática, controles superpuestos, nombres largos y ausencia de contexto. En escritorio queda un lienzo amplio debajo de un grid corto; llenarlo con gráficos sin una pregunta comercial concreta empeoraría la densidad, no resolvería la orientación.

**C.** La tipografía está repartida entre el tema MUI por defecto y Tailwind. Se propone priorizar una familia local ya disponible y una escala corta, aplicada al ámbito de la portada y a los componentes nuevos. No modificar fuentes globales para corregir un solo dashboard.

**C+V.** El texto oscuro de los títulos no es el principal problema de contraste. El amarillo `#ECC94B` sobre blanco tiene aproximadamente 1.61:1, pero el icono de Servicios está acompañado de su etiqueta: no se declara incumplimiento de texto por un icono decorativo. Los cocientes anteriores son cálculos sRGB a partir de colores del código, no una certificación automática de todos los estados.

Criterios WCAG a verificar en implementación: estructura/relaciones (1.3.1), contraste de texto (1.4.3), reflow (1.4.10), contraste de controles (1.4.11), teclado (2.1.1), orden y visibilidad de foco (2.4.3/2.4.7), foco no oculto (2.4.11), tamaño/espaciado mínimo de objetivos (2.5.8) y nombre/rol/valor (4.1.2). El modal puede cerrarse recorriendo controles; no se describe como «trampa de teclado», sino como falta de foco contenido y orden adecuado. Faltan pruebas con lector de pantalla y zoom para una conclusión de conformidad.

Para los umbrales se contrastaron las guías oficiales de W3C: [contraste de texto 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [contraste no textual 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) y [objetivos mínimos 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). El comportamiento recomendado de foco contenido y Escape sigue el [patrón de diálogo modal de WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Estas guías apoyan la interpretación; las fallas concretas de la tabla se basan en código y pruebas locales.

Framer Motion y transiciones CSS de R03 no consultan explícitamente `prefers-reduced-motion`; no se encontró un proveedor global de esa preferencia en esta ruta. El montaje de prueba solicita movimiento reducido, pero eso no acredita que el componente lo respete en todas sus animaciones. Un futuro diálogo puede seguir el patrón de `useMediaQuery` de `NewProductHeader`.

## 5. Evaluación responsive

### 5.1 Breakpoints y geometría existentes

**C.** La interfaz tiene cuatro decisiones independientes:

1. R04 calcula móvil con **`window.innerWidth <= 768`**; ocultará la sidebar cerrada hasta ese ancho y elimina margen izquierdo.
2. MUI cambia padding a **600** y **900 px**; el menú abierto mide 60% en `xs` y 250 px desde `sm` 600.
3. R03 usa Tailwind: columnas a **640** y **1024**, gaps a **768**.
4. R05 utiliza `<640` para detectar viewport móvil al decidir etiquetas; R06 muestra texto de cierre de sesión desde **768**.

Casos frontera que deben entrar en futuras verificaciones: 599/600, 639/640, 767/768/769, 899/900 y 1023/1024. A 768 la lógica JavaScript sigue siendo móvil, pero ya cambia el gap y aparece «Cerrar Sesión». A 769 la sidebar se abre, reduciendo de golpe el ancho útil. A 1024 se duplica la cantidad de columnas sin considerar el espacio que ocupa el menú.

### 5.2 Matriz de siete anchos — medición V del grid aislado

El contenedor de prueba reproduce el shell montado con sidebar abierta en escritorio, **sin dibujarla**; por tanto los números son mediciones del componente con esa geometría, no screenshots de una sesión autenticada. La altura de referencia es 844 px en todos los casos. Anchos/alturas redondeados a un decimal.

| Viewport | Grid útil / columnas / gap | Ancho tarjeta | Alturas tarjeta | Alto total del grid | Scroll horizontal aislado | Evaluación |
| --- | --- | --- | --- | --- | --- | --- |
| 320 px | 288 px / 2 / 12 px | 138 px | 126–147.9 px | 787.7 px | No, documento = 320 px | Cinco filas; títulos multilínea. Grid inicia a y=80 y termina a y=867.7: sobrepasa la altura 844. Documento ~884 px. |
| 360 px | 328 px / 2 / 12 px | 158 px | 126–147.9 px | 787.7 px | No, documento = 360 px | Mismas cinco filas y alto total; desalineaciones inferiores por títulos. Documento ~884 px. |
| 390 px | 358 px / 2 / 12 px | 173 px | 126–147.9 px | 699.8 px | No, documento = 390 px | Diez tarjetas caben dentro de 844 px en este montaje. QR queda más alto que Editar Perfil. |
| 430 px | 398 px / 2 / 12 px | 193 px | ~126 px | 677.8 px | No, documento = 430 px | Mejor legibilidad y alturas uniformes para estos textos; el patrón sigue sin jerarquía ni contexto. |
| 768 px | 704 px / 3 / 16 px | 224 px | ~126 px | 551.9 px | No, documento = 768 px | Cuatro filas, última con un acceso. Sidebar tratada como móvil por JS; orientación y encabezado requieren sesión real. |
| 1024 px | 744 px / 6 / 16 px | ~110.7 px | 126–169.9 px | 333.8 px | No, documento = 1024 px | **Peor proporción.** Info intersecta icono en 10/10 tarjetas; QR alcanza tres líneas. El menú real puede invadir los primeros 10 px del grid por su offset. |
| 1440 px | 1160 px / 6 / 16 px | 180 px | 126–147.9 px | 289.9 px | No, documento = 1440 px | Dos filas de seis/cuatro; bastante espacio inferior. Mejor proporción que a 1024, sin resolver el desfase lateral de 50 px del shell. |

No se detectaron títulos con `scrollWidth > clientWidth` en este montaje. Eso no valida ampliación de texto, todas las fuentes/sistemas, ni la ausencia de elementos recortados por ancestros. El shell aplica `overflowX: hidden` en varios niveles; ocultar overflow puede enmascarar un problema y no demuestra reflow correcto.

Capturas V:

| Móvil | Tablet / escritorio | Ayuda |
| --- | --- | --- |
| [320 px](./evidence/grid-isolated-320.png), [360 px](./evidence/grid-isolated-360.png), [390 px](./evidence/grid-isolated-390.png), [430 px](./evidence/grid-isolated-430.png) | [768 px](./evidence/grid-isolated-768.png), [1024 px](./evidence/grid-isolated-1024.png), [1440 px](./evidence/grid-isolated-1440.png) | [Modal a 390 px](./evidence/info-modal-isolated-390.png) |

### 5.3 Encabezado, menú y uso táctil — C y pendientes P

| Elemento | Determinado por código | Pendiente de validación integrada |
| --- | --- | --- |
| Encabezado 320–430 | Fijo 64 px, padding 24 px, nombre centrado flexible, avatar 32 px, controles 40/36 px aproximados. Sin tratamiento específico de nombre largo. | Sesión con nombre largo, imagen rota/fallback, texto al 200%, foco y compresión real. |
| Sidebar móvil | Cerrada tras montar; al abrir mide 60% en 320–430: 192/216/234/258 px. Nav padding 16 px y links padding 12; etiquetas a 16 px. | Legibilidad/wrap de Organización del Catálogo en 192 px; scroll interno, llegada a últimos enlaces, cierre al navegar y retorno de foco. |
| Sidebar a 768 | Se considera móvil y mide 250 px cuando se abre. | Cruce 768/769, overlay, foco y scroll de fondo. |
| Sidebar escritorio | 250 px abierta, 64 px colapsada; contenido/header con offset 200/64 px. | Solapamiento pintado completo, z-index y controles bajo topbar; persistencia después de resize. |
| Descubrimiento móvil | Navegación completa requiere abrir sidebar; no hay bottom navigation específica de esta portada. Los quince links se ordenan verticalmente y la lista tiene scroll. | Que QR, Editar usuario y Catálogo sean localizables con una mano y teclado virtual/viewport reducido. |
| Ayuda | Modal centrado, `mx-4`, `max-w-md`; no tiene altura máxima ni scroll interior; close 32 px. | Textos más largos, paisaje de poca altura, 200–400% de zoom. A 390×844 el ejemplo Productos se ve completo en V. |
| Feedback táctil | Card con hover de elevación, sin estado `active` propio definido; Info tiene hover/ripple MUI. | Feedback en touch real, hover persistente y objetivos sin interferencias al tocar borde/icono/ayuda. |

No se demuestra «scroll excesivo» para todos los móviles: a 390×844 la cuadrícula completa cabe en la medición aislada. A 320/360×844 necesita un pequeño scroll; con altura 667 px necesitaría más. El problema comprobado es la **ocupación poco informativa**: icono grande y ayuda repetida, sin resumir tareas ni explicar contexto. En desktop el problema es el salto de densidad y la falta de jerarquía, no solo tamaño.

### 5.4 Comportamiento responsive recomendado, todavía conceptual

Usar ancho disponible del contenido para decidir disposición, evitando que un breakpoint de viewport imponga seis columnas estrechas. Para C se plantea una columna de filas compactas en 320–430 cuando la etiqueta y la ayuda no quepan cómodamente; dos columnas solo si cada tarjeta conserva ancho suficiente. En tablet, dos/tres columnas según contenedor; en escritorio, tres/cuatro. Un breakpoint o container query de CSS basta; no se necesita una dependencia.

Unificar primero el vocabulario de breakpoints de la nueva portada. La migración del shell debe ser otra fase porque afecta todas las páginas. No reemplazar breakpoints MUI globales ni los de Tailwind de toda la aplicación para arreglar la portada.

## 6. Fuentes de datos disponibles para un dashboard inteligente

**C.** Actualmente R01 solo obtiene sesión. Las siguientes fuentes existen pero no están conectadas a la portada. Se inspeccionaron en código, sin consultar información comercial real ni ejecutar SQL. Los presupuestos de consultas son deducidos, no tiempos medidos ni planes de ejecución de producción.

### 6.1 Inventario de fuentes, semántica, permisos y coste

| Necesidad | Fuente real y contrato | Filtro / frescura / coste | Reutilización prudente y trabajo pendiente |
| --- | --- | --- | --- |
| Contexto de negocio | R08:69–93 y sesión: nombre, slug, operabilidad, motivo, flags de reservas/encuestas | Ya forma parte del snapshot. Por snapshot con email: consulta de usuario/negocio; si operativo, dos `count` de configuración. | Mostrar identidad y estado descriptivo sin nueva API. No repetir consultas para flags ni usarlos como totales. No añadir una lectura cliente por tarjeta. |
| Pedidos recientes | [src/orders/actions/getOrders.ts](../../src/orders/actions/getOrders.ts):31–100, `getOrdersByNegocio(page=1, limit=10)`; [api/orders/route.ts](../../src/app/api/orders/route.ts):5–18 expone GET con página/límite | Requiere sesión con `negocioId`. `count` total + `findMany` por negocio, orden `createdAt desc`, con items y conversión Decimal. Sin filtro de estado ni período. | Se puede llamar directamente desde Server Component con límite pequeño para un bloque de recientes; no crear otro REST. Payload incluye items que quizá no se necesitan. Preferir selección reducida en una evolución de datos si el coste lo justifica. |
| Pedidos pendientes | `Order.status` en schema:165 y enum:900–906; recientes devuelven status | Estados reales: `Recibida`, `Preparacion`, `Entregada`, `Pagada`, `Cancelada`. No se encontró un contador dedicado de pendientes para propietarios. | No usar `total` ni filtrar solo la última página. Acordar definición de pendiente; después un `count` acotado por negocio/estados en servidor, sin nuevo endpoint obligatorio. **Requiere trabajo de datos.** |
| Reservas del día | [api/reservasConfig/route.ts](../../src/app/api/reservasConfig/route.ts):24–90, `GET ?date=YYYY-MM-DD`; [ReservasDashboard.tsx](../../src/reservas/componentes/ReservasDashboard.tsx):78–106 | Sesión con `negocioId`; una consulta por día con orden ascendente. Devuelve todos los estados y datos de cliente. Usa `parseISO`/`startOfDay` del entorno, no zona Colombia explícita. Sin `take`. | Un resumen «Reservas de hoy» exige normalizar rango en Colombia y filtrar estados. No llevar teléfonos/notas de clientes a la portada solo para contar; no consultar varios días en bucle. |
| Reservas próximas | [api/asistente/route.ts](../../src/app/api/asistente/route.ts):2395–2417, función interna `reservasProximas(negocioId)` | Una consulta `fechaHoraInicio >= ahora`, ascendente, `take:25`, sin filtro de estado y con fila completa. El POST está protegido con `MYCKEO_ADMIN_KEY`/`x-api-key`, líneas 30–35 y 1443–1503. | Existe consulta reutilizable conceptualmente, **no una función exportada consumible por la UI**. Extraer un helper reducido/autorizado en fase de datos; no llamar al endpoint administrativo desde navegador ni exponer su clave. Excluir canceladas/bloqueos según definición acordada. |
| Productos disponibles | [src/perfil/actions/getConteosSecciones.ts](../../src/perfil/actions/getConteosSecciones.ts):10–108, campo `productos` | Verifica negocio mediante política pública y cuenta `status: "disponible"`; caché individual 3600 s, tag `productos-count-${slug}`. El helper completo hace 1 búsqueda de negocio + 4 counts en frío. | Ya existe el conteo. Llamarlo «Productos disponibles», no total del catálogo, stock ni productos con variantes activas. Reutilizable si se acepta frescura; para actualización inmediata, revisar invalidación/selección del helper. |
| Listado completo de productos | [getProductsFromUser.ts](../../src/actions/productos/getProductsFromUser.ts):14–105; [api/productosNegocio/route.ts](../../src/app/api/productosNegocio/route.ts):5–92 | Action recibe ID de usuario sin `auth()` interno, busca negocio y lista sin paginación. API sí usa sesión, devuelve catálogo con imágenes/secciones/variantes, no selecciona status de producto y llama `$disconnect` en finally. | No usar ninguno solo para obtener un número. La action no debe recibir ID libre de cliente como fuente del dashboard; identidad en servidor. No importar el endpoint como módulo de consulta ni copiar su desconexión de Prisma singleton. |
| Servicios disponibles | `getConteosSecciones`:42–51; [api/getServiciosNegocio/route.ts](../../src/app/api/getServiciosNegocio/route.ts):7–41 para listado | Conteo `status:"disponible"`, caché 3600 s; listado con sesión, sin paginación y multimedia. | Preferir conteo, no descargar multimedia para contar. No denominarlo «reservas» ni disponibilidad horaria. |
| Publicaciones | `getConteosSecciones`:69–78, campo `publicaciones`; [getPublicaciones.ts](../../src/publicaciones/actions/getPublicaciones.ts):30–83, 117–140 y paginación; [api/publicaciones/[slug]/route.ts](../../src/app/api/publicaciones/[slug]/route.ts):86–104 | Count de `visibilidad:"PUBLICA"`, caché 60 s. Listados públicos por negocio/tipo, con multimedia/interacciones; action `skip/take`, orden reciente. | Count público es reutilizable como «Publicaciones públicas»; no es total de borradores/privadas ni necesariamente solo publicaciones escritas por propietario. No bajar comentarios/medios para un número. No existe enlace de gestión histórica desde la portada auditada. |
| Reseñas | `getConteosSecciones`:54–67 | Cuenta publicaciones `TESTIMONIO` con producto asociado marcado `esResena`, caché 3600 s. | No sustituir por número de registros `Resena` ni por «opiniones del negocio» sin aclaración. No es métrica necesaria en el primer rediseño; el helper actual la consulta aunque solo se pidan otros tres conteos. |
| Transacciones recientes | [src/transacciones/actions/getTransactions.ts](../../src/transacciones/actions/getTransactions.ts):19–78 | Sesión por `usuarioId`; página/límite (20 por defecto), tipo, fechas solo si vienen ambas. `findMany` + `count`, sin agregado monetario. Orden por `date`. | Reutilizable para recientes con período/límite explícitos. No sumar 20 registros y mostrarlo como total del negocio. El alcance es del usuario, no `negocioId`. |
| Ingresos, gastos y neto | [api/transacciones/route.ts](../../src/app/api/transacciones/route.ts):8–15, 21–91 | Sesión por `usuarioId`, fechas/tipo/método; por defecto último mes móvil. 1 listado paginado, 1 count y 2 aggregate. Balance global del filtro, independiente de la página. Respuesta declara `s-maxage=60, stale-while-revalidate`. | Fuente real de balance. Indicar período y «transacciones registradas». Antes de usar datos privados en nueva superficie revisar política de caché del despliegue; el header por sí solo no demuestra fuga ni aislamiento efectivo. Preferir consulta privada de servidor si se extrae lógica. |
| Gráficos financieros | [GraficosTransacciones.tsx](../../src/transacciones/componentes/GraficosTransacciones.tsx):35–49, 73–103; página transacciones:114–123 | Agrega en cliente las transacciones recibidas, que la página obtiene con el límite por defecto de 20. Registra Chart.js. | No reutilizar estos gráficos ni sus sumas como total histórico completo en la portada. Reutilizar conceptos/formateadores pequeños, no cargar la pantalla financiera. |
| Resumen comercial diario/semanal | [api/asistente/route.ts](../../src/app/api/asistente/route.ts):61–86, 2323–2350, 2645–2672 | Helpers internos: count de pedidos/reservas y sum de `Order.totalAmount`. Zona Colombia explícita. Diario = 3 consultas; semanal = 2. Sin filtrar estado de pedido, tipo de transacción ni estado de reserva. | No reutilizar la etiqueta «ingresos» del helper como venta cobrada. Son importes de pedidos creados. Puede extraerse consulta en fase independiente tras definir negocio/estado/período; no consumir endpoint de clave administrativa desde UI. |
| Actividad reciente | Fechas de Order/Product/Publicacion/Transaction/Reservation; `OrderStatusHistory` en schema:206–213 y escritura en [updateOrder.ts](../../src/orders/actions/updateOrder.ts):183–189 | No se encontró un servicio unificado de actividad del propietario. La historia de pedidos es de dominio; una actualización puede registrar historia incluso sin cambiar de estado. | Un bloque «Pedidos recientes» puede usar fuente existente. Una línea temporal cruzada requiere contrato nuevo y consultas adicionales; no presentarla como disponible ni crear un sistema de eventos por el rediseño. |

No se encontró una métrica de tráfico, conversión, visitantes únicos, crecimiento porcentual, valoración media completa o escaneos QR lista para esta portada. Tampoco una conexión que permita deducir «ventas cobradas» solo a partir de los estados de pedidos. Esas tarjetas quedan fuera de las tres propuestas iniciales.

### 6.2 Impacto y frescura: condiciones para reutilizar sin APIs innecesarias

**Datos sin trabajo adicional de backend:** identidad/estado descriptivo y flags de configuración ya incluidos en sesión. Cambiar su presentación es trabajo visual, siempre que no se modifiquen guards ni se oculten enlaces de onboarding.

**Fuentes existentes con integración funcional:** conteos públicos del helper y pedidos recientes acotados. Se pueden consumir desde servidor sin añadir REST, pero la integración añade queries, gestión de error/estado vacío y decisiones de frescura. No debe llamarse «solo CSS».

El helper de conteos ejecuta cuatro `count` en frío aunque solo se muestren productos/servicios/publicaciones. Cada invocación verifica de nuevo el negocio. Para una primera integración, evaluar su coste medido frente a extraer selectores específicos preservando el contrato público. Las mutaciones inspeccionadas suelen invalidar `negocio-products-*` o `negocio-publications-*`; la revalidación de `productos-count-*` existe en [revalidateAdminProductSurfaces.ts](../../src/actions/myckeoAdmin/revalidateAdminProductSurfaces.ts):16–20, pero no se observó cobertura equivalente de todas las mutaciones del propietario para todos los counts. Una tarjeta podría permanecer desactualizada hasta el TTL. No prometer refresco inmediato por un simple `router.refresh()`.

**Información que requiere consulta/contrato adicional:** pendientes exactos, próximas reservas filtradas, resumen financiero privado desacoplado del listado y actividad cruzada. No requiere necesariamente API, migración o sistema estadístico: un loader/helper server acotado puede bastar, después de definir semántica y medir coste.

Índices declarados en el schema inspeccionado:

- `Reservation [negocioId, fechaHoraInicio]`:94, adecuado para rangos por negocio.
- `Product [negocioId, status]`:277 y `[negocioId, createdAt]`:278; `Servicio [negocioId,status]`:712; `Publicacion [negocioId,visibilidad,createdAt]`:493.
- `Transaction [usuarioId,date,type]`:148.
- `Order [negocioId,date]`:175 y `[status]`:177; el listado ordena por **createdAt**, no por `date`. No hay un índice compuesto exacto negocio/estado/createdAt en ese modelo inspeccionado.

Son declaraciones del archivo local —que ya tenía cambios previos—, no prueba de que los índices estén desplegados. No se ejecutaron `EXPLAIN` ni consultas reales. Antes de añadir carga, medir volúmenes/latencia con acceso autorizado; priorizar `count`/`aggregate` con filtros y `select` pequeño, límites 3–5 para listados, sin `include` masivo y sin polling general del dashboard. `count` también tiene coste dependiente del volumen: no es gratuitamente constante.

Para una primera versión híbrida, elegir **un** resumen pequeño, evitando conectar simultáneamente todos los endpoints. Presupuesto de referencia para discutir: conteos del helper (1 verificación + hasta 4 counts en frío) **o** recientes de pedidos (count + listado), además del auth existente. Añadir ambos solo después de medir. Si un resumen falla, mantener los enlaces de herramientas utilizables y mostrar «No disponible»/reintento; nunca `0` por defecto cuando `ok:false`.

Los datos privados deben derivar usuario/negocio del servidor, conservar los guards, serializar Decimal/Date explícitamente y aislar cualquier caché por identidad. La política pública no sustituye el ownership privado. No añadir todos los KPIs al JWT ni duplicar los dos proveedores Query existentes con un tercero.

## 7. Comparación de tres propuestas conceptuales

Las siguientes son propuestas, no componentes o rutas ya implementados. Los nombres de grupos organizan herramientas existentes; no crean módulos de backend.

### A. Dashboard minimalista premium

Encabezado con «Panel de tu negocio» y nombre real; dos acciones destacadas —Nuevo Producto y Nueva Publicación—; directorio compacto del resto de herramientas con texto claro y una línea de apoyo. Grupos pequeños o una lista bien ordenada; ayuda secundaria accesible. Sin KPIs en la primera entrega. Conserva acceso explícito a catálogo organizado, QR y cuenta mediante la navegación actual o enlaces secundarios revisados.

En móvil, filas con icono pequeño y título legible, toda la fila como enlace y ayuda aparte si hace falta. En escritorio, tarjetas horizontales de tamaño moderado y ancho máximo razonable. El espacio libre contribuye a claridad sin convertir todas las tarjetas en grandes bloques vacíos.

Ventaja principal: puede mejorar mucho la experiencia manteniendo el coste de datos actual. Limitación: el propietario todavía debe entrar en Pedidos o Reservas para conocer su situación.

### B. Dashboard SaaS operativo

Encabezado del negocio; resumen de pocos indicadores reales con período; bloque de pedidos recientes/agenda; acciones rápidas; catálogo organizado por categorías. Puede incorporar Productos disponibles, Publicaciones públicas y Pedidos recientes con fuentes existentes. Pendientes exactos, próximas reservas depuradas o balance privado quedan sujetos a la fase funcional descrita en 6.

En móvil se prioriza información accionable y se evita desplazar todas las herramientas bajo varias pantallas de métricas. No se propone un gráfico financiero grande, feed de eventos o comparaciones porcentuales por defecto.

Ventaja principal: mayor utilidad diaria cuando los datos se definan bien. Limitación: más contratos de estado/error, consultas y validaciones; riesgo de tratar cachés antiguas o páginas parciales como datos actuales.

### C. Dashboard híbrido

Base de A, con un bloque operativo opcional y pequeño de B. Primero contexto de sesión y dos acciones claras; después herramientas agrupadas, siempre accesibles. El resumen se incorpora gradualmente cuando tenga fuentes verificadas y no desplaza innecesariamente la navegación en móvil. Cada bloque de datos puede fallar sin bloquear la portada.

Agrupación inicial propuesta, usando únicamente accesos reales:

| Grupo conceptual | Herramientas / rutas existentes |
| --- | --- |
| Catálogo y oferta | Gestión de Productos; Nuevo Producto; Organización del Catálogo; Servicios |
| Operación | Gestión de Órdenes/Pedidos; Reservas; Transacciones |
| Presencia del negocio | Nueva Publicación; QR; Encuestas; Editar Perfil del negocio |
| Cuenta y salida, en navegación secundaria | Editar usuario; Ver negocio público cuando haya slug; Inicio; Cerrar sesión |

Las diez tarjetas actuales siguen representadas; Organización del Catálogo gana descubrimiento desde su enlace existente. Una acción rápida que repita destino del catálogo se justifica por la tarea de alta, no por una segunda implementación. La categoría de Encuestas es una decisión de información revisable con propietarios; no cambia rutas ni configuración.

El estado restringido, onboarding de usuarios/admin y superadministración permanecen como experiencias específicas. No se les muestran las métricas ni las categorías de negocio por uniformidad visual.

### 7.1 Comparación

Las valoraciones son relativas a este repositorio y alcance, no puntuaciones obtenidas en un estudio de usuarios.

| Criterio | A — Minimalista | B — Operativo | C — Híbrido |
| --- | --- | --- | --- |
| Experiencia móvil | Muy clara y ligera; buena para encontrar herramientas. | Útil con datos acertados; riesgo de scroll y densidad excesivos. | Buena si acciones y navegación preceden a datos secundarios; resumen breve. |
| Claridad de navegación | Alta al corregir nombres y agrupación. | Alta si separa indicadores de herramientas; más elementos compiten. | Alta con una estructura estable y grupos completos. |
| Complejidad | Baja/media: presentación, accesibilidad y cobertura de enlaces. | Alta: queries/semánticas, estados y shell. | Media y escalonable: empezar sin nuevas consultas. |
| Rendimiento | Similar o mejor al actual si se reducen islas cliente. | Mayor carga de datos/JS si se reutilizan listados o gráficos enteros. | Controlable: loader opcional, sin gráficos iniciales, datos acotados. |
| Mantenibilidad | Buena si definición de módulos se centraliza sin tocar permisos. | Exige contratos y lógica de datos mantenibles por dominio. | Buena con navegación estable y resumen desacoplado. |
| Escalabilidad | Nuevos accesos caben por grupos; limitada como centro operativo. | Alta para operación, con coste de complejidad creciente. | Alta: suma bloques independientes sin convertir todo en Client Component. |
| Riesgo de regresión | Bajo/medio; mayor si se cambia shell a la vez. | Alto respecto a A por permisos/caché/finanzas y múltiples fuentes. | Bajo/medio si cada ampliación de datos y shell se valida por separado. |

## 8. Recomendación final

Adoptar **C con una primera entrega de alcance visual equivalente a A**. Así se corrigen las deficiencias demostradas sin condicionar el resultado a datos nuevos o a una modificación de backend.

La primera experiencia debería comunicar el negocio, presentar las tareas de creación con claridad y agrupar las herramientas con títulos legibles, ayuda accesible y anchos útiles. La identidad cromática debe alinearse con los precedentes locales —Ruby/tinta/neutros o una decisión de marca explícita— mediante tokens del dashboard, sin declarar la paleta de Nuevo Producto como tema global ni alterar esa pantalla.

Luego incorporar un resumen real de volumen o una lista corta de pedidos recientes según valor para los propietarios y medición del coste. Los conteos existentes tienen prioridad sobre inventar analítica; si no se acepta su frescura, no se muestran hasta resolverla. El dinero requiere una fase independiente con período, alcance de usuario y semántica precisos.

La sidebar y la topbar requieren corrección, pero su alcance compartido impide tratarlas como un detalle local. El desfase 250/200 y la navegación accesible deben tener su propia revisión, pruebas en páginas consumidoras y autorización de alcance cuando se permita intervenir el shell. No se propone modificar otras pantallas para conseguir una portada premium.

## 9. Arquitectura técnica propuesta

**Todos los nombres nuevos siguientes son propuestas; no existen todavía.** Mantener `DashboardPage` como Server Component y los guards actuales como fuentes de verdad.

```text
src/app/dashboard/page.tsx                 existente, conserva ramas de auth/rol/estado
  ArchivedBusinessDashboardState          existente, conserva propósito y salidas
  CrearNegocioInfo                         existente, conserva onboarding
  DashboardHome                           propuesto, presentación de negocio
    DashboardHeader                       propuesto, server: identidad/h1
    DashboardQuickActions                 propuesto, server: enlaces existentes
    DashboardSummary                      propuesto, async server opcional/futuro
      DashboardMetric                     propuesto, presentación serializable
      DashboardRecentOrders               propuesto, listado breve solo si se aprueba
    DashboardModuleGroup                  propuesto, server: grupos/encabezados
      DashboardModuleLink                 propuesto, enlace principal y texto
      DashboardModuleHelp                 propuesto, isla client con Dialog MUI
  DashboardAdminHome                      propuesto o variante presentacional de dos enlaces

src/dashboard/config/dashboardModules.ts  propuesto, metadatos/IDs y URLs existentes
src/dashboard/componentes/dashboardHome.module.css   propuesto, estilos locales
src/dashboard/data/getDashboardSummary.ts           futuro opcional, server-only
```

### 9.1 Reutilización y límites de componentes

- **Conservar R02/R08/R09.** Presentación no decide permisos. La rama `negocio` del servidor entrega sus módulos actuales; `super_admin` recibe su inventario. La configuración de reservas/encuestas produce orientación, no revocación de acceso.
- **Evolucionar R03 o sustituir solo su consumo en portada.** Actualmente solo R01 importa `DashboardSections`. Se puede migrar por etapas conservando el contrato de enlaces y descripciones, sin reescribir pantallas de destino.
- **Centralizar metadatos sin centralizar autorización prematuramente.** IDs estables, nombre, descripción, ruta, grupo y clave de icono permiten evitar índices como keys y duplicaciones. Primera fase solo portada; adaptar sidebar al registro más adelante, manteniendo sus variantes. Un mapa común de URLs no debe absorber todos los guards de negocio.
- **Separar «enlace» de «ayuda».** Un artículo/contendor puede contener un enlace principal y un botón de ayuda hermano; nunca botón dentro de anchor. Mantener navegación estándar, abrir nueva pestaña y lectura del enlace.
- **Usar el `Dialog` de MUI instalado.** Ya hay un patrón accesible de ayuda en [NewProductHeader.tsx](../../src/ui/components/productos/newProduct/NewProductHeader.tsx):24–25, 49–85 con nombre/44 px/reduced motion. Reutilizar patrón/primitiva, no importar el encabezado del producto. `HelpTriggerModal` también existe, pero usa un modal propio; no asumir que resuelve todos los defectos de foco por el solo hecho de reutilizarlo.
- **Estilos locales.** CSS Module para estructura/tokens y `sx` cuando aporta al control MUI. Evitar declarar simultáneamente el mismo padding/tipo en Tailwind y Emotion. Un pequeño vocabulario local de superficie, borde, tinta, texto secundario, acento y focus basta.
- **Iconografía.** Usar una familia ya instalada o normalizar tamaño/peso de la existente, con iconos decorativos `aria-hidden` y texto visible. No instalar otra biblioteca ni usar un emoji como identificador operativo.
- **Shell compartido en fase separada.** Un ancho único y una decisión coherente de breakpoint, idealmente CSS para geometría y estado React para apertura. `Drawer` de MUI ya disponible si se requiere modal móvil. No cambiar el provider/theme global ni `/admin` por accidente.

### 9.2 Renderizado, carga y datos

Mantener navegación y contexto como HTML de servidor; hidratar únicamente ayuda y controles interactivos necesarios. Las props del loader deben ser DTO mínimos, no instancias Prisma, Decimal ni objetos de sesión completos. Los iconos pueden resolverse desde claves donde convenga; no pasar funciones de componentes por la frontera server/client.

No añadir SWR/Query por cada tarjeta. Si se usa loader server, no introducir otro fetching cliente equivalente. Si un resumen necesita interacción posterior, reutilizar el proveedor existente y claves por usuario/negocio; no cachear datos privados con una clave global. Una frontera `Suspense` para resumen opcional debe reservar altura coherente y no esconder enlaces del directorio.

El loader futuro derivará identidad de sesión y comprobará el contexto operativo adecuado sin alterar la rama visual heredada del caso límite `negocio` sin relación. Resumen no disponible en ese caso; no convertir la falta de datos en una redirección nueva. Para errores parciales usar un resultado explícito por bloque; no mapear indiscriminadamente a cero.

No cargar `ListOrders`, `ReservasDashboard`, `GraficosTransacciones` ni formularios completos en la portada para «reutilizar»: contienen tablas, mutaciones, multimedia o bibliotecas que no hacen falta para un resumen. Reutilizar sus fuentes o formateo cuando tengan un contrato válido. La fase visual puede hacerse sin nueva consulta, endpoint, paquete o migración.

### 9.3 Separación de tipos de mejora

| Tipo | Ejemplos | ¿Necesita datos/backend? |
| --- | --- | --- |
| Visual local | Jerarquía, nombres revisados, agrupaciones, tamaño/peso de iconos, bordes, espaciado, proporciones y grid por ancho útil. | No; conservar rutas/selección actual. |
| Interacción/accesibilidad | Enlace y ayuda separados, diálogo MUI, foco, Escape, target 44 px, encabezados/landmarks. | No API; sí comportamiento frontend y pruebas de interacción. |
| Navegación compartida | Offset/sidebar, cierre al navegar, resize/persistencia, topbar con nombres largos y avatar usando el campo correcto. | No debería cambiar auth; sí afecta shell y requiere regresión transversal. |
| Datos con fuentes existentes | Conteos públicos o pedidos recientes acotados. | Sí integración funcional, estados, coste y frescura; no nueva API obligatoria. |
| Contrato de datos nuevo/revisado | Pendientes exactos, próximas reservas depuradas, balance privado desacoplado, actividad cruzada. | Sí trabajo server/dominio tras evaluación; no implica migración por defecto. |

## 10. Plan de implementación por fases

**Ninguna fase se ejecuta en esta auditoría.** Cada una debe poder revisarse y revertirse como cambio independiente. No usar una nueva dependencia de feature flags como condición para reversibilidad; basta limitar los cambios y conservar contratos.

| Fase | Objetivo y archivos potenciales | Dependencias | Riesgos | Validaciones | Criterio de aceptación / reversión |
| --- | --- | --- | --- | --- | --- |
| 0 — Baseline integrada | Capturar `/dashboard` real por roles y estados con cuentas existentes autorizadas; evidencia en `docs/dashboard-premium-audit/`; futura prueba específica en `e2e/dashboard/` si procede. | Acceso de prueba real, sin crear datos por defecto. | Confundir fixtures con producto, datos personales en capturas o cobertura parcial como aprobación. | 7 anchos, menú abierto/cerrado, configuración presente/ausente, restricción y superadmin; navegación de solo lectura. | Evidencia etiquetada por contexto y mapa de enlaces completo. Sin cambios productivos; se puede descartar la instrumentación. |
| 1 — Contrato y estructura local | Extraer metadatos de las tarjetas a `src/dashboard/config/dashboardModules.ts` y preparar composición de portada; `src/app/dashboard/page.tsx`, R03 y componentes nuevos locales. | Baseline e inventario aprobado. | Omitir tarjeta, cambiar URL, filtrar por flags, mezclar roles. | Comparar conjunto de destinos negocio/superadmin y textos de ayuda; typecheck/lint pertinentes al cambio. Pruebas de ramas con comportamiento real o casos controlados explícitamente etiquetados. | Diez tarjetas de negocio/dos administrativas equivalentes y mismos estados alternativos; cero cambio de auth/rutas. Revertir extracción sin tocar destinos. |
| 2 — Presentación premium mobile-first | H1/contexto, acciones, categorías, enlaces compactos, escala tipográfica/iconos, CSS Module/tokens locales. Archivos de fase 1 y `dashboardHome.module.css`. | Contrato estable y decisión de copy/paleta. | Nuevos nombres ambiguos, duplicación de altas, pérdida de contraste, alturas fijas. | Capturas en 320/360/390/430/768/1024/1440 y fronteras; zoom 200/400%, teclado, comparación del grid. | Sin intersección icono/ayuda, sin recorte, rutas completas y legibilidad. Solo cambia la portada. Revertir composición/estilos manteniendo metadatos compatibles. |
| 3 — Ayuda y accesibilidad local | Sustituir modal propio por Dialog MUI, separar controles, foco/Escape, áreas táctiles, landmarks. R03 o `DashboardModuleHelp`/`DashboardModuleLink`; wrappers mínimos si hace falta. | Fase 1; puede desarrollarse antes o junto a 2, revisada por separado. | Info activa navegación, foco perdido, portal sobre/bajo la topbar, pérdida de descripciones. | Abrir Info con mouse/touch/Enter, Tab/Shift+Tab, Escape, cierre por fondo, foco de vuelta; CTA correcto; lector de pantalla. | Un solo destino por enlace; ayuda accesible y completa; sin fondo interactivo durante diálogo; target objetivo 44 px. Revertir únicamente interacción si hay regresión. |
| 4 — Shell compartido, alcance explícito | Resolver 250/200, breakpoints, menú móvil accesible, topbar, resize/persistencia. R04/R05/R06/R07 y estilos del shell; revisar semántica de R02. | Baseline transversal y autorización para intervenir componente compartido. No requiere rediseñar otras páginas. | Cambiar todas las pantallas dashboard y `/admin`, tapar formularios/modales, alterar comportamiento del store. | Lectura/navegación de Productos, Nuevo Producto, Órdenes, Transacciones, Reservas, Encuestas, editar usuario/perfil y `/admin`; 768/769; menú/collapse/volver; nombres largos. | Un ancho/offset coherente, sin contenido tapado; foco y cierre correctos; destinos intactos. Revertir shell/store como unidad independiente de portada. |
| 5 — Primer resumen real opcional | Integrar conteos **o** recientes según decisión, en `DashboardSummary` + futuro `src/dashboard/data/getDashboardSummary.ts`; helpers de dominio si hace falta. | Fases visuales estables; definición de métricas, frescura y medición de consultas; verificar guard y caché. | Números antiguos, falso cero, payload excesivo, duplicación de auth, datos de otro negocio. | Datos autorizados comparados con fuente; caso cero/error/no configurado; presupuesto de consultas; navegación usable si falla resumen; sin llamadas al asistente administrativo desde cliente. | Cada indicador tiene etiqueta/período/alcance correctos y error independiente. Sin nuevo endpoint por comodidad. Revertir bloque y loader sin alterar herramientas. |
| 6 — Operación ampliada, si se justifica | Pendientes, reservas próximas o balance en cambios separados; helpers server en dominios existentes, no toda la analítica a la vez. | Semántica de estados, zona horaria, aislamiento de caché y coste aprobados; fase 5 medida. | Clasificación incorrecta, duplicar ingresos, canceladas como próximas, carga de históricos. | Comparación con módulo fuente, límites de día Colombia, estados cancelados/pagados/bloqueados, paginación y volumen. | Cada métrica responde una pregunta útil y verificable; sin porcentajes ficticios ni nuevas tablas estadísticas. Cada bloque se puede retirar individualmente. |
| 7 — Revisión final y decisión de publicación | Documentar aceptación; evidencias/comprobaciones pertinentes. No incluye despliegue automático. | Fases elegidas completas y alcance aprobado. | Asumir que smoke público valida dashboard o que el éxito visual prueba permisos. | Contratos de navegación, roles/estados, responsive, teclado/lector, errores y rendimiento comparativo. `pnpm typecheck`, comprobaciones del área y browser según alcance futuro; no regenerar fixtures con escrituras sin necesidad. | Documento de aceptación con pendientes explícitos; publicación solo bajo instrucción correspondiente. Revertir la fase específica que falle, no datos/migraciones. |

Si se exige conservar estrictamente todas las otras pantallas durante la primera entrega, **fase 4 queda fuera de esa entrega**. El informe puede registrar su deuda sin esconderla; no se debe hacer un workaround global desde CSS de la portada para aparentar que está resuelta.

## 11. Riesgos de regresión

| Riesgo | Fuente concreta | Salvaguarda propuesta |
| --- | --- | --- |
| Perder un módulo poco visible | Diez tarjetas R01 y quince links R05; QR y edición al final; Catálogo/cuenta solo sidebar. | Comparar inventarios completos de URLs; validar últimos accesos con scroll y menú abierto. |
| Bloquear configuración inicial | `configReservation`/`configEncuestas` falsos redirigen a crear. | Mantener tarjetas habilitadas; no usar flags como permisos. Verificar ambos estados. |
| Habilitar negocio restringido | Snapshot anula `negocioId`; R09/R10 y shell tienen ramas específicas. | Mantener guards/avisos y no pedir datos operativos ni mostrar módulos en estado restringido. No sustituir server auth por CSS. |
| Uniformar indebidamente roles | `super_admin` tiene dos tarjetas; `admin` cae en onboarding pero sidebar «Clientes». | Preservar comportamiento y tratar cambios funcionales como decisión separada. |
| Resolver silenciosamente el caso sin negocio | `negocio` sin `hasManagedBusiness` no satisface R09. | No añadir redirect/ocultación dentro de rediseño; fallback explícito solo para resumen futuro. |
| Navegación doble al pedir ayuda | Botón anidado actual y `preventDefault`. | Separar elementos y probar destinos/eventos/teclado; mantener CTA del modal. |
| Heredar una mejora global involuntaria | R04 también consumido por `/admin`; layouts persisten entre subrutas. | Fase de shell aislada, alcance explícito y regresión transversal; sin estilos globales desde portada. |
| Desfase entre servidor y sesión cliente | R01 usa `auth`, R05/R06 `useSession`, provider sin snapshot inicial. | No eliminar guards para evitar parpadeo; verificar montaje, logout y sesión renovada. No asumir sincronía instantánea. |
| Datos de cuenta/negocio confundidos | `Transaction.usuarioId`, negocio en otras fuentes; `fotoPerfil` frente a `image`. | DTO por propósito, identidad del servidor y etiquetas claras; consumo UI correcto sin cambiar auth. |
| Mostrar finanzas incompletas | `getTransactions` default 20 y gráficos cliente; sum de pedidos sin filtro de cobro en asistente. | Nunca sumar página como total; balance por filtro y semántica explícita. |
| Contar una cancelación como trabajo pendiente | Estados distintos en Order/Reservation; helper de próximas no filtra. | Definir estados incluidos; no inventar enum `PENDIENTE` para Order ni omitir bloqueos en reservas. |
| Datos obsoletos o caché privada incorrecta | TTLs 60/3600, tags distintos, header compartido en API transacciones. | Auditar invalidación, scope e implementación real de caché antes de reutilización privada; no asumir filtración demostrada. |
| Error convertido en cero | Helper público devuelve campos cero con `ok:false`; orders vacío devuelve `ok:false,total:0`. | Distinguir estado vacío verificable de fallo; conservar mensaje/resultado y mostrar error no destructivo. |
| Carga excesiva | Listados completos de productos/servicios, relaciones de pedidos, gráficos y varias lecturas de auth. | `count`/select/límites, resumen optativo y presupuesto medido; no refetch por tarjeta ni polling por defecto. |
| Cortes de día incorrectos | Reservas API usa TZ del proceso; asistente tiene rango Colombia explícito. | Rangos `[inicio, fin)` en Colombia y pruebas de bordes antes de añadir KPI «hoy». |
| Texto cortado o foco tapado | Sidebar fija, topbar, overflow hidden y modal sin altura máxima. | Medir rectángulos reales, zoom, landscape y teclado; no resolver recortes con más `overflow:hidden`. |
| Alterar trabajo previo del repositorio | Al iniciar ya había modificaciones en schema, feed, búsqueda y navegación pública, entre otras. | No revertir, formatear ni incluir cambios ajenos; limitar entregable a esta carpeta. Los hashes acompañan la evidencia usada. |

## 12. Criterios de aceptación visual y funcional

Estos criterios son para la implementación futura. **La auditoría no los declara aprobados en producto.**

### 12.1 Visual y responsive

- Revisar la ruta autenticada a 320, 360, 390, 430, 768, 1024 y 1440 px, con alturas representativas y evidencia identificada por rol/estado.
- No hay scroll horizontal global ni contenido oculto por sidebar, topbar o ancestros; no se acepta únicamente `scrollWidth === viewport` si existe clipping.
- Las tarjetas/filas conservan títulos completos, alineación y espacio propio de icono/ayuda. En 1024 px desaparece la intersección demostrada; el número de columnas responde al ancho útil.
- La portada muestra un h1 y contexto de negocio real cuando corresponda. Las acciones rápidas se distinguen de navegación y los grupos no ocultan herramientas.
- El ritmo de espaciado y las superficies siguen tokens locales coherentes; no hay un color arbitrario distinto por herramienta sin propósito. Contraste medido en normal/hover/focus/disabled cuando aplique.
- Texto normal mínimo con contraste 4.5:1; controles/iconos informativos esenciales 3:1. Los iconos decorativos acompañan texto y no son el único identificador.
- Objetivo de producto de 44×44 px para controles táctiles, con separación suficiente y sin solapamientos. Verificar además los requisitos/excepciones WCAG aplicables, sin equiparar 44 px a mínimo obligatorio AA.
- Nombre largo, zoom 200%, reflow equivalente a 320 CSS px, paisaje y preferencia de movimiento reducido mantienen uso y comprensión. No fijar alturas que recorten traducciones/texto ampliado.
- Si se cambia el shell: ancho abierto y offsets coinciden, colapsado conserva legibilidad, cruces de breakpoints no reinician arbitrariamente la elección del usuario y menú no tapa interacciones de destino.

### 12.2 Funcional, accesibilidad y navegación

- Negocio no restringido conserva N01–N10 con sus URLs exactas; siguen localizables Organización del Catálogo, Editar usuario, sitio público y salida.
- Superadministración conserva sus dos accesos; `user`/`admin`, ausencia de sesión y roles excluidos mantienen los flujos actuales hasta una autorización funcional distinta.
- Reservas/Encuestas sin configuración siguen pudiendo entrar al onboarding; no se convierten en tarjetas inertes.
- Restricción por archivo/inactividad/test conserva aviso, motivo, fecha válida y sus tres salidas, sin datos o acciones operativas nuevas.
- Enlaces navegables mediante teclado/lectura asistiva y apertura en nueva pestaña; sin controles interactivos anidados; nombres visibles y accesibles consistentes.
- Info abre explicación sin navegar. El diálogo tiene nombre/título, foco inicial, Tab/Shift+Tab contenidos, Escape, cierre explícito y por fondo, retorno de foco y CTA con URL correcta.
- Menú accesible con estado expandido/nombre; si es modal móvil, foco y fondo correctamente gestionados, cierre por Escape/fondo/navegación y retorno al disparador. Estado activo anunciado de forma adecuada.
- Un solo landmark principal de contenido, jerarquía de títulos coherente e indicadores de foco visibles/no ocultos por barras fijas.
- Cerrar Sesión conserva `callbackUrl: "/"`; las pruebas de esta operación se hacen únicamente en un contexto de prueba autorizado.

### 12.3 Datos, rendimiento y aislamiento

- Cada resumen tiene fuente, alcance, estados incluidos, período y frescura documentados. Conteos públicos no se presentan como inventario total y transacciones no se confunden con ventas cobradas.
- Un fallo, cero real, ausencia de configuración y negocio restringido se distinguen visualmente y en los resultados de datos. Un error secundario no bloquea navegación.
- Ownership y operabilidad se verifican donde corresponda en servidor. No se aceptan IDs libres del cliente como identidad del resumen ni claves administrativas en frontend.
- Páginas parciales no producen métricas totales. Reservas/pedidos cancelados o bloqueados no se clasifican silenciosamente como trabajo activo.
- Consultas y payloads medidos frente al baseline, sin N+1 por módulo, catálogos enteros para contar, recargas duplicadas, gráficos innecesarios ni polling general. No se afirman mejoras de LCP/CLS sin medición integrada comparable.
- Caché pública/privada y revalidación acordadas; actualización posterior a mutaciones comprobada cuando se prometa. No se modifican esquema/índices sin evidencia y alcance independiente.
- Ninguna dependencia adicional ni API nueva como requisito cosmético; tipado y verificaciones pertinentes completados en las fases que finalmente se autoricen.

### 12.4 Estado de cierre de esta auditoría

| Entregable / comprobación | Estado |
| --- | --- |
| Arquitectura, inventarios, roles/estados y rutas | Completado mediante código, con líneas y límites explícitos. |
| Responsive de componentes en siete anchos | Completado en montaje aislado; JSON y ocho capturas incluidos. |
| Interacción de ayuda en navegador | Confirmados apertura, descripción, carencia de diálogo, Escape inefectivo y foco hacia el fondo. |
| Acceso a ruta real sin sesión | Confirmado HTTP 307 a `/`. |
| Ruta real con sesión / sidebar / topbar / fuentes comerciales | Pendiente de validación integrada; no simulado como evidencia real. |
| Tres alternativas, recomendación, arquitectura y fases | Documentadas como propuestas sin ejecutar. |
| Cambios productivos, auth, permisos, rutas, datos o despliegue | Ninguno realizado por esta auditoría. |

MYCKEO_DASHBOARD_PREMIUM_AUDIT_READY
