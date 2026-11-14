# Auditoría de ubicación y guardado del perfil de negocio

La pantalla `/dashboard/editar-perfil` conserva Next.js, React Hook Form, MUI, el cargador de medios, la Server Action y Prisma. Los cambios están listos para revisión técnica. La causa ambiental del incidente original de geolocalización y la configuración real de Google Cloud requieren una comprobación manual; las pruebas automatizadas no sustituyen esa comprobación.

## Diagnóstico y evidencia

| Prioridad | Hallazgo en la implementación anterior | Corrección |
| --- | --- | --- |
| Crítico para integridad | `editarPerfilNegocio` reemplazaba `null` con Bogotá mediante `||`; el formulario también tenía coordenadas predeterminadas y podía guardarlas sin selección. | La ausencia permanece `null`. El centro inicial de Colombia solo controla la vista del mapa. |
| Crítico para integridad | La acción solo comparaba rangos: `NaN` y valores ausentes podían pasar esas comparaciones. | Zod valida números finitos, rangos y pares completos antes de la escritura. |
| Crítico para integridad | El cargador compartido eliminaba la imagen anterior de Cloudinary antes de terminar el reemplazo o guardar el formulario. | Opción `deleteRemoteOnRemove={false}` únicamente en este editor; conserva los archivos remotos al reemplazar o quitar una imagen. Un reemplazo fallido conserva la URL anterior. |
| Funcional | `MapPicker` almacenaba una copia de las coordenadas iniciales; cambios posteriores del formulario podían no reflejarse. | React Hook Form conserva la selección; el mapa separa la vista y un punto de referencia por confirmar. |
| Funcional | Varias comprobaciones con `||`/truthiness descartaban latitud o longitud `0`. | Validación explícita de números, incluyendo cero. |
| Funcional | No había carga/bloqueo para geolocalización, ni guardia inmediata para envíos simultáneos del formulario. | Referencias síncronas bloquean duplicados; se muestran estados de espera. |
| Funcional | El teléfono editado se enviaba como `telefonoContacto`, pero la acción persistía el antiguo `telefonoNegocio`. La carga quitaba tres caracteres sin comprobar el prefijo. | Se envía el número normalizado al campo persistido; solo se retira el prefijo `+57` cuando existe. |
| Funcional | Guardar cualquier campo recreaba categorías y secciones, restableciendo `prioridad` a cero. | Las relaciones se escriben cuando sus IDs cambian. |
| Funcional | Opcionales omitidos se convertían en `null`. | Omitir conserva; una cadena vacía permite borrar explícitamente los opcionales editables. |
| Funcional | Un fallo al refrescar la sesión después de confirmar la escritura podía mostrar un rechazo de guardado. | La confirmación depende de `response.ok`; el fallo posterior de sesión se trata por separado. |

El texto observado «Error desconocido al obtener la ubicación.» estaba en el `default` del callback de error de `navigator.geolocation.getCurrentPosition`. Esa rama no registraba el código numérico ni permitía distinguir la causa. El uso de constantes de la instancia del error era válido en implementaciones conformes; cambiarlo por códigos numéricos estables refuerza la compatibilidad, pero no demuestra que fuera la causa del incidente.

No hay llamada a Google Geocoding en la geolocalización original: las coordenadas proceden del navegador. No se encontró una cabecera `Permissions-Policy` que bloquee geolocalización en el repositorio, ni un iframe en este flujo. La política efectiva del navegador, posibles contenedores externos y las cabeceras reales de Vercel no se observaron. No hay evidencia para atribuir el incidente a HTTPS, permisos, Google Maps o Boyacá. Los valores predeterminados encontrados corresponden a Bogotá; para explicar la zona de Boyacá se necesitarían el registro ficticio y el entorno que mostraron ese resultado.

## Geolocalización y selección

- Solicita permiso únicamente al pulsar «Usar mi ubicación».
- Detecta API ausente, contexto inseguro y una política del documento que prohíba geolocalización.
- Distingue códigos `1` (permiso), `2` (no disponible), `3` (timeout) y error inesperado con mensajes en español. Registra solo el código numérico, sin coordenadas ni datos del negocio.
- Opciones: `enableHighAccuracy: false`, `timeout: 15000`, `maximumAge: 60000`. Permiten una posición reciente sin exigir GPS de alta precisión; el usuario puede ajustar el marcador.
- Los fallos no cambian coordenadas. Una selección manual posterior invalida respuestas pendientes, y las respuestas tras desmontar el componente se descartan.
- El mapa libera su referencia mediante `onUnmount`. La búsqueda no añade listeners globales.

## Búsqueda y persistencia

Se reutiliza `@react-google-maps/api` y `google.maps.Geocoder`; no se añadieron dependencias. MUI Autocomplete ofrece sugerencias de municipios desde `src/config/colombia.json`, sin llamadas externas por cada pulsación. «Buscar» o Enter consulta la dirección con restricción de país `CO` y región `co`; muestra resultados seleccionables. Elegir una sugerencia local busca ese municipio directamente.

Al abrir:

1. Si hay coordenadas válidas, se muestran sin sustituirlas ni realizar búsqueda inicial de ciudad.
2. Sin coordenadas, la ciudad/departamento ya indicados sirven para una consulta de referencia. Cambiar la ciudad también permite navegar a su referencia.
3. Sin referencia válida o ante un fallo externo, se usa la vista general de Colombia: centro `4.5, -73.5`, zoom `5`. Nunca se guarda ese centro automáticamente.

Un resultado cambia el centro y ajusta el encuadre con su `viewport`. Su marcador es un borrador. Ni una ciudad ni una dirección se persisten hasta pulsar «Confirmar este punto», arrastrar el marcador o hacer clic en el mapa. La geolocalización válida sí constituye una selección explícita. Los controles de zoom de Google Maps siguen disponibles.

El buscador no modifica `ciudadNegocio`, `departamentoNegocio` ni `direccionNegocio`. Esos campos y el marcador deben revisarse conjuntamente: no se hace geocodificación inversa ni validación automática de coincidencia entre dirección textual y punto. Geocoding puede no resolver nombres de establecimientos o barrios ambiguos; en ese caso se debe buscar su dirección o seleccionar el punto manualmente. No se incorporó Places Autocomplete ni búsqueda predictiva remota de establecimientos.

Recorrido: `MapPicker.onLocationSelect(lat, lng)` → `setValue` numérico en React Hook Form → `actualizarPerfilNegocio` → validación Zod → transacción Prisma → `editarPerfilNegocio` en la carga posterior. Las coordenadas guardadas conservan el orden latitud/longitud. La acción comprueba sesión, usuario solicitado y propiedad del negocio. No permite alterar su estado operativo. Si no se proporciona una nueva ubicación válida, conserva la existente; cambiar coordenadas genera un enlace Google Maps coherente con el nuevo par.

## Formulario y diseño

«Guardar cambios» tiene capitalización natural, altura mínima de 48 px, radio y colores MUI, foco visible, estados hover/disabled y carga «Guardando…». Ocupa el ancho disponible en móvil y tiene ancho contenido en escritorio. Los estilos se aplican únicamente a este botón.

Se conservan validaciones de obligatoriedad, ciudad, categorías, secciones y teléfono. La validación de redes sociales usa el analizador `URL`, valida hosts y admite X/Twitter; se mantiene la posibilidad existente de escribir el sitio web sin esquema. El servidor valida el mismo contrato, incluida la ubicación. Un `fieldset` bloquea controles durante subidas/guardado y el modal MUI gestiona el foco. Categorías/secciones son botones accesibles por teclado; los campos de texto tienen etiquetas asociadas.

Los errores de servidor/red dejan los valores editados disponibles para reintentar. La confirmación aparece únicamente tras una respuesta exitosa. Se conserva la redirección existente al perfil público o a completar el administrador según la sesión.

## Verificación ejecutada

| Comprobación | Resultado |
| --- | --- |
| Jest focalizado, tres suites | 81 pruebas aprobadas; cobertura de archivos auditados: 96,52 % de líneas, 85,88 % de ramas. Umbrales del repositorio aprobados. |
| Playwright de componentes, Chromium real | 29 pruebas aprobadas, 40,6 s. Google Maps, geolocalización, sesión, acción y Cloudinary simulados. |
| `pnpm typecheck` | Aprobado. |
| `pnpm lint` | Aprobado con advertencia preexistente de `_body` sin uso en `ActivationBootstrap.test.tsx:347`. `next lint` también anuncia su deprecación. |
| `pnpm build` en copia temporal | Aprobado: compilación, comprobación de tipos y 85 páginas estáticas generadas. |
| `git diff --check` | Aprobado. |

La primera ejecución de build en el directorio compartido compiló, pero falló al recoger páginas con un manifiesto incompleto. Se confirmó otro servidor Next activo en el puerto 3000 con cwd `/home/nico/red-social`. Se repitió el mismo build en `/tmp/myckeo-profile-audit-build`, con copia del código y enlaces a dependencias/configuración local; pasó sin detener el servidor existente. No hubo despliegues ni migraciones.

La suite cubre obtención válida, todos los códigos de geolocalización, API ausente, excepción, coordenadas inválidas, duplicados, respuestas tardías, carga inicial con/sin coordenadas, sugerencias locales, ciudad y dirección, confirmación, clic/arrastre, rechazo de servicios externos, conservación tras guardar/recargar, errores del servidor/red, sesión caducada, campos inválidos, bloqueo de carga, campos existentes, desmontaje, móvil y reemplazo fallido de imagen.

El guardado/recarga en Playwright usa almacenamiento simulado. Las pruebas de las acciones ejecutan el código real con Prisma simulado. No se probó una escritura en PostgreSQL real ni una petición real a Google o Cloudinary. La captura móvil en `test-results/playwright/profile-editor/map-mobile.png` comprueba el contenedor y los controles con un mapa simulado.

Comandos reproducibles desde la raíz:

```bash
pnpm exec jest src/lib/business/profileLocation.test.ts src/lib/business/profileEditor.test.ts src/actions/perfil/actualizarPerfil.test.ts --runInBand --collectCoverageFrom=src/lib/business/profileLocation.ts --collectCoverageFrom=src/lib/business/profileEditor.ts --collectCoverageFrom=src/actions/perfil/actualizarPerfil.ts --collectCoverageFrom=src/actions/auth/editarPerfilNegocio.ts
pnpm exec playwright test --config=e2e/profile-editor/playwright.config.ts
pnpm typecheck
pnpm lint
pnpm build
```

El arnés usa esbuild ya instalado con tsx y el compilador Tailwind del proyecto. En este entorno se ejecutó Chromium con `PROFILE_TEST_BROWSER=/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome` porque el binario esperado por la versión instalada de Playwright no estaba disponible. La ejecución de navegador requirió salir del sandbox por restricciones EPERM; toda solicitud externa quedó interceptada por los mocks.

## Configuración externa y costos

La variable pública `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` está presente localmente; no se imprimió su valor. No se inspeccionaron restricciones, cuotas, facturación ni APIs habilitadas en Google Cloud, ni variables del proyecto Vercel.

Es necesario verificar:

1. **Maps JavaScript API** habilitada para mostrar el mapa.
2. **Geocoding API** habilitada en el mismo proyecto y admitida por las restricciones de API de la clave. Google exige habilitarla para el [servicio JavaScript Geocoding](https://developers.google.com/maps/documentation/javascript/geocoding).
3. Clave de navegador restringida por referentes HTTP a los dominios autorizados, incluido el dominio de producción, los previews que se decida admitir y localhost de desarrollo. El prefijo `NEXT_PUBLIC_` es apropiado para esta clave pública restringida, no para secretos de servidor. Véase la [guía oficial de seguridad de claves](https://developers.google.com/maps/api-security-best-practices).
4. Facturación, cuotas y alertas de presupuesto del proyecto. Las cargas de mapa y las consultas Geocoding pueden generar cargos según el [modelo de uso de Geocoding](https://developers.google.com/maps/documentation/geocoding/usage-and-billing). No se indican precios fijos ni se asume crédito gratuito. Las sugerencias locales y `navigator.geolocation` no llaman a un servicio de geolocalización de Google. Buscar o elegir una sugerencia provoca una consulta; también se consulta una ciudad inicial sin coordenadas o una ciudad recién cambiada.
5. HTTPS en Vercel y localhost para desarrollo. Acceder por HTTP mediante una IP de LAN puede no ser contexto seguro. Si se incrusta la página, comprobar la delegación de geolocalización en el iframe y la política efectiva; véanse los [requisitos de Geolocation](https://www.w3.org/TR/geolocation/).

Places no es requisito de esta implementación. Para una futura búsqueda predictiva de establecimientos, Google recomienda `PlaceAutocompleteElement`; el widget antiguo Autocomplete tiene restricciones para clientes nuevos desde marzo de 2025. Esa alternativa requiere habilitar Places API (New) y revisar su facturación, según la [documentación del widget](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new).

## Riesgos y revisión manual pendiente

- **Funcional pendiente de evidencia externa:** reproducir el incidente original en el navegador afectado y capturar el código numérico, permiso del sitio, contexto seguro, política efectiva, uso de iframe y consola. La mejora maneja causas distinguibles; no demuestra cuál ocurrió entonces.
- **Integración pendiente:** en un negocio ficticio y un entorno de pruebas, ejecutar búsquedas reales de Tunja, Bogotá, Medellín, Bucaramanga y una dirección; comprobar cuotas/restricciones, encuadre, arrastre real, autorización con sesión expirada y persistencia en PostgreSQL tras recargar. No se modificaron negocios reales.
- **Limitación del alcance:** los fallos de descarga del script se muestran en la interfaz. Los errores de autorización internos de Maps JavaScript pueden dejar el script cargado pero mostrar el aviso propio de Google; deben diagnosticarse con su consola y configuración real. La selección guardada se conserva.
- **Mejora opcional:** el formulario sigue usando categorías/secciones del seed y su validación antigua para enlaces Google Maps; conviene revisar compatibilidad con categorías administrativas fuera del seed y enlaces cortos `maps.app.goo.gl` en una tarea separada.
- **Mejora opcional:** la conservación segura de imágenes evita borrar assets persistidos durante una edición pendiente. Las imágenes reemplazadas o abandonadas pueden quedar sin referencia en Cloudinary; una limpieza debe comprobar referencias y realizarse tras guardar, fuera de esta auditoría. No se ejecutó ninguna limpieza remota.

Estado: listo para revisión del código y pruebas manuales de integración. Sin commits, migraciones ni despliegue. La validación automatizada es satisfactoria; la causa original del incidente y el funcionamiento real de Google Cloud/Vercel permanecen pendientes de evidencia.

## Validación real posterior

Se completaron pruebas con Google Maps y Geocoding reales, arrastre real y geolocalización nativa. El resultado de preparación para despliegue es `PROFILE_EDITOR_REAL_INTEGRATION_VALIDATION_BLOCKED`: falta validar guardado y recarga con una cuenta y negocio de prueba autorizados y obtener una posición nativa válida. La matriz y evidencia están en [Validación real del editor de perfil](PROFILE_EDITOR_REAL_INTEGRATION_VALIDATION.md). Este cierre distingue la preparación del código para revisión de la validación necesaria para producción.

## Cierre posterior de los pendientes críticos

La persistencia autenticada de Aura Studio Beauty se comprobó con PostgreSQL real: coordenadas idénticas tras ambos guardados/recargas, campos existentes conservados y descripción temporal restaurada. El cierre sigue `PROFILE_EDITOR_REAL_INTEGRATION_VALIDATION_BLOCKED` exclusivamente por un fallo preexistente de autorización en `POST /api/cloudinary/delete`, reproducido con proveedor simulado y sin borrados reales. La matriz vigente está en [Cierre de validación del editor de perfil](PROFILE_EDITOR_REAL_INTEGRATION_VALIDATION.md).

## Resolución posterior de autorización de imágenes — 2026-11-14

El bloqueo histórico de `POST /api/cloudinary/delete` quedó corregido con identidad activa, prueba firmada de creación y verificación del recurso en Cloudinary antes de borrar por asset ID inmutable. Los casos sin procedencia verificable se deniegan. La persistencia real previamente aprobada se conserva y no se repite. El estado vigente es `PROFILE_EDITOR_REAL_INTEGRATION_VALIDATION_READY` para revisión del código, con los límites de integración positiva del proveedor indicados en [Auditoría de Cloudinary](CLOUDINARY_DELETE_AUTHORIZATION_AUDIT.md) y en [Validación del editor](PROFILE_EDITOR_REAL_INTEGRATION_VALIDATION.md). Sin borrados reales, commits, migraciones ni despliegues.
