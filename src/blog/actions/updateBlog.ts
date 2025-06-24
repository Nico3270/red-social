"use server";
import prisma from "@/lib/prisma";

// Define una interfaz estricta para los datos del blog
interface BlogUpdateData {
  titulo?: string;
  descripcion?: string;
  imagen?: string;
  imagenes?: string[]; // Array de URLs de imágenes
  parrafos?: string[];
  subtitulos?: string[];
  autor?: string;
  orden?: number;
}

// Función para actualizar un blog
export const updateBlog = async (id: string, data: BlogUpdateData) => {
  try {
    // Validación previa: Verifica que el ID y los datos sean correctos
    if (!id) {
      throw new Error("El ID del blog es requerido.");
    }

    if (!data || Object.keys(data).length === 0) {
      throw new Error("No se proporcionaron datos para actualizar el blog.");
    }

    // Actualización del blog en la base de datos
    const updatedBlog = await prisma.articulo.update({
      where: { id },
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        imagen: data.imagen,
        imagenes: data.imagenes || [],

        autor: data.autor,
        orden: data.orden,
      },
    });

    return updatedBlog;
  } catch (error: unknown) {
    // Validación del tipo para acceder a `message`
    let errorMessage = "Ocurrió un error desconocido";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error("Error al actualizar el blog:", errorMessage);

    // Lanza una nueva excepción con el mensaje real del error
    throw new Error(`No se pudo actualizar el blog: ${errorMessage}`);
  }
};
