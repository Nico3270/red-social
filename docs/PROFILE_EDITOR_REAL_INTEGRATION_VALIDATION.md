# Cierre de validación del editor de perfil

**Resultado: `PROFILE_EDITOR_REAL_INTEGRATION_VALIDATION_READY` para revisión del código.**

La persistencia autenticada de Aura Studio Beauty queda **PASS**: las coordenadas guardadas son exactamente iguales después de ambos guardados y recargas, se conservan imágenes, teléfono, redes y demás campos comparados, y se restauró la descripción original tras la prueba. La acción principal del editor también supera los controles aislados de autenticación y propiedad antes de escribir.

**El bloqueo de autorización de imágenes quedó corregido el 2026-11-14.** `POST /api/cloudinary/delete` ahora exige identidad activa y autorización firmada ligada al creador, verificada contra el contexto del recurso en Cloudinary antes de borrar por asset ID inmutable. El [informe de seguridad](CLOUDINARY_DELETE_AUTHORIZATION_AUDIT.md) documenta política, consumidores, pruebas y casos legacy denegados. No se borraron archivos reales; el resultado positivo del borrado del proveedor se probó únicamente con mocks. READY expresa el cierre de los dos pendientes críticos del editor y del hallazgo de autorización, no una certificación de despliegue ni de borrado real.

## Evidencia previamente aprobada

Se conserva, sin repetir las pruebas, la evidencia de la auditoría y las validaciones anteriores:

| Evidencia | Tipo | Resultado conservado |
| --- | --- | --- |
| Maps y Geocoding con la clave local; Tunja, Bogotá, Medellín, Bucaramanga y dirección específica | Automatizada con servicios reales | PASS |
| Selección de sugerencia, centrado, punto pendiente sin guardado automático, arrastre y contenedor móvil | Automatizada con Maps real | PASS |
| Geolocalización denegada y timeout con códigos nativos 1 y 3 | Automatizada con API nativa | PASS para esos escenarios; el error desconocido original no se reprodujo |
| 81 pruebas unitarias y 29 pruebas de componentes del cambio inicial | Fronteras externas simuladas | PASS histórico; no se ejecutaron de nuevo para este cierre |
| Mapa correcto en localhost y presentación satisfactoria | Confirmación manual explícita del propietario | PASS manual |
| Edición de descripción, imágenes y demás campos; cambios visibles en perfil público de producción | Confirmación manual explícita del propietario | PASS manual; el agente no realizó despliegue |
| Aura pertenece a la cuenta autenticada | Sesión legítima y consulta real de solo lectura, además de confirmación del propietario | PASS |

Los artefactos históricos están en `test-results/playwright/profile-editor-real/` y `test-results/playwright/profile-editor-authenticated/`. La auditoría inicial permanece en `PROFILE_EDITOR_LOCATION_AUDIT.md`. Las comprobaciones antiguas sin sesión o con otra identidad son intentos históricos superados; **ya no justifican BLOCKED**.

## Identidad y alcance de las escrituras reales

Se reutilizó el perfil privado de Chromium en el que el propietario había iniciado sesión manualmente. No se solicitaron credenciales, no se exportaron cookies/tokens y no se fabricó autenticación. El navegador se cerró al terminar.

Antes de guardar, se contrastó `/api/auth/session` con una consulta Prisma de solo lectura limitada al nombre **Aura Studio Beauty** y al usuario autenticado. Hubo una coincidencia inequívoca: slug `aura-studio-beauty`, huella de negocio `72ebebe12aab` y huella de propietario/usuario `128856984c98`.

La app en `http://localhost:3000` utiliza la base Neon remota ya identificada, huella de destino `541c2a46707d`. Aura es el negocio ficticio autorizado expresamente por el propietario; no se supuso que toda la base fuera de pruebas ni se modificó `isTestData`.

Se ejecutaron **tres guardados confirmados**, exclusivamente mediante el formulario y su Server Action existente:

1. Reenvío de la ubicación que el propietario ya había seleccionado y guardado. Se conservaron las mismas coordenadas, sin mover deliberadamente el negocio para repetir la prueba de Maps. Los controles numéricos reales de React Hook Form recibieron el par existente; no hubo API o respuesta de servidor simuladas.
2. Edición de la descripción añadiendo una etiqueta temporal de validación, sin tocar ubicación, teléfono, imágenes ni redes.
3. Restauración de la descripción original por el mismo formulario. El estado final conserva todos los valores de negocio comparados.

Las lecturas directas de PostgreSQL se hicieron con `SET TRANSACTION READ ONLY`. No se usó SQL para escribir ni restaurar datos. No se modificaron registros de terceros, no se subieron/reemplazaron imágenes y no se hicieron borrados de Cloudinary.

## Matriz de las dos validaciones críticas

| Escenario | Resultado esperado | Resultado observado | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| Identidad y pertenencia de Aura | Sesión y dueño del registro coinciden | Coincidencia verificada antes de guardar | E9, E10 | PASS real |
| Carga inicial de coordenadas guardadas | Formulario coincide exactamente con PostgreSQL | Igualdad numérica comprobada | E9 | PASS real |
| Primer guardado y recarga completa | Conservar ubicación seleccionada | Par leído de PostgreSQL y del editor recargado coincide exactamente con el inicial | E9 | PASS real |
| Segundo guardado de campo no geográfico y recarga completa | Conservar exactamente las mismas coordenadas | Descripción modificada realmente en PostgreSQL; mismo par en ambas recargas y en las lecturas de base | E10 | PASS real |
| Imágenes, teléfono y redes | No perder ni sobrescribir información | `fotoPerfil`, `fotoPortada`, `telefonoContacto` y cinco redes iguales antes/después | E9, E10 | PASS real |
| Otros campos del negocio | Conservar los no editados | Nombre, slug, ciudad, departamento, dirección, enlace Maps, sitio web, estado, flags, categorías y secciones/prioridades iguales | E9, E10 | PASS real |
| Limpieza de la edición temporal | Recuperar descripción original | Etiqueta retirada, descripción original restaurada y ubicación/campos protegidos conservados | E10 | PASS real |
| Acción principal sin sesión | Rechazo antes de leer payload o consultar/escribir DB | `ok:false`, «No autorizado. Debes iniciar sesión.»; cero accesos a DB | E11 | PASS aislado |
| Usuario solicitado distinto del autenticado | Rechazo antes de leer payload o acceder a DB | `ok:false`; payload hostil no leído; cero accesos a DB | E11 | PASS aislado |
| `idNegocio` de otro dueño | Rechazo antes de cualquier escritura | Solo se permite leer propiedad; respuesta de permiso denegado; cero transacciones y cero escrituras | E11 | PASS aislado |
| Omitir `idNegocio` | Buscar únicamente al dueño autenticado y rechazar una relación inconsistente | Selector por usuario de sesión; relación ajena rechazada antes de escribir | E11 | PASS aislado |
| Doce rutas REST afines de negocio | Sin clave administrativa, rechazar antes de consultar/escribir | Doce respuestas 401, con contadores Prisma en cero | E11 | PASS aislado |
| Ruta alternativa de borrado de imágenes | Rechazar peticiones sin sesión y assets no autorizados antes de cualquier borrado | 401/403 antes de eliminar; prueba firmada y contexto del proveedor obligatorios; cero borrados/escrituras en rechazos | E13 y regresión actualizada de E11 | **PASS aislado y rechazos HTTP reales** |

Evidencias nuevas, en `test-results/playwright/profile-editor-authenticated/closure/`:

- **E9:** `persistence-cycle1.json`, fila `first_save_and_reload` y carga inicial. Contiene comparaciones por campo y huella de coordenadas; no valores privados en claro.
- **E10:** `persistence-cycle2.json`, filas `second_edit_save_and_reload` y `restore_description`; incluye respuestas HTTP 200 de las Server Actions reales y confirmación de persistencia en DB.
- **E11:** `authorization-jest.json` y `src/lib/business/__tests__/profileEditorAuthorization.audit.test.ts`, 17 casos aislados.
- **E12:** `closure-summary.json`, resultado consolidado de persistencia y autorización, número de guardados y comprobación de que la implementación funcional permanece igual.

La huella del par de coordenadas es idéntica en los dos ciclos: `425e76f73b1fc81ca1d4f766435ac6edebd70ed330043c24c39ea6e58051bfd7`. Las comparaciones se hicieron sobre números reales de PostgreSQL y del formulario tras navegación/recarga completas, no sobre almacenamiento simulado. Los valores concretos y el contenido privado del negocio no se exportaron al informe.

Hubo intentos incompletos del arnés antes de completar el recorrido: una comprobación demasiado temprana de identidad del formulario y una espera de modal que no obtuvo confirmación del segundo envío. Se conservaron como evidencia de instrumentación. Se ajustó la sincronización de hidratación y respuesta de la Server Action y se continuó únicamente con el segundo ciclo pendiente; no se repitieron las pruebas de Maps ni el primer guardado ya aprobado. La consulta previa a la continuación comprobó que no había quedado la etiqueta temporal de descripción.

## Autorización y vía alternativa encontrada

`src/actions/perfil/actualizarPerfil.ts` exige `auth().user.id`, comprueba que `usuarioId` coincida con la sesión y comprueba `negocio.usuarioId` antes de la transacción. Las pruebas utilizan payloads que fallarían si fueran leídos antes de esas guardas y una barrera de escritura: no basta con comprobar que la respuesta final sea un error. La edición real de Aura demuestra el caso positivo del propietario autorizado. Los casos negativos se ejecutaron con Prisma/auth simulados, como permite el alcance, para no arriesgar registros de terceros.

Se revisaron las vías relacionadas que actualizan campos del perfil. Las rutas `/api/business/{nombre,description,direccion,sitioweb,fotoperfil,fotoportada,ubicacion,facebook,instagram,twitter,tiktok,youtube}/[phone]` exigen `MYCKEO_ADMIN_KEY`; una sesión de propietario no sustituye esa autorización administrativa. La acción de actualización administrativa exige `super_admin`. El endpoint batch de scores exige su secreto `ID_UPDATES`; no se invocó sobre la base real.

### Hallazgo histórico de Cloudinary y resolución

La implementación anterior de `src/app/api/cloudinary/delete/route.ts` aceptaba identificadores arbitrarios sin sesión y alcanzaba `uploader.destroy`. La reproducción histórica de E11 usaba un proveedor simulado; confirmó un defecto real de control de acceso, sin borrar archivos reales. Ese resultado FAIL explica el estado BLOCKED anterior y se conserva como antecedente.

El encargo posterior autorizó su corrección focalizada. La ruta ahora autentica y comprueba cuenta activa, valida un payload estricto, exige prueba HMAC de creación temporal ligada al actor y consulta Cloudinary para comprobar el contexto firmado del recurso. Las referencias persistidas vetan el borrado; no conceden propiedad. Solo después se elimina por asset ID inmutable. Ni el rol administrativo, una URL guardada ni un prefijo de carpeta bastan para autorizar.

Se añadió una autorización de subida firmada para los temporales nuevos y se adaptó exclusivamente el uploader compartido para conservar esa prueba. Los assets legacy sin asociación verificable no se eliminan remotamente. El componente de perfil y el mapa no se modificaron para esta corrección; se conservan sus pruebas y evidencia real anteriores. No se repitió el ciclo de persistencia ni se escribió en Aura.

La antigua prueba reproductora se convirtió en una regresión que exige 401 y ausencia de efectos destructivos. Las nuevas pruebas verifican explícitamente cero llamadas a `uploader.destroy`, al borrado por asset ID y a escrituras Prisma en los rechazos. Las vías administrativas internas conservan sus guardas `super_admin`, también probadas de forma aislada.

**E13:** `test-results/playwright/cloudinary-security/jest.json` (211 PASS), `live-http.json` (rechazos reales 401/403/400) y `lookup-diagnostic.json` (consulta real de ID recién reservado y nunca subido: `deleted:0`, `alreadyMissing:1`). El primer intento dio 503 porque el SDK anidaba su 404 en `error.http_code`; la lectura corregida tiene regresión para ambos formatos y el último intento real es PASS. La suite Chromium completa suma 36 PASS con fronteras externas simuladas. El detalle y los comandos reproducibles están en [Autorización de eliminación de Cloudinary](CLOUDINARY_DELETE_AUTHORIZATION_AUDIT.md).

## Comandos ejecutados y límites

En el cierre original de persistencia se ejecutaron estos comandos; se conservan como evidencia histórica:

```bash
node /tmp/profile-editor-close-persistence.cjs
node /tmp/profile-editor-close-persistence-cycle2.cjs
pnpm exec jest src/lib/business/__tests__/profileEditorAuthorization.audit.test.ts --runInBand --coverage=false --json --outputFile=test-results/playwright/profile-editor-authenticated/closure/authorization-jest.json
pnpm exec next lint --file src/lib/business/__tests__/profileEditorAuthorization.audit.test.ts
pnpm typecheck
git diff --check
```

Las 17 pruebas de aquel cierre, el lint focalizado y TypeScript pasaron. Los resultados actuales de seguridad y regresión (211 unitarias y 36 Chromium), lint, TypeScript y build se documentan en E13 y en el informe enlazado. La persistencia real previamente aprobada no se repitió. Los scripts de navegador están copiados junto a E9/E10 para inspección local y reutilizan exclusivamente el perfil de navegador donde el propietario había iniciado sesión manualmente; no incluyen cookies ni contraseñas.

Limitaciones conservadas: los rechazos de autorización se probaron de forma aislada, no mediante ataques a cuentas reales; no se probaron borrados reales del proveedor; la confirmación del perfil público de producción es manual; la política de claves y cabeceras del despliegue no se modificó ni se volvió a inspeccionar. El incidente original de geolocalización sigue sin causa raíz reproducida y no se reabrió en este cierre.

**Estado final: `PROFILE_EDITOR_REAL_INTEGRATION_VALIDATION_READY` para revisión del código.** Persistencia autenticada PASS con datos reales; autorización principal y alternativa PASS con pruebas aisladas y rechazos HTTP reales. La limpieza de assets legacy o sin prueba vigente permanece denegada de forma segura, y el borrado positivo real no se ejecutó por la restricción del encargo. No faltan contraseñas, tokens ni una repetición manual del ciclo de recarga. No hubo commits, migraciones, despliegues ni eliminación de archivos reales.

La [revisión final de integración](PROFILE_EDITOR_FINAL_INTEGRATION_REVIEW.md) mantiene este estado y define el manifiesto de 33 archivos para commit: 212 pruebas Jest aprobadas, 7 casos del uploader aprobados desde dependencias limpias, lint y TypeScript satisfactorios. Conserva el build previo por identidad de los 14 archivos productivos y toda la evidencia real anterior. Incluye los requisitos de Production comprobados por nombre en Vercel, sus límites y la exclusión de archivos locales/artefactos. No se repitieron las escrituras de Aura ni las pruebas de Google Maps.
