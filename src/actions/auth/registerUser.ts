"use server";

import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { Genero, Prisma } from "@prisma/client";

export const registerUser = async (
  nombre: string,
  apellido: string,
  email: string,
  contraseña: string,
  genero: string,
  fechaNacimiento: Date,
  ciudadCompleta: string // Ej: "Medellín - Antioquia"
) => {
  try {

    // Validar unicidad de email
    const existingUser = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return {
        ok: false,
        message: "El correo ya está registrado.",
      };
    }


    // Validar género
    if (!["masculino", "femenino", "otro"].includes(genero)) {
      return {
        ok: false,
        message: "Género inválido",
      };
    }

    // Validar fecha de nacimiento
    const hoy = new Date();
    const edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const cumpleEsteAño =
      hoy.getMonth() > fechaNacimiento.getMonth() ||
      (hoy.getMonth() === fechaNacimiento.getMonth() && hoy.getDate() >= fechaNacimiento.getDate());

    const edadReal = cumpleEsteAño ? edad : edad - 1;

    if (fechaNacimiento > hoy) {
      return {
        ok: false,
        message: "La fecha de nacimiento no puede ser en el futuro.",
      };
    }

    if (edadReal < 13) {
      return {
        ok: false,
        message: "Debes tener al menos 13 años para registrarte.",
      };
    }

    // Separar ciudad y departamento
    const partes = ciudadCompleta.split(" - ");
    const ciudad = partes[0]?.trim() ?? "";
    const departamento = partes[1]?.trim() ?? "";

    if (!ciudad || !departamento) {
      return {
        ok: false,
        message: "Ciudad y departamento son requeridos.",
      };
    }


    // Generar username único
    const usernameBase = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
    let username = usernameBase;
    let counter = 1;
    while (await prisma.usuario.findUnique({ where: { username } })) {
      username = `${usernameBase}${counter}`;
      counter++;
    }

    // Validar formato de username
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return {
        ok: false,
        message: "El nombre de usuario generado contiene caracteres no válidos.",
      };
    }

    if (username.length < 3) {
      return {
        ok: false,
        message: "El nombre de usuario debe tener al menos 3 caracteres.",
      };
    }

    const user = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        email: email.toLowerCase(),
        contraseña: bcryptjs.hashSync(contraseña),
        genero: genero as Genero,
        fechaNacimiento,
        ciudad,
        departamento,
        preferencias: [], // Array vacío por defecto
        username, perfilCompleto: true, // Nuevo campo para completar perfil
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        ciudad: true
      },
    });

    return {
      ok: true,
      user,
      message: "Usuario creado",
    };
  } catch (error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      // Prisma no tipa bien meta.target, así que hacemos un cast seguro
      const target = error.meta?.target as string[] | undefined;

      return {
        ok: false,
        message: target?.includes("email")
          ? "El correo ya está registrado."
          : "El nombre de usuario ya está en uso.",
      };
    }
  }

    console.error(error);
    return {
      ok: false,
      message: "No se pudo registrar el usuario",
    };
  }
};
