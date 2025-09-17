

"use server";

import { getInfoNegocioWhatsapp } from '../actions/getInfoNegocioWhatsapp';
import { PlantillaWhatsApp } from '../interfaces/interfaces.whatsapp';
import { sendWhatsAppMessage } from './sendWhatsAppMessage'; // Importa la genérica


interface NotifyReservaConfirmadaClienteProps {
    to: string; // Teléfono del cliente
    nombre_cliente?: string;
    telefono_cliente?: string; // Opcional, por si se necesita en otras plantillas
    fechaHora?: string; // Formateada, ej. '20-08-2025 15:00'
    fecha_anterior?: string; // Para reprogramaciones
    fecha_nueva?: string; // Para reprogramaciones
    enlace_cancelar?: string;
    descripcion?: string; // Descripción de la reserva, opcional
    template: PlantillaWhatsApp; // Nombre de la plantilla en Meta (ej. 'reserva_confirmada_cliente')
    negocioId: string; // Opcional: si se necesita contexto del negocio
    datos_pedido?: string;
    valor_compra?: string;
    direccion?: string;
    ciudad?: string;
}

export async function notifyReservaConfirmadaCliente({
    to,
    nombre_cliente,
    telefono_cliente,
    fechaHora,
    fecha_anterior,
    fecha_nueva,
    enlace_cancelar,
    template,
    descripcion,
    negocioId,
    datos_pedido,
    valor_compra,
    direccion,
    ciudad
}: NotifyReservaConfirmadaClienteProps) {
    // Validaciones modernas: Asegura que los datos sean válidos para evitar envíos fallidos
    // console.log({negocioId}, "en notifyReservas");
    const negocioInfo = await getInfoNegocioWhatsapp(negocioId);
    if (!negocioInfo) {
        throw new Error("Información del negocio no encontrada para enviar notificaciones");
    }

    const slugNegocio = negocioInfo?.slugNegocio
    const reservas_negocio = `https://myckeo.com/reservas/${slugNegocio}`; 
    const nombre_negocio = negocioInfo?.nombreNegocio || "Negocio Desconocido";
    const enlace_reserva = "https://myckeo.com/dashboard/reservas"



    if (!to.startsWith('+') || !/^\+\d{10,15}$/.test(to)) {
        throw new Error('Número de teléfono inválido: debe ser en formato E.164 (ej. +573182282025)');
    }


    const templateName = template; // Nombre exacto de tu plantilla en Meta
    // const variables = [nombreCliente, nombreNegocio, fechaHora, enlaceCancelar];
    let variables: string[] = [];
    let placeholderNames: string[] = [];
    let languageCode = ""

    switch (template) {
        case PlantillaWhatsApp.CONFIRMACION_RESERVA_CLIENTE:
            if (!nombre_cliente || !fechaHora || !enlace_cancelar) {
                throw new Error("Faltan datos para la plantilla de confirmación de reserva al cliente");
            }
            variables = [nombre_cliente, nombre_negocio, fechaHora, enlace_cancelar, descripcion || ''];
            // console.log({variables});
            placeholderNames = ['nombre_cliente', 'nombre_negocio', 'fecha_hora', 'enlace_cancelar', 'descripcion'];
            languageCode = "es_CO"
            break;

        case PlantillaWhatsApp.CONFIRMAR_NEGOCIO_RESERVA:
            if (!nombre_cliente || !telefono_cliente || !fechaHora) {
                throw new Error("Faltan datos para la plantilla de confirmación de reserva al negocio");
            }
            variables = [nombre_negocio, nombre_cliente, telefono_cliente, fechaHora, enlace_reserva];
            placeholderNames = ['nombre_negocio', 'nombre_cliente', 'telefono_cliente', 'fecha_hora', 'enlace_reserva'];
            languageCode = "es_CO"
            break;

        case PlantillaWhatsApp.RESERVA_CANCELADA_USUARIO:
            if (!nombre_cliente || !fechaHora) {
                throw new Error("Faltan datos para la plantilla de reserva cancelada por el usuario");
            }
            variables = [nombre_cliente, nombre_negocio, fechaHora, reservas_negocio];
            placeholderNames = ['nombre_cliente', 'nombre_negocio', 'fecha_hora', 'reservas_negocio'];
            languageCode = "es"
            break;

        case PlantillaWhatsApp.RESERVA_CANCELADA_NEGOCIO:
            if (!nombre_cliente || !fechaHora || !telefono_cliente) {
                throw new Error("Faltan datos para la plantilla de reserva cancelada por el negocio");
            }
            variables = [nombre_cliente, nombre_negocio, fechaHora, telefono_cliente, enlace_reserva];
            placeholderNames = ['nombre_cliente', 'nombre_negocio', 'fecha_hora', 'telefono_cliente', 'enlace_reserva'];
            languageCode = "es"
            break;

        case PlantillaWhatsApp.RESERVA_REPROGRAMADA_USUARIO:
            if (!nombre_cliente || !fecha_anterior || !fecha_nueva || !enlace_cancelar) {
                throw new Error("Faltan datos para la plantilla de reserva reprogramada por el usuario");
            }
            variables = [nombre_cliente, nombre_negocio, fecha_anterior, fecha_nueva, enlace_cancelar];
            placeholderNames = ['nombre_cliente', 'nombre_negocio', 'fecha_anterior', 'fecha_nueva', 'enlace_cancelar'];
            languageCode = "es"
            break;

        case PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO:
            if (!valor_compra || !datos_pedido || !nombre_cliente || !telefono_cliente || !descripcion || !direccion) {
                throw new Error("Faltan datos para la plantilla de confirmación de pedido al negocio");
            }
            variables = [nombre_negocio, datos_pedido, valor_compra, nombre_cliente, telefono_cliente, direccion, descripcion];
            placeholderNames = ['nombre_negocio', "datos_pedido", "valor_compra", 'nombre_cliente', "telefono_cliente", "direccion", "descripcion"];
            languageCode = "es"
            break;

        case PlantillaWhatsApp.PEDIDO_CREADO_USUARIO_USUARIO:
            if (!valor_compra || !datos_pedido || !nombre_cliente || !direccion || !ciudad) {
                throw new Error("Faltan datos para la plantilla de confirmación de pedido creado por el usuario al usuario");
            }
            variables = [nombre_cliente, nombre_negocio, datos_pedido, valor_compra, direccion, ciudad];
            placeholderNames = ['nombre_cliente', 'nombre_negocio', "datos_pedido", "valor_compra", "direccion", "ciudad"];
            languageCode = "es"
            break;

        case PlantillaWhatsApp.PEDIDO_CREADO_NEGOCIO_USUARIO:
            if (!nombre_cliente || !datos_pedido || !valor_compra || !direccion) {
                throw new Error("Faltan datos para la plantilla de confirmación de pedido creado por el negocio al usuario");
            }
            variables = [nombre_cliente, nombre_negocio, datos_pedido, valor_compra, direccion];
            placeholderNames = ['nombre_cliente', 'nombre_negocio', "datos_pedido", "valor_compra", "direccion"];
            languageCode = "es"
            break;

        case PlantillaWhatsApp.PEDIDO_CANCELADO_NEGOCIO:
            if (!nombre_cliente || !datos_pedido || !valor_compra) {
                throw new Error("Faltan datos para la plantilla de cancelación de pedido creado por el negocio al usuario");
            }
            variables = [nombre_cliente, nombre_negocio, datos_pedido, valor_compra];
            placeholderNames = ['nombre_cliente', 'nombre_negocio', 'datos_pedido', 'valor_compra'];
            languageCode = "es"
            break;

        default:
            throw new Error("Plantilla no reconocida");
    }

    // Llama a la genérica con ttl de 30 min (1800 seg) para notificaciones urgentes
    // console.log(`Enviando notificación WhatsApp a ${to} con plantilla ${templateName}`);
    if (variables.some(v => !v || v.trim() === '')) {
        throw new Error('Una o más variables de plantilla están vacías o inválidas');
    }
    //     console.log('Placeholders esperados en plantilla (orden): {{1}}=nombre_cliente, {{2}}=nombre_negocio, {{3}}=fecha_hora, {{4}}=enlace_cancelar');
    // console.log('Variables enviadas en orden:', variables);
    return await sendWhatsAppMessage({
        to,
        templateName,
        placeholderNames,  // Nuevo: pasa los nombres
        variables,
        ttl: 1800,
        languageCode
    });
}