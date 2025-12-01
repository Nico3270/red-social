// app/api/asistente/route.ts

import prisma from '@/lib/prisma';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY!;
if (!ADMIN_KEY) throw new Error('No es correcta o no está definida la api key de administrador.');

/* ============================================================
   TIPOS
============================================================ */

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

/* ============================================================
   NORMALIZADOR TELEFÓNICO ROBUSTO
============================================================ */

function normalizePhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;

  let cleaned = phone.replace(/[^\d+]/g, '').replace(/ +/g, '');

  if (!cleaned.startsWith('+') && cleaned.length >= 10) {
    cleaned = '+' + cleaned;
  }

  return /^\+\d{7,15}$/.test(cleaned) ? cleaned : null;
}

/* ============================================================
   OBTENER NEGOCIO POR TELÉFONO (SEGURO)
============================================================ */

async function getNegocioByTelefono(telefonoRaw: string): Promise<NegocioLite | null> {
  if (!telefonoRaw) return null;

  const telefono = normalizePhone(telefonoRaw);
  if (!telefono) return null;

  const negocio = await prisma.negocio.findFirst({
    where: { telefonoContacto: telefono },
    select: {
      id: true,
      nombre: true,
      slug: true,
      fotoPerfil: true,
      fotoPortada: true,
      ciudad: true,
      direccion: true,
      sitioWeb: true,
      urlGoogleMaps: true,
    },
  });

  return negocio || null;
}

/* ============================================================
   ENDPOINT PRINCIPAL
============================================================ */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, telefono, key, pedidoId, reservaId } = body;

    if (key !== ADMIN_KEY) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    /* — es-negocio — */
    if (action === 'es-negocio') {
      const negocio = await getNegocioByTelefono(telefono);

      return Response.json({
        isBusiness: !!negocio,
        businessName: negocio?.nombre || null,
      });
    }

    /* — Validar negocio para cualquier acción — */
    const negocio = await getNegocioByTelefono(telefono);

    if (!negocio) {
      return Response.json(
        { error: "Negocio no encontrado", isBusiness: false, datos: null },
        { status: 404 }
      );
    }

    /* — Switch de acciones — */
    switch (action) {
      case 'nombre':
        return Response.json({ nombre: negocio.nombre });

      case 'datos-perfil':
        return Response.json(await datosPerfil(negocio));

      case 'resumen-dia':
        return Response.json(await resumenDia(negocio.id));

      case 'reservas-hoy':
        return Response.json(await reservasHoy(negocio.id));

      case 'pedidos-hoy':
        return Response.json(await pedidosHoy(negocio.id));

      case 'proximos-pedidos':
        return Response.json(await proximosPedidos(negocio.id));

      case 'pedidos-manana':
        return Response.json(await pedidosManana(negocio.id));

      case 'estadisticas-semana':
        return Response.json(await estadisticasSemana(negocio.id));

      case 'proximas-reservas':
      case 'reservas-proximas':
        return Response.json(await reservasProximas(negocio.id));

      case 'reservas-manana':
        return Response.json(await reservasManana(negocio.id));

      case 'detalle-pedido':
        if (!pedidoId) throw new Error('pedidoId requerido');
        return Response.json(await detallePedido(negocio.id, pedidoId));

      case 'detalle-reserva':
        if (!reservaId) throw new Error('reservaId requerido');
        return Response.json(await detalleReserva(negocio.id, reservaId));

      default:
        return Response.json({ error: 'Acción no encontrada' }, { status: 404 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    console.error('Error en /api/asistente:', message);

    return Response.json({ error: message }, { status: 400 });
  }
}

/* ============================================================
   FUNCIONES DE DATOS
============================================================ */

async function datosPerfil(negocio: NegocioLite) {
  return {
    mensaje:
      `¡Hola jefe de *${negocio.nombre}*! 👋\n\nTus datos:\n\n` +
      `📍 ${negocio.direccion || 'Sin dirección'}\n` +
      `🌎 ${negocio.ciudad}\n` +
      `🌐 ${negocio.sitioWeb || 'Sin web'}\n` +
      `🗺️ ${negocio.urlGoogleMaps || 'Sin mapa'}\n\n` +
      `Tu perfil: https://myckeo.com/perfil/${negocio.slug}\n` +
      `QR: https://myckeo.com/dashboard/qr`,
    datos: negocio,
  };
}

async function resumenDia(negocioId: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

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

  const ingresosHoy = Number(ingresos._sum.totalAmount ?? 0);

  return {
    mensaje:
      `Resumen de hoy ☀️\n\n` +
      `${reservas ? `📅 ${reservas} reservas` : '📅 Sin reservas'}\n` +
      `${pedidos ? `🛒 ${pedidos} pedidos` : '🛒 Sin pedidos'}\n` +
      `💰 Ingresos: $${ingresosHoy.toLocaleString()}`,
    datos: { reservas, pedidos, ingresos: ingresosHoy },
  };
}

async function reservasHoy(negocioId: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const reservas = await prisma.reservation.findMany({
    where: { negocioId, fechaHoraInicio: { gte: hoy, lt: manana } },
    orderBy: { fechaHoraInicio: "asc" },
    take: 20,
  });

  if (!reservas.length)
    return { mensaje: "Hoy no tienes reservas programadas 😊", reservas: [] };

  const lista = reservas
    .map((r) => `• ${format(r.fechaHoraInicio, "hh:mm a", { locale: es })} - ${r.nombre}`)
    .join("\n");

  return {
    mensaje: `Reservas de hoy 📅\n\n${lista}\n\n¿Quieres ver detalles de alguna?`,
    reservas,
  };
}

async function reservasManana(negocioId: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const pasado = new Date(manana);
  pasado.setDate(pasado.getDate() + 1);

  const reservas = await prisma.reservation.findMany({
    where: { negocioId, fechaHoraInicio: { gte: manana, lt: pasado } },
    orderBy: { fechaHoraInicio: "asc" },
    take: 20,
  });

  if (!reservas.length)
    return { mensaje: "Mañana no tienes reservas 😊", reservas: [] };

  const lista = reservas
    .map((r) => `• ${format(r.fechaHoraInicio, "hh:mm a", { locale: es })} - ${r.nombre}`)
    .join("\n");

  return {
    mensaje: `Reservas para mañana 📅\n\n${lista}\n\n¿Quieres detalles de alguna?`,
    reservas,
  };
}

async function reservasProximas(negocioId: string) {
  const hoy = new Date();

  const reservas = await prisma.reservation.findMany({
    where: { negocioId, fechaHoraInicio: { gte: hoy } },
    orderBy: { fechaHoraInicio: "asc" },
    take: 25,
  });

  if (!reservas.length)
    return { mensaje: "No tienes reservas próximas 😊", reservas: [] };

  const lista = reservas
    .map((r) => `• ${format(r.fechaHoraInicio, "EEE d MMM, hh:mm a", { locale: es })} - ${r.nombre}`)
    .join("\n");

  return {
    mensaje: `Próximas reservas 📅\n\n${lista}`,
    reservas,
  };
}

async function pedidosHoy(negocioId: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const pedidos = await prisma.order.findMany({
    where: { negocioId, createdAt: { gte: hoy, lt: manana } },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (!pedidos.length)
    return { mensaje: "Hoy no tienes pedidos 🛒", pedidos: [] };

  const lista = pedidos
    .map((p) => `• #${p.id.slice(-6)} | $${p.totalAmount.toLocaleString()}`)
    .join("\n");

  return {
    mensaje: `Pedidos de hoy 🛒\n\n${lista}\n\n¿Quieres ver detalles de alguno?`,
    pedidos,
  };
}

/* ============================================================
   FIX TYPE: Antes items:any[] → Ahora items:PedidoItem[]
============================================================ */

async function pedidoItemList(items: PedidoItem[]): Promise<string> {
  return items
    .map(i => `${i.quantity}x ${i.product?.nombre || i.description}`)
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

  const items = await pedidoItemList(
    pedido.items.map(i => ({
      quantity: i.quantity,
      description: i.description,
      product: i.product ? { nombre: i.product.nombre } : null,
    }))
  );

  return {
    mensaje:
      `Pedido #${pedido.id.slice(-6)}\n\n` +
      `🛍️ Productos:\n${items}\n\n` +
      `💰 Total: $${pedido.totalAmount.toLocaleString()}\n\n` +
      `📦 Cliente:\n${pedido.datosDeEntrega?.clientName || 'N/D'} | ${pedido.datosDeEntrega?.clientPhone || ''}\n` +
      `${pedido.datosDeEntrega?.deliveryAddress || 'Recoge en local'}\n\n` +
      `Estado: ${pedido.status}`,
    pedido,
  };
}

async function proximosPedidos(negocioId: string) {
  const hoy = new Date();

  const pedidos = await prisma.order.findMany({
    where: { negocioId, createdAt: { gte: hoy } },
    include: { items: true },
    orderBy: { createdAt: "asc" },
    take: 25,
  });

  if (!pedidos.length)
    return { mensaje: "No tienes pedidos próximos 😊", pedidos: [] };

  const lista = pedidos
    .map(p => `• ${format(p.createdAt, "EEE d MMM, hh:mm a", { locale: es })} | #${p.id.slice(-6)} | $${p.totalAmount.toLocaleString()}`)
    .join("\n");

  return {
    mensaje: `Próximos pedidos 🛒\n\n${lista}`,
    pedidos,
  };
}

async function pedidosManana(negocioId: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const pasado = new Date(manana);
  pasado.setDate(pasado.getDate() + 1);

  const pedidos = await prisma.order.findMany({
    where: { negocioId, createdAt: { gte: manana, lt: pasado } },
    include: { items: true },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  if (!pedidos.length)
    return { mensaje: "Mañana no tienes pedidos 🛒", pedidos: [] };

  const lista = pedidos
    .map((p) => `• #${p.id.slice(-6)} | $${p.totalAmount.toLocaleString()}`)
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
      `📅 ${format(reserva.fechaHoraInicio, "EEEE d 'de' MMMM, hh:mm a", { locale: es })}\n` +
      `📞 ${reserva.telefono}\n` +
      `📝 ${reserva.notas || "Sin notas"}\n\n` +
      `Estado: ${reserva.estado}`,
    reserva,
  };
}

async function estadisticasSemana(negocioId: string) {
  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  inicioSemana.setHours(0, 0, 0, 0);

  const [pedidos, ingresos] = await Promise.all([
    prisma.order.count({ where: { negocioId, createdAt: { gte: inicioSemana } } }),
    prisma.order.aggregate({
      where: { negocioId, createdAt: { gte: inicioSemana } },
      _sum: { totalAmount: true },
    }),
  ]);

  const ingresosSemana = Number(ingresos._sum.totalAmount ?? 0);

  return {
    mensaje:
      `Estadísticas de esta semana 📊\n\n` +
      `• ${pedidos} pedidos\n` +
      `• Ingresos: $${ingresosSemana.toLocaleString()}\n`,
    datos: { pedidos, ingresos: ingresosSemana },
  };
}
