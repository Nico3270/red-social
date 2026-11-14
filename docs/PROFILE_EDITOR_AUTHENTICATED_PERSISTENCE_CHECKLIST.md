# Validación autenticada de Aura Studio Beauty

Estado actual: `PROFILE_EDITOR_REAL_INTEGRATION_VALIDATION_READY` para revisión del código.

Actualización de cierre: los dos ciclos autenticados se verificaron contra PostgreSQL y la descripción temporal se restauró. No hace falta ejecutar esta guía de nuevo. El bloqueo posterior de autorización de imágenes quedó corregido; véase [auditoría de Cloudinary](CLOUDINARY_DELETE_AUTHORIZATION_AUDIT.md) y el resultado vigente en `PROFILE_EDITOR_REAL_INTEGRATION_VALIDATION.md`. No se eliminaron archivos reales durante la validación de seguridad.

Esta guía completa únicamente la persistencia autenticada. Las pruebas satisfactorias de Google Maps y Geocoding no deben repetirse. No pide contraseñas, tokens, cookies ni exportaciones de sesiones.

## Identificar la cuenta y el entorno antes de guardar

1. Usa la ventana de Chromium abierta para esta validación. Si no la ves, puedes realizar el recorrido en tu navegador habitual y entregar los resultados de la tabla final.
2. Abre `http://localhost:3000/dashboard/editar-perfil` e inicia sesión tú mismo con la cuenta propietaria de **Aura Studio Beauty**. No es suficiente que exista cualquier sesión.
3. Confirma que el nombre del formulario sea Aura Studio Beauty y anota su slug. **No cambies el nombre de otro negocio para hacerlo coincidir.**
4. Confirma que la base Neon configurada para la app local sea el entorno donde creaste ese negocio ficticio. La app está en localhost, pero su base es remota. No ejecutes esta prueba contra un registro real ni cambies `.env` sin identificar primero el destino correcto.
5. Detente si la cuenta muestra otro negocio, si Aura no existe en ese entorno o si el propietario no coincide. No crees otra cuenta/negocio para sortear este control.

Se puede comprobar la identidad visible de la sesión con este fragmento **de solo lectura** en DevTools → Console, estando en la página local:

```js
(async () => {
  if (location.origin !== "http://localhost:3000") {
    throw new Error("Detenerse: este no es el origen local previsto");
  }
  const response = await fetch("/api/auth/session", {
    credentials: "same-origin", cache: "no-store",
  });
  const session = await response.json();
  return {
    origen: location.origin,
    autenticado: Boolean(session?.user?.id),
    negocioDeLaSesion:
      session?.user?.managedBusinessName ?? session?.user?.negocioNombre ?? null,
    negocioDelFormulario:
      document.querySelector('[name="nombreNegocio"]')?.value ?? null,
    slug: document.querySelector('[name="slugNegocio"]')?.value ?? null,
  };
})();
```

Comparte solo ese resumen, nunca el objeto completo de sesión. Una vez que coincidan la sesión, el formulario y el entorno, indica: **«Sesión de Aura abierta en la ventana de pruebas; negocio y entorno autorizados»**. Eso permite continuar las comprobaciones automatizadas sin transferir tu autenticación.

## Recorrido manual si no se puede compartir la ventana

No pulses «Usar mi ubicación»: basta con ajustar el marcador para el negocio ficticio. No reemplaces ni elimines imágenes durante este recorrido.

1. Antes de editar, anota localmente los valores actuales: nombre, slug, descripción, ciudad, departamento, dirección, teléfono, sitio web, enlace Maps, redes sociales, categorías y secciones seleccionadas. Comprueba las imágenes de perfil y portada. No hace falta compartir los valores privados: después bastará indicar si se conservaron.
2. En el mapa, selecciona el punto exacto destinado al negocio ficticio mediante clic o arrastre. Si había coordenadas, confirma que elegiste deliberadamente el nuevo punto. No guardes el centro aproximado de una ciudad como dirección precisa.
3. Lee el par seleccionado con el fragmento siguiente y guárdalo en tus notas como **P1**. No invierte latitud y longitud ni modifica el formulario.
4. Pulsa **Guardar cambios** una vez. Espera la respuesta del servidor. Un error o un modal que sigue cargando no cuenta como guardado exitoso. Anota si hubo confirmación y el destino de la redirección.
5. Vuelve explícitamente a `/dashboard/editar-perfil` y recarga completamente la página. Lee el par como **P2**. Debe coincidir numéricamente con P1 y el marcador debe aparecer en el mismo lugar.
6. Comprueba que teléfono, redes, imágenes y demás campos coincidan con tus notas. El enlace Google Maps puede cambiar para reflejar las coordenadas recién seleccionadas; esa diferencia está prevista.
7. Modifica únicamente la **descripción**, conservando el texto anterior y añadiendo ` [prueba de persistencia]`. No toques mapa, nombre/slug, teléfono, redes ni imágenes.
8. Guarda de nuevo, espera la confirmación, vuelve al editor y recarga completamente. Lee el par como **P3**: debe cumplir **P1 = P2 = P3**. La descripción debe contener el cambio deliberado; los demás campos deben conservarse.
9. Si deseas retirar la etiqueta de prueba, restaura solo la descripción original del negocio ficticio y comprueba de nuevo que la ubicación se conserva. No borres el negocio ni sus imágenes.

Fragmento de lectura de coordenadas, ejecutado dentro del editor:

```js
(() => {
  const read = (name) => {
    const value = document.querySelector(`[name="${name}"]`)?.value;
    return value == null || value === "" ? null : Number(value);
  };
  return {
    latitud: read("latitudNegocio"),
    longitud: read("longitudNegocio"),
  };
})();
```

No uses valores escritos a mano para sustituir la lectura. Si los campos aparecen vacíos o no son números finitos, detente y anota el resultado. Puedes compartir únicamente `P1=P2=P3: sí/no`, sin revelar las coordenadas.

## Rechazo de operaciones sobre negocios ajenos

El editor utiliza la Server Action `actualizarPerfilNegocio`, no un endpoint REST genérico. Una respuesta HTTP 200 de una Server Action puede contener `ok: false`: hay que verificar el resultado y su mensaje.

La implementación comprueba sesión, coincidencia del usuario solicitado y `negocio.usuarioId` antes de abrir la transacción de escritura. Las pruebas anteriores con Prisma simulado cubren el rechazo de usuario ajeno y de `idNegocio` perteneciente a otro dueño. **Esa evidencia es simulada; no sustituye una prueba HTTP autenticada.**

No intentes editar un negocio real ajeno, no reutilices una API Key administrativa y no compartas HAR, cookies o peticiones copiadas como cURL. La comprobación real negativa se hará cuando esté disponible la sesión correcta, con controles que no puedan escribir un registro ajeno. Hasta ejecutarla y registrar el rechazo, esa fila sigue BLOCKED.

## Resultados que puedes proporcionar

| Dato o escenario | Resultado para completar |
| --- | --- |
| Origen usado | `http://localhost:3000` u otro, indicando cuál |
| Nombre del negocio y slug | Aura Studio Beauty / … |
| Negocio de sesión y de formulario coinciden | Sí / No |
| Entorno/base autorizados para ese negocio ficticio | Sí / No / No sé |
| Primera operación de guardado | Confirmación / Error; mensaje visible |
| P1 = P2 después de recargar | Sí / No |
| Segunda operación de guardado | Confirmación / Error; mensaje visible |
| P1 = P2 = P3 | Sí / No |
| Descripción conserva el cambio deliberado | Sí / No |
| Teléfono y redes conservados | Sí / No; nombres de campos con diferencias |
| Imágenes de perfil y portada conservadas | Sí / No |
| Nombre, slug, ciudad, departamento, dirección, sitio web, categorías y secciones conservados | Sí / No; nombres de campos con diferencias |
| Resultado del control real de autorización | Pendiente / Rechazado con `ok:false`; lo registrará la comprobación controlada |

Los resultados comunicados por ti se clasificarán como **prueba manual reportada**, con las capturas que decidas adjuntar ocultando datos privados. Solo se clasificará como prueba automatizada real lo que ejecute y observe el navegador de pruebas con la sesión legítima. No se cerrará el estado BLOCKED con una confirmación de guardado sin recarga ni con pruebas simuladas.
