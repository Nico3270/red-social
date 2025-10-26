"use server";

import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";

export const resetPasswordAction = async (token: string, newPassword: string) => {
  try {
    // Validar token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return {
        ok: false,
        message: "El enlace ha expirado o ya fue usado. Solicita uno nuevo.",
      };
    }

    // Validar longitud de contraseña (similar a tu ejemplo)
    if (newPassword.length < 8) {
      return {
        ok: false,
        message: "La contraseña debe tener al menos 8 caracteres.",
      };
    }

    // Hash de la nueva contraseña
    const hashedPassword = bcryptjs.hashSync(newPassword);

    // Actualizar usuario
    await prisma.usuario.update({
      where: { id: resetToken.userId },
      data: { contraseña: hashedPassword },
    });

    // Marcar token como usado
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    return {
      ok: true,
      message: "Contraseña actualizada exitosamente.",
    };
  } catch (error) {
    console.error("Error en resetPasswordAction:", error);
    return {
      ok: false,
      message: "No se pudo actualizar la contraseña. Intenta de nuevo.",
    };
  }
};