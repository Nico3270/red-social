"use server";

import { v2 as cloudinary } from "cloudinary";

cloudinary.config(process.env.CLOUDINARY_URL || "");

export const deleteVideoFromCloudinary = async (publicId: string): Promise<{ success: boolean; error?: string }> => {
  if (!publicId) {
    return { success: false, error: "Falta el publicId." };
  }

  try {
    await cloudinary.uploader.destroy(`gallery_videos/${publicId}`, {
      resource_type: "video",
    });
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar el video de Cloudinary:", error);
    return { success: false, error: "No se pudo eliminar el video." };
  }
};
