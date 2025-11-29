// app/api/asistente/route.ts
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ADMIN_KEY = process.env.MYCKEO_ADMIN_KEY!;
if (!ADMIN_KEY) throw new Error('No es correcta o no está definida, la api key de administrador.');

// === TIPOS ===
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

// === NORMALIZADOR DE TELÉFONO INTERNACIONAL ===
function normalizePhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;
  let cleaned = phone.replace(/[^\d+]/g, '').replace(/\+{2,}/g, '+');
  if (!cleaned.startsWith('+') && cleaned.length >= 10) cleaned = '+' + cleaned;
  return /^\+\d{7,15}$/.test(cleaned) ? cleaned : null;
}

// === BÚSQUEDA SEGURA POR TELÉFONO ===
async function getNegocioByTelefono(telefonoRaw: string): Promise<NegocioLite> {
  if (!telefonoRaw) throw new Error('Teléfono requerido');
  const telefono = normalizePhone(telefonoRaw);
  if (!telefono) throw new Error('Formato de teléfono inválido');

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

  if (!negocio) throw new Error('Negocio no encontrado con este número');
  return negocio;
}

// === RUTA PRINCIPAL ===
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, telefono, key, pedidoId, reservaId } = body;

    if (key !== ADMIN_KEY) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // NUEVA ACCIÓN: es-negocio (rápida y ligera)
    if (action === 'es-negocio') {
      if (!telefono) {
        return Response.json({ isBusiness: false, businessName: null });
      }

      const telefonoNorm = normalizePhone(telefono);
      if (!telefonoNorm) {
        return Response.json({ isBusiness: false, businessName: null });
      }

      const negocio = await prisma.negocio.findFirst({
        where: { telefonoContacto: telefonoNorm },
        select: { nombre: true },
      });

      return Response.json({
        isBusiness: !!negocio,
        businessName: negocio?.nombre || null,
      });
    }

    const negocio = await getNegocioByTelefono(telefono);

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

      case 'estadisticas-semana':
        return Response.json(await estadisticasSemana(negocio.id));

      case 'proximas-reservas':
        return Response.json(await proximasReservas(negocio.id));

      case 'detalle-pedido':
        if (!pedidoId) throw new Error('pedidoId requerido');
        return Response.json(await detallePedido(negocio.id, pedidoId));

      case 'detalle-reserva':
        if (!reservaId) throw new Error('reservaId requerido');
        return Response.json(await detalleReserva(negocio.id, reservaId));

      default:
        return Response.json({ error: 'Acción no encontrada' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error en /api/asistente:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
}

// === FUNCIONES CORREGIDAS ===

async function datosPerfil(negocio: NegocioLite) {
  return {
    mensaje: `¡Hola jefe de *${negocio.nombre}*! 👋\n\nTus datos:\n\n📍 ${negocio.direccion || 'Sin dirección'}\n🌎 ${negocio.ciudad}\n🌐 ${negocio.sitioWeb || 'Sin web'}\n🗺️ ${negocio.urlGoogleMaps || 'Sin mapa'}\n\nTu perfil: https://myckeo.com/perfil/${negocio.slug}\nQR: https://myckeo.com/dashboard/qr`,
    datos: negocio,
  };
}

async function resumenDia(negocioId: string) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const mañana = new Date(hoy); mañana.setDate(mañana.getDate() + 1);

  const [reservas, pedidos, ingresos] = await Promise.all([
    prisma.reservation.count({
      where: { negocioId, fechaHoraInicio: { gte: hoy, lt: mañana } },
    }),
    prisma.order.count({
      where: { negocioId, createdAt: { gte: hoy, lt: mañana } }, // ← CORREGIDO
    }),
    prisma.order.aggregate({
      where: { negocioId, createdAt: { gte: hoy, lt: mañana } }, // ← CORREGIDO
      _sum: { totalAmount: true },
    }),
  ]);

  const ingresosHoy = Number(ingresos._sum.totalAmount ?? 0);

  return {
    mensaje: `¡Buen día! ☀️\n\nResumen de hoy:\n\n${
      reservas > 0 ? `✅ ${reservas} reservas` : '✅ Sin reservas'
    }\n${
      pedidos > 0 ? `🛍️ ${pedidos} pedidos` : '🛍️ Sin pedidos'
    }\n${
      ingresosHoy > 0 ? `💰 Ingresos: $${ingresosHoy.toLocaleString()}` : '💰 Ingresos: $0'
    }\n\n¿En qué te ayudo hoy?`,
    datos: { reservas, pedidos, ingresos: ingresosHoy },
  };
}

async function reservasHoy(negocioId: string) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const mañana = new Date(hoy); mañana.setDate(mañana.getDate() + 1);

  const reservas = await prisma.reservation.findMany({
    where: { negocioId, fechaHoraInicio: { gte: hoy, lt: mañana } },
    orderBy: { fechaHoraInicio: 'asc' },
    select: { id: true, nombre: true, telefono: true, fechaHoraInicio: true, notas: true, estado: true },
  });

  if (reservas.length === 0) {
    return { mensaje: 'Hoy no tienes reservas programadas 😊\n¡Día tranquilo!', reservas: [] };
  }

  const lista = reservas
    .map(r => `• ${format(r.fechaHoraInicio, 'hh:mm a', { locale: es })} - ${r.nombre} (${r.telefono})${r.notas ? ` | ${r.notas}` : ''}`)
    .join('\n');

  return {
    mensaje: `Tus reservas de hoy 📅\n\n${lista}\n\n¿Quieres detalles de alguna?`,
    reservas,
  };
}

async function pedidosHoy(negocioId: string) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const mañana = new Date(hoy); mañana.setDate(mañana.getDate() + 1);

  const pedidos = await prisma.order.findMany({
    where: { negocioId, createdAt: { gte: hoy, lt: mañana } }, // ← CORREGIDO
    include: { items: { include: { product: { select: { nombre: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  if (pedidos.length === 0) {
    return { mensaje: 'Hoy no tienes pedidos nuevos 🛍️\n¡Todo listo!', pedidos: [] };
  }

  const lista = pedidos
    .map(p => `• #${p.id.slice(-6)} | $${p.totalAmount.toLocaleString()} | ${p.items.map(i => `${i.quantity}x ${i.product?.nombre || i.description}`).join(', ')}`)
    .join('\n');

  return {
    mensaje: `Pedidos de hoy 🛒\n\n${lista}\n\n¿Quieres ver detalles de alguno?`,
    pedidos,
  };
}

async function detallePedido(negocioId: string, pedidoId: string) {
  const pedido = await prisma.order.findFirst({
    where: { id: pedidoId, negocioId },
    include: {
      items: { include: { product: true } },
      datosDeEntrega: true,
    },
  });

  if (!pedido) throw new Error('Pedido no encontrado');

  const items = pedido.items.map(i => `${i.quantity}x ${i.product?.nombre || i.description}`).join('\n');
  const entrega = pedido.datosDeEntrega
    ? `${pedido.datosDeEntrega.clientName} | ${pedido.datosDeEntrega.clientPhone}\n${pedido.datosDeEntrega.deliveryAddress || 'Recoge en local'}`
    : 'Sin datos de entrega';

  return {
    mensaje: `Detalle del pedido #${pedido.id.slice(-6)}\n\n🛍️ Productos:\n${items}\n\n💰 Total: $${pedido.totalAmount.toLocaleString()}\n\n📦 Entrega:\n${entrega}\n\nEstado: ${pedido.status}`,
    pedido,
  };
}

async function detalleReserva(negocioId: string, reservaId: string) {
  const reserva = await prisma.reservation.findFirst({
    where: { id: reservaId, negocioId },
  });

  if (!reserva) throw new Error('Reserva no encontrada');

  return {
    mensaje: `Reserva de ${reserva.nombre}\n\n📅 ${format(reserva.fechaHoraInicio, "EEEE d 'de' MMMM, hh:mm a", { locale: es })}\n📞 ${reserva.telefono}\n📝 ${reserva.notas || 'Sin notas'}\n\nEstado: ${reserva.estado}`,
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
    mensaje: `Estadísticas de esta semana 📊\n\n• ${pedidos} pedidos\n• Ingresos: $${ingresosSemana.toLocaleString()}\n\n¡Vas excelente! 🚀`,
    datos: { pedidos, ingresos: ingresosSemana },
  };
}

async function proximasReservas(negocioId: string) {
  const hoy = new Date();

  const reservas = await prisma.reservation.findMany({
    where: { negocioId, fechaHoraInicio: { gte: hoy } },
    orderBy: { fechaHoraInicio: 'asc' },
    take: 10,
    select: { id: true, nombre: true, telefono: true, fechaHoraInicio: true, notas: true },
  });

  if (reservas.length === 0) {
    return { mensaje: 'No tienes reservas próximas 😊', reservas: [] };
  }

  const lista = reservas
    .map(r => `• ${format(r.fechaHoraInicio, "EEE d MMM, hh:mm a", { locale: es })} - ${r.nombre}`)
    .join('\n');

  return {
    mensaje: `Próximas reservas 📅\n\n${lista}\n\n¿Quieres detalles de alguna?`,
    reservas,
  };
}