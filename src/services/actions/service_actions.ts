"use server";

import { Service } from "@/interfaces/product.interface";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config(process.env.CLOUDINARY_URL || "");

interface ServiceFormData {
  titulo: string;
  descripcion: string;
  imagen: string;
  slug: string;
  isActive: boolean;
}

// Obtener servicio por ID
export async function getServiceById(id: string): Promise<Service | null> {
  try {
    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) return null;

    return {
      ...service,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("Error al obtener el servicio por ID:", error);
    return null;
  }
}


export async function uploadImageToCloudinary(imageFile: File): Promise<string | null> {
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

export async function createService(formData: FormData) {
  try {
    const titulo = formData.get("titulo") as string;
    const descripcion = formData.get("descripcion") as string;
    const slug = formData.get("slug") as string;
    const isActive = formData.get("isActive") === "true";
    const base64Image = formData.get("imagen") as string;

    let uploadedImageUrl = "";

    // Subir imagen a Cloudinary si existe
    if (base64Image) {
      const result = await cloudinary.uploader.upload(base64Image);
      uploadedImageUrl = result.secure_url;
    }

    // Crear el servicio en Prisma
    const service = await prisma.service.create({
      data: {
        titulo,
        descripcion,
        slug,
        isActive,
        imagen: uploadedImageUrl
      },
    });

    // Retornar una respuesta con 'ok' y 'message'
    return {
      ok: true,
      service,
      message: "Servicio creado exitosamente."
    };

  } catch (error) {
    console.error("Error al crear servicio:", error);
    return {
      ok: false,
      message: "Error al crear el servicio."
    };
  }
}


// Crear o actualizar un servicio con validación de slug único
export const upsertService = async (
  data: ServiceFormData,
  id?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Validar si el slug ya existe (excepto para el mismo servicio en edición)
    const existingSlug = await prisma.service.findUnique({
      where: { slug: data.slug },
    });

    if (existingSlug && existingSlug.id !== id) {
      return { success: false, message: "El slug ya existe. Usa otro título." };
    }

    if (id) {
      // Actualizar servicio existente
      await prisma.service.update({
        where: { id },
        data,
      });
      return { success: true, message: "Servicio actualizado correctamente" };
    } else {
      // Crear nuevo servicio
      await prisma.service.create({ data });
      return { success: true, message: "Servicio creado exitosamente" };
    }
  } catch (error) {
    console.error("Error al guardar servicio:", error);
    return { success: false, message: "Ocurrió un error al guardar el servicio." };
  }
};

// Obtener servicios activos
export const getServices = async (): Promise<Service[]> => {
  const services = await prisma.service.findMany({
    where: { isActive: true }, // Solo servicios activos
    orderBy: { createdAt: "desc" },
  });

  return services.map((service) => ({
    ...service,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  }));
};

// Eliminar servicio (Soft Delete)
export const deleteService = async (id: string): Promise<{ success: boolean }> => {
  try {
    // En lugar de eliminar físicamente, marcar como inactivo
    await prisma.service.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Error al desactivar servicio:", error);
    return { success: false };
  }
};


