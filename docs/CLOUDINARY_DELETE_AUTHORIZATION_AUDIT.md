# Autorización de eliminación de Cloudinary

Fecha: 2026-11-14. Estado: **`CLOUDINARY_DELETE_AUTHORIZATION_READY` para revisión del cambio**. El defecto de autorización del endpoint está corregido y cubierto por pruebas aisladas y rechazos HTTP reales. No se certifica un borrado real del proveedor: se evitó deliberadamente por la restricción del encargo. Sin commits, migraciones ni despliegues.

## Causa raíz y alcance

`POST /api/cloudinary/delete` aceptaba `publicId`, `resourceType` o URL y llamaba a `deleteCloudinaryAssets`, que usa `uploader.destroy` con credenciales administrativas. No llamaba a `auth` ni verificaba asociación o permisos del archivo. Un identificador arbitrario alcanzaba el borrado simulado desde una solicitud anónima. El reproductor histórico no eliminó archivos reales.

La ruta solo exporta POST. Antes del cambio se localizaron todos sus consumidores: el único consumidor HTTP es `AutoUploadMedia`. Se utiliza en:

| Área | Consumidores |
| --- | --- |
| Perfil y portada | `src/ui/components/dashboard/perfil/CompletePerfil.tsx` |
| Productos | `CreateNewProduct.tsx`, `CreateOrUpdateProduct.tsx` |
| Publicaciones | `Form_Carrusel_Imagenes.tsx`, `TestimonioCrearEditar.tsx`, `TestimonioProductoCrearEditar.tsx` |
| Reseñas y servicios | `FormCrearResenaProducto.tsx`, `CrearServicio.tsx` |
| Administración | `AdminBusinessProfileForm.tsx`, `AssistedProductCreationClient.tsx` |
| Ejemplo de formulario | `src/ui/components/autoUpload/UsoenForm.tsx` |

No se encontraron otros endpoints HTTP de borrado de Cloudinary. Hay tres usos internos de `deleteCloudinaryAssets`, conservados: `purgeTestBusinessAction` (sesión `super_admin`, preview y negocio test archivado antes de la purga), rollback de `generateAdminProductImageAction` (sesión `super_admin`, identificador devuelto por su propia subida del servidor) y `scripts/test-cloudinary-generated-upload.ts` (CLI). No se ejecutaron esas operaciones sobre datos reales. Las guardas de ambas Server Actions tienen pruebas nuevas de rechazo antes de acceder al payload, consultas, escrituras, generación o limpieza.

## Política implementada

No se infiere propiedad de un nombre de carpeta, URL, `userId` recibido ni de que una fila guarde una URL: esas referencias son editables. Tampoco se concede un bypass por ser `admin` o `super_admin` en la ruta genérica.

1. `getCloudinaryActor` obtiene la identidad de `auth.config.ts` y comprueba en Prisma que la cuenta aún existe y está activa. Una petición cross-site se rechaza.
2. El cuerpo es estricto: `publicId`, `resourceType`, `url`, `deleteAuthorization`. Campos de propietario, JSON malformado, tipos inválidos y referencias ambiguas se rechazan. La URL debe pertenecer a la cuenta Cloudinary configurada, con tipo y versión compatibles.
3. Los temporales nuevos reciben una autorización HMAC del servidor ligada a la identidad autenticada, UUID generado en el servidor, tipo y vencimiento de una hora. El nuevo `POST /api/cloudinary/upload-authorization` firma `public_id`, `overwrite=false`, timestamp y contexto; no acepta un destino o propietario del cliente. El contexto lleva la misma prueba firmada. El cliente usa una subida firmada, sin depender del preset unsigned anterior.
4. Se verifica esa prueba contra la sesión. No se emiten pruebas para identificadores antiguos escogidos por el cliente.
5. Las referencias persistidas **vetan** el borrado; nunca conceden propiedad. Se consultan `Usuario.fotoPerfil`, `Negocio.fotoPerfil/fotoPortada/imagenes`, `Image.url`, `ProductVariant.imagenUrl`, `Media.url`, `Resena.multimedia` y `ProductImageGeneration.cloudinaryUrl/cloudinaryPublicId`. Si existe una referencia, respuesta 409 `ASSET_IN_USE`. Errores de consulta, referencias Cloudinary ambiguas de la misma cuenta o límite de exploración producen rechazo 503.
6. Se consulta Cloudinary Admin API para comprobar `public_id`, tipo de recurso, tipo de entrega `upload`, contexto firmado, versión cuando se aporta URL y `asset_id`. Una prueba válida sin contexto correspondiente en el recurso tampoco autoriza el borrado.
7. Solo después se llama a `api.delete_resources_by_asset_ids` con el identificador inmutable verificado. Se evita borrar una sustitución que reutilice el mismo `public_id` entre consulta y eliminación. `uploader.destroy` ya no se utiliza en esta ruta.
8. Solo se comunica éxito ante confirmación válida del proveedor. Un 404 de consulta es idempotente (`deleted:0`, `alreadyMissing:1`) y no ejecuta borrado. Otros errores responden 503, sin mensajes privados del proveedor. Se registra únicamente etapa, clasificación y código HTTP.

La prueba real no destructiva reveló que el SDK devuelve el 404 como `{error:{http_code:404}}`; el endpoint ahora admite ese formato y el error directo, con regresión determinista para ambos. El 503 observado inicialmente se conserva como evidencia histórica y quedó superado por `lookup-diagnostic.json`.

El SDK y las APIs existentes permiten esta solución sin dependencias ni cambios del esquema. Documentación utilizada: [subidas firmadas](https://cloudinary.com/documentation/client_side_uploading), [parámetros de subida y overwrite](https://cloudinary.com/documentation/upload_parameters), [Upload API](https://cloudinary.com/documentation/image_upload_api_reference) y [Admin API: consulta y borrado por asset ID](https://cloudinary.com/documentation/admin_api).

## Integridad y compatibilidad

El único componente funcional modificado por esta corrección es el uploader compartido. Era necesario transportar la prueba de creación y dejar de borrar el archivo anterior antes de completar su reemplazo. No se cambió el diseño ni los componentes del editor, mapa o contratos de persistencia en este encargo; sus modificaciones previas se conservaron.

- La imagen anterior y su referencia siguen disponibles si falla la autorización o subida de la nueva. Un reemplazo exitoso cambia el borrador, sin destruir el asset anterior antes de guardar.
- El perfil conserva `deleteRemoteOnRemove=false`. Quitar una imagen antigua sin prueba solamente modifica el borrador; no llama al endpoint. No se borra un archivo guardado como consecuencia de una edición pendiente.
- Para un temporal nuevo, la eliminación explícita presenta la prueba. Un 403/503 conserva imagen y referencia, y muestra error. Un 409 de archivo ya persistido permite retirarlo del borrador sin eliminar el remoto.
- Se impiden subidas duplicadas del mismo archivo mientras está en curso. No se eliminan automáticamente los temporales reemplazados o abandonados.
- Productos, publicaciones, reseñas, servicios y formularios administrativos reciben la misma protección a través del uploader. Sus Server Actions y persistencia no cambian. Los flujos administrativos internos conservan sus permisos explícitos.

## Matriz de validación

| Escenario | Resultado observado | Evidencia y tipo | Estado |
| --- | --- | --- | --- |
| Sin sesión o sesión inválida/cuenta inactiva | 401; payload no leído cuando no hay sesión; cero borrados y escrituras | Unitarias; anónimo HTTP local 401 | PASS |
| Sesión válida sin propiedad/prueba, incluso con rol administrativo | 403; cero borrados y escrituras | Unitarias y HTTP local con sesión legítima de Aura | PASS |
| Payload malformado, propietario inyectado, identificador arbitrario, URL/cuenta/tipo/versión manipulados | 400/403; cero borrados y escrituras | Unitarias; inyección de propietario HTTP local 400 | PASS |
| Prueba ajena, manipulada o vencida | 403; cero borrados y escrituras | Unitarias | PASS |
| Archivo todavía referenciado | 409 antes de consultar/eliminar en proveedor | Unitarias de ruta y siete modelos de referencias | PASS |
| Error de identidad, referencias, exploración o proveedor | Rechazo sin éxito falso; cero borrados si falla una comprobación previa | Unitarias | PASS |
| Propietario autorizado de temporal no referenciado | Se verifica contexto y se elimina exclusivamente el asset ID comprobado; no hay escrituras Prisma | Unitarias con Cloudinary simulado, roles negocio/admin/super_admin | PASS simulado |
| ID inexistente correctamente reservado | HTTP real 200, `deleted:0`, `alreadyMissing:1`; consulta real al proveedor, sin subida ni borrado | `lookup-diagnostic.json` | PASS real no destructivo |
| Error/confirmación parcial de eliminación | 503, `success:false`; ningún éxito falso | Unitarias con Cloudinary simulado | PASS simulado |
| Guardas de vías administrativas internas | Sin sesión, negocio o admin no alcanzan sus efectos secundarios; requieren super_admin | `administrativeCleanupAuthorization.test.ts` | PASS aislado |
| Reemplazo correcto, fallo de autorización/subida, limpieza fallida, en uso y legacy | Referencias conservadas o desvinculadas solo según política | Chromium, componentes reales y fronteras HTTP simuladas | PASS simulado |
| Persistencia real del editor | Se conserva evidencia previa de coordenadas, imágenes, teléfono, redes y demás campos; no se repite ni modifica Aura | Informe del editor y E9/E10 históricos | PASS real previo |
| Subida y eliminación de un archivo real con el nuevo contrato | No ejecutadas; no se afirma validación real positiva de esos servicios | Restricción de no eliminar archivos reales | No ejecutado |

Artefactos locales: `test-results/playwright/cloudinary-security/jest.json`, `live-http.json` y `lookup-diagnostic.json`. No incluyen credenciales ni ubicaciones privadas. Los scripts de comprobación local se conservan junto a esos artefactos, sin sesión exportada. El perfil de Chromium se cerró después de las comprobaciones.

Comandos ejecutados:

```bash
pnpm exec jest src/app/api/cloudinary/delete/route.test.ts src/app/api/cloudinary/upload-authorization/route.test.ts src/lib/cloudinary/temporaryUploadAuthorization.test.ts src/lib/cloudinary/isCloudinaryAssetReferenced.test.ts src/lib/cloudinary/uploadAuthorizedMedia.test.ts src/lib/cloudinary/administrativeCleanupAuthorization.test.ts src/lib/business/__tests__/profileEditorAuthorization.audit.test.ts src/actions/perfil/actualizarPerfil.test.ts src/lib/business/profileEditor.test.ts src/lib/business/profileLocation.test.ts src/lib/openai/generateProductImage.test.ts --runInBand --coverage --json --outputFile=test-results/playwright/cloudinary-security/jest.json --collectCoverageFrom='src/app/api/cloudinary/delete/route.ts' --collectCoverageFrom='src/app/api/cloudinary/upload-authorization/route.ts' --collectCoverageFrom='src/lib/cloudinary/{temporaryUploadAuthorization,cloudinaryRequestAuthorization,cloudinaryDeletionReference,isCloudinaryAssetReferenced,uploadAuthorizedMedia}.ts'
PROFILE_TEST_BROWSER=/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome pnpm exec playwright test --config=e2e/profile-editor/playwright.config.ts
node /tmp/cloudinary-security-live-check.cjs
node /tmp/cloudinary-security-lookup-diagnostic.cjs
pnpm lint
pnpm typecheck
git diff --check
# En copia aislada /tmp/myckeo-cloudinary-security-build, sin compartir .next:
pnpm build
```

Resultado unitario: **211 pruebas, 11 suites, PASS**. Cobertura del conjunto de seguridad seleccionado: 96,90 % sentencias, 97,30 % funciones, 92,09 % ramas. Chromium: **36 PASS** en la suite completa; sus servicios externos son simulados. La ejecución focalizada final del uploader suma **7 PASS** (incluidos en esos 36). `pnpm build` terminó con código 0 en una copia aislada del árbol actual para no interferir con el servidor local; solo generó Prisma Client y compiló Next, sin migraciones. Lint y TypeScript pasan; permanece una advertencia preexistente de `_body` sin uso en `ActivationBootstrap.test.tsx` y el aviso de deprecación de `next lint`.

## Configuración, casos bloqueados y limpieza posterior

- El servidor necesita las credenciales Cloudinary ya existentes y `CLOUDINARY_UPLOAD_AUTH_SECRET` de al menos 32 caracteres, o el `AUTH_SECRET` existente con esa longitud. La configuración local dispone de ambos requisitos; no se imprimieron sus valores. Las firmas se generan exclusivamente en servidor; el API key público no equivale al API secret.
- Se necesitan permisos de Admin API para consultar contexto y borrar por asset ID, además de las subidas firmadas. La consulta real de un ID inexistente obtuvo el 404 esperado. El borrado positivo solo se verificó con mocks. No se cambiaron permisos externos, presets ni facturación.
- Hay una consulta Admin API y una operación de borrado por limpieza autorizada, sujetas a cuotas y condiciones del plan Cloudinary. Los uploads y assets huérfanos consumen los recursos habituales de la cuenta. No se incorporó ningún servicio nuevo ni se modificó el plan.
- **Bloqueado intencionalmente:** eliminación directa de legacy sin prueba de creador, temporales con prueba vencida y cualquier archivo aún referenciado. El formulario permite sustituir/desvincular los antiguos, pero conserva el archivo remoto. No existe un permiso universal de limpieza para solventarlo.
- La limpieza futura requiere un inventario revisado, procedencia verificable, propietario/permisos explícitos, asset IDs inmutables y comprobación de referencias compartidas. Una URL guardada por sí sola no basta para atribuir propiedad. Los casos sin evidencia permanecen en revisión; no se hizo backfill ni migración automática.
- La exploración de referencias está paginada a 200 filas y limitada a 10.000 por modelo. Ambigüedad, exceso o error bloquean limpieza. A escala requeriría un registro indexado de assets; no se añadió migración. La consulta de referencias y la eliminación externa no constituyen una transacción distribuida: una limpieza permanente de assets publicados debe diseñarse dentro del flujo de dominio posterior al guardado.

**Cierre de seguridad:** ninguna rama de esta ruta alcanza el borrado sin identidad activa y prueba de creación comprobada contra el recurso en el proveedor. Los rechazos de autorización se verifican expresamente con cero llamadas tanto a `uploader.destroy` como al nuevo borrado por asset ID, y cero escrituras Prisma. Los límites funcionales de limpieza quedan cerrados por denegación segura y documentados. El cambio está listo para revisión; el resultado positivo real de subida/borrado y la configuración de producción no se certifican en este encargo.

## Revisión final de integración

La [revisión final del paquete](PROFILE_EDITOR_FINAL_INTEGRATION_REVIEW.md) conserva los resultados anteriores y añade una regresión de reutilización de la autorización: tras un borrado simulado, el reintento de un archivo inexistente no borra nada y una sustitución con otro contexto se rechaza. La prueba sigue siendo acotada a una hora, no de un solo uso; cada petición vuelve a validar sujeto, recurso, referencias y contexto. No se cambió la política.

Resultado vigente: **212 PASS en 11 suites**, **7 PASS Chromium del uploader con una instalación limpia**, lint y TypeScript PASS. Se corrigió únicamente la resolución de esbuild en el arnés, sin nueva dependencia o cambios productivos. El build anterior corresponde exactamente a los 14 archivos productivos actuales. Los metadatos Vercel confirman los nombres requeridos en Production, sin descifrar valores; requisitos, exclusiones del commit y límites de despliegue figuran en el informe final. No se repitieron Maps, persistencia autenticada ni operaciones positivas reales de borrado.
