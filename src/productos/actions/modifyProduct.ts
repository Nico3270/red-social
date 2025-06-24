"use server";

import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config(process.env.CLOUDINARY_URL || "");

export async function modifyProduct(formData: FormData) {
  try {
    const id = formData.get("id") as string;
    const nombre = formData.get("nombre") as string;
    const precio = parseFloat(formData.get("precio") as string);
    const descripcion = formData.get("descripcion") as string;
    const descripcionCorta = formData.get("descripcionCorta") as string;
    const slug = formData.get("slug") as string;
    const prioridad = parseInt(formData.get("prioridad") as string);
    const status = formData.get("status") as string;
    const tags = (formData.get("tags") as string).split(",").map((tag) => tag.trim());
    const seccionIds = formData.getAll("seccionIds") as string[];
    const imagesToDelete = formData.getAll("imagesToDelete") as string[];
    const newImages = formData.getAll("newImages") as File[];

    // **Eliminar imágenes marcadas para borrar**
    if (imagesToDelete.length > 0) {
      // Obtener las URLs de las imágenes a borrar
      const images = await prisma.image.findMany({
        where: { id: { in: imagesToDelete } },
      });

      // Eliminar imágenes de Cloudinary
      await Promise.all(
        images.map(async (image) => {
          const publicId = image.url.split("/").pop()?.split(".")[0]; // Extraer el publicId de la URL
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        })
      );

      // Eliminar imágenes de la base de datos
      await prisma.image.deleteMany({
        where: { id: { in: imagesToDelete } },
      });
    }

    // **Subir nuevas imágenes a Cloudinary**
    const uploadedImages = await Promise.all(
      newImages.map(async (image) => {
        const buffer = await image.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");
        const result = await cloudinary.uploader.upload(`data:image/png;base64,${base64Image}`);
        return result.secure_url; // Retornar el URL seguro
      })
    );

    // **Actualizar las relaciones con las secciones**
    // Primero, eliminar todas las relaciones existentes con las secciones
    await prisma.productSection.deleteMany({
      where: { productId: id },
    });

    // Luego, agregar las nuevas relaciones con las secciones
    const sectionConnections = seccionIds.map((seccionId) => ({
      productId: id,
      sectionId: seccionId,
    }));
    await prisma.productSection.createMany({
      data: sectionConnections,
    });

    // **Actualizar el producto principal**
    await prisma.product.update({
      where: { id },
      data: {
        nombre,
        precio,
        descripcion,
        descripcionCorta,
        slug,
        prioridad,
        status,
        tags,
      },
    });

    // **Agregar las nuevas imágenes al producto**
    if (uploadedImages.length > 0) {
      await prisma.image.createMany({
        data: uploadedImages.map((url) => ({
          url,
          productId: id,
        })),
      });
    }

    return { ok: true, message: "Producto modificado exitosamente." };
  } catch (error) {
    console.error("Error al modificar producto:", error);
    return { ok: false, message: "Error al modificar el producto." };
  }
}