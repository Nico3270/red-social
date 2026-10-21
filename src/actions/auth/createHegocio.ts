"use server";

import { auth } from "@/auth.config";
import {
  createNegocioCore,
  type CreateNegocioCoreInput,
  type CreateNegocioCoreResult,
} from "@/lib/business/create-negocio-core";

const failure = (message: string): CreateNegocioCoreResult => ({
  ok: false,
  message,
  negocioId: "",
  slugNegocio: "",
});

export async function createNegocio(
  formData: FormData,
): Promise<CreateNegocioCoreResult> {
  try {
    const session = await auth();
    const usuarioId = session?.user?.id;

    if (!usuarioId) {
      return failure("No autorizado. Debes iniciar sesión.");
    }

    const input: CreateNegocioCoreInput = {
      usuarioId,
      nombre: formData.get("nombre") as string,
      descripcion: formData.get("descripcion") as string,
      ciudad: formData.get("ciudad") as string,
      departamento: formData.get("departamento") as string,
      direccion: formData.get("direccion") as string,
      telefonoContacto: formData.get("telefonoContacto") as string | null,
      categoriaIds: formData.getAll("categoriaIds") as string[],
      seccionIds: formData.getAll("seccionIds") as string[],
    };

    return await createNegocioCore(input);
  } catch {
    return failure("Error al crear el negocio.");
  }
}
