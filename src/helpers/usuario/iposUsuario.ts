// src/helpers/usuario/tiposUsuario.ts
import { z } from "zod";

export const generosValidos = ["masculino", "femenino", "otro"] as const;
export type GeneroValido = typeof generosValidos[number];

export const createUserSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  apellido: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  contraseña: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  genero: z.enum(generosValidos, { message: "Género inválido" }),
  fechaNacimiento: z.coerce.date(), // Acepta string o Date
  ciudadCompleta: z.string().refine(
    (val) => val.includes(" - "),
    "Formato esperado: Ciudad - Departamento"
  ),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;