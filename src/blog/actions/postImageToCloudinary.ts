"use server";

import { v2 as cloudinary } from "cloudinary";

cloudinary.config(process.env.CLOUDINARY_URL || "");

// Función para subir una imagen a Cloudinary
export async function postImageToCloudinary(file: File): Promise<{ url: string }> {
  try {
    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${base64Image}`,
      {
        folder: "blogs",
      }
    );

    return { url: result.secure_url };
  } catch (error) {
    console.error("Error subiendo la imagen a Cloudinary:", error);
    throw new Error("No se pudo subir la imagen.");
  }
}
