// lib/validators/updateUserSchema.ts
import { z } from "zod";

const usernameRegex = /^[a-zA-Z0-9_]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

export const updateUserSchema = z
  .object({
    nombre: z.string().min(2).max(50).regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),
    apellido: z.string().min(2).max(50).regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),
    email: z.string().email(),
    username: z.string().min(3).max(30).regex(usernameRegex).transform(v => v.toLowerCase()),
    ciudadCompleta: z.string().min(1).refine(v => v.includes(" - ")),
    genero: z.enum(["masculino", "femenino", "otro"]),
    fechaNacimiento: z.date({
      required_error: "La fecha de nacimiento es obligatoria",
      invalid_type_error: "Fecha inválida",
    }).optional(), // ← AQUÍ EL CAMBIO
    nuevaContraseña: z.string().optional(),
    confirmarContraseña: z.string().optional(),
  })
  .refine(data => !data.nuevaContraseña || passwordRegex.test(data.nuevaContraseña), {
    message: "Mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número",
    path: ["nuevaContraseña"],
  })
  .refine(data => data.nuevaContraseña === data.confirmarContraseña, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarContraseña"],
  })
  .refine(data => {
    if (!data.fechaNacimiento) return false;
    const hoy = new Date();
    const nacimiento = data.fechaNacimiento;
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad >= 13;
  }, {
    message: "Debes tener al menos 13 años",
    path: ["fechaNacimiento"],
  })
  .refine(data => !!data.fechaNacimiento, {
    message: "La fecha de nacimiento es obligatoria",
    path: ["fechaNacimiento"],
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;