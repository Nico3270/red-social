// actions/registerUser.ts
"use server";

import prisma from "@/lib/prisma";
import { validarYPrepararDatosUsuario } from "@/helpers/usuario/funcionesUsuario";

export const registerUser = async (
  nombre: string,
  apellido: string,
  email: string,
  contraseña: string,
  genero: string,
  fechaNacimiento: Date,
  ciudadCompleta: string
) => {
  try {
    const resultado = await validarYPrepararDatosUsuario({
      nombre,
      apellido,
      email,
      contraseña,
      genero,
      fechaNacimiento,
      ciudadCompleta,
    });

    if (!resultado.ok) {
      return { ok: false, message: resultado.message };
    }

    const { contraseñaHash, ...datosUsuario } = resultado.data;

    const user = await prisma.usuario.create({
      data: {
        ...datosUsuario,
        contraseña: contraseñaHash,
        preferencias: [],
        perfilCompleto: true,
        isPlaceholder: false,
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        ciudad: true,
        username: true,
      },
    });

    return {
      ok: true,
      user,
      message: "Usuario creado exitosamente",
    };
  } catch (error) {
    console.error("Error en registerUser:", error);
    return {
      ok: false,
      message: "Error interno del servidor",
    };
  }
};