"use server";

import { InfoEmpresa } from "@/config/config";
import { indexUrl } from "@/lib/googleIndexing";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config(process.env.CLOUDINARY_URL || "");

export async function postNewBlog(formData: FormData): Promise<{ ok: boolean; message: string; slug?: string }> {
  try {
    const titulo = formData.get("titulo") as string;
    if (!titulo) {
      return { ok: false, message: "El título es obligatorio." };
    }

    const descripcion = formData.get("descripcion") as string;
    if (!descripcion) {
      return { ok: false, message: "La descripción es obligatoria." };
    }

    const autor = formData.get("autor") as string || "Anónimo"; // Valor por defecto si no se proporciona
    const orden = parseInt(formData.get("orden") as string, 10) || 0;

    let secciones: string[] = [];
    let productos: string[] = [];
    let temas: { titulo: string; imagen: string; parrafos: string[] }[] = [];

    try {
      secciones = formData.get("secciones") ? JSON.parse(formData.get("secciones") as string) : [];
      productos = formData.get("productos") ? JSON.parse(formData.get("productos") as string) : [];
      temas = formData.get("temas") ? JSON.parse(formData.get("temas") as string) : [];
    } catch {
      return { ok: false, message: "Error en el formato de los datos enviados (secciones, productos o temas)." };
    }

    // Handle main image (asumimos que siempre es una URL desde el frontend)
    let imagenPrincipal = formData.get("imagen") as string;
    if (!imagenPrincipal) {
      return { ok: false, message: "La imagen principal es obligatoria." };
    }
    imagenPrincipal = imagenPrincipal.trim();
    if (!imagenPrincipal.startsWith("http")) {
      return { ok: false, message: "La URL de la imagen principal no es válida." };
    }

    // Manejar imágenes adicionales (esperamos URLs desde el frontend, no Files)
const imagenesRaw = formData.get("imagenes") as string;
let uploadedImagesUrls: string[] = [];
if (imagenesRaw) {
  try {
    const imagenesArray: Array<{ url: string }> = JSON.parse(imagenesRaw);
    uploadedImagesUrls = imagenesArray
      .filter((img) => img.url && typeof img.url === "string" && img.url.startsWith("http"))
      .map((img) => img.url);
  } catch {
    return { ok: false, message: "Error en el formato de las imágenes adicionales." };
  }
}

    // Generar slug único
    const generateUniqueSlug = async (titulo: string): Promise<string> => {
      const baseSlug = generateSlug(titulo);
      let slug = baseSlug;
      let counter = 1;
      while (await prisma.articulo.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter++}`;
      }
      return slug;
    };
    const slug = await generateUniqueSlug(titulo);

    // Crear el artículo en la base de datos
    await prisma.articulo.create({
      data: {
        titulo,
        slug,
        descripcion,
        imagen: imagenPrincipal,
        imagenes: uploadedImagesUrls,
        autor,
        orden,
        secciones: secciones.length > 0 ? {
          create: secciones.map((sectionId) => ({
            section: { connect: { id: sectionId } },
          })),
        } : undefined,
        products: productos.length > 0 ? {
          create: productos.map((productId) => ({
            product: { connect: { id: productId } },
          })),
        } : undefined,
        temas: temas.length > 0 ? {
          create: temas.map((tema) => ({
            titulo: tema.titulo,
            imagen: tema.imagen,
            parrafos: tema.parrafos,
          })),
        } : undefined,
      },
    });

    // Construir la URL del blog
    const blogUrl = `${InfoEmpresa.linkWebProduccion}/blog/${slug}`;

    // Enviar a Google para indexación
    console.log("📢 Enviando a Google para indexación:", blogUrl);
    const response = await indexUrl(blogUrl);
    console.log("📌 Respuesta completa de Google Indexing API:", JSON.stringify(response, null, 2));

    // Evaluar si la indexación fue exitosa
    const isSuccess = response && response.urlNotificationMetadata && !response.error;

    // Guardar en la base de datos el resultado de la indexación
    try {
      await prisma.indexLog.create({
        data: {
          url: blogUrl,
          status: isSuccess ? "success" : "error",
          response: response ? JSON.stringify(response) : "{}",
        },
      });
    } catch (dbError) {
      console.error("❌ Error al guardar en la base de datos:", dbError);
    }

    return { ok: true, message: "Blog creado exitosamente.", slug };
  } catch (error) {
    console.error("Error al crear el blog:", error);
    return {
      ok: false,
      message: process.env.NODE_ENV === "development" ? String(error) : "Error al crear el blog.",
    };
  }
}

const generateSlug = (titulo: string): string => {
  return titulo
    .toLowerCase()
    .normalize("NFD") // Eliminar tildes
    .replace(/[\u0300-\u036f]/g, "") // Quitar diacríticos
    .replace(/[^a-z0-9]+/g, "-") // Reemplazar caracteres no alfanuméricos por guiones
    .replace(/(^-|-$)+/g, ""); // Quitar guiones al inicio o final
};