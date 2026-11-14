import { z } from "zod";
import { EstadoNegocio } from "@prisma/client";
import colombia from "@/config/colombia.json";
import { validProfileLocation } from "./profileLocation";

export function validProfileUrl(
  value: string,
  hosts?: readonly string[],
): boolean {
  if (!value) return true;
  try {
    const url = new URL(
      !hosts && !/^[a-z][a-z0-9+.-]*:/i.test(value)
        ? `https://${value}`
        : value,
    );
    return (
      ["https:", "http:"].includes(url.protocol) &&
      url.hostname.includes(".") &&
      !url.username &&
      !url.password &&
      (!hosts ||
        (url.protocol === "https:" &&
          hosts.some(
            (host) => url.hostname === host || url.hostname === `www.${host}`,
          )))
    );
  } catch {
    return false;
  }
}

export const SOCIAL_HOSTS = {
  facebook: ["facebook.com"],
  instagram: ["instagram.com"],
  twitter: ["twitter.com", "x.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
} as const;

const optionalUrl = (hosts?: readonly string[]) =>
  z
    .string()
    .optional()
    .refine(
      (value) => value === undefined || validProfileUrl(value, hosts),
      "Ingresa una URL válida",
    );
const ids = z
  .array(z.string().min(1))
  .min(1)
  .refine(
    (values) => new Set(values).size === values.length,
    "La selección contiene valores duplicados",
  );

export const profileEditorSchema = z
  .object({
    nombreNegocio: z
      .string()
      .trim()
      .min(1, "El nombre del negocio es obligatorio"),
    slugNegocio: z
      .string()
      .regex(/^[a-z0-9-]+$/, "El slug del negocio no es válido"),
    descripcionNegocio: z
      .string()
      .trim()
      .min(1, "La descripción del negocio es obligatoria"),
    telefonoNegocio: z
      .string()
      .regex(/^(\+57\d{10})?$/, "El teléfono debe incluir +57 y 10 dígitos"),
    ciudadNegocio: z.string().min(1),
    departamentoNegocio: z.string().min(1),
    direccionNegocio: z.string().optional(),
    telefonoContacto: z.string().optional(),
    imagenPerfil: z.string().optional(),
    imagenPortada: z.string().optional(),
    sitioWeb: optionalUrl(),
    urlGoogleMaps: optionalUrl(),
    facebook: optionalUrl(SOCIAL_HOSTS.facebook),
    instagram: optionalUrl(SOCIAL_HOSTS.instagram),
    twitter: optionalUrl(SOCIAL_HOSTS.twitter),
    tiktok: optionalUrl(SOCIAL_HOSTS.tiktok),
    youtube: optionalUrl(SOCIAL_HOSTS.youtube),
    // null representa ausencia real. undefined mantiene compatibilidad con clientes que omiten la ubicación.
    latitudNegocio: z.number().finite().min(-90).max(90).nullable().optional(),
    longitudNegocio: z
      .number()
      .finite()
      .min(-180)
      .max(180)
      .nullable()
      .optional(),
    categoriaIds: ids,
    seccionesIds: ids,
    estadoNegocio: z.nativeEnum(EstadoNegocio),
    idNegocio: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.latitudNegocio == null && data.longitudNegocio == null) ||
      validProfileLocation(data.latitudNegocio, data.longitudNegocio) !== null,
    {
      message: "Selecciona una ubicación con latitud y longitud válidas",
      path: ["latitudNegocio"],
    },
  )
  .refine(
    (data) =>
      colombia.some(
        (department) =>
          department.departamento === data.departamentoNegocio &&
          department.ciudades.includes(data.ciudadNegocio),
      ),
    {
      message: "Selecciona una ciudad válida de la lista",
      path: ["ciudadNegocio"],
    },
  );

export type InformacionInicialNegocio = z.infer<typeof profileEditorSchema>;
