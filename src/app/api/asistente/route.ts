// app/api/asistente/route.ts

import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { format, startOfDay, addDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY;
if (!ADMIN_KEY) {
  throw new Error("No es correcta o no está definida la api key de administrador.");
}

/* ============================================================
   TIPOS / CONSTANTES
============================================================ */

const ALLOWED_ACTIONS = [
  "es-negocio",
  "nombre",
  "datos-perfil",
  "resumen-dia",
  "reservas-hoy",
  "reservas-manana",
  "reservas-proximas",
  "proximas-reservas",
  "pedidos-hoy",
  "pedidos-manana",
  "proximos-pedidos",
  "estadisticas-semana",
  "detalle-pedido",
  "detalle-reserva",
] as const;

type AsistenteAction = (typeof ALLOWED_ACTIONS)[number];

type NegocioLite = {
  id: string;
  nombre: string;
  slug: string;
  fotoPerfil: string | null;
  fotoPortada: string | null;
  ciudad: string;
  direccion: string | null;
  sitioWeb: string | null;
  urlGoogleMaps: string | null;
};

type PedidoItem = {
  quantity: number;
  description: string | null;
  product: { nombre: string | null } | null;
};

type AsistenteRequestBody = {
  action: AsistenteAction;
  telefono: string;
  key: string;
  pedidoId?: string;
  reservaId?: string;
};

/* ============================================================
   HELPERS: VALIDACIÓN / JSON / TELÉFONO
============================================================ */

type JsonRecord = Record<string, unknown>;

function isObject(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAsistenteAction(value: unknown): value is AsistenteAction {
  return (
    typeof value === "string" &&
    (ALLOWED_ACTIONS as readonly string[]).includes(value)
  );
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Normaliza a E.164 mínimo:
 * - Deja solo dígitos
 * - Si son 10 dígitos, asume Colombia (+57)
 * - Prefija +
 */
function normalizePhone(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  const digitsOnly = raw.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";

  const normalizedDigits =
    digitsOnly.length === 10 ? `57${digitsOnly}` : digitsOnly;

  return `+${normalizedDigits}`;
}

/* ============================================================
   MONEY (Decimal-safe)
============================================================ */

function moneyToNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  if (value && typeof value === "object") {
    const v = value as { toNumber?: () => number; toString?: () => string };

    if (typeof v.toNumber === "function") {
      const n = v.toNumber();
      return Number.isFinite(n) ? n : 0;
    }

    if (typeof v.toString === "function") {
      const n = Number(v.toString());
      return Number.isFinite(n) ? n : 0;
    }
  }

  return 0;
}

function formatMoney(value: unknown): string {
  return moneyToNumber(value).toLocaleString("es-CO");
}

/* ============================================================
   NEGOCIO POR TELÉFONO (ROBUSTO + FALLBACK)
============================================================ */

async function getNegocioByTelefono(
  telefonoRaw: string
): Promise<NegocioLite | null> {
  const telefono = normalizePhone(telefonoRaw);
  if (!telefono) return null;

  const digits = telefono.replace("+", "");
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

  const select = {
    id: true,
    nombre: true,
    slug: true,
    fotoPerfil: true,
    fotoPortada: true,
    ciudad: true,
    direccion: true,
    sitioWeb: true,
    urlGoogleMaps: true,
  } satisfies Prisma.NegocioSelect;

  // 1) Exacto (mejor)
  const exact = await prisma.negocio.findFirst({
    where: { telefonoContacto: telefono },
    select,
  });

  if (exact) return exact;

  // 2) Fallback por "contains" (útil si guardaste sin + o con separadores)
  const fallback = await prisma.negocio.findFirst({
    where: {
      telefonoContacto: {
        not: null,
        contains: last10,
      },
    },
    select,
  });

  return fallback ?? null;
}

/* ============================================================
   ENDPOINT PRINCIPAL
============================================================ */

export async function POST(request: Request) {
  try {
    const rawBody: unknown = await request.json();

    if (!isObject(rawBody)) {
      return Response.json({ error: "Body inválido", mensaje: "Body inválido" }, { status: 400 });
    }

    const actionRaw = rawBody.action;

    // Soportar key por body o por header (compatibilidad con agentes)
    const headerKey = asNonEmptyString(request.headers.get("x-api-key"));
    const key = asNonEmptyString(rawBody.key) ?? headerKey;

    const telefono = asNonEmptyString(rawBody.telefono);
    const pedidoId = asNonEmptyString(rawBody.pedidoId);
    const reservaId = asNonEmptyString(rawBody.reservaId);

    if (!key || key !== ADMIN_KEY) {
      return Response.json({ error: "Unauthorized", mensaje: "Unauthorized" }, { status: 401 });
    }

    if (!telefono) {
      return Response.json(
        { error: "Falta telefono en el body", mensaje: "Falta telefono en el body" },
        { status: 400 }
      );
    }

    if (!isAsistenteAction(actionRaw)) {
      return Response.json(
        {
          ok: false,
          error: "Acción no encontrada",
          mensaje: "Acción no encontrada",
          allowedActions: ALLOWED_ACTIONS,
        },
        { status: 404 }
      );
    }

    const body: AsistenteRequestBody = {
      action: actionRaw,
      telefono,
      key,
      ...(pedidoId ? { pedidoId } : {}),
      ...(reservaId ? { reservaId } : {}),
    };

    /* === es-negocio === */
    if (body.action === "es-negocio") {
      const negocio = await getNegocioByTelefono(body.telefono);
      return Response.json({
        isBusiness: !!negocio,
        businessName: negocio?.nombre ?? null,
      });
    }

    /* === Validar negocio para cualquier otra acción === */
    const negocio = await getNegocioByTelefono(body.telefono);

    if (!negocio) {
      return Response.json(
        { error: "Negocio no encontrado", mensaje: "Negocio no encontrado", isBusiness: false, businessName: null, datos: null },
        { status: 404 }
      );
    }

    // Meta común: se adjunta en TODAS las respuestas OK para que el agente pueda cachear el nombre real.
    const baseMeta = {
      isBusiness: true,
      businessName: negocio.nombre,
    };

    /* === Acciones === */
    switch (body.action) {
      case "nombre":
        return Response.json({ ...baseMeta, nombre: negocio.nombre });

      case "datos-perfil":
        return Response.json({ ...baseMeta, ...(await datosPerfil(negocio)) });

      case "resumen-dia":
        return Response.json({ ...baseMeta, ...(await resumenDia(negocio.id)) });

      case "reservas-hoy":
        return Response.json({ ...baseMeta, ...(await reservasHoy(negocio.id)) });

      case "reservas-manana":
        return Response.json({ ...baseMeta, ...(await reservasManana(negocio.id)) });

      case "reservas-proximas":
      case "proximas-reservas":
        return Response.json({ ...baseMeta, ...(await reservasProximas(negocio.id)) });

      case "pedidos-hoy":
        return Response.json({ ...baseMeta, ...(await pedidosHoy(negocio.id)) });

      case "pedidos-manana":
        return Response.json({ ...baseMeta, ...(await pedidosManana(negocio.id)) });

      case "proximos-pedidos":
        return Response.json({ ...baseMeta, ...(await proximosPedidos(negocio.id)) });

      case "estadisticas-semana":
        return Response.json({ ...baseMeta, ...(await estadisticasSemana(negocio.id)) });

      case "detalle-pedido":
        if (!body.pedidoId) {
          return Response.json(
            { error: "pedidoId requerido", mensaje: "pedidoId requerido" },
            { status: 400 }
          );
        }
        return Response.json({ ...baseMeta, ...(await detallePedido(negocio.id, body.pedidoId)) });

      case "detalle-reserva":
        if (!body.reservaId) {
          return Response.json(
            { error: "reservaId requerido", mensaje: "reservaId requerido" },
            { status: 400 }
          );
        }
        return Response.json({ ...baseMeta, ...(await detalleReserva(negocio.id, body.reservaId)) });

      default:
        return Response.json(
          {
            ok: false,
            error: "Acción no encontrada",
            mensaje: "Acción no encontrada",
            allowedActions: ALLOWED_ACTIONS,
          },
          { status: 404 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    console.error("Error en /api/asistente:", message);
    return Response.json({ error: message, mensaje: message }, { status: 400 });
  }
}

/* ============================================================
   FUNCIONES DE DATOS
============================================================ */

async function datosPerfil(negocio: NegocioLite) {
  return {
    mensaje:
      `¡Hola jefe de *${negocio.nombre}*! 👋\n\nTus datos:\n\n` +
      `📍 ${negocio.direccion || "Sin dirección"}\n` +
      `🌎 ${negocio.ciudad}\n` +
      `🌐 ${negocio.sitioWeb || "Sin web"}\n` +
      `🗺️ ${negocio.urlGoogleMaps || "Sin mapa"}\n\n` +
      `Tu perfil: https://myckeo.com/perfil/${negocio.slug}\n` +
      `QR: https://myckeo.com/dashboard/qr`,
    datos: negocio,
  };
}

async function resumenDia(negocioId: string) {
  const hoy = startOfDay(new Date());
  const manana = addDays(hoy, 1);

  const [reservas, pedidos, ingresos] = await Promise.all([
    prisma.reservation.count({
      where: { negocioId, fechaHoraInicio: { gte: hoy, lt: manana } },
    }),
    prisma.order.count({
      where: { negocioId, createdAt: { gte: hoy, lt: manana } },
    }),
    prisma.order.aggregate({
      where: { negocioId, createdAt: { gte: hoy, lt: manana } },
      _sum: { totalAmount: true },
    }),
  ]);

  const ingresosHoy = moneyToNumber(ingresos._sum.totalAmount);

  return {
    mensaje:
      `Resumen de hoy ☀️\n\n` +
      `${reservas ? `📅 ${reservas} reservas` : "📅 Sin reservas"}\n` +
      `${pedidos ? `🛒 ${pedidos} pedidos` : "🛒 Sin pedidos"}\n` +
      `💰 Ingresos: $${ingresosHoy.toLocaleString("es-CO")}`,
    datos: { reservas, pedidos, ingresos: ingresosHoy },
  };
}

async function reservasHoy(negocioId: string) {
  const hoy = startOfDay(new Date());
  const manana = addDays(hoy, 1);

  const reservas = await prisma.reservation.findMany({
    where: { negocioId, fechaHoraInicio: { gte: hoy, lt: manana } },
    orderBy: { fechaHoraInicio: "asc" },
    take: 20,
  });

  if (!reservas.length)
    return { mensaje: "Hoy no tienes reservas programadas 😊", reservas: [] };

  const lista = reservas
    .map(
      (r) =>
        `• ${format(r.fechaHoraInicio, "hh:mm a", { locale: es })} - ${r.nombre}`
    )
    .join("\n");

  return {
    mensaje: `Reservas de hoy 📅\n\n${lista}\n\n¿Quieres ver detalles de alguna?`,
    reservas,
  };
}

async function reservasManana(negocioId: string) {
  const hoy = startOfDay(new Date());
  const manana = addDays(hoy, 1);
  const pasado = addDays(manana, 1);

  const reservas = await prisma.reservation.findMany({
    where: { negocioId, fechaHoraInicio: { gte: manana, lt: pasado } },
    orderBy: { fechaHoraInicio: "asc" },
    take: 20,
  });

  if (!reservas.length) return { mensaje: "Mañana no tienes reservas 😊", reservas: [] };

  const lista = reservas
    .map(
      (r) =>
        `• ${format(r.fechaHoraInicio, "hh:mm a", { locale: es })} - ${r.nombre}`
    )
    .join("\n");

  return {
    mensaje: `Reservas para mañana 📅\n\n${lista}\n\n¿Quieres detalles de alguna?`,
    reservas,
  };
}

async function reservasProximas(negocioId: string) {
  const ahora = new Date();

  const reservas = await prisma.reservation.findMany({
    where: { negocioId, fechaHoraInicio: { gte: ahora } },
    orderBy: { fechaHoraInicio: "asc" },
    take: 25,
  });

  if (!reservas.length) return { mensaje: "No tienes reservas próximas 😊", reservas: [] };

  const lista = reservas
    .map(
      (r) =>
        `• ${format(r.fechaHoraInicio, "EEE d MMM, hh:mm a", { locale: es })} - ${r.nombre}`
    )
    .join("\n");

  return {
    mensaje: `Próximas reservas 📅\n\n${lista}`,
    reservas,
  };
}

/* ============================================================
   PEDIDOS (con soporte a Decimal y a deliveryDate)
   - "Hoy": incluye (a) programados para hoy por deliveryDate, y (b) instantáneos por createdAt
   - "Mañana": por deliveryDate (programados)
   - "Próximos": por deliveryDate >= ahora (programados)
============================================================ */

type PedidoListItem = {
  id: string;
  createdAt: Date;
  totalAmount: Prisma.Decimal;
  datosDeEntrega: { deliveryDate: Date | null } | null;
  orderType: "DELIVERY" | "ON_SITE";
};

function pedidoDisplayDate(p: PedidoListItem): Date {
  return p.datosDeEntrega?.deliveryDate ?? p.createdAt;
}

async function pedidosHoy(negocioId: string) {
  const hoy = startOfDay(new Date());
  const manana = addDays(hoy, 1);

  const pedidos = await prisma.order.findMany({
    where: {
      negocioId,
      OR: [
        // (a) Programados para hoy
        { datosDeEntrega: { is: { deliveryDate: { gte: hoy, lt: manana } } } },
        // (b) Sin fecha programada: creados hoy
        {
          createdAt: { gte: hoy, lt: manana },
          OR: [
            { deliveryDataId: null },
            { datosDeEntrega: { is: { deliveryDate: null } } },
          ],
        },
      ],
    },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
      orderType: true,
      datosDeEntrega: { select: { deliveryDate: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (!pedidos.length) return { mensaje: "Hoy no tienes pedidos 🛒", pedidos: [] };

  const lista = pedidos
    .map((p) => {
      const when = pedidoDisplayDate(p);
      return (
        `• ${format(when, "hh:mm a", { locale: es })} | ` +
        `#${p.id.slice(-6)} | $${formatMoney(p.totalAmount)}`
      );
    })
    .join("\n");

  return {
    mensaje: `Pedidos de hoy 🛒\n\n${lista}\n\n¿Quieres ver detalles de alguno?`,
    pedidos,
  };
}

function pedidoItemList(items: PedidoItem[]): string {
  return items
    .map((i) => {
      const name = i.product?.nombre || i.description || "Producto";
      return `${i.quantity}x ${name}`;
    })
    .join("\n");
}

async function detallePedido(negocioId: string, pedidoId: string) {
  const pedido = await prisma.order.findFirst({
    where: { id: pedidoId, negocioId },
    include: {
      items: { include: { product: true } },
      datosDeEntrega: true,
    },
  });

  if (!pedido) throw new Error("Pedido no encontrado");

  const itemsText = pedidoItemList(
    pedido.items.map((i) => ({
      quantity: i.quantity,
      description: i.description ?? null,
      product: i.product ? { nombre: i.product.nombre } : null,
    }))
  );

  const deliveryDate = pedido.datosDeEntrega?.deliveryDate ?? null;

  return {
    mensaje:
      `Pedido #${pedido.id.slice(-6)}\n\n` +
      `🛍️ Productos:\n${itemsText}\n\n` +
      `💰 Total: $${formatMoney(pedido.totalAmount)}\n\n` +
      (deliveryDate
        ? `🗓️ Entrega: ${format(deliveryDate, "EEE d MMM, hh:mm a", { locale: es })}\n`
        : "") +
      `📦 Cliente:\n${pedido.datosDeEntrega?.clientName || "N/D"} | ${
        pedido.datosDeEntrega?.clientPhone || ""
      }\n` +
      `${pedido.datosDeEntrega?.deliveryAddress || "Recoge en local"}\n\n` +
      `Estado: ${pedido.status}`,
    pedido,
  };
}

async function proximosPedidos(negocioId: string) {
  const ahora = new Date();

  const pedidos = await prisma.order.findMany({
    where: {
      negocioId,
      datosDeEntrega: { is: { deliveryDate: { gte: ahora } } },
    },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
      orderType: true,
      datosDeEntrega: { select: { deliveryDate: true } },
    },
    orderBy: [{ datosDeEntrega: { deliveryDate: "asc" } }, { createdAt: "asc" }],
    take: 25,
  });

  if (!pedidos.length) {
    return { mensaje: "No tienes pedidos próximos programados 😊", pedidos: [] };
  }

  const lista = pedidos
    .map((p) => {
      const when = pedidoDisplayDate(p);
      return (
        `• ${format(when, "EEE d MMM, hh:mm a", { locale: es })} | ` +
        `#${p.id.slice(-6)} | $${formatMoney(p.totalAmount)}`
      );
    })
    .join("\n");

  return {
    mensaje: `Próximos pedidos 🛒\n\n${lista}`,
    pedidos,
  };
}

async function pedidosManana(negocioId: string) {
  const hoy = startOfDay(new Date());
  const manana = addDays(hoy, 1);
  const pasado = addDays(manana, 1);

  const pedidos = await prisma.order.findMany({
    where: {
      negocioId,
      datosDeEntrega: { is: { deliveryDate: { gte: manana, lt: pasado } } },
    },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
      orderType: true,
      datosDeEntrega: { select: { deliveryDate: true } },
    },
    orderBy: [{ datosDeEntrega: { deliveryDate: "asc" } }, { createdAt: "asc" }],
    take: 20,
  });

  if (!pedidos.length) return { mensaje: "Mañana no tienes pedidos 🛒", pedidos: [] };

  const lista = pedidos
    .map((p) => {
      const when = pedidoDisplayDate(p);
      return (
        `• ${format(when, "hh:mm a", { locale: es })} | ` +
        `#${p.id.slice(-6)} | $${formatMoney(p.totalAmount)}`
      );
    })
    .join("\n");

  return {
    mensaje: `Pedidos para mañana 🛒\n\n${lista}\n\n¿Quieres ver detalles de alguno?`,
    pedidos,
  };
}

async function detalleReserva(negocioId: string, reservaId: string) {
  const reserva = await prisma.reservation.findFirst({
    where: { id: reservaId, negocioId },
  });

  if (!reserva) throw new Error("Reserva no encontrada");

  return {
    mensaje:
      `Reserva de ${reserva.nombre}\n\n` +
      `📅 ${format(reserva.fechaHoraInicio, "EEEE d 'de' MMMM, hh:mm a", {
        locale: es,
      })}\n` +
      `📞 ${reserva.telefono}\n` +
      `📝 ${reserva.notas || "Sin notas"}\n\n` +
      `Estado: ${reserva.estado}`,
    reserva,
  };
}

async function estadisticasSemana(negocioId: string) {
  const hoy = new Date();
  const inicioSemana = startOfWeek(hoy, { weekStartsOn: 1 });

  const [pedidos, ingresos] = await Promise.all([
    prisma.order.count({
      where: { negocioId, createdAt: { gte: inicioSemana } },
    }),
    prisma.order.aggregate({
      where: { negocioId, createdAt: { gte: inicioSemana } },
      _sum: { totalAmount: true },
    }),
  ]);

  const ingresosSemana = moneyToNumber(ingresos._sum.totalAmount);

  return {
    mensaje:
      `Estadísticas de esta semana 📊\n\n` +
      `• ${pedidos} pedidos\n` +
      `• Ingresos: $${ingresosSemana.toLocaleString("es-CO")}\n`,
    datos: { pedidos, ingresos: ingresosSemana },
  };
}
