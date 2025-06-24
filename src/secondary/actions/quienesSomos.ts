"use server";

import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config(process.env.CLOUDINARY_URL || "");



// 📌 Eliminar imagen de Cloudinary
export async function deleteTarjetImage(imageUrl: string): Promise<boolean> {
  try {
    const publicId = extractPublicIdFromUrl(imageUrl);
    if (!publicId) throw new Error("No se pudo extraer el public_id de la URL.");

    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    console.error("Error al eliminar imagen de Cloudinary:", error);
    return false;
  }
}

// Crear una nueva tarjeta
interface CreateTarjetData {
  titulo: string;
  descripcion: string;
  imagen: string;
}



// Subir imagen de tarjeta a Cloudinary
export async function uploadTarjetImage(imageFile: File): Promise<string | null> {
  try {
    const buffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    const result = await cloudinary.uploader.upload(`data:image/png;base64,${base64Image}`);
    return result.secure_url;
  } catch (error) {
    console.error("Error al subir imagen a Cloudinary:", error);
    return null;
  }
}

export async function createTarjet(data: CreateTarjetData) {
  try {
    const nuevaTarjeta = await prisma.tarjeta.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        imagen: data.imagen,
      },
    });
    return nuevaTarjeta;
  } catch (error) {
    console.error("Error al crear tarjeta en la base de datos:", error);
    throw new Error("No se pudo crear la tarjeta.");
  }
}

// Obtener todas las tarjetas
export async function getTarjets() {
  try {
    const tarjetas = await prisma.tarjeta.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return tarjetas;
  } catch (error) {
    console.error("Error al obtener tarjetas:", error);
    throw new Error("No se pudieron obtener las tarjetas.");
  }
}





// Obtener tarjeta por ID
export async function getTarjetById(id: string) {
  try {
    const tarjeta = await prisma.tarjeta.findUnique({
      where: { id },
    });
    return tarjeta;
  } catch (error) {
    console.error("Error al obtener tarjeta por ID:", error);
    throw new Error("No se pudo encontrar la tarjeta.");
  }
}

interface UpdateTarjetData {
  id: string;
  titulo: string;
  descripcion: string;
  newImageFile?: File;
  oldImageUrl?: string;
}

// 📌 Actualizar una tarjeta (incluyendo imagen)
export async function updateTarjet(data: UpdateTarjetData) {
  try {
    let uploadedImageUrl = data.oldImageUrl;

    // Si hay nueva imagen, eliminar la anterior y subir la nueva
    if (data.newImageFile) {
      if (data.oldImageUrl) {
        await deleteTarjetImage(data.oldImageUrl);  // Elimina la imagen antigua
      }
      const newImageUrl = await uploadTarjetImage(data.newImageFile);
      if (newImageUrl) {
        uploadedImageUrl = newImageUrl;
      }
    }

    // Actualizar la tarjeta en la BD
    const updatedTarjet = await prisma.tarjeta.update({
      where: { id: data.id },
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        imagen: uploadedImageUrl,
      },
    });

    return updatedTarjet;
  } catch (error) {
    console.error("Error al actualizar tarjeta:", error);
    throw new Error("No se pudo actualizar la tarjeta.");
  }
}


// 📌 Eliminar una tarjeta por ID
export async function deleteTarjet(id: string) {
  try {
    // Obtener tarjeta
    const tarjet = await prisma.tarjeta.findUnique({
      where: { id },
    });

    if (!tarjet) {
      console.warn("Tarjeta no encontrada.");
      return false;  // Devuelve false en lugar de lanzar un error
    }

    // Eliminar imagen de Cloudinary
    await deleteTarjetImage(tarjet.imagen);

    // Eliminar tarjeta de la BD
    await prisma.tarjeta.delete({
      where: { id },
    });

    return true;
  } catch (error) {
    console.error("Error al eliminar tarjeta:", error);
    throw new Error("No se pudo eliminar la tarjeta.");
  }
}



// 📌 Extraer public_id de la URL de Cloudinary
function extractPublicIdFromUrl(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?([^/.]+)(?:\.\w+)?$/);
  return match ? match[1] : null;
}
