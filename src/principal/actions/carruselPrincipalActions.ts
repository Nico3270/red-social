"use server";

import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config(process.env.CLOUDINARY_URL || "");

// 📌 Subir imagen del carrusel a Cloudinary
export async function uploadCarruselImage(imageFile: File): Promise<string | null> {
  try {
    const buffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    const result = await cloudinary.uploader.upload(`data:image/png;base64,${base64Image}`, {
      folder: "carrusel_sections",  // Almacena las imágenes en una carpeta específica de Cloudinary
    });

    return result.secure_url;
  } catch (error) {
    console.error("Error al subir imagen a Cloudinary:", error);
    return null;
  }
}


// Obtener sección del carrusel por ID
export async function getSectionCarruselById(id: string) {
  try {
    const section = await prisma.carruselSection.findUnique({
      where: { id },
    });

    if (!section) {
      return null;
    }
    return section;
  } catch (error) {
    console.error("Error al obtener sección de carrusel por ID:", error);
    throw new Error("No se pudo obtener la sección del carrusel.");
  }
}


// 📌 Obtener todas las secciones del carrusel
export async function getCarruselSections() {
  try {
    return await prisma.carruselSection.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error obteniendo carrusel:", error);
    return [];
  }
}

// 📌 Crear nueva sección del carrusel con imagen URL
export async function createCarruselSection(data: {
  titulo: string;
  descripcion: string;
  imagen: string;  // Cambiamos de File a string
  url: string;
}) {
  try {
    // Crear sección en la base de datos
    return await prisma.carruselSection.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        imagen: data.imagen,  // Ahora es un string
        url: data.url,
      },
    });
  } catch (error) {
    console.error("Error creando sección de carrusel:", error);
    throw new Error("No se pudo crear la sección.");
  }
}

// 📌 Eliminar sección del carrusel
export async function deleteCarruselSection(id: string) {
  try {
    const section = await prisma.carruselSection.findUnique({ where: { id } });

    if (section?.imagen) {
      const publicId = extractPublicId(section.imagen);

      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      } else {
        console.warn("No se pudo extraer el public_id de la imagen.");
      }
    }

    return await prisma.carruselSection.delete({ where: { id } });
  } catch (error) {
    console.error("Error eliminando sección:", error);
    throw new Error("No se pudo eliminar la sección.");
  }
}

// 📌 Actualizar sección del carrusel (con nueva imagen opcional)
export async function updateCarruselSection(
  id: string,
  data: { titulo: string; descripcion: string; url: string },
  newImageFile?: File,
  oldImageUrl?: string
) {
  try {
    let uploadedImageUrl = oldImageUrl;

    // Si se proporciona una nueva imagen, subirla y eliminar la anterior
    if (newImageFile) {
      if (oldImageUrl) {
        const publicId = extractPublicId(oldImageUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }

      const newImageUrl = await uploadCarruselImage(newImageFile);
      if (newImageUrl) {
        uploadedImageUrl = newImageUrl;
      }
    }

    // Actualizar la sección en la base de datos
    return await prisma.carruselSection.update({
      where: { id },
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        imagen: uploadedImageUrl,
        url: data.url,
      },
    });
  } catch (error) {
    console.error("Error actualizando sección:", error);
    throw new Error("No se pudo actualizar la sección.");
  }
}

// 📌 Función para extraer el public_id de la URL de Cloudinary
function extractPublicId(url: string): string | null {
  const match = url.match(/\/v\d+\/(.+?)\./);
  return match ? match[1] : null;
}


// 📌 Eliminar imagen específica de Cloudinary
export async function deleteCarruselImage(imageUrl: string): Promise<boolean> {
  try {
    const publicId = extractPublicId(imageUrl);

    if (!publicId) {
      console.warn("No se pudo extraer el public_id de la imagen.");
      return false;
    }

    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Error al eliminar imagen de Cloudinary:", error);
    return false;
  }
}
