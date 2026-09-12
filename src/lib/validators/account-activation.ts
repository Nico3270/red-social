import { Buffer } from "node:buffer";

import { z } from "zod";

const PERSON_NAME_PATTERN = /^[A-Za-záéíóúÁÉÍÓÚñÑ ]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const NO_CONTROL_CHARACTERS_PATTERN = /^[^\u0000-\u001F\u007F]*$/;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const PASSWORD_ALLOWED_CHARACTERS_PATTERN = /^[A-Za-z0-9@$!%*?&]+$/;
const CITY_SEPARATOR = " - ";
const MINIMUM_AGE = 13;
const BCRYPT_PASSWORD_MAX_BYTES = 72;

function personNameSchema(fieldName: "nombre" | "apellido") {
  const label = fieldName === "nombre" ? "nombre" : "apellido";

  return z
    .string({
      required_error: `El ${label} es obligatorio`,
      invalid_type_error: `El ${label} debe ser texto`,
    })
    .regex(NO_CONTROL_CHARACTERS_PATTERN, `El ${label} contiene caracteres inválidos`)
    .trim()
    .min(2, `El ${label} debe tener al menos 2 caracteres`)
    .max(50, `El ${label} debe tener máximo 50 caracteres`)
    .regex(
      PERSON_NAME_PATTERN,
      `El ${label} sólo puede contener letras y espacios`,
    );
}

function normalizeCity(value: string): string | null {
  const parts = value.split(CITY_SEPARATOR);

  if (parts.length !== 2) {
    return null;
  }

  const [city, department] = parts.map((part) => part.trim());

  if (!city || !department) {
    return null;
  }

  return `${city}${CITY_SEPARATOR}${department}`;
}

function buildLocalCalendarDate(value: string): Date | null {
  const match = DATE_ONLY_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);

  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function calculateAge(birthDate: Date, now: Date): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDifference = now.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && now.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

const fechaNacimientoSchema = z
  .string({
    required_error: "La fecha de nacimiento es obligatoria",
    invalid_type_error: "La fecha de nacimiento debe usar YYYY-MM-DD",
  })
  .regex(DATE_ONLY_PATTERN, "La fecha debe usar el formato YYYY-MM-DD")
  .transform((value, context): Date => {
    const date = buildLocalCalendarDate(value);

    if (date === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha de nacimiento no es una fecha válida",
      });
      return z.NEVER;
    }

    return date;
  });

const accountActivationFieldsSchema = z
  .object({
    nombre: personNameSchema("nombre"),
    apellido: personNameSchema("apellido"),
    email: z
      .string({
        required_error: "El email es obligatorio",
        invalid_type_error: "El email debe ser texto",
      })
      .regex(
        NO_CONTROL_CHARACTERS_PATTERN,
        "El email contiene caracteres inválidos",
      )
      .trim()
      .min(1, "El email es obligatorio")
      .max(254, "El email debe tener máximo 254 caracteres")
      .email("El email no es válido")
      .transform((value) => value.toLowerCase()),
    username: z
      .string({
        required_error: "El username es obligatorio",
        invalid_type_error: "El username debe ser texto",
      })
      .regex(
        NO_CONTROL_CHARACTERS_PATTERN,
        "El username contiene caracteres inválidos",
      )
      .trim()
      .min(3, "El username debe tener al menos 3 caracteres")
      .max(30, "El username debe tener máximo 30 caracteres")
      .regex(
        USERNAME_PATTERN,
        "El username sólo puede contener letras, números y guion bajo",
      )
      .transform((value) => value.toLowerCase()),
    ciudadCompleta: z
      .string({
        required_error: "La ciudad es obligatoria",
        invalid_type_error: "La ciudad debe ser texto",
      })
      .regex(
        NO_CONTROL_CHARACTERS_PATTERN,
        "La ciudad contiene caracteres inválidos",
      )
      .trim()
      .min(1, "La ciudad es obligatoria")
      .max(200, "La ciudad debe tener máximo 200 caracteres")
      .transform((value, context): string => {
        const normalized = normalizeCity(value);

        if (normalized === null) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La ciudad debe usar el formato Ciudad - Departamento",
          });
          return z.NEVER;
        }

        return normalized;
      }),
    genero: z.enum(["masculino", "femenino", "otro"], {
      required_error: "El género es obligatorio",
      invalid_type_error: "El género no es válido",
    }),
    fechaNacimiento: fechaNacimientoSchema,
    password: z
      .string({
        required_error: "La contraseña es obligatoria",
        invalid_type_error: "La contraseña debe ser texto",
      })
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[a-z]/, "La contraseña debe incluir una minúscula")
      .regex(/[A-Z]/, "La contraseña debe incluir una mayúscula")
      .regex(/[0-9]/, "La contraseña debe incluir un número")
      .regex(
        PASSWORD_ALLOWED_CHARACTERS_PATTERN,
        "La contraseña contiene caracteres no permitidos",
      )
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= BCRYPT_PASSWORD_MAX_BYTES,
        "La contraseña no puede superar 72 bytes",
      ),
    confirmPassword: z
      .string({
        required_error: "La confirmación de contraseña es obligatoria",
        invalid_type_error: "La confirmación de contraseña debe ser texto",
      })
      .min(1, "La confirmación de contraseña es obligatoria"),
  })
  .strict("El formulario contiene campos no permitidos");

export type AccountActivationInput = z.input<
  typeof accountActivationFieldsSchema
>;
export type AccountActivationData = z.output<
  typeof accountActivationFieldsSchema
>;

export function validateAccountActivationInput(
  input: unknown,
  now: Date = new Date(),
): z.SafeParseReturnType<AccountActivationInput, AccountActivationData> {
  return accountActivationFieldsSchema
    .superRefine((data, context) => {
      if (data.password !== data.confirmPassword) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Las contraseñas no coinciden",
          path: ["confirmPassword"],
        });
      }

      if (Number.isNaN(now.getTime())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "No fue posible validar la fecha de nacimiento",
          path: ["fechaNacimiento"],
        });
        return;
      }

      if (
        !(data.fechaNacimiento instanceof Date) ||
        Number.isNaN(data.fechaNacimiento.getTime())
      ) {
        return;
      }

      const today = new Date(0);
      today.setHours(0, 0, 0, 0);
      today.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());

      if (data.fechaNacimiento.getTime() > today.getTime()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La fecha de nacimiento no puede estar en el futuro",
          path: ["fechaNacimiento"],
        });
        return;
      }

      if (calculateAge(data.fechaNacimiento, today) < MINIMUM_AGE) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debes tener al menos 13 años",
          path: ["fechaNacimiento"],
        });
      }
    })
    .safeParse(input);
}
