# Revisión final del paquete de integración del editor

Fecha: 2026-11-14. **Recomendación: READY para commit del manifiesto indicado y para despliegue posterior autorizado**, con los requisitos y límites de producción documentados abajo. Se mantiene `PROFILE_EDITOR_REAL_INTEGRATION_VALIDATION_READY`. No se ha hecho staging, commit, push, migración ni despliegue.

## Estado del repositorio y alcance

- Rama: `release/red-social-production-activation`.
- HEAD: `106f095` (`release: promote secure activation flow to production`).
- Upstream: `origin/main`. Comparación contra la referencia local disponible: 0 commits por delante y 0 por detrás; no se hizo fetch.
- Índice vacío: no hay cambios preparados para commit.
- Paquete revisado: **33 archivos: 6 modificados y 27 nuevos**, incluidos este informe, pruebas y documentación. Hay 14 archivos productivos, 10 pruebas Jest, 4 archivos del arnés Chromium y 5 documentos.
- Tres archivos locales adicionales permanecen fuera del paquete: `.claude/settings.local.json`, `AGENTS.md`, `CLAUDE.md`. Ya estaban presentes y no se modificaron. Deben excluirse al preparar el commit; este informe no autoriza incluir todo el árbol indiscriminadamente.

Se revisó el diff completo, incluidos los cambios de formato de `CompletePerfil.tsx`. Su tamaño elevado incluye formato y accesibilidad además de las correcciones del formulario; no se volvió a formatear ni reescribir el componente. No hay cambios de dependencias, lockfile, esquema Prisma, migraciones, configuración global de estilos ni rutas de otros dominios.

## Manifiesto para integración

Archivos existentes modificados:

```text
src/actions/auth/editarPerfilNegocio.ts
src/actions/perfil/actualizarPerfil.ts
src/app/api/cloudinary/delete/route.ts
src/ui/components/autoUpload/AutoUploadMedia.tsx
src/ui/components/dashboard/perfil/CompletePerfil.tsx
src/ui/components/map-picker/MapPicker.tsx
```

Archivos productivos nuevos, necesarios para que los imports y contratos funcionen:

```text
src/app/api/cloudinary/upload-authorization/route.ts
src/lib/business/profileEditor.ts
src/lib/business/profileLocation.ts
src/lib/cloudinary/cloudinaryDeletionReference.ts
src/lib/cloudinary/cloudinaryRequestAuthorization.ts
src/lib/cloudinary/isCloudinaryAssetReferenced.ts
src/lib/cloudinary/temporaryUploadAuthorization.ts
src/lib/cloudinary/uploadAuthorizedMedia.ts
```

Pruebas Jest nuevas:

```text
src/actions/perfil/actualizarPerfil.test.ts
src/app/api/cloudinary/delete/route.test.ts
src/app/api/cloudinary/upload-authorization/route.test.ts
src/lib/business/__tests__/profileEditorAuthorization.audit.test.ts
src/lib/business/profileEditor.test.ts
src/lib/business/profileLocation.test.ts
src/lib/cloudinary/administrativeCleanupAuthorization.test.ts
src/lib/cloudinary/isCloudinaryAssetReferenced.test.ts
src/lib/cloudinary/temporaryUploadAuthorization.test.ts
src/lib/cloudinary/uploadAuthorizedMedia.test.ts
```

Arnés Chromium nuevo:

```text
e2e/profile-editor/harness.tsx
e2e/profile-editor/mocks/boundaries.tsx
e2e/profile-editor/playwright.config.ts
e2e/profile-editor/profile-editor.spec.ts
```

Documentación nueva:

```text
docs/CLOUDINARY_DELETE_AUTHORIZATION_AUDIT.md
docs/PROFILE_EDITOR_AUTHENTICATED_PERSISTENCE_CHECKLIST.md
docs/PROFILE_EDITOR_LOCATION_AUDIT.md
docs/PROFILE_EDITOR_REAL_INTEGRATION_VALIDATION.md
docs/PROFILE_EDITOR_FINAL_INTEGRATION_REVIEW.md
```

No basta con incluir los seis archivos que muestra `git diff`: los helpers nuevos son necesarios. El análisis de imports locales de los archivos fuente y del arnés no encontró referencias sin resolver.

## Cambios productivos revisados

El editor conserva React Hook Form, las Server Actions, Prisma y Google Maps existentes. La ubicación es un par numérico válido o ausencia real; ningún centro de fallback se convierte en coordenadas guardadas. La búsqueda navega hasta que el usuario confirma o ajusta un punto. Se conservan coordenadas al editar otros campos y se evita recrear relaciones sin cambios. La hidratación, validación de URLs, mensajes de geolocalización y estados de guardado están cubiertos por las pruebas y evidencia previamente aprobadas.

La eliminación de Cloudinary exige identidad de sesión y cuenta activa, prueba HMAC de creación temporal ligada al sujeto, `public_id`, tipo y vencimiento, y coincidencia del contexto en el proveedor. Rechaza referencias persistidas. El borrado usa exclusivamente el `asset_id` inmutable verificado en cada solicitud. La URL, un ID arbitrario, una carpeta o un rol administrativo por sí solos no autorizan la operación.

El uploader compartido obtiene la autorización de subida del servidor y conserva la imagen anterior si falla el reemplazo. Perfil/portada, productos, publicaciones, reseñas, servicios y formularios administrativos reutilizan esa implementación, sin cambios en sus contratos de guardado. El listado completo de consumidores y las políticas están en [la auditoría de Cloudinary](CLOUDINARY_DELETE_AUTHORIZATION_AUDIT.md).

## Seguridad y reutilización de la prueba

| Comprobación | Evidencia | Resultado |
| --- | --- | --- |
| Sujeto y recurso vinculados | HMAC comprobado en servidor; identidad actual desde sesión y Prisma | PASS |
| Token o referencias manipulados, otro sujeto o rol elevado ajeno | Rechazo y cero borrados/escrituras en pruebas | PASS |
| Caducidad, tipo, cuenta Cloudinary y contexto del recurso | Validación antes de cualquier borrado | PASS |
| Reintento tras borrar | 404 idempotente, cero nuevas llamadas de eliminación | PASS simulado |
| Reutilización sobre sustitución con otro contexto | Nueva regresión: 403 y cero borrados/escrituras | PASS simulado |
| Reutilización contra recurso persistido | Consulta de referencias obligatoria en cada petición; 409 | PASS simulado |
| Legacy sin procedencia verificable | Sin prueba válida, 403; el cliente solo desvincula el borrador | PASS |
| Vías alternativas | Solo una ruta HTTP de borrado; Server Actions administrativas mantienen `super_admin`; CLI no es endpoint | PASS inspección y guardas aisladas |

La prueba es una autorización acotada de una hora, **no un token de un solo uso**. Un reintento del mismo sujeto dentro de su alcance vuelve a comprobar identidad, referencias y contexto; no autoriza otro recurso o sujeto. Una recreación con el mismo destino y la misma autorización de subida sigue perteneciendo al mismo creador; nunca se reutiliza ciegamente un asset ID de una consulta previa. No se modificó la política en esta revisión.

El escaneo del paquete no encontró claves privadas, literales de credenciales en URI, claves Google literales ni valores privados coincidentes con los archivos `.env*` locales. Las cadenas de prueba son fixtures ficticias. Los documentos contienen el negocio ficticio autorizado y huellas de comparación, sin coordenadas, teléfonos privados, cookies o tokens reales.

`.env*`, `.next`, `coverage`, `*.tsbuildinfo`, `playwright-report` y `test-results/playwright` están ignorados y no están en el índice. Los artefactos históricos siguen disponibles localmente para inspección; no forman parte del paquete. No se incluyeron perfiles de navegador ni scripts temporales. Esto es una comprobación del conjunto de cambios, no una auditoría de secretos de todo el historial Git.

## Verificaciones de esta revisión

| Verificación | Resultado | Alcance |
| --- | --- | --- |
| Jest focalizado de seguridad, perfil, ubicación y generación de imágenes | **212 PASS, 11 suites** | Fronteras externas simuladas; incluye nueva regresión de reutilización |
| Chromium del uploader con dependencias instaladas desde cero | **7 PASS** | Componentes reales, HTTP/Cloudinary simulados, sin `.env` ni sesión |
| `pnpm typecheck` | PASS | Árbol actual completo |
| `pnpm lint` y lint focalizado de las pruebas cambiadas | PASS | Advertencia preexistente `_body` sin uso en `ActivationBootstrap.test.tsx`; aviso de deprecación de `next lint` |
| `git diff --check` | PASS | Sin errores de whitespace |
| Imports locales y manifiesto | PASS | Helpers y archivos nuevos presentes |
| Build | PASS previo conservado | Los 14 archivos productivos coinciden byte a byte con `/tmp/myckeo-cloudinary-security-build`; `.next/BUILD_ID` y log de build satisfactorio presentes. No se repitió un build sin cambios productivos |
| Maps y persistencia autenticada real | PASS previo conservado | No se repitieron ni hubo escrituras en Aura o en otros negocios |
| Metadatos Vercel Production | PASS de presencia de nombres | Consulta read-only, `decrypt:false`; no valida valores ni permisos del proveedor |

La instalación limpia demostró un defecto del arnés: `node_modules/.bin/esbuild` existía localmente pero no lo crea una instalación pnpm limpia. Se corrigió únicamente la resolución del ejecutable mediante `tsx`, dependencia de desarrollo ya declarada que depende de esbuild en el lockfile. La validación limpia confirmó que ambos caminos raíz de esbuild estaban ausentes y los siete casos pasaron con la corrección. No se añadió ninguna dependencia ni cambió código productivo. La suite completa histórica de Chromium conserva sus **36 PASS**; no se presenta como una nueva ejecución completa de esta fase.

Comandos principales de esta revisión:

```bash
pnpm exec jest src/app/api/cloudinary/delete/route.test.ts src/app/api/cloudinary/upload-authorization/route.test.ts src/lib/cloudinary/temporaryUploadAuthorization.test.ts src/lib/cloudinary/isCloudinaryAssetReferenced.test.ts src/lib/cloudinary/uploadAuthorizedMedia.test.ts src/lib/cloudinary/administrativeCleanupAuthorization.test.ts src/lib/business/__tests__/profileEditorAuthorization.audit.test.ts src/actions/perfil/actualizarPerfil.test.ts src/lib/business/profileEditor.test.ts src/lib/business/profileLocation.test.ts src/lib/openai/generateProductImage.test.ts --runInBand --coverage --json --outputFile=test-results/playwright/cloudinary-security/final-integration-jest.json --collectCoverageFrom='src/app/api/cloudinary/delete/route.ts' --collectCoverageFrom='src/app/api/cloudinary/upload-authorization/route.ts' --collectCoverageFrom='src/lib/cloudinary/{temporaryUploadAuthorization,cloudinaryRequestAuthorization,cloudinaryDeletionReference,isCloudinaryAssetReferenced,uploadAuthorizedMedia}.ts'
pnpm typecheck
pnpm lint
pnpm exec next lint --file e2e/profile-editor/profile-editor.spec.ts --file src/app/api/cloudinary/delete/route.test.ts
git diff --check
# En /tmp/myckeo-integration-clean-deps, con manifiestos y fuentes copiados, sin .env:
pnpm install --offline --frozen-lockfile --ignore-scripts
PROFILE_TEST_BROWSER=/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome pnpm exec playwright test --config=e2e/profile-editor/playwright.config.ts --grep=uploader
```

Se conservaron logs y JSON únicamente en ubicaciones locales ignoradas o `/tmp`. No se hicieron llamadas de borrado o subida real, pruebas de ataque sobre terceros ni lecturas/escrituras de registros del negocio en esta fase.

## Requisitos y límites para producción

El enlace local `.vercel/project.json` apunta a **`myckeo-red-social-staging`**. La revisión consultó por separado el proyecto **`red-social`** mediante el conector Vercel, sin cambiar el enlace local. Los metadatos confirman ámbito `production` para `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `AUTH_SECRET`, `DATABASE_URL` y `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. No se descifraron ni exportaron valores; su corrección y la longitud del secreto no se certifican a partir de metadatos.

- El secreto de autorizaciones debe ser `CLOUDINARY_UPLOAD_AUTH_SECRET` de al menos 32 caracteres o, si falta, `AUTH_SECRET` de al menos 32 caracteres. El proyecto tiene el nombre `AUTH_SECRET`; no tiene un override `CLOUDINARY_UPLOAD_AUTH_SECRET`. Tener únicamente `NEXTAUTH_SECRET` no satisface este helper, aunque la autenticación y el comprobador general de entorno lo admitan. Un secreto insuficiente rechaza subidas/limpieza con 503, sin ampliar permisos.
- Las tres credenciales explícitas de Cloudinary deben corresponder a la misma cuenta y habilitar subidas firmadas, lectura Admin API de contexto y borrado por asset ID. No basta con `CLOUDINARY_URL` por sí sola. El nuevo uploader no requiere el preset unsigned; otros consumidores externos a este uploader pueden conservar su configuración previa.
- Maps JavaScript API y Geocoding API deben estar habilitadas para la clave pública restringida al dominio de producción. La validación local real ya aprobada se conserva; no se volvieron a consultar Google ni sus permisos/facturación.
- Subidas, almacenamiento y Admin API mantienen cuotas y condiciones del plan Cloudinary. No se modificó facturación ni se habilitaron APIs externas. La política puede conservar archivos huérfanos, cuyo almacenamiento sigue consumiendo recursos.
- Las dos rutas nuevas/modificadas usan runtime Node.js; requieren desplegar conjuntamente helpers, autorización de subida y uploader. Un despliegue parcial del cliente sin su endpoint produce fallos de subida.

Limitaciones deliberadas, **no bloqueos de autorización**: archivos antiguos sin procedencia verificable, pruebas vencidas y archivos aún asociados a datos guardados no se eliminan remotamente mediante esta ruta. Las referencias ambiguas o el límite de 10.000 filas por modelo detienen la limpieza. La consulta de referencias y el proveedor no son una transacción distribuida. La limpieza permanente y el inventario de legacy quedan para un trabajo separado, sin conceder permisos universales.

No se verificaron subidas/borrados positivos reales con el nuevo contrato, los valores secretos de Production ni sus cuotas. Los permisos y valores de producción deben cumplir los requisitos indicados al autorizar el despliegue; no se detectó evidencia de una configuración ausente por nombre. El borrado real se evitó conforme a la restricción del encargo. El incidente original de geolocalización continúa sin causa raíz reproducida, ya documentado; no se reabrió.

**Decisión: READY para integrar el manifiesto y preparar el despliegue autorizado.** No se encontraron defectos productivos nuevos ni vías de borrado no autenticadas. La corrección mínima del arnés y la nueva regresión no alteran funcionalidades o política. La aprobación futura debe señalar el destino de producción correcto; esta revisión no ejecuta esa aprobación ni un despliegue.

## Recomprobación del mismo paquete

Ante la reiteración de la revisión final, se confirmó de nuevo rama, HEAD, índice vacío y manifiesto de 33 archivos. Los 14 archivos productivos continúan idénticos al build aprobado; el escaneo de secretos del paquete y `git diff --check` no presentan hallazgos. Se repitieron únicamente las mismas 11 suites Jest con `--runInBand --coverage=false` (**212 PASS**), `pnpm typecheck` y `pnpm lint` (código 0, misma advertencia preexistente). Logs locales: `/tmp/myckeo-integration-recheck-{jest,typecheck,lint}.log`. Se conserva la evidencia previa de Chromium, instalación limpia, Maps, persistencia y metadatos Vercel; esas comprobaciones no se ejecutaron de nuevo. No se modificaron código productivo, pruebas, política ni configuración. Se mantiene la recomendación READY con los requisitos y límites anteriores.
