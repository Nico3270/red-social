// lib/validators/updateUserSchema.ts
import { z } from "zod";

const usernameRegex = /^[a-zA-Z0-9_]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

const isoDateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
const latinDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

const INVALID_DATE_VALUE = "__INVALID_DATE__";

function buildLocalDate(year: number, month: number, day: number): Date | typeof INVALID_DATE_VALUE {
  const date = new Date(year, month - 1, day);

  const isValidDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isValidDate ? date : INVALID_DATE_VALUE;
}

function parseFechaNacimiento(value: unknown): unknown {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? INVALID_DATE_VALUE : value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (isoDateOnlyRegex.test(trimmedValue)) {
    const [year, month, day] = trimmedValue.split("-").map(Number);
    return buildLocalDate(year, month, day);
  }

  const latinDateMatch = trimmedValue.match(latinDateRegex);

  if (latinDateMatch) {
    const [, dayValue, monthValue, yearValue] = latinDateMatch;
    return buildLocalDate(Number(yearValue), Number(monthValue), Number(dayValue));
  }

  const parsedDate = new Date(trimmedValue);

  return Number.isNaN(parsedDate.getTime()) ? INVALID_DATE_VALUE : parsedDate;
}

function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date();

  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const diferenciaMes = hoy.getMonth() - fechaNacimiento.getMonth();

  if (
    diferenciaMes < 0 ||
    (diferenciaMes === 0 && hoy.getDate() < fechaNacimiento.getDate())
  ) {
    edad--;
  }

  return edad;
}

export const updateUserSchema = z
  .object({
    nombre: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),

    apellido: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),

    email: z.string().email(),

    username: z
      .string()
      .min(3)
      .max(30)
      .regex(usernameRegex)
      .transform((value) => value.toLowerCase()),

    ciudadCompleta: z
      .string()
      .min(1)
      .refine((value) => value.includes(" - ")),

    genero: z.enum(["masculino", "femenino", "otro"]),

    fechaNacimiento: z.preprocess(
      parseFechaNacimiento,
      z.date({
        required_error: "La fecha de nacimiento es obligatoria",
        invalid_type_error: "Fecha inválida",
      })
    ),

    nuevaContraseña: z.string().optional(),
    confirmarContraseña: z.string().optional(),
  })
  .refine((data) => !data.nuevaContraseña || passwordRegex.test(data.nuevaContraseña), {
    message: "Mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número",
    path: ["nuevaContraseña"],
  })
  .refine((data) => data.nuevaContraseña === data.confirmarContraseña, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarContraseña"],
  })
  .refine((data) => calcularEdad(data.fechaNacimiento) >= 13, {
    message: "Debes tener al menos 13 años",
    path: ["fechaNacimiento"],
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;