import { z } from "zod";
import colombia from "@/config/colombia.json";

export const assistedBusinessInput = z
  .object({
    operationId: z.string().uuid(),
    nombre: z.string().trim().min(2).max(160),
    descripcion: z.string().trim().max(3000).default(""),
    ciudad: z.string().min(1),
    departamento: z.string().min(1),
    telefonoContacto: z
      .string()
      .regex(/^(?:\+57\d{10})?$/)
      .default(""),
    categoriaIds: z.array(z.string().min(1)).min(1).max(20),
    seccionIds: z.array(z.string().min(1)).min(1).max(40),
    reviewedDuplicateIds: z.array(z.string().min(1)).max(50).default([]),
  })
  .strict()
  .refine(
    (v) =>
      colombia.some(
        (d) =>
          d.departamento === v.departamento && d.ciudades.includes(v.ciudad),
      ),
    { message: "Ciudad inválida.", path: ["ciudad"] },
  );

export function normalizeBusinessName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const demoSnapshotSchema = z.object({
  version: z.literal(1),
  businessId: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  ciudad: z.string(),
  departamento: z.string(),
  direccion: z.string().nullable(),
  telefono: z.string().nullable(),
  fotoPerfil: z.string().nullable(),
  fotoPortada: z.string().nullable(),
  products: z.array(
    z.object({
      id: z.string(),
      nombre: z.string(),
      descripcion: z.string(),
      precio: z.number().finite().nonnegative(),
      imagenes: z.array(z.string()),
      variantes: z.array(
        z.object({
          nombre: z.string().nullable(),
          precio: z.number().nullable(),
          opciones: z.array(
            z.object({ nombre: z.string(), valor: z.string() }),
          ),
        }),
      ),
    }),
  ),
});
export type DemoSnapshot = z.infer<typeof demoSnapshotSchema>;
