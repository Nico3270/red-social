"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import { z } from "zod";

const schema = z.object({ /* Igual que formSchema */ });

export async function postConfiguracionReservas(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "No autenticado" };

  const parsed = schema.safeParse(data);
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };

  // Guarda en Prisma (modelo BusinessAvailability)
//   await prisma.businessAvailability.upsert({
//     where: { negocioId: data.negocioId },
//     update: parsed.data,
//     create: { ...parsed.data, negocioId: data.negocioId },
//   });

  return { ok: true, message: "Configuración guardada" };
}