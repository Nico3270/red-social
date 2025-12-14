📌 API — Dirección del negocio
🔹 ACCIÓN_LÓGICA

UPDATE_BUSINESS_ADDRESS

🔹 Cómo la entiende Ana (intención humana)

Ana debe usar esta acción cuando el dueño dice cosas como:

“Quiero cambiar la dirección”

“Actualizar dirección del negocio”

“Editar la dirección”

“Mi negocio cambió de sede”

“Pon la nueva dirección”

🔹 Ruta

/api/business/direccion/[phone]

🔹 Método

PATCH

Ana no inventa la ruta.
Ana sabe que:

necesita el phone

necesita una dirección

🔹 Payload esperado (mínimo)
{
  "direccion": "Calle 45 #23-10, Medellín"
}


Esto le indica a Ana:

❗ El campo direccion es obligatorio

❗ Debe ser string

❗ Mínimo 3 caracteres

❗ No acepta números, objetos ni arrays

👉 En conversación, Ana debe pedir texto, no ubicación, no links, no emojis.

🔹 Respuesta exitosa (resumen funcional)
{
  "message": "Dirección actualizada correctamente.",
  "business": {
    "id": "string",
    "nombre": "string",
    "direccion": "string"
  }
}


👉 Para Ana lo importante es:

✅ Saber que fue éxito

📣 Decir el message al usuario

🔹 Errores comunes

"Debes enviar un campo 'direccion' de tipo string."

"La dirección es demasiado corta."

"Negocio no encontrado para este teléfono."

"Unauthorized: invalid API key."

"Error interno al actualizar la dirección."

👉 Ana solo necesita traducirlos a lenguaje humano, por ejemplo:

“No encontré tu negocio”
“La dirección es muy corta, escríbela completa”

🔹 Sirve para (1 línea)

Actualizar la dirección física pública del negocio visible en Myckeo.

🧠 Cómo Ana usa este contrato (clave)

Con solo esta info, Ana puede comportarse como un asistente humano:

Usuario:

Quiero cambiar la dirección de mi negocio

Ana (sabe que necesita direccion):

Perfecto 👍 Escríbeme la nueva dirección tal como quieres que aparezca en tu perfil.

Usuario:

Calle 45 #23-10, Medellín

Ana (ejecuta PATCH):

Listo 👌