# Myckeo — Mobile Premium V2

**MYCKEO_MOBILE_PREMIUM_V2_BRAND_READY_FOR_REVIEW**. Iteración local del 26 de noviembre de 2026. No integrada, enviada ni desplegada.

- Worktree: `/home/nico/worktrees/myckeo-mobile-premium-v2-20261126`.
- Rama: `prototype/mobile-premium-v2-brand-20261126`.
- Base V1: `251f29501891a6896d85dbbb0f4d4d95ab151ded`. Publicada: `89f2741578ec666fbcdcabb1e1d23126b5609f31`.
- [Comparador publicada → V1 → V2](mobile-premium-v2-evidence/index.html): 48 comparaciones, 144 imágenes principales y enlaces relativos.
- ZIP: `/home/nico/worktrees/myckeo-mobile-premium-v2-review-20261126.zip`. Extraer y abrir `index.html`. El commit final queda en `revision.json` dentro del paquete y en la entrega.

## Qué se corrigió

| Feedback | V2 implementada | Evidencia a 390 px |
|---|---|---|
| Franja comercial ocupa altura | Se elimina completamente la franja de V1, aunque ya no era fija. Cabecera de 64 px seguida directamente por categorías; no hay bloque sustituto. El inicio de la principal pasa de 168 a 120 px. | [Inicio V1](mobile-premium-v2-evidence/v1-390-top.png) · [V2](mobile-premium-v2-evidence/after-390-top.png) |
| Productos pequeños y espacio muerto | Marco según la proporción del mismo activo; comida y calzado pasan de 138 a 184 px de alto (+33%). Moda pasa de 205 a 380 px. Un título de una línea ocupa 19 px, frente al mínimo de 38 de V1. | [Comida](mobile-premium-v2-evidence/v2-key-food-390.png) · [Calzado](mobile-premium-v2-evidence/v2-key-shoe-390.png) · [Moda](mobile-premium-v2-evidence/v2-key-fashion-390.png) |
| Publicaciones con bandas vacías | La foto horizontal usa su proporción real: marco de 213 px frente a 320 de V1, sin reducir la imagen visible. El póster vertical gana tamaño: 560 px de alto frente a 320. | [Social](mobile-premium-v2-evidence/v2-key-social-390.png) · [Póster](mobile-premium-v2-evidence/v2-key-poster-390.png) |
| Barra demasiado neutra | Iconos coherentes con color por destino sobre tintas suaves. Activo con fondo y marca superior; texto inactivo sobrio, badges conservados. Misma altura de 64 px más safe-area. | [Inicio](mobile-premium-v2-evidence/after-390-top.png) · [Favoritos activo](mobile-premium-v2-evidence/after-nav-favoritos-390.png) · [Carro activo](mobile-premium-v2-evidence/after-nav-carro-390.png) |
| Identidad genérica | Bordes rosados sutiles, sombras suaves, radios de 18 px, acentos ciruela/rosa y superficies cálidas. Contacto conserva su verde reconocible; Crear y Negocio tienen acentos propios. | [Badges y tarjetas](mobile-premium-v2-evidence/after-badges-390.png) · [Reseña vinculada](mobile-premium-v2-evidence/v2-key-review-390.png) |

No se crean imágenes ni se sustituyen fotografías. Las fuentes móviles son las mismas de V1; tampoco cambian los presets compartidos o URLs de entrega. La proporción se obtiene al cargar la imagen existente y solo modifica una variable CSS móvil. Se prefiere recuperar superficie de imagen y quitar márgenes antes que introducir otro recorte. `contain` protege zapatos, ropa y comida; los límites de 440 px para producto y 560 para publicación conservan una pequeña compensación lateral en formatos verticales extremos. No se afirma eliminar todo margen posible.

## Acceso a negocio y navegación

Se conservan seis posiciones estables: Inicio, Carro, Favoritos, contextual, Perfil y Ayuda. No se añade altura ni otra franja comercial.

| Sesión | Posición contextual persistente | Perfil |
|---|---|---|
| Visitante | Negocio → `/config/completePerfil?negocio=1`, un toque | Mismo acceso «Tengo un negocio», e Ingresar existente |
| Personal o incompleta no placeholder | Crear → diálogo existente, un toque | «Tengo un negocio» y Crear; negocio queda a dos toques |
| Propietario | Negocio → `/dashboard`, un toque | Dashboard existente se presenta como «Gestionar mi negocio», enlace al perfil y Crear |

Se reutiliza el destino comercial existente y sus políticas de registro/gestión. Para propietarios no se duplica Dashboard dentro de Perfil. Crear conserva sus siete destinos y abre después de cerrar el menú; el foco inicial va a Cerrar Crear en móvil. El comportamiento de escritorio de ese diálogo mantiene su valor predeterminado. Ayuda conserva su URL de WhatsApp; la prueba no envía mensajes.

El acceso comercial personal cambia de ubicación: desaparece el acceso de un toque de la franja inicial de V1 y queda dentro de Perfil. Es el compromiso explícito para retirar esa fila conservando Crear, Ayuda y las seis posiciones. Visitantes y propietarios mantienen acceso directo permanente en la barra.

## Comparación y comprobaciones

La comparación general reutiliza las capturas válidas publicada/V1 del inventario congelado de la entrega anterior. V2 se captura con esos mismos 33 elementos: 10 productos, 10 publicaciones, 10 negocios y 3 servicios; el caso de reseñas utiliza las cinco relaciones públicas anteriores. Se recapturan seis tarjetas completas en ambos commits de referencia y los cuatro PNG de escritorio de la base publicada. Los worktrees temporales no tienen cambios de aplicación. [Procedencia reutilizada](mobile-premium-v2-evidence/reused-screenshots.json) · [referencias recapturadas](mobile-premium-v2-evidence/reference-worktrees.json).

El mismo scroll de 950 px puede mostrar tarjetas distintas porque cambian sus alturas. Las tarjetas individuales se capturan directamente en el navegador para comparar el mismo elemento completo, sin retocar PNG ni forzar publicaciones al inicio.

| Comprobación | Resultado y evidencia |
|---|---|
| Anchos | 320, 360, 390, 430, 768, 769 y 1440, inicio/scroll. Además, 280 px como comprobación adicional V2. [Medidas](mobile-premium-v2-evidence/after-metrics.json) · [280 inicio](mobile-premium-v2-evidence/after-280-top.png) · [scroll](mobile-premium-v2-evidence/after-280-scroll.png). |
| Inventario y escritorio | Los 15 casos comparables conservan sus identidades, sin pérdidas, duplicados, overflow ni errores finales de página. En 769/1440 inicio/scroll: **cero píxeles diferentes** frente a los cuatro PNG publicados recapturados. Principal de 680 px centrada y sticky de escritorio intactos. [Resultado](mobile-premium-v2-evidence/comparison-results.json). |
| Cabecera, categorías y barra | Header 64 px, reserva inicial de 120, 18 categorías accesibles, seis posiciones ≥44 px y footer alcanzable sobre la barra. Expansión/cierre, foco y scroll verificados. [Medidas](mobile-premium-v2-evidence/shell-categories.json). |
| Acciones comerciales y rutas | Precio/WhatsApp/carrito conservan una fila con controles de 44 px; distintivo sobre avatar, favorito independiente y pedido con variante/cantidad conservado al continuar 10 → 33 elementos. Favoritos y Carro reales muestran activo y badges 1/2. [Resultado](mobile-premium-v2-evidence/commerce-actions.json) · [recorrido final](mobile-premium-v2-evidence/browser-commerce-final.txt). |
| Sesiones | Anónima, personal, propietaria e incompleta; mismas posiciones y destinos, Perfil → Crear, siete opciones y foco. Guard placeholder existente solicita editar perfil. [Resultado](mobile-premium-v2-evidence/sessions.json) · [prueba final](mobile-premium-v2-evidence/browser-sessions-final.txt). |
| Pestañas y medios | Las cuatro pestañas regresan a los mismos 33 IDs. Fotos públicas cuadradas/horizontales; geometría vertical controlada identificada como sintética. Texto ampliable, imagen, póster/video y relación de reseña conservados. [Resultado](mobile-premium-v2-evidence/tabs-photographs.json). |
| Diálogos, teclado e insets | Búsqueda, ciudad, pedido rápido, publicación y Perfil. Cierres/foco/Escape/Tab, insets 24/20 y viewport visual de 470 px simulados. [Resultado](mobile-premium-v2-evidence/keyboard-dialogs.json) · [búsqueda](mobile-premium-v2-evidence/after-keyboard-search-390.png) · [carrito](mobile-premium-v2-evidence/after-keyboard-cart-390.png). |
| Continuación y ciudad | Coordinador existente con adaptador en memoria: 69 IDs únicos en Tunja y 69 en Bogotá; ciudad → departamento → país. Vacío, carga, pendiente, error y final conservados. [Resultado](mobile-premium-v2-evidence/continuation-states.json) · [estados](mobile-premium-v2-evidence/after-states.json). |
| Código | 12/12 unitarias de reparto/geografía, typecheck, lint y build. [Unitarias](mobile-premium-v2-evidence/unit.txt) · [tipos](mobile-premium-v2-evidence/typecheck.txt) · [lint](mobile-premium-v2-evidence/lint.txt) · [enfocado](mobile-premium-v2-evidence/lint-focused.txt) · [build](mobile-premium-v2-evidence/build.txt). La única advertencia de lint es `_body` heredada en ActivationBootstrap.test.tsx:347. |
| Portabilidad | 48 comparaciones triples, 144 imágenes principales cargadas sin red, más capturas complementarias. Enlaces relativos y extracción ZIP comprobados. [Resultado](mobile-premium-v2-evidence/portable-check.json). |

Son seis historias funcionales distintas, aprobadas en ejecuciones separadas: cinco en el [primer recorrido](mobile-premium-v2-evidence/browser-first.txt), sesiones en su ejecución final y comercio/rutas en su ampliación final. La primera aserción de sesiones detectó el foco en el contenedor de MUI, fuera del Paper que tiene el rol de diálogo. Se explicitó el foco en el botón de cierre al terminar la transición móvil y se secuenció el cierre de Perfil antes de Crear. Los intentos anteriores se conservan como evidencia, sin presentarlos como aprobados.

Se reutiliza la evidencia geográfica/relacional y la matriz PostgreSQL previa documentada en los informes V1 y de escritorio; no se repite ni se suma como nueva. No se cambia coordinador, política de vistos, ranking, consultas, cursores, caché, auth, esquema, datos remotos ni dependencias. [274 archivos protegidos sin cambios](mobile-premium-v2-evidence/scope.json). La revisión React cubrió hooks, callbacks, foco, limpieza, tipos y ausencia de nuevas peticiones de imagen.

## Aislamiento y límites

V1, su rama/commit y sus entregas se conservan intactos, al igual que el original y los demás worktrees. Main/origin/main se comprueban en 89f2741. [Referencias](mobile-premium-v2-evidence/references.json) · [preservación por hashes y estado Git](mobile-premium-v2-evidence/preservation.json).

Build con PostgreSQL propio desechable en tmpfs: 12 negocios y 3 productos mínimos, con runner que valida exclusivamente 127.0.0.1:55439/myckeo_public_audit y bloquea HTTP externo. Se usa el reenvío local 55439 → 25439 por la restricción de Docker Desktop ya conocida. El esquema se prepara solo en esa base; no hay migraciones o seeds remotos. Build aprobado: 74 páginas, sin ruta temporal. Advertencias de Upstash sin credenciales corresponden al entorno seguro. Servidores, cachés de revisión, worktree temporal y contenedor propios retirados. [Limpieza](mobile-premium-v2-evidence/cleanup.json). [Preparación](mobile-premium-v2-evidence/build-prepare.txt) · [fixtures](mobile-premium-v2-evidence/build-seed.txt).

Límites que siguen abiertos:

- IME, safe-area y barras de navegador se simulan. Falta revisión breve en Safari iOS y Chrome Android reales, con teclado y rotación.
- Este Chromium no dispone de H.264. Se conservan fuente MP4 original, póster y controles; no se certifica reproducción. [Metadatos](mobile-premium-v2-evidence/after-flows.json). La fotografía de comida del inventario tiene solo 192 px nativos; no se inventa detalle ni se altera el activo remoto.
- Sesiones y búsqueda se simulan en navegador. El recorrido de feed usa adaptador en memoria; la navegación de Carro/Favoritos comprueba su presentación y estado local, no checkout, nombres remotos o autenticación real. No se envían mensajes, compras, seguimientos autenticados ni preferencias remotas.
- Las fotos sin dimensiones previas ajustan su marco al decodificarse; no se certifican CLS cero ni rendimiento de red móvil. El alto reservado de la cabecera sí se mantiene durante hidratación.
- Persisten los pendientes históricos: Public smoke fallido en validación de entorno, staging separado sin certificar, asuntos editoriales/404, contenido de prueba persistido, cursor eliminado y ausencia de instantánea general ante cambios concurrentes. Esta tarea no los presenta como resueltos.

**Recomendación:** recomiendo V2 como candidata a integración: responde al feedback visual, mantiene los contratos y supera las regresiones focalizadas. No la integraría automáticamente antes de la aprobación visual de esta entrega y una prueba breve en dispositivos reales de los puntos anteriores. No se publica en esta tarea.

Reproducción local: `e2e/mobile-premium-v2/README.md`. El ZIP es una revisión visual autosuficiente, no un build instalable de la aplicación.
