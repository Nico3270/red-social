"use server";
import prisma from "@/lib/prisma";

export async function getTestimonials() {
  return await prisma.testimonial.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function createTestimonial(data: {
  imagen: string;
  titulo: string;
  descripcion: string;
}) {
  return await prisma.testimonial.create({
    data,
  });
}

export async function updateTestimonial(
  id: string,
  data: { imagen?: string; titulo?: string; descripcion?: string }
) {
  return await prisma.testimonial.update({
    where: { id },
    data,
  });
}

export async function deleteTestimonial(id: string) {
  return await prisma.testimonial.delete({
    where: { id },
  });
}

import { v2 as cloudinary } from "cloudinary";

cloudinary.config(process.env.CLOUDINARY_URL || "");

export async function uploadImageToCloudinary(imageFile: File): Promise<string> {
  try {
    const buffer = await imageFile.arrayBuffer();
    const mimeType = imageFile.type;  // Detectar el tipo real (image/jpeg, image/png, etc.)
    const base64Image = Buffer.from(buffer).toString("base64");

    const dataUri = `data:${mimeType};base64,${base64Image}`;  // Formato dinámico
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "testimonials",  // Guarda las imágenes en una carpeta específica
      transformation: [
        { width: 800, height: 800, crop: "limit" },  // Límite de tamaño
        { quality: "auto" },  // Optimización automática
      ],
    });

    return result.secure_url;
  } catch (error) {
    console.error("Error al subir imagen a Cloudinary:", error);
    throw new Error("No se pudo subir la imagen. Intenta de nuevo.");
  }
}



export async function getTestimonialById(id: string) {
  try {
    const testimonial = await prisma.testimonial.findUnique({
      where: { id },
    });

    return testimonial;
  } catch (error) {
    console.error("Error al obtener testimonio:", error);
    return null;
  }
}

export async function deleteImageFromCloudinary(imageUrl: string): Promise<boolean> {
  try {
    const publicIdMatch = imageUrl.match(/\/upload\/(?:v\d+\/)?([^/.]+)(?:\.\w+)?$/);

    if (!publicIdMatch) {
      throw new Error("No se pudo extraer el public_id de la URL.");
    }

    const publicId = publicIdMatch[1];  // Extraemos el public_id de la URL

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      return true;
    } else {
      throw new Error("Error al eliminar la imagen de Cloudinary.");
    }
  } catch (error) {
    console.error("Error al eliminar imagen de Cloudinary:", error);
    return false;
  }
}
