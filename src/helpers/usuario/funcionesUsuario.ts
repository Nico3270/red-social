// src/helpers/usuario/funcionesUsuario.ts
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";

import { Genero } from "@prisma/client";
import { createUserSchema } from "./iposUsuario";

export const validarEdadMinima = (fechaNacimiento: Date): boolean => {
  const hoy = new Date();
  const edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const cumpleEsteAño =
    hoy.getMonth() > fechaNacimiento.getMonth() ||
    (hoy.getMonth() === fechaNacimiento.getMonth() && hoy.getDate() >= fechaNacimiento.getDate());
  return cumpleEsteAño ? edad >= 13 : edad - 1 >= 13;
};

export const separarCiudadDepartamento = (ciudadCompleta: string) => {
  const [ciudad = "", departamento = ""] = ciudadCompleta.split(" - ").map(p => p.trim());
  return { ciudad, departamento };
};

export const generarUsernameUnico = async (base: string): Promise<string> => {
  const baseLimpio = base.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "user";
  let username = baseLimpio;
  let counter = 1;

  while (await prisma.usuario.findUnique({ where: { username } })) {
    username = `${baseLimpio}${counter}`;
    counter++;
  }

  return username;
};

export const validarYPrepararDatosUsuario = async (input: unknown) => {
  // 1. Validación con Zod
  const parseResult = createUserSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false as const,
      message: parseResult.error.errors[0].message,
    };
  }

  const { nombre, apellido, email, contraseña, genero, fechaNacimiento, ciudadCompleta } = parseResult.data;

  // 2. Email único
  const existeEmail = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existeEmail) {
    return { ok: false as const, message: "El correo ya está registrado." };
  }

  // 3. Edad mínima
  if (!validarEdadMinima(fechaNacimiento)) {
    return { ok: false as const, message: "Debes tener al menos 13 años para registrarte." };
  }

  // 4. Ciudad y departamento
  const { ciudad, departamento } = separarCiudadDepartamento(ciudadCompleta);
  if (!ciudad || !departamento) {
    return { ok: false as const, message: "Ciudad y departamento son requeridos." };
  }

  // 5. Username único
  const username = await generarUsernameUnico(email.split("@")[0]);

  return {
    ok: true as const,
    data: {
      nombre,
      apellido,
      email: email.toLowerCase(),
      contraseñaHash: bcryptjs.hashSync(contraseña),
      username,
      genero: genero as Genero,
      fechaNacimiento,
      ciudad,
      departamento,
    },
  };
};