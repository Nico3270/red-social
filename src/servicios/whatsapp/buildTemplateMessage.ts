// src/services/whatsapp/buildTemplateMessage.ts

import { PlantillaWhatsApp } from "@/reservas/interfaces/interfaces.whatsapp";


/* ============================================================
   INTERFACES — Datos que usan TODAS las plantillas
============================================================ */
export interface TemplateVariables {
  nombre_cliente?: string;
  nombre_negocio?: string;
  fecha_hora?: string;
  fecha_anterior?: string;
  fecha_nueva?: string;
  telefono_cliente?: string;
  enlace_cancelar?: string;
  enlace_reserva?: string;
  reservas_negocio?: string;
  datos_pedido?: string;
  valor_compra?: string;
  direccion?: string;
  ciudad?: string;
  descripcion?: string;
}

/* ============================================================
   UTILIDAD — Reemplazar {{nombre}} por el valor
============================================================ */
function fill(text: string, vars: TemplateVariables) {
  return text.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    return vars[key.trim() as keyof TemplateVariables] ?? "";
  });
}

/* ============================================================
   PLANTILLAS — Cada una devuelve un mensaje bonito
============================================================ */

export function tpl_RESERVA_CANCELADA_USUARIO(vars: TemplateVariables) {
  const t = `
¡Reserva Cancelada!
Hola {{nombre_cliente}},

Lamentamos informarte que tu reserva en el negocio {{nombre_negocio}} para la fecha y hora 📅 {{fecha_hora}}, ha sido cancelada.

No te preocupes, ¡puedes reprogramar o explorar otras opciones fácilmente!  
Si deseas intentarlo de nuevo, ingresa a este enlace: 🔗 {{reservas_negocio}}.

Estamos aquí para ayudarte en lo que necesites. 😊

Saludos, ✌️🖐
`.trim();

  return fill(t, vars);
}

export function tpl_RESERVA_CANCELADA_NEGOCIO(vars: TemplateVariables) {
  const t = `
¡Reserva Cancelada!
Hola {{nombre_negocio}},

Lamentamos informarte que un cliente ha cancelado su reserva en tu negocio.

Aquí los detalles:

Cliente: {{nombre_cliente}}  
Fecha y hora original: 📅 {{fecha_hora}}  
Contacto del cliente: {{telefono_cliente}} (puedes comunicarte si lo necesitas)

La reserva ha sido cancelada de tu agenda.  
Para crear o gestionar reservas, ingresa a este enlace: 🔗 {{enlace_reserva}}.

¡No te desanimes, oportunidades nuevas llegan pronto!  
Estamos aquí para apoyarte en lo que necesites. 😊
`.trim();

  return fill(t, vars);
}

export function tpl_RESERVA_REPROGRAMADA_USUARIO(vars: TemplateVariables) {
  const t = `
Hola {{nombre_cliente}},

¡Tenemos noticias!

✅ Tu reserva en el negocio {{nombre_negocio}} ha sido reprogramada exitosamente.  
Aquí los detalles:

Fecha y hora original: 📅 {{fecha_anterior}}  
Nueva fecha y hora: 📅 {{fecha_nueva}}

Para cancelar, ingresa a este enlace: 🔗 {{enlace_cancelar}}.

¡Esperamos que esta nueva programación te funcione perfectamente!  
Si tienes dudas, estamos aquí para ayudarte. 😊

Saludos ✌️🤚
`.trim();

  return fill(t, vars);
}

export function tpl_CONFIRMAR_NEGOCIO_RESERVA(vars: TemplateVariables) {
  const t = `
¡Nueva Reserva Recibida!
Hola {{nombre_negocio}},

¡Buenas noticias! ✅ Un cliente ha creado una reserva en tu negocio.  
Aquí los detalles:

Cliente: {{nombre_cliente}}  
Contacto: {{telefono_cliente}}  
Fecha y hora: 📅 {{fecha_hora}}

Le hemos enviado un mensaje de confirmación a tu cliente con los datos de la reserva.

Para gestionar o confirmar la reserva, ingresa a este enlace: 🔗 {{enlace_reserva}}.

¡Aprovecha esta oportunidad para brindar una experiencia inolvidable!  
Si necesitas ayuda, estamos aquí. 😊

Saludos ✌️
`.trim();

  return fill(t, vars);
}

export function tpl_CONFIRMACION_RESERVA_CLIENTE(vars: TemplateVariables) {
  const t = `
¡Reserva Confirmada!
Hola {{nombre_cliente}}

¡Excelente elección! ✅

Se ha creado con éxito tu reserva en el negocio {{nombre_negocio}},  
para el día: {{fecha_hora}}. 📅

Estamos seguros de que será una gran experiencia.

Si por algún motivo necesitas cancelarla, puedes hacerlo fácilmente ingresando a este enlace: 🔗 {{enlace_cancelar}}

Notas adicionales: {{descripcion}}

Saludos ✌
`.trim();

  return fill(t, vars);
}

export function tpl_PEDIDO_CREADO_USUARIO_USUARIO(vars: TemplateVariables) {
  const t = `
¡Tu pedido fue registrado con éxito!
Hola {{nombre_cliente}}, gracias por confiar en {{nombre_negocio}}.

Hemos recibido tu pedido y ya estamos trabajando en él.

🛍️ Detalle del pedido: {{datos_pedido}}  
💰 Valor total: {{valor_compra}}

Pronto el negocio se comunicará contigo al número que registraste  
para coordinar la entrega, en la dirección {{direccion}} - {{ciudad}}.

🙏 ¡Gracias por tu compra y por preferirnos!
`.trim();

  return fill(t, vars);
}

export function tpl_PEDIDO_CREADO_NEGOCIO(vars: TemplateVariables) {
  const t = `
Recibiste un nuevo pedido
📢 Hola {{nombre_negocio}}, ¡buenas noticias! 🎉

Acabas de recibir un nuevo pedido en tu tienda.  
Aquí están los datos principales:

🛍️ Pedido: {{datos_pedido}}  
💰 Valor total: {{valor_compra}}

👤 Cliente: {{nombre_cliente}}  
📞 Teléfono: {{telefono_cliente}}  
🏠 Dirección: {{direccion}}

Datos adicionales: {{descripcion}}

👉 Ingresa a tu dashboard para revisar todos los detalles y gestionar la entrega.
`.trim();

  return fill(t, vars);
}

export function tpl_PEDIDO_CREADO_NEGOCIO_USUARIO(vars: TemplateVariables) {
  const t = `
Nuevo pedido creado
Hola {{nombre_cliente}}

Se ha creado con éxito un nuevo pedido en el negocio {{nombre_negocio}}.  
A continuación se muestran los detalles de tu compra:

🛍️ Pedido: {{datos_pedido}}  
💰 Valor total: {{valor_compra}}

Pronto el negocio se comunicará contigo al número que registraste  
para coordinar la entrega, en la dirección {{direccion}}

😉 Gracias por tu compra y por preferirnos
`.trim();

  return fill(t, vars);
}

export function tpl_PEDIDO_CANCELADO_NEGOCIO(vars: TemplateVariables) {
  const t = `
Pedido cancelado
Hola {{nombre_cliente}},

Lamentamos informarte que tu pedido en {{nombre_negocio}} ha sido cancelado.

Aquí los detalles de tu pedido:  
📦 Pedido: {{datos_pedido}}  
💰 Valor total: {{valor_compra}}

El negocio se pondrá en contacto contigo pronto para explicarte los motivos de la cancelación.

Mientras tanto, si lo deseas, puedes crear un nuevo pedido en cualquier momento.

Gracias por tu comprensión. 🙏
`.trim();

  return fill(t, vars);
}

/* ============================================================
   EXPORTADOR — Usa los nombres EXACTOS del enum
============================================================ */
export const TemplateBuilders: Record<
  PlantillaWhatsApp,
  (vars: TemplateVariables) => string
> = {
  [PlantillaWhatsApp.RESERVA_CANCELADA_USUARIO]:
    tpl_RESERVA_CANCELADA_USUARIO,

  [PlantillaWhatsApp.RESERVA_CANCELADA_NEGOCIO]:
    tpl_RESERVA_CANCELADA_NEGOCIO,

  [PlantillaWhatsApp.RESERVA_REPROGRAMADA_USUARIO]:
    tpl_RESERVA_REPROGRAMADA_USUARIO,

  [PlantillaWhatsApp.CONFIRMAR_NEGOCIO_RESERVA]:
    tpl_CONFIRMAR_NEGOCIO_RESERVA,

  [PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE]:
    tpl_CONFIRMACION_RESERVA_CLIENTE,

  [PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO]:
    tpl_PEDIDO_CREADO_USUARIO_USUARIO,

  [PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO]:
    tpl_PEDIDO_CREADO_NEGOCIO,

  [PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO_USUARIO]:
    tpl_PEDIDO_CREADO_NEGOCIO_USUARIO,

  [PlantillaWhatsApp.PEDIDO_CANCELADO_NEGOCIO]:
    tpl_PEDIDO_CANCELADO_NEGOCIO,
};
