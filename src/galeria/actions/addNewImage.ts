"use server"

import prisma from "@/lib/prisma";
import { ImageGalleryItem } from "../interfaces/types";

export const addNewImage = async (image: {
    url: string;
    title: string;
    description: string;
    order: number;
  }): Promise<
    | { success: true; image: ImageGalleryItem }
    | { success: false; error: string }
  > => {
    try {
      const newImage = await prisma.imagegallery.create({
        data: {
          url: image.url,
          title: image.title,
          description: image.description,
          order: image.order,
        },
      });
      return {
        success: true,
        image: {
          id: newImage.id,
          url: newImage.url,
          title: newImage.title,
          description: newImage.description,
          order: newImage.order,
        },
      };
    } catch (error) {
      console.error("Error al agregar nueva imagen:", error);
      return { success: false, error: "No se pudo agregar la nueva imagen." };
    }
  };
  