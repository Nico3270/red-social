# Myckeo — Auditoría UX/UI del formulario de nuevo producto

**Estado: `NEW_PRODUCT_FORM_UX_AUDIT_READY`**

- **Fecha:** 14 de noviembre de 2026.
- **Ruta:** `/dashboard/productos/nuevo_producto`.
- **Referencia de producción:** <https://myckeo.com/dashboard/productos/nuevo_producto>.
- **Código local revisado:** HEAD `6e849626c6b3e77266bacf8dd9d5d69532395a51` y archivos presentes en el workspace.

## 1. Alcance, evidencia y conclusión

Esta entrega contiene auditoría, propuesta visual y plan para revisión. No implementa el rediseño, modifica componentes, ejecuta creaciones, sube/elimina imágenes, consulta registros de la base de datos, hace commits ni despliega. La aprobación del diseño sigue pendiente.

El formulario actual es una columna extensa que combina campos comerciales, clasificación, fotografías, asistencia con IA y opciones avanzadas. Sus capacidades son amplias, pero la presentación da un peso parecido a casi todos los bloques. Las fotografías aparecen después de la clasificación; la descripción manual queda detrás de explicaciones sobre IA; el inventario está lejos del precio y activar variantes exige descubrir un interruptor dentro de otro bloque.

La propuesta es conservar un único formulario y organizarlo en fotografías, información, precio/inventario, variantes y detalles adicionales. La mejora principal consiste en reducir decisiones simultáneas y hacer visibles los requisitos y errores, manteniendo disponibles todas las capacidades reales.

### 1.1 Qué se comprobó y qué no

| Evidencia | Resultado y límite |
| --- | --- |
| Inspección del código | Se revisaron página, formulario completo de 1.520 líneas, uploader, acciones, layouts, providers, estilos, seed, esquema Prisma y consumidores relevantes. Las etiquetas, valores y reglas descritos proceden de ese código. |
| Acceso público a producción | `curl -sS -I --max-time 20 https://myckeo.com/dashboard/productos/nuevo_producto` devolvió **HTTP 307**, `location: /`, el 14 de noviembre de 2026. Confirma la redirección de la solicitud sin sesión; no muestra el formulario. |
| Navegación autenticada | No hay una sesión autenticada disponible para esta auditoría mediante las herramientas expuestas. No se transfirieron cookies ni se alteraron controles de autenticación. La evidencia antigua del editor de perfil no acredita una sesión vigente de esta pantalla. |
| Aspecto visual | Descripción estructural derivada de clases, `sx` y valores predeterminados de MUI instalado. No es una medición del DOM ni una comparación de píxeles con producción. No se verificó que el despliegue coincida con HEAD. |
| Flujos externos | No se invocaron Server Actions, OpenAI ni endpoints de subida o borrado. La revisión de esos flujos es estática. |

### 1.2 Capturas solicitadas

| Vista | Estado |
| --- | --- |
| Escritorio | Pendiente de sesión autenticada disponible. |
| Móvil | Pendiente de sesión autenticada disponible. |
| Secciones inferiores | Pendiente de sesión autenticada disponible. |
| Inventario, atributos, variantes y modales abiertos | Pendiente de sesión autenticada disponible. |

No se adjuntan imágenes de la portada, del login ni de un montaje simulado como evidencia de la ruta. Los esquemas de la sección 7 son propuestas, no capturas. La falta de sesión no impide entregar el diagnóstico estructural ni requiere ampliar esta fase a infraestructura.

## 2. Identificación técnica

Las referencias siguientes son relativas a este documento. Los números de línea corresponden al código revisado.

| Pieza | Archivo y responsabilidad | Alcance |
| --- | --- | --- |
| Página | [page.tsx](../src/app/dashboard/productos/nuevo_producto/page.tsx), líneas 1–24. `force-dynamic`; título, ayuda y `CreateNewProduct`. | Exclusiva de la ruta. |
| Formulario | [CreateNewProduct.tsx](../src/ui/components/productos/CreateNewProduct.tsx), líneas 80–1520. Datos, carga de imágenes, IA, atributos, variantes, envío y modal. | Solo se encontró importado por esta página. |
| Layout autenticado | [dashboard/layout.tsx](../src/app/dashboard/layout.tsx). Usa `auth` de `@/auth.config`, permite `admin`, `super_admin`, `negocio`, `user`, redirige sin sesión a `/`. | Compartido por dashboard. |
| Estructura dashboard | [LayoutDashboardComponent.tsx](../src/ui/components/dashboard/perfil/LayoutDashboardComponent.tsx), `SideBarDashboard.tsx`, `TopBarDashBoard.tsx`. Menú, barra superior, márgenes y bloqueo visual de negocio restringido. | Compartida; fuera del cambio propuesto. |
| Layout raíz/providers | [layout.tsx](../src/app/layout.tsx), [Provider.tsx](../src/providers/Provider.tsx). Idioma español, CSS, SessionProvider y QueryClientProvider; ReactQueryProvider adicional en raíz. | Global. |
| Título | [Titulos.tsx](../src/ui/components/titulos/Titulos.tsx). Montserrat Alternates, tamaño y sombra. | Compartido. |
| Separadores | [Divider.tsx](../src/ui/components/divider/Divider.tsx). Dos líneas y `•••` centrados. Hay 16 usos en el formulario. También se utiliza `Divider` de MUI dentro de bloques desplegables. | Compartidos. |
| Ayuda | [HelpTriggerModal.tsx](../src/ui/components/helpModal/HelpTriggerModal.tsx). Botón configurable y modal con iframe YouTube. | Compartida; configuración de esta llamada es local. |
| Fotografías | [AutoUploadMedia.tsx](../src/ui/components/autoUpload/AutoUploadMedia.tsx), 555 líneas. Selección, optimización, previsualización, subida automática y eliminación autorizada. | Muy compartido: edición de producto, perfil, servicios, publicaciones, reseñas y administración. |
| Creación/IA | [createNewProduct.ts](../src/ui/actions/productos/createNewProduct.ts), `createProduct` desde línea 111 y `generateDescriptionFromText` desde línea 430. | Módulo de servidor; no modificar por razones estéticas. |
| Clasificación | [seed.ts](../src/seed/seed.ts). `initialData.categorias` y `initialData.secciones`; no se consultan desde API en el formulario. | Compartida con otras superficies. |
| Estado auxiliar | [productosTransaccionesStore.ts](../src/store/productosTransacciones/productosTransaccionesStore.ts). Tras crear se agrega id, nombre y precio al store. | Compartido. |
| Persistencia | [schema.prisma](../prisma/schema.prisma), `Product` desde línea 230, relaciones desde 284, `Category` desde 737 y enum `ProductStatus` desde 906. | Base de datos compartida. |
| Edición existente | [CreateOrUpdateProduct.tsx](../src/ui/components/productos/CreateOrUpdateProduct.tsx), usado por `/dashboard/productos/modificar_producto/[id]`. | Es otro componente. Cambiar creación no cambia automáticamente edición. |

### 2.1 Librerías, hooks y validación

- Next.js 15.5.9 y React 18 según `package.json`; navegación con `useRouter` y redirecciones del layout en servidor.
- MUI 6 declarado y Emotion: `TextField`, `FormControl`, `Controller` de RHF alrededor de controles MUI, `Stack`, `Box`, radios, switches, chips, alertas, botones y spinners. Tailwind 3 y `sx` conviven en el mismo árbol.
- React Hook Form 7: `useForm`, `register`, `handleSubmit`, `control`, `setValue`, `watch`. No hay resolver Zod/Yup en este formulario. No se extrae `formState.errors`, ni se conectan `error`/`helperText` a las reglas RHF.
- React: `useState` para imágenes, selección de secciones, componentes, atributos, variantes, estados de carga y modal; `useMemo` filtra secciones; `useCallback` estabiliza `onChange` del uploader.
- Dos `useEffect` generan el slug al cambiar el nombre y fuerzan stock general ilimitado/nulo al activar variantes.
- Framer Motion / `AnimatePresence` anima despliegues y modal; `createPortal` coloca el modal de envío en `document.body`; `next/image` renderiza iconos y previsualizaciones. Iconos de `react-icons`; la ayuda usa Lucide.
- El uploader añade `useRef`, `useEffect` y `useId` para inicialización, archivos en vuelo y selector único.
- No se usa TanStack Query, SWR ni un hook específico de productos para gestionar este formulario. Su presencia en la aplicación no implica participación en este flujo.

### 2.2 Creación y relaciones

```text
Formulario → handleSubmit de RHF → validaciones locales → FormData
          → createProduct (Server Action) → auth + negocio del usuario
          → validaciones servidor → transacción Prisma
          → Product + Image[] + ProductSection[]
                    + ProductAttribute[]
                    + ProductVariant[] + ProductVariantOption[]
          → revalidateTag → store auxiliar → modal éxito → detalle público
```

No hay un endpoint REST de creación llamado por este formulario. Next transporta la Server Action; no corresponde reemplazarla por `/api/productos` por motivos visuales.

`Product` pertenece a un `Negocio` y a una `Category`; admite varias `Section` mediante `ProductSection`. Los atributos y las variantes tienen orden explícito. Cada variante puede tener nombre, SKU, precio propio nullable, stock propio, imagen y opciones descriptivas. Las opciones no generan combinaciones automáticamente. `Image` tiene URL y relación al producto, sin campo de principal ni orden explícito.

La moneda predeterminada de `Product` es COP. No se selecciona en esta pantalla. Hay relaciones `CatalogGroupProduct`/`CatalogGroup`, pero el formulario no asigna grupos de catálogo del negocio. **Sección global y grupo de catálogo son conceptos distintos.**

La acción resuelve el negocio por `session.user.id`; no recibe un negocio editable del cliente. Revalida `negocio-products-${negocio.slug}`. Después de crear, el cliente usa la primera sección seleccionada para construir `/{categoriaSlug}/{section.slug}/{product.slug}`, muestra éxito y navega tras 2 segundos; cerrar el modal de éxito también navega.

## 3. Inventario completo del formulario actual

### 3.1 Orden inicial de la pantalla

1. Título **«Crear Nuevo Producto»** centrado.
2. Botón **«Mira este video de ayuda y crea tus productos»**, rojo, tamaño grande. Abre un modal cuyo título configurado es **«Cómo crear tu cuenta de negocio en Myckeo»**, con `https://www.youtube.com/embed/c5CsO8t4aBQ`. El contenido del video no se verificó.
3. Nombre, precio base, categorías, secciones y fotografías.
4. Bloque explicativo verde sobre generación automática con IA.
5. Componentes, botón Agregar y chips cuando hay componentes.
6. Características principales, botón de generación con IA y alerta condicional.
7. Bloques explicativos y campos para descripción completa, descripción corta y tags.
8. Inventario y opciones avanzadas, inicialmente cerrado.
9. Atributos adicionales, inicialmente cerrado.
10. Variantes del producto, inicialmente cerrado y sin activar; se ve la indicación para activarlas.
11. Slug de solo lectura, estado mediante radios y botón Crear producto.
12. Otra instancia de la misma alerta, si existe. Modal de progreso/resultado cuando se intenta crear y pasa la validación RHF.

No hay enlace local de regreso al catálogo ni botón cancelar. El menú compartido sí permite navegar a Productos.

### 3.2 Campos generales, clasificación y contenido

“Obligatorio” distingue lo exigido por RHF, por comprobaciones locales y por servidor. Los requisitos no están todos señalados visualmente.

| Etiqueta/control exacto | Tipo y valor inicial | Requisito, validación y comportamiento |
| --- | --- | --- |
| «Ingresa el nombre de tu producto» / «Nombre» | `TextField` texto; `""`. | RHF `required: true`; servidor recorta y exige contenido. No hay longitud mínima/máxima configurada ni mensaje inline. Cada cambio con nombre no vacío genera slug nuevo. Solo espacios pueden superar la regla de requerido del cliente y ser rechazados al recortar en servidor. |
| «Precio base» / «Precio» | Número; `0`. | RHF requerido y `valueAsNumber`. Servidor exige número finito y no negativo; 0 es válido. No hay símbolo COP, formateo monetario, `min`, `step` ni `inputMode` explícitos. No hay mensaje inline. |
| «Categoría» | 18 bloques seleccionables con icono; sin selección inicial, id y slug `""`. | Una categoría. `Controller` sin `rules.required`; control mediante `Box onClick`. Enviar sin selección muestra modal «Debes seleccionar una categoría.». Cambiarla borra todas las secciones elegidas, incluso si se pulsa nuevamente la misma categoría. |
| «Secciones» | Bloques de selección múltiple con icono; `Set` vacío. | Al inicio: «Selecciona una categoría para ver las secciones disponibles.». Se filtran por `categorySlug`, sin consulta remota. Cliente exige al menos una: «Debes seleccionar al menos una sección.». El servidor valida existencia cuando recibe ids, pero no exige que haya alguno. |
| «Imágenes del producto» / «Añade tus imágenes» | `AutoUploadMedia`, `multiple=true`, `mediaType="image"`; sin imágenes. | Se exige una URL subida como mínimo, no solamente una previsualización local. Ver sección 4. |
| «Componentes del producto» / «Ingresa los componentes (uno por línea)» | Textarea de 4 filas; `""`. Placeholder: Bandeja decorada / Mix de frutas / Huevos de codorniz. | Opcional. Es un borrador local, no se envía directamente. «Agregar» separa por salto de línea, recorta, omite vacíos y agrega al array; limpia el textarea. No deduplica. Si se escribe y no se pulsa Agregar, ese texto no se guarda. |
| «Componentes generados» | Chips con texto y papelera; bloque ausente al inicio. | Se muestra cuando el array tiene elementos. Se elimina cada chip por índice. Se envían todos los componentes agregados y también sirven como contexto para IA. No se generan con IA al pulsar Agregar. |
| «Características principales del producto» / «Características principales» | Textarea de 3 filas; `""`. Ayuda con ejemplos de material, beneficios, presentación, uso, estilo y contenido. | Opcional para crear manualmente; requerido solo para generar con IA. No se persiste como campo independiente. |
| «Generar Descripciones con IA» | Botón azul con icono de nube; habilitado inicialmente. | Exige nombre y características no vacíos; ver errores abajo. Durante la petición se deshabilita solo este botón y muestra spinner. Reemplaza descripción, descripción corta y tags con el resultado. Componentes son contexto opcional. No hay confirmación antes de sobrescribir texto existente. |
| «Descripción completa» → «Descripción» | Explicación azul y `TextField` multiline de 8 filas; `""`; label flotante forzado. | RHF requerida y servidor exige texto no vacío tras recortar. Puede escribirse manualmente. No hay límite de caracteres ni error inline. |
| «Descripción corta» | Explicación azul y textarea de 4 filas; `""`. | Opcional. Se guarda `null` si queda vacía tras recortar. La IA recibe la instrucción de máximo 20 palabras, pero no hay validación de ese límite al escribir o guardar. |
| «Tags (Palabras Clave)» / «Tags (Palabras clave)» / «Tags» | Explicación azul y textarea de 3 filas; `""`. | Opcional. Ayuda «Palabras clave separadas por comas.». Servidor separa, recorta y omite vacíos; no deduplica. La IA también lo puede rellenar. |
| «Slug» | `TextField` de solo lectura; `""`. | No editable. Se genera en efecto desde nombre: minúsculas, sin tildes/caracteres especiales, espacios a guiones y sufijo aleatorio de 4 caracteres. El servidor normaliza y busca un slug único; el valor mostrado no es una garantía de URL final. No se limpia automáticamente cuando el nombre se vacía. |
| «Estado» | Grupo de radios horizontal; `disponible`. | Opciones visibles, en orden: Disponible, Descontinuado, Agotado, Oculto. Servidor valida enum. No hay selección de “borrador” separada ni automatismo de estado asociado al stock en este formulario. |
| `prioridad` | Dato interno; `1`. | Está en `defaultValues` y se envía; **no tiene campo visible**. Servidor admite entero nullable. No se propone añadir un control comercial para él. |

### 3.3 Inventario, atributos y variantes

| Control exacto | Inicial y condición | Regla y comportamiento |
| --- | --- | --- |
| «Inventario y opciones avanzadas» → «Configurar» / «Ocultar» | Cerrado. | Despliega controles con animación de altura/opacidad de 250 ms. Ocultar no elimina sus valores. |
| «Stock ilimitado» general | Switch en `true`, dentro de inventario. | Si se desactiva y no se usan variantes aparece Stock disponible. Con variantes se fuerza a `true` y stock a `null` mediante efecto. El switch general continúa disponible dentro del bloque; el servidor ignora stock general si hay variantes. |
| «Stock disponible» | Número, `null`; visible con stock limitado y sin variantes. | Vacío → `null`; resto → `Number`. No hay reglas RHF de mínimo/entero. Servidor exige no nulo y ≥0 en modo limitado; Prisma espera `Int`. |
| «Este producto tiene variantes» | Switch en `false`, dentro de inventario. | Activa el modo, pero no agrega ninguna variante ni abre automáticamente el bloque de variantes. Resetea el stock general. Desactivarlo no borra el array local de variantes, aunque no se envía mientras esté desactivado. |
| «Atributos adicionales» → «Mostrar» / «Ocultar» | Cerrado; array vacío. | «Agregar» abre el bloque y crea fila. Abierto y vacío muestra «Aún no has agregado atributos.». |
| Fila «Atributo»: «Nombre», «Valor» | Textos vacíos; id local aleatorio. | Ambos deben tener texto para enviarse. Una fila incompleta se filtra sin error visible; no es un obligatorio RHF. Papelera elimina la fila. No hay límite de filas ni deduplicación. |
| «Variantes del producto» → «Mostrar» / «Ocultar» | Cerrado. | Es independiente del switch de activación. Con modo desactivado, Mostrar cambia estado local pero no presenta los campos. |
| «Agregar variante» | Deshabilitado si `usaVariantes=false`. | Al pulsar con variantes activas abre bloque y crea una variante. Si el array está vacío se muestra «Aún no has agregado variantes.». |
| Guía «Como crear variantes sin confusion» | Visible al activar variantes, incluso si sus filas están plegadas. | Panel con ejemplos Grande / Extra grande, explicación de nombre, SKU y detalles. No construye variantes automáticamente. |
| «Variante N» → papelera | Una tarjeta por variante añadida. | Elimina esa variante y sus opciones locales. No hay confirmación ni duplicado/reordenación de variantes. |
| «Nombre que vera el cliente» | Texto `""`. | Ayuda con Grande, Extra grande, Roja, 1 kg. No requerido individualmente; se transforma a `null` al vaciar. |
| «SKU interno (opcional)» | Texto `""`. | Ayuda con código interno `SALCH-GRA`. No requerido; no se exige unicidad en acción ni esquema. |
| «Precio» de variante | Input numérico `""`. | Precio final, no recargo. Vacío → `null`; consumidores públicos usan `variante.precio ?? producto.precio`, por lo que puede heredar el precio base. No hay `min`/`step` ni validación explícita del signo para variantes en esta acción. |
| «Stock ilimitado» de variante | Switch `true` al agregar. | Independiente por variante. Este valor inicial del cliente difiere del default `false` del modelo, pero la acción transmite el del formulario. |
| «Activa» | Switch `true`. | Se guarda como `isActive`. Es posible enviar variantes inactivas; el formulario no exige al menos una activa. |
| «Stock» de variante | Input numérico `""`; aparece al quitar ilimitado. | Vacío/no numérico se convierte en `null`; servidor exige stock no nulo y ≥0 si está limitado. Prisma espera entero. |
| «URL de imagen específica (opcional)» | Texto `""`. | Se pega URL; no hay uploader individual ni preview de variante. Servidor permite vacío y, con valor, exige prefijo HTTPS de Cloudinary. |
| «Detalles opcionales de esta variante» → «Opción» | Array vacío. | Añade un par descriptivo. La ayuda explica que los pares no crean opciones comprables nuevas. |
| Fila «Opción»: «Atributo», «Valor visible» | Textos `""`. | Ejemplos tamaño/color/presentación y Grande/Negro/1 kg. Solo se guardan pares completos; los incompletos se omiten. Papelera elimina la opción. |

Si el modo variantes está activo sin filas, el cliente muestra «Si activas variantes, debes agregar al menos una.». Una fila completamente vacía puede superar esa comprobación de cantidad y ser filtrada antes del envío; el servidor responderá «Debes agregar al menos una variante válida.». En cliente, una variante que solo tenga URL de imagen también se filtra: la condición de retención no incluye `imagenUrl`, aunque el servidor sí la contempla. Son discrepancias existentes, no funcionalidades nuevas que deba incorporar el diseño.

### 3.4 Acciones, alertas y modales

| Acción/estado | Comportamiento actual |
| --- | --- |
| Ayuda de video | Overlay oscuro con blur, cabecera, iframe 16:9 y botón cerrar. El backdrop cierra. Maneja Escape mediante `onKeyDown` del wrapper, sin gestión explícita de foco/trampa en el componente. |
| Agregar componentes | Botón `contained`, ancho completo en xs y 300 px desde sm. Vacío no hace nada. |
| Generar con IA | Mismo ancho de 300 px; usa `generating`, separado de `loading`. Falta nombre: «Debes ingresar un nombre para el producto antes de generar la descripción.». Faltan características: «Ingresa las características del producto antes de generar la descripción.». Éxito: «Descripción generada exitosamente.». |
| Alerta general | `Alert` con severidad success/error/info y cierre. Se renderiza dos veces con el mismo estado: junto al generador y al pie. Los errores de fotos también van a esta alerta, lejos de las fotos. |
| Crear producto | Azul, `contained`, 100% en xs / 320 px desde sm, radio 12 px, texto de aproximadamente 15,2 px. `disabled={loading || submitted}`; spinner sustituye el texto durante `loading`. |
| Progreso de creación | Antes de comprobaciones locales se activa modal: «Estamos creando tu producto...». Pasa a error si falta categoría, foto, sección o variantes. Los errores RHF previos no abren ese modal. |
| Error de creación | Modal centrado, mensaje rojo y botón «Cerrar»; conserva datos del formulario. Se usa el mensaje devuelto por servidor o el de excepción. |
| Éxito de creación | Modal con mensaje verde «Producto creado exitosamente.», botón «Cerrar» y navegación automática en 2 s. `submitted=true` mantiene inactivo el botón. |
| Cierre del modal | X o clic en backdrop en todos los estados, incluido loading. No cancela la petición. El modal no declara `role="dialog"`, `aria-modal`, vínculo con título ni trampa/restauración de foco. No implementa Escape para el modal de creación. |

### 3.5 Reglas y mensajes del servidor

Además de las comprobaciones locales, `createProduct` comprueba:

| Condición | Mensaje/resultado |
| --- | --- |
| Falta sesión | «No estás autenticado. Por favor, inicia sesión.» |
| No existe negocio del usuario | «El usuario no tiene un negocio asociado.» |
| Nombre/descripción vacíos, precio inválido o categoría vacía | «Faltan datos obligatorios: nombre, descripción, precio o categoría.» |
| Ninguna imagen | «Debes subir al menos una imagen antes de crear el producto.» |
| Precio base negativo | «El precio no puede ser negativo.» |
| Prioridad no entera | «La prioridad debe ser un número entero válido.» |
| Estado fuera del enum | «El estado '…' no es válido. Usa: ….» |
| URL de imagen fuera del prefijo aceptado | «Una o más URLs de imágenes no son válidas.» |
| Categoría inexistente | «La categoría especificada no existe.» |
| Sección inexistente | «Una o más secciones especificadas no existen.» |
| Stock general limitado vacío/negativo | «Si el producto no tiene stock ilimitado, debes indicar un stock válido.» |
| Variantes activadas sin variantes retenidas | «Debes agregar al menos una variante válida.» |
| Stock limitado de variante vacío/negativo | «Todas las variantes con stock limitado deben tener un stock válido.» |
| URL de variante inválida | «Una o más imágenes de variantes no tienen una URL válida.» |
| Colisión única Prisma P2002 | «El slug ya está en uso.» |
| Integridad Prisma P2003 | «Error de integridad: categoría, negocio o relaciones no válidas.» |
| Otra excepción | «Error inesperado al crear el producto: …». Si no puede generar slug válido, el detalle lo indica. |

Las secciones se comprueban por existencia, sin comprobar pertenencia a la categoría en esta acción. Tampoco se valida aquí el flag `isActive` de categoría/sección. No se deduce que esa ausencia permita acciones por esta interfaz: sus opciones proceden del seed y están filtradas por categoría en cliente.

La generación de texto usa OpenAI, modelo configurado por `OPENAI_PRODUCT_DESCRIPTION_MODEL` o `gpt-4o`, y separa la respuesta por líneas para rellenar tres campos. Devuelve errores específicos para clave ausente, datos incompletos, cuota insuficiente, rate limit, clave inválida y error genérico. Esa salida no equivale a contenido validado: puede requerir revisión del usuario y no genera imágenes en esta pantalla.

### 3.6 Funciones que no existen en esta ruta

No hay descuento/precio tachado, promoción editable, selector de moneda, impuestos, envío, selector de negocio, generación de imágenes con IA, selector de grupos de catálogo, generador cartesiano de combinaciones, importación masiva, carga de fotos por variante, ordenación de fotos, recorte, selección explícita de portada, guardado como borrador independiente ni asistente de varios pasos. Que el esquema u otras rutas tengan funciones parecidas no las convierte en parte de este formulario.

## 4. Fotografías y Cloudinary

### 4.1 Flujo comprobado en código

1. Selector de archivos `accept="image/*"`, múltiple. La zona tiene icono de añadir foto; no implementa arrastrar/soltar.
2. Rechaza archivos cuyo MIME no comienza por `image/`. Ejemplo de error: «Archivo … no es una imagen.».
3. JPEG/JPG, PNG y WebP se optimizan en navegador, máximo 1600 × 1600 conservando proporción, calidad 0,82 cuando aplica. Solo usa el resultado si pesa menos; si falla la optimización usa el original. Otros formatos de imagen no pasan por esta optimización.
4. Comprueba máximo de **10 MiB después de optimizar**, no antes. Error: «La imagen … excede el tamaño máximo de 10MB.». No hay límite explícito de cantidad total en el componente.
5. Crea una preview local por `URL.createObjectURL`. Un efecto inicia la subida automática de los archivos pendientes; distintas subidas pueden completarse en distinto orden.
6. [uploadAuthorizedMedia.ts](../src/lib/cloudinary/uploadAuthorizedMedia.ts) hace `POST /api/cloudinary/upload-authorization`, obtiene campos firmados y hace `POST` directo a Cloudinary. Comprueba que respuesta, publicId, cloud y tipo coincidan con la autorización. No utiliza un preset unsigned.
7. Solo URLs remotas completadas actualizan `uploadedImages` del formulario. Hay spinner global del uploader, sin progreso porcentual ni estado individual por foto. Un fallo retira el pendiente; no existe botón de reintento individual.
8. La papelera de una imagen subida puede llamar `POST /api/cloudinary/delete`. Se conserva autorización de borrado del asset recién subido. Assets sin esa prueba se retiran del formulario sin destruirse remotamente; una respuesta `ASSET_IN_USE` 409 también permite retirarlos del borrador sin borrar el recurso en uso.

Los endpoints [upload-authorization](../src/app/api/cloudinary/upload-authorization/route.ts) y [delete](../src/app/api/cloudinary/delete/route.ts) comprueban actor y origen; el borrado además comprueba prueba temporal, referencias persistidas y recurso antes de eliminar. Deben conservarse estas garantías y las mejoras recientes del editor de perfil.

### 4.2 Límites y riesgos de UX existentes

- La interfaz no explica junto al selector el requisito de una imagen, el límite ni los formatos que pueden necesitar conversión. No corresponde prometer soporte real de HEIC por usar `image/*`; falta validación de ese caso con navegador/proveedor.
- Cada preview mide 256 × 256 px; el control para añadir mide 128 × 128 px. Tienen pesos visuales y tamaños distintos y se centran en una fila con wrap.
- La carga es inmediata, previa a Crear producto. Abandonar el formulario no tiene una limpieza de uploads temporales dentro de este componente; esta auditoría no presupone una política externa de limpieza.
- `uploadedMedia` agrega al terminar cada petición. No garantiza respetar el orden de selección. Tampoco existe contrato de imagen principal en el modelo. Los consumidores leen la primera imagen recuperada, pero la relación `imagenes` no fija orden explícito en las consultas revisadas.
- Eliminar una preview pendiente no aborta la petición ya iniciada. Por código existe riesgo de que termine y vuelva como subida; requiere reproducción focalizada antes de corregirlo.
- La limpieza de object URLs de pendientes revoca las de otros elementos que permanecen en el array y no la del elemento terminado en ese bloque. Es un riesgo técnico de previews múltiples que debe verificarse antes de tocar el uploader compartido.
- El padre usa el mismo `loading` para optimización/subida/borrado y creación. El uploader emite `false` al acabar selección antes del efecto de subida; las fases pueden producir transiciones de bloqueo ambiguas. No se afirma un duplicado reproducido, pero conviene separar estados en la futura implementación local.
- El botón de eliminar tiene nombre accesible; los botones de papelera de atributos/variantes/opciones no tienen un `aria-label` equivalente.

**Decisión de alcance:** no añadir un selector de principal ni prometer un orden persistido. Tampoco añadir crop, drag and drop o reemplazo en sitio. El reemplazo disponible hoy es quitar una fotografía y añadir otra. Mejorar visualmente la galería exige resolver antes el alcance del uploader compartido, descrito en la sección 9.

## 5. Auditoría visual estructural

### 5.1 Composición, dimensiones y espaciado

- La estructura compartida tiene barra superior fija de 64 px, menú lateral oscuro y fondo MUI `grey.100`; el contenido deja `mt: 4rem` y padding de 16/24/32 px en xs/sm/md.
- El menú abierto declara 250 px desde sm, pero el margen del contenido y la barra superior usan 200 px. Hay una diferencia estructural de 50 px; su efecto visible requiere navegador y no se propone modificar el layout en esta tarea.
- La página añade otra superficie blanca `w-full`, flex vertical centrado, `gap-4` y 24 px de padding desde 640 px. El formulario agrega 16 px más de padding, `w-full`, radio 16 px y `shadow-lg`. No tiene `max-width`: en pantallas grandes se estira hasta el espacio disponible del dashboard.
- La mayoría de controles son una columna a ancho completo. El espacio base entre hijos es 16 px (`space-y-4`), sumado a márgenes de `FormControl`, separadores y bloques informativos. El problema dominante es longitud y repetición, no falta general de espacio.
- Hay 16 separadores decorativos `•••` con líneas gris 400 y texto de 18 px; varios separan la explicación de su propio campo. Esto debilita la agrupación entre ayuda y control.
- Inventario, atributos y variantes usan tarjetas blancas, borde gris 200, radio 8 px, 16 px de padding y sombra suave. Dentro se anidan tarjetas gris 50 de radio 16 px y otras cajas de opciones. La profundidad visual crece con las variantes.
- Los grupos compactos de acciones Mostrar/Agregar y las cabeceras de opciones no siempre tienen wrap. Son candidatos a desbordamiento con ancho reducido, zoom o textos largos; no se ha medido un fallo en móvil.

### 5.2 Tipografía y jerarquía

- El título utiliza `titleFont` = Montserrat Alternates local, disponible en 500/700, tamaño 30 px y 36 px desde sm, texto gris 800, centrado, padding 8 px, esquinas redondeadas y sombra grande. No declara una jerarquía de subtítulo ni vínculo de regreso.
- El uploader usa la misma fuente para «Añade tus imágenes», de 20 px semibold, centrado e índigo 600.
- MUI utiliza su familia predeterminada `Roboto, Helvetica, Arial, sans-serif`. No se encontró `ThemeProvider`/`createTheme` en `src`; la raíz tampoco aplica Inter a todo el body. La familia efectivamente renderizada depende de las fuentes disponibles. No se debe afirmar que todo se ve en Roboto.
- Valores predeterminados MUI revisados: cuerpo de 16 px, `body2` de 14 px. Etiquetas externas se repiten encima de labels flotantes; suelen ir en negrita y azul `info.main`.
- Conviven encabezados HTML h4/h5, Typography y títulos de fuente distinta. Los bloques descriptivos usan `text-md`, que no es una utilidad de tamaño estándar definida en la configuración Tailwind revisada; su tamaño no está fijado por esa clase.
- Los párrafos instructivos y banners ocupan mucha más altura de la necesaria para apoyar tareas breves; la descripción larga empieza con 8 filas incluso vacía.

### 5.3 Colores reales y consistencia

No hay un sistema único de tokens gris/rojo aplicado a este formulario. El repositorio contiene varias capas históricas:

| Fuente real | Valores/comportamiento encontrado | Implicación |
| --- | --- | --- |
| `tailwind.config.ts` | Solo extiende colores background/foreground mediante variables; no define una paleta semántica Myckeo. | Reutilizar utilidades existentes, sin inventar tokens globales en esta tarea. |
| `globals.css` | `--primary: #274494`; clases históricas con `#428f99`, `#d44b7c`, `#1c283c`; helpers de botón azul, rojo y gris. | `--primary` CSS no cambia automáticamente `primary.main` de MUI. |
| Dashboard | Menú `gray-900`, activos/hover `gray-700`, texto claro; barra blanca y texto `gray-800`. | Base neutra existente que sí conviene conservar. |
| MUI predeterminado claro instalado | Primary azul 700 (`#1976d2`); info lightBlue 700 (`#0288d1`). | Botones principales y selección son azules; etiquetas informativas también. |
| Página actual | Ayuda `red-600`, hover `red-700`; instrucciones IA verdes; descripciones/tags azules; uploader índigo; guías de variantes azul/slate. | Hay varios acentos compitiendo sin significado coherente. |
| Perfil revisado en código | Neutros, superficies blancas; algunos focos/errores rojos y CTA oscuro en estado de error. | Se pueden reutilizar neutros y rojo existentes sin cambiar perfil ni su tema. |

La pantalla comparte con el dashboard la base blanca/gris y con edición de producto muchos patrones MUI, pero la mezcla de azul/verde/índigo/rojo y la abundancia de sombras no expresan la identidad gris/rojo solicitada. Esto es un diagnóstico del código; la consistencia perceptual final requiere comparación autenticada.

### 5.4 Inputs, botones, imágenes y estados

- `TextField` usa outlined estándar sin rediseño local. Los valores predeterminados de MUI sugieren altura cercana a 56 px en inputs simples y radio 4 px; es una derivación del componente, no medición de la pantalla. Los textareas crecen por filas.
- Las categorías son bloques blancos con borde gris 200, padding aproximado 20 × 9,6 px, radio 12 px, ancho mínimo 140 px y sombra MUI 1. Seleccionadas tienen fondo azul, texto blanco y sombra 3. Secciones usan tratamiento similar sin mínimo explícito.
- Hover de clasificación eleva sombra, cambia borde/fondo en 200–250 ms; inputs y botones heredan sus estados MUI. No hay tratamiento propio de foco para los `Box` clicables.
- Los botones de componentes, IA y Crear tienen todos estilo `contained primary`; compiten visualmente aunque solo uno crea el producto. La ayuda roja grande aparece antes de todos ellos.
- No se fuerza mayúsculas en los botones principales, que ya usan `textTransform: none`. El título y varias etiquetas sí tienen capitalización editorial inconsistente.
- Fotos: cuadrados recortados con `object-cover`, sombra y radio 8 px; no se muestra nombre/tamaño/resultado individual ni insignia de principal.
- Loading: spinners genéricos, sin porcentaje. Crear pierde su etiqueta durante carga. Error: alerta duplicada o modal, sin identificación junto al campo. Disabled: Crear por `loading/submitted`, IA por `generating`, añadir variante por modo apagado y selector de archivos durante carga del uploader; no se bloquea todo el formulario de forma coherente.
- Framer Motion despliega contenido y usa resorte en modal; no hay una rama explícita de movimiento reducido en estos componentes.

### 5.5 Responsive

- Tailwind cambia distribución de cabeceras desde 640 px; filas SKU/precio y atributos de opción cambian de columna a fila con `md` de MUI (900 px por defecto). El layout decide móvil con `window.innerWidth <= 768`. Hay tres umbrales distintos.
- En móvil el menú se oculta y el contenido ocupa el ancho; los botones principales son de ancho completo. Las listas de clasificación hacen wrap, pero siguen mostrando todas las opciones de la categoría.
- Las fotos permanecen en 256 px fijos; a 320 px de viewport el padding del layout y del formulario deja aproximadamente ese mismo ancho interior, sin holgura para contenido adicional. No existe una galería de miniaturas adaptativa.
- En escritorio el ancho sin límite produce líneas de lectura y campos largos; al activar variantes el recorrido vertical aumenta considerablemente.
- No hay barra local de acciones sticky ni tratamiento explícito de safe area/teclado virtual. No se confirma solapamiento del teclado, contraste medido ni comportamiento real de zoom sin sesión.

## 6. Hallazgos UX priorizados

Impacto alto = dificulta completar correctamente o usar teclado/tecnología asistiva. Complejidad baja = cambio local de presentación/semántica; media = reorganización con estado; alta = componente compartido o contrato de persistencia. La columna de evidencia separa defecto confirmado en código de riesgo pendiente de reproducción.

| ID | Hallazgo y efecto | Impacto | Complejidad | Evidencia / decisión |
| --- | --- | --- | --- | --- |
| UX-01 | RHF bloquea nombre/precio/descripción sin mensaje visible junto al campo; los otros requisitos llegan en modal al final. Un propietario no sabe qué corregir. | Alto | Baja–media | Confirmado en código. Prioridad 1: errores asociados y requisitos visibles, conservando reglas. |
| UX-02 | Categorías y secciones son `Box onClick`, sin rol, `tabIndex` ni control de teclado. | Alto | Baja–media | Confirmado. Usar selección simple/múltiple accesible. |
| UX-03 | Formulario largo, sin ancho máximo, 16 separadores y explicaciones intercaladas; la entrada manual queda subordinada a IA. | Alto | Media | Confirmado estructural. Agrupar y plegar ayudas opcionales. |
| UX-04 | Precio lejos del inventario; activar variantes requiere Configurar inventario → switch → otro bloque → agregar. | Alto | Media | Confirmado. Mover activación al bloque de variantes y reunir precio/stock. |
| UX-05 | Error de foto se muestra junto a IA y al pie; fotos en posición secundaria y tamaños rígidos. | Alto | Media–alta | Confirmado en estructura. Primero ubicación/ayuda/error local; galería requiere decisión sobre uploader compartido. |
| UX-06 | Modal de creación carece de semántica y manejo de foco; se cierra mientras la operación sigue en curso. | Alto | Media | Confirmado. Reutilizar Dialog MUI y comunicar estado sin permitir reenvío. |
| UX-07 | Una variante vacía o solo con imagen puede desaparecer al serializar; pares incompletos se omiten sin aviso. | Alto | Media | Confirmado. Advertir cerca de filas y conservar filtrado actual; corrección de serialización solo si se aprueba como defecto funcional separado. |
| UX-08 | Estado compartido `loading` mezcla multimedia y envío; no hay guard síncrono en `onSubmit` ni idempotencia en servidor. | Alto | Media | Existen `disabled` y `submitted`, por tanto hay prevención parcial. Carrera/duplicado pendiente de reproducción. Separar estados locales y bloquear reentrada; no prometer idempotencia de API. |
| UX-09 | Papelera de atributos/variantes/opciones sin nombre accesible; desplegables sin `aria-expanded`/`aria-controls`. | Alto | Baja | Confirmado. Añadir semántica, leyendas/contexto y objetivos táctiles. |
| UX-10 | Precio no comunica COP ni herencia de variante. Stock no expone validación de entero aunque la base lo exige. | Medio–alto | Baja–media | Confirmado. Mejorar ayudas; cambio de validación numérica requiere documentar el defecto y probarlo. |
| UX-11 | Cambiar categoría borra selecciones silenciosamente; el re-clic en la misma categoría también las borra. | Medio–alto | Baja–media | Confirmado. Explicar dependencia; evitar pérdida accidental sería corrección local explícita, no requisito comercial nuevo. |
| UX-12 | Añadir componentes requiere botón aunque el textarea parezca completo; datos sin agregar se pierden al crear. | Medio | Baja | Confirmado. Ayuda contextual y estado que haga evidente qué se guardará. |
| UX-13 | IA sobrescribe tres campos; permite escribir o crear mientras la petición sigue. | Medio | Media | Confirmado en controles. Hacer explícito el efecto y comunicar generación en curso; proteger texto frente a resultado tardío requiere prueba focalizada. |
| UX-14 | Ayuda roja grande compite con Crear y el título del modal habla de cuenta de negocio. | Medio | Baja | Confirmado. Enlace discreto y título local correcto; conservar video hasta verificar contenido. |
| UX-15 | Fotos fijas, grupos de botones sin wrap y cabeceras densas pueden recortarse en anchos pequeños; layout oculta overflow. | Medio–alto | Media | Riesgo estructural pendiente de navegador a 320/360 px y zoom. |
| UX-16 | Alertas duplicadas y azules/verdes/índigo con igual énfasis aumentan ruido visual; ayudas largas no están junto al campo al que sirven. | Medio | Baja | Confirmado. Una ubicación relevante por mensaje y paleta neutra. |
| UX-17 | Slug técnico ocupa una sección completa y cambia durante edición del nombre. | Bajo–medio | Baja | Confirmado. Llevar a detalles adicionales de solo lectura; no quitar del payload. |
| UX-18 | Seed local y relaciones BD pueden divergir; no hay filtro por flags activos. | Medio | Alta fuera del diseño | Dependencia confirmada; no comprobada divergencia real de BD. No cambiar seed ni cargar catálogo remoto en este rediseño. |
| UX-19 | No hay portada persistida; orden de subida puede variar, quitar pendiente no aborta y object URLs tienen limpieza sospechosa. | Medio–alto | Alta/compartida | Parte confirmada, efecto visual/cancelación pendiente de reproducción. Mantener fuera de corrección estética indiscriminada. |
| UX-20 | Sidebar 250 px frente a margen 200 px, breakpoints distintos y ausencia de reducción explícita de movimiento. | Medio | Compartida / baja local | Registrar y verificar; no reparar layout global en esta ruta. Respetar movimiento reducido en nuevos elementos locales. |

No hay evidencia para afirmar que todos los campos estén demasiado juntos. El código ya ofrece separaciones generosas en varios puntos; la fricción principal es la organización, con agrupaciones de acciones más apretadas dentro de tarjetas anidadas.

## 7. Propuesta visual para aprobación

### 7.1 Dirección de diseño

**Una superficie de trabajo tranquila, fotografías primero y controles comerciales claros.** Mantener el dashboard compartido, sin wizard, dependencias nuevas ni grandes animaciones. Una columna de lectura con pares de campos únicamente donde facilita la tarea.

Propuesta de medidas, todavía no implementadas:

| Elemento | Especificación propuesta |
| --- | --- |
| Contenedor | Máximo 960 px, centrado en el área disponible; respetar padding existente sin sumar capas innecesarias. Ancho fluido en móvil. |
| Superficie | Blanco, borde gris 200 y sombra muy suave solo si ayuda a separar del fondo. Secciones internas con espacio, sin tarjeta por cada campo. |
| Espaciado | Escala de 8 px; 24–32 px entre grupos y 32–40 px entre secciones en escritorio; 20–24 px entre secciones en móvil; 8 px entre etiqueta y control. |
| Título | «Nuevo producto», 28–32 px escritorio / 24–28 px móvil, Montserrat Alternates local; sin caja ni sombra en el título. |
| Texto | Base 16 px para campos, ayudas 14 px y títulos de sección 18–20 px. Reutilizar Inter local para cuerpo si se aprueba, aplicado solo al formulario y controles MUI para evitar mezcla accidental. |
| Inputs | Altura objetivo 48–52 px para controles simples, radio 10–12 px, borde neutro; textareas con altura inicial más contenida y posibilidad de ampliación. |
| Color | `gray-900` / `gray-800` para títulos y CTA; `gray-600` para ayuda; blanco y gris 50/100 para superficies; `red-600`/700 existente para pequeños acentos interactivos y errores contextualizados. Selección también con check/borde, sin depender solo del rojo. |
| Foco | Indicador visible de al menos 2 px, separado del borde, contraste a comprobar; no eliminar outline sin sustituto. |
| Interacción | Cambios de color de 150–200 ms; evitar elevación pronunciada. Respetar `prefers-reduced-motion`. |
| Táctil | Objetivos de aproximadamente 44 × 44 px para acciones y papeleras, sin agrandar innecesariamente el icono. |

No se propone un ThemeProvider global ni redefinir `--primary`. El CTA oscuro usa un patrón neutro ya existente; el rojo se reserva como acento, con semántica de error explícita cuando corresponde. Esta es una propuesta deliberada para la ruta, no una afirmación de que ya exista un tema único gris/rojo.

### 7.2 Organización propuesta

**A. Encabezado.** Enlace «Volver a productos» hacia `/dashboard/productos`, título y subtítulo «Agrega fotos y los datos de tu producto para incluirlo en tu catálogo.». Ayuda de video como acción secundaria discreta y título del modal ajustado mediante props locales.

**B. Fotografías.** Adelantar el uploader y añadir la ayuda «Agrega al menos una fotografía». Colocar el error junto a esta sección. Mostrar «Subiendo fotografías…» mientras carga, sin confundirlo con creación. Para una segunda mejora visual, una zona de selección con texto y galería adaptativa de miniaturas de aproximadamente 96–120 px en móvil y 128–160 px en escritorio; cada foto con eliminación accesible. Esa galería está condicionada a aprobar una extensión visual opt-in del uploader compartido. No mostrar “Principal” porque la persistencia no ofrece esa garantía; no añadir drag and drop ni funciones ficticias de reemplazo.

**C. Información del producto.** Nombre y descripción manual visibles desde el inicio; categoría de selección única y secciones de selección múltiple agrupadas a continuación. Conservar las 18 categorías y las secciones dependientes, usando controles MUI accesibles que puedan mantener iconos. Una lista desplegable de categoría y checklist compacto de secciones reduce altura frente a decenas de bloques. Secciones elegidas siempre reconocibles, sin ocultar opciones ni impedir elegir varias.

La descripción corta permanece accesible en este grupo, claramente marcada como opcional. La IA pasa a un desplegable «Ayúdame a escribir la descripción»: contiene características y acción de generar, explica que completa descripción, descripción corta y palabras clave, y permite revisar resultados. Componentes guardables del producto se ubican en Detalles adicionales y se pueden seguir usar como contexto de IA; no se convierten en datos exclusivos del asistente.

**D. Precio e inventario.** Precio base con referencia COP visible. Debajo, «Stock ilimitado» y cantidad disponible cuando corresponda; ya no requieren entrar a opciones avanzadas. Mantener 0 válido. Cuando hay variantes, explicar «El inventario se gestiona en cada variante» y evitar presentar el stock general como una cantidad efectiva. Estado disponible/agotado/oculto/descontinuado permanece en este grupo como control claramente etiquetado; no se altera su enum ni su efecto.

**E. Variantes.** Interruptor «Este producto tiene variantes» dentro de su propia sección, seguido de «Agregar variante». Cada bloque conserva nombre, SKU, precio, switches de stock/actividad, cantidad, URL de imagen y pares de opciones. Nombre y precio tienen prioridad; SKU, URL y detalles pueden plegarse localmente con resumen visible. No ocultar controles con errores. En móvil todos los pares se apilan; en escritorio solo pares cortos comparten fila. Ayuda breve: «Cada variante es una opción que tu cliente puede comprar». Explicar que el precio vacío utiliza el precio base y que los detalles describen una variante existente. No introducir generador de combinaciones.

**F. Detalles adicionales.** Desplegable con componentes, atributos adicionales, palabras clave y URL/slug de solo lectura. Mantener borradores y arrays al plegar. Mostrar resumen de cantidades para que los datos agregados sigan siendo reconocibles.

**G. Acciones.** Una acción principal «Crear producto», oscura y de ancho completo en móvil; «Creando producto…» durante envío, con spinner y etiqueta, y «Subiendo fotografías…» si el bloqueo es por carga. El enlace de regreso queda secundario. Inicialmente usar pie en flujo normal para evitar conflictos con teclado y barra global; valorar sticky solo después de pruebas, con espacio y safe area adecuados. Mantener destino de éxito actual y prevenir reentrada local. Un Dialog MUI sustituiría el modal artesanal conservando mensajes y estados; no añadir acción de cancelar una petición que no se puede cancelar.

### 7.3 Esquemas visuales conceptuales

**Escritorio — esquema de distribución propuesto, no captura ni diseño implementado:**

```text
┌ Dashboard existente ──────────────────────────────────────────┐
│                  ← Volver a productos                        │
│                  Nuevo producto                    Ayuda     │
│                  Agrega fotos y los datos de tu producto…     │
│  ┌ Superficie de trabajo · máximo 960 px ───────────────────┐ │
│  │ Fotografías *                                           │ │
│  │ [ Añadir fotografías ]  [ foto ] [ foto ]                │ │
│  │ Agrega al menos una fotografía.                         │ │
│  │                                                        │ │
│  │ Información del producto                               │ │
│  │ Nombre *                                               │ │
│  │ [                                                    ] │ │
│  │ Descripción *                                          │ │
│  │ [                                                    ] │ │
│  │ [                                                    ] │ │
│  │ ▸ Ayúdame a escribir la descripción                    │ │
│  │ Descripción corta (opcional)                           │ │
│  │ [                                                    ] │ │
│  │ Categoría * [ Seleccionar                            ▾] │ │
│  │ Secciones *  [✓ Sección A] [  Sección B] […]             │ │
│  │                                                        │ │
│  │ Precio e inventario                                    │ │
│  │ Precio base · COP [              ]                     │ │
│  │ Stock ilimitado  [●]   / cantidad si está limitado      │ │
│  │ Estado [ Disponible                                  ▾] │ │
│  │                                                        │ │
│  │ Variantes                                  Activar [○] │ │
│  │ ▸ Detalles adicionales                                 │ │
│  │                                  [ Crear producto ]    │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Móvil — mismo orden, sin paso adicional:**

```text
← Volver a productos
Nuevo producto
Agrega fotos y los datos…     Ayuda

Fotografías *
[ Añadir fotografías          ]
[ foto ] [ foto ]
Agrega al menos una fotografía.

Información del producto
Nombre *
[                             ]
Descripción *
[                             ]
[                             ]
▸ Ayúdame a escribir…
Descripción corta (opcional)
[                             ]
Categoría *
[ Seleccionar                ▾]
Secciones *
[✓ Sección A] [  Sección B]

Precio e inventario
Precio base · COP
[                             ]
Stock ilimitado            [●]
Estado [ Disponible          ▾]

Variantes                  [○]
▸ Detalles adicionales

[        Crear producto       ]
```

**Variantes desplegadas — esquema de todos los datos conservados:**

```text
Variantes                                     [●]
[ + Agregar variante ]
Cada variante es una opción comprable.

Variante 1                             [Eliminar]
Nombre que verá el cliente [ Grande             ]
Precio · COP               [                    ]
Vacío: utiliza el precio base.
Stock ilimitado [○]         Activa [●]
Stock                       [ 10                ]
▾ Más detalles de esta variante
  SKU interno               [                   ]
  URL de imagen específica  [                   ]
  Detalles opcionales                 [+ Opción]
  Atributo [ Tamaño ]  Valor [ Grande ] [Eliminar]
```

Los asteriscos propuestos se acompañarían de texto «* Obligatorio». El diseño detallado de selección, galería y color final se confirma al aprobar esta dirección; no se presenta como decisión ya implementada.

## 8. Comparación y orden de implementación posterior

| Prioridad | Hoy | Cambio propuesto | Criterio para aceptar |
| --- | --- | --- | --- |
| 1. Estructura y jerarquía | Columna ilimitada, encabezado con sombra, ayudas repetidas. | Ancho controlado, encabezado simple, secciones por tarea y ayudas breves. | Un propietario identifica requisitos, contenido y acción principal sin leer banners largos. |
| 2. Fotografías | Tras clasificación, 256 px fijos, errores alejados. | Primero; ayuda y error local. Galería adaptativa solo mediante extensión visual aprobada. | Se distingue preview pendiente de foto subida; crear sigue exigiendo URL completada. |
| 3. Inputs/selectores | Labels repetidos, selección por `Box` no accesible, errores RHF invisibles. | Etiquetas únicas, controles accesibles, requerido/opcional, errores asociados y foco al primero. | Teclado puede seleccionar categoría y múltiples secciones; cada error indica cómo corregirlo. |
| 4. Precio/inventario | Separados; stock escondido. | Grupo comercial con COP, stock condicional y estado. | Mantener precio 0, stock ilimitado/limitado y enum; no añadir descuentos. |
| 5. Variantes | Activación en inventario, filas en otro bloque, ayudas largas. | Activación local, campos priorizados y detalles plegables. | Mismos valores y payload por variante, sin combinaciones automáticas ni pérdida al plegar. |
| 6. Responsive | Fotos fijas y múltiples umbrales. | Layout local fluido, controles apilados y wrap. | A 320/360/390/768/1024/1440 px, controles legibles y sin recorte; comprobar zoom. |
| 7. Acción/estados | Varios CTA equivalentes, spinner sin etiqueta, estado loading mezclado. | Jerarquía única, texto de progreso y bloqueo de reentrada. | Doble clic/Enter produce una sola llamada desde la instancia del formulario; errores permiten reintento. |

Estas prioridades se realizan juntas en el diseño; no implican publicar siete cambios separados ni tocar los sistemas externos.

## 9. Componentes que modificaría y límites

### 9.1 Núcleo local recomendado

1. **`src/app/dashboard/productos/nuevo_producto/page.tsx`:** encabezado, regreso al catálogo, subtítulo, contenedor y configuración discreta de ayuda. Sustituir el uso del título compartido solo aquí, sin alterar `TituloPrincipal` global.
2. **`src/ui/components/productos/CreateNewProduct.tsx`:** reorganizar JSX, estilos locales MUI/Tailwind, `formState.errors`, semántica de clasificación y desplegables, presentación de variantes y mensajes. Separar estados de imágenes y creación; añadir bloqueo local de reentrada. Conservar serialización y contrato salvo defecto concreto aprobado.
3. **Subcomponentes locales solo si reducen complejidad:** extraer secciones de presentación, por ejemplo bajo `src/ui/components/productos/newProduct/`, sin generalizarlas a edición o perfil y sin mover innecesariamente las fuentes de estado.

### 9.2 Decisión explícita sobre el uploader compartido

La interfaz pública actual de `AutoUploadMedia` no ofrece slots de galería, tamaño de miniaturas o estilo de zona de carga. Moverlo y rodearlo de ayudas es posible sin cambiarlo; una galería premium completa no se puede garantizar únicamente con esas props. No recomiendo parches CSS dependientes de selectores internos ni duplicar su lógica de autorización.

**Opción recomendada para aprobación:** permitir una extensión puramente visual y opt-in de `AutoUploadMedia` —por ejemplo una variante de presentación usada solo en creación— que conserve el render actual por defecto. Mantener validación, subida, optimización, firma y borrado sin cambios. Antes de tocar ese archivo, identificar y ejecutar regresiones pertinentes del uploader/perfil. Esta primera entrega no realiza esa extensión.

**Si se mantiene el alcance exclusivamente en dos archivos:** adelantar el uploader actual, aportar ayuda, error local y estados del formulario; aceptar que tamaño fijo y apariencia interna de galería permanecen como limitación de esa iteración. El objetivo visual completo de fotografías requeriría una aprobación posterior del punto anterior.

### 9.3 Archivos que no modificaría por diseño

- `CreateOrUpdateProduct.tsx`, editor de perfil, publicaciones, reseñas y servicios.
- Layout, sidebar y topbar del dashboard; providers, `globals.css`, Tailwind global, componentes compartidos de título/divisor/ayuda.
- `createNewProduct.ts`, endpoints Cloudinary, utilidades de autorización y limpieza, Prisma, seed y schema.
- Catálogo público, carrito, checkout, store compartido y flujo de administración.
- CI, configuración de infraestructura, variables/secrets, Neon, ramas de base de datos y hosting.

Si una reproducción revela un defecto que impide funcionar al formulario, documentar causa, cambio mínimo y regresión. La aprobación estética no debe utilizarse para cambiar silenciosamente reglas comerciales o garantías de Cloudinary.

## 10. Capacidades y contratos que deben preservarse

- Todos los campos visibles del inventario de la sección 3, incluidos los opcionales y condicionales; `prioridad=1` interno y generación de slug.
- Una categoría, varias secciones, reset de selección dependiente al cambiar categoría y navegación al detalle basada en la primera sección elegida. Un posible ajuste del re-clic debe ser explícito.
- Fotografías múltiples, optimización existente, URLs remotas confirmadas, mínimo una foto, eliminación conforme a permisos y mensajes de fallo.
- Escritura manual de ambas descripciones y tags; generación con IA opcional que actualiza los tres campos; componentes guardables y usados como contexto.
- Atributos completos, variantes manuales, precio final propio nullable, herencia de precio base, SKU opcional, activa/inactiva, stock propio, imagen por URL y pares descriptivos.
- Stock general limitado/ilimitado; al usar variantes, inventario por variante y normalización actual del general.
- Los cuatro estados, precio 0 válido, tratamiento de vacíos y errores del servidor.
- La transacción de creación de todas las relaciones, identificación del negocio por sesión, invalidación de caché, actualización del store y feedback/navegación de éxito.
- Bloqueo visual del dashboard para negocio restringido y autenticación existente. No introducir atajos de autenticación para capturas o pruebas.

No se introducen nuevos campos persistidos, promociones, reglas de precio, pagos, endpoints ni cambios de esquema.

## 11. Validación propuesta después de aprobar e implementar

Esta matriz es un plan; **no se reporta ejecutada en la auditoría**. Se usarán datos sintéticos y fronteras externas simuladas para la mayoría de casos. Una prueba real autenticada y de subida/creación se hará únicamente en un entorno y negocio de prueba autorizados, sin asumir que localhost implique base no productiva.

| Área | Casos y resultado esperado |
| --- | --- |
| Inventario de campos | Contrastar sección 3 con formulario final, abriendo IA, detalles, atributos, variantes y opciones. Ninguna capacidad desaparece. |
| Requeridos | Nombre, descripción, precio, categoría, sección e imagen. Mensaje asociado, foco al control, datos intactos y sin llamada de creación ante error local. Probar nombre con espacios. |
| Precio/stock | Precio 0 y positivo, vacío y negativo; stock nulo, 0, positivo, negativo y fraccionario. Documentar comportamiento vigente y cualquier corrección mínima acordada, sin inventar reglas nuevas. COP se comunica sin alterar el dato numérico. |
| Clasificación | Elegir una de las 18 categorías; varias secciones; cambiar categoría; re-clic; filtro de opciones y primera sección para destino. Sin consultas de escritura a seed/BD. |
| Imágenes | Una/múltiples fotos sintéticas, optimización, >10 MiB tras optimizar, MIME inválido, error de autorización, error proveedor, preview durante subida, completar en distinto orden y quitar pendiente. Reproducir sospechas antes de reparar lógica compartida. |
| Borrado | En simulación: éxito, fallo y `ASSET_IN_USE`; mantener pruebas de propiedad/firma y assets referenciados. No borrar recursos reales para validar estética. |
| IA/componentes | Flujo manual sin IA; requeridos propios de IA; carga/error/éxito; comprobar los tres campos actualizados; componentes por línea, quitar chips, texto sin agregar y respuesta tardía. No consumir cuota real. |
| Atributos/variantes | Agregar/quitar/plegar; filas vacías e incompletas; modo off/on; precio vacío/heredado/propio, activa/inactiva, stocks, URL y opciones; comparar FormData antes/después. |
| Envío | Una llamada por doble clic o Enter repetido; bloqueo durante imágenes; error de servidor y reintento; éxito bloquea reenvío y conserva destino y store. Verificar modal accesible y comportamiento al cerrar. |
| Responsive/accesibilidad | 320, 360, 390, 768, 1024 y 1440 px; menú abierto/cerrado; teclado virtual; zoom; Tab, Enter/Espacio, Escape en diálogos; foco visible, nombres de papeleras, labels y anuncio de errores. Comprobar contraste y movimiento reducido. |
| Capturas | Escritorio y móvil de estado inicial, zona inferior y variantes abiertas; errores/loading mediante fronteras simuladas identificadas como tales. Separar estas imágenes de capturas autenticadas reales. |

### Comprobaciones técnicas previstas

- Pruebas de interacción focalizadas del formulario cuando los cambios de estado/semántica lo justifiquen; reutilizar el enfoque Playwright con fronteras simuladas existente en `e2e/profile-editor`, sin modificar esa suite ni conectar una BD productiva.
- Si se aprueba la extensión visual del uploader, regresiones relevantes de `src/lib/cloudinary/uploadAuthorizedMedia.test.ts` y la cobertura existente del uploader/perfil. La suite smoke pública no cubre creación autenticada y no constituye una validación suficiente de esta pantalla.
- `pnpm typecheck` y `pnpm lint`. El repo declara Next 15 y ESLint 9 con `.eslintrc.json`; se comprobará la ejecución real y se reportarán incompatibilidades o problemas previos sin convertir la tarea en una migración de lint.
- `pnpm build` solo si hay una razón adicional para verificar compilación/integración. Antes comprobar que no requiere lecturas productivas durante generación estática; no ejecutar `smoke:fixtures`, seeds ni migraciones como parte de esta auditoría.

En esta fase solo se verifican el documento, sus rutas de evidencia y que el diff no incluya cambios de aplicación. No se ejecutan TypeScript/lint/build como si validaran un rediseño inexistente.

## 12. Riesgos, dependencias y decisiones de revisión

| Riesgo/dependencia | Tratamiento propuesto |
| --- | --- |
| No hay observación autenticada de esta ruta | Revisar layout y propuesta con las limitaciones descritas; capturas reales quedan pendientes de sesión legítima. No afirmar validación visual productiva. |
| Código local distinto del despliegue | La auditoría identifica HEAD; confirmar versión antes de una comparación visual final. |
| Uploader compartido con perfil recién validado | Aprobar explícitamente extensión visual opt-in si se busca galería completa; preservar defaults y regresiones de autorización. |
| Orden/imagen principal sin contrato | No ofrecer portada persistida ni orden garantizado; requeriría otro alcance y posiblemente cambios de datos/lectura. |
| Seed estático frente a BD | No consultar ni modificar producción. Probar clasificación con fixtures; registrar incompatibilidad concreta si aparece. El seed incluye, por ejemplo, Smart Home con slug `audio`, por lo que la URL no se debe “corregir” como parte del diseño. |
| Validaciones de stock/variantes no uniformes | Separar feedback visual de correcciones funcionales. Mantener reglas actuales salvo defecto probado que impida el flujo; documentar cada excepción. |
| Doble envío | Se puede mejorar reentrada de la instancia local sin cambiar API. Eso no garantiza idempotencia ante dos pestañas o reintentos externos; no añadir sistema de idempotencia en este alcance. |
| Despliegue de layout/tema compartido | Evitarlo: aplicar clases, `sx` y composición local. La posible diferencia de sidebar se registra sin modificarla. |
| API/secretos de OpenAI y Cloudinary | Dependencias existentes. Probar con simulación; no cambiar configuración externa ni exponer valores. |
| Acciones sobre datos reales | No autorizadas para esta entrega. Validación real futura requiere destino y negocio de prueba identificados. |

Para aprobar el rediseño basta revisar dos decisiones: la organización visual de la sección 7 y si se permite la extensión visual opt-in de `AutoUploadMedia`. El resto del núcleo puede quedar circunscrito a la página y al formulario de creación. No se solicita acceso a producción ni cambios de infraestructura para cerrar esta auditoría.

## Anexo A. Opciones reales de clasificación

El seed contiene **18 categorías y 159 secciones activas en el código** (excluidas entradas comentadas). El formulario itera esas listas sin filtrar por `isActive` ni ordenar por `order`. Se conserva aquí el orden de presentación de categorías y, dentro de cada una, el de sus secciones. No se ha contrastado existencia de estos ids con una BD.

| Categoría | Cantidad | Secciones que puede mostrar |
| --- | --- | --- |
| Comida | 27 | Adicionales; Almuerzos; Carnes; Comida Saludable; Comida Rápida; Desayunos; Empanadas; Ensaladas; Entradas; Especiales; Hamburguesas; Helados; Italiana; Menús del Día; Mexicana; Oriental; Panadería; Pastas; Perros calientes; Pescados; Pizzas; Pollo; Postres; Sopas; Tacos; Vegetariana; Wraps. |
| Bebidas | 16 | Agua; Bebidas frías; Bebidas calientes; Cafés; Cervezas; Cocteles; Gaseosas; Granizados; Jugos; Limonadas; Malteadas; Otras bebidas; Smothies; Té; Vinos; Whiskies. |
| Moda y Accesorios | 31 | Accesorios; Billeteras; Blusas; Bolsos; Botas; Bufandas; Camisas; Camisetas; Chaquetas; Corbatas; Faldas; Gorras; Guantes; Hoodies; Maletas; Medias; Pantalones; Ropa Deportiva; Ropa Interior; Sacos; Sandalias; Shorts; Sombreros; Sudaderas; Vestidos Hombre; Vestidos mujer; Zapatos; Zapatos deportivos; Zapatos de hombre; Zapatos de niño; Zapatos de mujer. |
| Tecnología | 9 | Accesorios Tech; Audio; Cámaras; Celulares; Gaming; Laptops; Smart Home; Smartwatches; Tablets. |
| Hogar y Decoración | 6 | Cocina; Decoración; Electrodomésticos; Iluminación; Muebles; Ropa de Cama. |
| Belleza y Cuidado | 6 | Cabello; Cuidado Corporal; Cuidado Facial; Maquillaje; Perfumes; Uñas. |
| Salud y Bienestar | 4 | Botiquín; Equipo Médico; Suplementos; Vitaminas. |
| Deportes y Fitness | 4 | Accesorios Deportivos; Equipos de Ejercicio; Ropa Deportiva; Suplementos Deportivos. |
| Mascotas | 4 | Accesorios Mascotas; Alimento; Higiene; Juguetes. |
| Libros y Papelería | 4 | Educativos; Libros Infantiles; Literatura; Papelería. |
| Vehículos y Motores | 8 | Accesorios Auto; Autos Usados; Autos Nuevos; Bicicletas; Camionetas; Camiones y Pesados; Motos; Repuestos. |
| Juguetes y Niños | 3 | Juegos de Mesa; Juguetes Educativos; Ropa Infantil. |
| Jardinería | 3 | Decoración Jardín; Herramientas Jardín; Plantas. |
| Viajes y Aventura | 3 | Accesorios de Viaje; Equipo de Camping; Equipaje. |
| Inmuebles - Propiedades | 8 | Apartamentos; Casas; En Alquiler; En Venta; Fincas y Cabañas; Habitaciones; Oficinas y Comerciales; Terrenos y Lotes. |
| Hospedaje y turismo | 6 | Habitaciones; Paquetes Vacacionales; Propiedades enteras; Servicios Adicionales; Suites y Premium; Turismo y Experiencias. |
| Servicios profesionales | 4 | Consultorías; Eventos y Organización; Otros Servicios; Reparaciones y Mantenimiento. |
| Negocios | 13 | Alimentos; Bebidas Alcohólicas; Carnes y Embutidos; Cuidado Personal; Frutas y Verduras; Hogar Básico; Lácteos; Limpieza; Panadería y Pastelería; Papelería y Miscelaneas; Regalos y detalles; Snacks y Dulces; Herramientas. |

**Cierre de esta entrega:** auditoría y propuesta listas para revisión, implementación pendiente de aprobación. Estado `NEW_PRODUCT_FORM_UX_AUDIT_READY`.
