"use server"

// app/actions/changeUserRole.ts
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function changeUserRole(userId: string, newRole: "admin" | "user") {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    // Revalida el caché para la página actual
    revalidatePath("/dashboard/users");

    return { success: true, message: `Rol cambiado a ${newRole}` };
  } catch (error) {
    console.error("Error cambiando el rol del usuario:", error);
    return { success: false, message: "Ocurrió un error al cambiar el rol" };
  }
}
