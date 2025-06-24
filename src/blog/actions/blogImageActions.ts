"use server";

import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config(process.env.CLOUDINARY_URL || "");

// Subir imágenes a Cloudinary y actualizar la base de datos
export const uploadImages = async (blogId: string, formData: FormData) => {
  const imagenPrincipal = formData.get("imagenPrincipal") as File | null;
  const imagenes = formData.getAll("imagenes") as File[];

  const uploadedUrls: string[] = [];

  if (imagenPrincipal) {
    const buffer = await imagenPrincipal.arrayBuffer();
    const result = await cloudinary.uploader.upload(`data:image/png;base64,${Buffer.from(buffer).toString("base64")}`);
    uploadedUrls.push(result.secure_url);
    await prisma.articulo.update({ where: { id: blogId }, data: { imagen: result.secure_url } });
  }

  for (const img of imagenes) {
    const buffer = await img.arrayBuffer();
    const result = await cloudinary.uploader.upload(`data:image/png;base64,${Buffer.from(buffer).toString("base64")}`);
    uploadedUrls.push(result.secure_url);
  }

  await prisma.articulo.update({ where: { id: blogId }, data: { imagenes: { push: uploadedUrls.slice(1) } } });

  return uploadedUrls;
};

// Eliminar imagen de Cloudinary y BD
export const deleteImageFromBlog = async (blogId: string, imageUrl: string) => {
  const publicId = imageUrl.split("/").pop()?.split(".")[0] || "";
  await cloudinary.uploader.destroy(publicId);
  await prisma.articulo.update({ where: { id: blogId }, data: { imagenes: { set: [] } } });
};
