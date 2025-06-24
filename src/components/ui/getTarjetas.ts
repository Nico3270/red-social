"use server"

import prisma from "@/lib/prisma";

// Obtener todas las tarjetas con optimización
export async function getTarjetas() {
    try {
      const tarjetas = await prisma.tarjeta.findMany({
        select: {
          id: true,
          titulo: true,
          descripcion: true,
          imagen: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc", // Ordenamos por fecha de actualización en lugar de creación
        },
      });
  
      // console.log(`✅ Se obtuvieron ${tarjetas.length} tarjetas desde la base de datos.`);
      return tarjetas;
    } catch (error) {
      console.error("❌ Error al obtener tarjetas desde la base de datos:", error);
      throw new Error("No se pudieron obtener las tarjetas. Intenta nuevamente.");
    }
  }
  