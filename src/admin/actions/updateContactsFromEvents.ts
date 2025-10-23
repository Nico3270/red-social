import { BrevoEvent, getBrevoEvents, } from "@/lib/getEvents";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface UpdateResult {
  total: number;
  updated: number;
}

export async function updateContactsFromEvents(
  startDate: string,
  endDate?: string
): Promise<UpdateResult> {
  // Validar fechas
  if (!startDate || isNaN(Date.parse(startDate))) {
    throw new Error("Fecha inicial inválida");
  }
  if (endDate && isNaN(Date.parse(endDate))) {
    throw new Error("Fecha final inválida");
  }
  if (endDate && new Date(endDate) < new Date(startDate)) {
    throw new Error("La fecha final no puede ser anterior a la fecha inicial");
  }

  const { ok, events, error } = await getBrevoEvents(startDate, endDate);
  if (!ok || !events) {
    throw new Error(error || "Error al obtener eventos de Brevo");
  }

  let updated = 0;
  const batchSize = 100; // Tamaño del lote para procesamiento concurrente

  // Filtrar eventos para evitar duplicados (basado en brevoMessageId)
  const uniqueEvents: BrevoEvent[] = [];
  for (const ev of events) {
    const existing = await prisma.contactos.findFirst({
      where: {
        brevoMessageId: ev.id,
      },
    });
    if (!existing) {
      uniqueEvents.push(ev);
    }
  }

  // Procesar eventos en lotes
  for (let i = 0; i < uniqueEvents.length; i += batchSize) {
    const batch = uniqueEvents.slice(i, i + batchSize);
    const updates = batch.map(async (ev) => {
      try {
        const contacto = await prisma.contactos.findUnique({
          where: { correo: ev.email },
        });
        if (!contacto) return;

        const data: Prisma.ContactosUpdateInput = {
          emailEstado: ev.event,
          brevoMessageId: ev.id,
          ultimoEventoBrevo: new Date(ev.date),
        };

        switch (ev.event) {
          case "delivered":
            data.entregadoEn = new Date(ev.date);
            break;
          case "opened":
            data.abiertoEn = new Date(ev.date);
            break;
          case "click":
            data.clicEn = new Date(ev.date);
            break;
          case "bounce":
            data.reboteRazon = ev.reason ?? null;
            break;
        }

        await prisma.contactos.update({
          where: { id: contacto.id },
          data,
        });
        updated++;
      } catch (err) {
        console.error(`Error actualizando contacto con email ${ev.email}:`, err);
      }
    });

    await Promise.all(updates);
  }

  // Optimización con updateMany para grandes volúmenes (opcional)
  if (uniqueEvents.length > 1000) { // Umbral para usar updateMany
    const eventGroups = uniqueEvents.reduce((acc, ev) => {
      if (!acc[ev.email]) acc[ev.email] = [];
      acc[ev.email].push(ev);
      return acc;
    }, {} as Record<string, BrevoEvent[]>);

    for (const email of Object.keys(eventGroups)) {
      const latestEvent = eventGroups[email].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]; // Tomar el evento más reciente por email

      try {
        const data: Prisma.ContactosUpdateInput = {
          emailEstado: latestEvent.event,
          brevoMessageId: latestEvent.id,
          ultimoEventoBrevo: new Date(latestEvent.date),
        };

        switch (latestEvent.event) {
          case "delivered":
            data.entregadoEn = new Date(latestEvent.date);
            break;
          case "opened":
            data.abiertoEn = new Date(latestEvent.date);
            break;
          case "click":
            data.clicEn = new Date(latestEvent.date);
            break;
          case "bounce":
            data.reboteRazon = latestEvent.reason ?? null;
            break;
        }

        const result = await prisma.contactos.updateMany({
          where: { correo: email },
          data,
        });
        updated += result.count;
      } catch (err) {
        console.error(`Error actualizando contacto con email ${email} usando updateMany:`, err);
      }
    }
  }

  return { total: events.length, updated };
}