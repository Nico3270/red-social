// actions/updateUserProfile.ts
"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { updateUserSchema } from "@/lib/validators/updateUserSchema";
import { revalidatePath } from "next/cache";
import { Genero } from "@prisma/client";

type FormDataObject = {
  [key: string]: string | File;
};

export const updateUserProfile = async (
  userId: string,
  formData: FormData | FormDataObject
) => {
  try {
    const session = await auth();
    const authenticatedUserId = session?.user?.id;

    if (!authenticatedUserId) {
      return {
        ok: false,
        message: "No autorizado",
      };
    }

    if (userId && userId !== authenticatedUserId) {
      return {
        ok: false,
        message: "No autorizado",
      };
    }

    // Convertir FormData a objeto plano
    const rawData: FormDataObject = formData instanceof FormData
      ? Object.fromEntries(
          Array.from(formData.entries()).map(([key, value]) => [
            key,
            typeof value === "string" ? value : "",
          ])
        )
      : formData;

    // Validar con Zod
    const parsed = updateUserSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return {
        ok: false,
        message: firstError.message || "Datos inválidos",
      };
    }

    const {
      nombre,
      apellido,
      email,
      username,
      ciudadCompleta,
      genero,
      fechaNacimiento,
      nuevaContraseña,
    } = parsed.data;

    // Separar ciudad y departamento
    const [ciudad = "", departamento = ""] = ciudadCompleta
      .split(" - ")
      .map((s) => s.trim());

    // Validar unicidad de email
    const existingEmail = await prisma.usuario.findUnique({
      where: { email },
    });
    if (existingEmail && existingEmail.id !== authenticatedUserId) {
      return {
        ok: false,
        message: "Este correo ya está registrado por otro usuario",
      };
    }

    // Validar unicidad de username
    const existingUsername = await prisma.usuario.findUnique({
      where: { username },
    });
    if (existingUsername && existingUsername.id !== authenticatedUserId) {
      return {
        ok: false,
        message: "Este nombre de usuario ya está en uso",
      };
    }

    // Preparar datos para Prisma
    const updateData: {
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  ciudad: string;
  departamento: string;
  genero: Genero;
  fechaNacimiento: Date;
  perfilCompleto: boolean;
  isPlaceholder: boolean;
  contraseña?: string;
} = {
  nombre,
  apellido,
  email,
  username,
  ciudad,
  departamento,
  genero: genero as Genero,
  fechaNacimiento,
  perfilCompleto: true,
  isPlaceholder: false,
};

    // Encriptar contraseña si se ingresó
    if (nuevaContraseña && nuevaContraseña.trim() !== "") {
      updateData.contraseña = await bcryptjs.hash(nuevaContraseña, 10);
    }

    // Actualizar usuario
    await prisma.usuario.update({
      where: { id: authenticatedUserId },
      data: updateData,
    });

    // Revalidar rutas
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/editar-usuario");
    revalidatePath(`/perfil/${username}`);

    return {
      ok: true,
      message: "¡Perfil actualizado con éxito!",
    };

  } catch (error) {
    console.error("Error en updateUserProfile:", error);
    return {
      ok: false,
      message: "Error interno del servidor. Inténtalo más tarde.",
    };
  }
};