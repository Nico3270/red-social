"use server";

import { v2 as cloudinary } from "cloudinary";

// Configuración de Cloudinary
cloudinary.config(process.env.CLOUDINARY_URL || "");

export const uploadVideoToCloudinary = async (file: File): Promise<string> => {
  try {
    // Convertimos el archivo a un buffer y luego a base64
    const buffer = await file.arrayBuffer();
    const base64Video = Buffer.from(buffer).toString("base64");

    // Subimos el video a Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:video/mp4;base64,${base64Video}`, // Formato base64 para video
      {
        resource_type: "video",
        folder: "gallery_videos", // Carpeta donde se guardarán los videos
        overwrite: true,
      }
    );

    return uploadResult.secure_url; // Retorna la URL segura del video subido
  } catch (error) {
    console.error("Error al subir el video a Cloudinary:", error);
    throw new Error("No se pudo subir el video.");
  }
};
