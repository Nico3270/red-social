"use server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config(process.env.CLOUDINARY_URL || "");

export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const base64Image = Buffer.from(buffer).toString("base64");

  const uploadResult = await cloudinary.uploader.upload(`data:image/png;base64,${base64Image}`, {
    folder: "gallery",
  });

  return uploadResult.secure_url;
};
