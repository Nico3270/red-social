"use server";

import { v2 as cloudinary } from "cloudinary";
import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { InfoEmpresa } from "@/config/config";
import { indexUrl } from "@/lib/googleIndexing";

cloudinary.config(process.env.CLOUDINARY_URL || "");

export async function uploadImagesToCloudinary(formData: FormData) {
  try {
    const images = formData.getAll("images") as File[];

    if (!images || images.length === 0) {
      return { ok: false, message: "No se recibieron imágenes." };
    }

    // Subir imágenes a Cloudinary y obtener sus URLs
    const uploadedImages = await Promise.all(
      images.map(async (image) => {
        const buffer = await image.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");

        const result = await cloudinary.uploader.upload(`data:image/png;base64,${base64Image}`);
        return result.secure_url;
      })
    );

    return { ok: true, images: uploadedImages };
  } catch (error) {
    console.error("Error al subir imágenes:", error);
    return { ok: false, message: "Error al subir imágenes a Cloudinary." };
  }
}

export async function createProduct(formData: FormData) {
  try {
    const nombre = formData.get("nombre") as string;
    const precio = parseFloat(formData.get("precio") as string);
    const descripcion = formData.get("descripcion") as string;
    const descripcionCorta = formData.get("descripcionCorta") as string;
    const slug = formData.get("slug") as string;
    const prioridad = parseInt(formData.get("prioridad") as string);
    const status = formData.get("status") as string;
    const tags = (formData.get("tags") as string).split(",").map((tag) => tag.trim());
    const seccionIds = formData.getAll("seccionIds") as string[];
    const imageUrls = formData.getAll("imageUrls") as string[]; // Ahora recibimos URLs en vez de archivos
    const componentes = formData.getAll("componentes") as string[]; // ✅ Ahora recibimos los componentes


    if (!nombre || !descripcion || !precio || imageUrls.length === 0) {
      return { ok: false, message: "Faltan datos obligatorios." };
    }

    // Crear el producto en la base de datos
    const product = await prisma.product.create({
      data: {
        nombre,
        precio,
        descripcion,
        descripcionCorta,
        slug,
        prioridad,
        status,
        tags,
        componentes, // ✅ Ahora se insertan los componentes en el producto
        imagenes: {
          create: imageUrls.map((url) => ({ url })), // Guardamos solo las URLs
        },
      },
    });

    // 🔥 Relacionar el producto con las secciones si existen
    if (seccionIds.length > 0) {
      await prisma.productSection.createMany({
        data: seccionIds.map((sectionId) => ({
          productId: product.id,
          sectionId,
        })),
      });
    }

    // 📌 Construir la URL del producto

    const productUrl = `${InfoEmpresa.linkWebProduccion}/producto/${product.slug}`;


    // 📌 Enviar la URL a Google para la indexación
    console.log("📢 Enviando a Google para indexación:", productUrl);
    const response = await indexUrl(productUrl);
    console.log("📌 Respuesta completa de Google Indexing API:", JSON.stringify(response, null, 2));

    // 📌 Evaluar si la indexación fue exitosa
    const isSuccess = response && response.urlNotificationMetadata && !response.error;


    // 📌 Guardar en la base de datos el resultado de la indexación
    try {
      await prisma.indexLog.create({
        data: {
          url: productUrl,
          status: isSuccess ? "success" : "error",
          response: response ? JSON.stringify(response) : "{}",
        },
      });
    } catch (dbError) {
      console.error("❌ Error al guardar en la base de datos:", dbError);
    }

    return { ok: true, product };
  } catch (error) {
    console.error("Error al crear producto:", error);
    return { ok: false, message: "Error al crear el producto." };
  }
}


export async function updateProduct(formData: FormData) {
  console.log({formData});
  try {
    const id = formData.get("id") as string;
    const nombre = formData.get("nombre") as string;
    const precio = parseFloat(formData.get("precio") as string);
    const descripcion = formData.get("descripcion") as string;
    const descripcionCorta = formData.get("descripcionCorta") as string;
    const slug = formData.get("slug") as string;
    const prioridad = parseInt(formData.get("prioridad") as string) || 0;
    const status = formData.get("status") as string;
    const tags = formData.get("tags") ? (formData.get("tags") as string).split(",").map((tag) => tag.trim()) : [];
    const seccionIds = formData.getAll("seccionIds") as string[];
    const imageUrls = formData.getAll("imageUrls") as string[];
    const componentes = formData.getAll("componentes") as string[];

    // Validar campos obligatorios con más detalle
    if (!id) return { ok: false, message: "El ID del producto es obligatorio para la actualización." };
    if (!nombre) return { ok: false, message: "El nombre es obligatorio." };
    if (isNaN(precio)) return { ok: false, message: "El precio debe ser un número válido." };
    if (!descripcion) return { ok: false, message: "La descripción es obligatoria." };
    if (!slug) return { ok: false, message: "El slug es obligatorio." };
    if (!status) return { ok: false, message: "El estado es obligatorio." };
    if (imageUrls.length === 0) return { ok: false, message: "Debes proporcionar al menos una imagen." };

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { imagenes: true, secciones: true },
    });
    
    if (!existingProduct) {
      return { ok: false, message: "El producto no existe." };
    }
    

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        nombre: nombre ?? "", // ✅ Si es null, usa un string vacío
        precio: isNaN(precio) ? 0 : precio, // ✅ Si precio no es un número, usa 0
        descripcion: descripcion ?? "",
        descripcionCorta: descripcionCorta ?? "",
        slug: slug ?? "",
        prioridad: isNaN(prioridad) ? 0 : prioridad,
        status: status ?? "available",
        tags: Array.isArray(tags) ? tags : [], // ✅ Asegurar que sea un array
        componentes: Array.isArray(componentes) ? componentes : [], // ✅ Asegurar que sea un array
        imagenes: {
          deleteMany: {},
          create: Array.isArray(imageUrls) ? imageUrls.map((url) => ({ url })) : [], // ✅ Asegurar que sea un array
        },
      },
    });
    
    

    const currentSectionIds = existingProduct.secciones.map((ps) => ps.sectionId);
    const sectionsToRemove = currentSectionIds.filter((sid) => !seccionIds.includes(sid));
    const sectionsToAdd = seccionIds.filter((sid) => !currentSectionIds.includes(sid));

    if (sectionsToRemove.length > 0) {
      await prisma.productSection.deleteMany({
        where: {
          productId: id,
          sectionId: { in: sectionsToRemove },
        },
      });
    }

    if (sectionsToAdd.length > 0) {
      await prisma.productSection.createMany({
        data: sectionsToAdd.map((sectionId) => ({
          productId: id,
          sectionId,
          prioridad: 0,
        })),
      });
    }

    // const productUrl = `${InfoEmpresa.linkWebProduccion}/producto/${updatedProduct.slug}`;
    // console.log("📢 Enviando a Google para indexación:", productUrl);
    // const response = await indexUrl(productUrl);
    // console.log("📌 Respuesta completa de Google Indexing API:", JSON.stringify(response, null, 2));

    // const isSuccess = response && response.urlNotificationMetadata && !response.error;

    // try {
    //   await prisma.indexLog.create({
    //     data: {
    //       url: productUrl,
    //       status: isSuccess ? "success" : "error",
    //       response: response ? JSON.stringify(response) : "{}",
    //     },
    //   });
    // } catch (dbError) {
    //   console.error("❌ Error al guardar en la base de datos:", dbError);
    //   console.error("🔍 Stack del error:", dbError instanceof Error ? dbError.stack : "No disponible");
    // }

    return { ok: true, product: updatedProduct };
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return { ok: false, message: `Error al actualizar el producto: ${error instanceof Error ? error.message : "Desconocido"}` };
  }
}


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Usa la API Key de OpenAI
});

export async function generateDescriptionFromText(
  nombreProducto: string,
  caracteristicas: string,
  componentes: string[]
) {
  try {
    if (!nombreProducto.trim() || !caracteristicas.trim() || componentes.length === 0) {
      return {
        ok: false,
        message: "Se requieren el título del producto, características generales y los componentes para generar la descripción.",
      };
    }

    // Convertir los componentes en una lista formateada
    const componentesTexto = componentes.join(", ");

    // Llamada a OpenAI para generar la descripción optimizada
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Eres un experto en ecommerce y SEO. Basado en el título, la descripción general y la lista de componentes del producto, genera:\n\
            - Una **Descripción Detallada** clara y profesional, sin exageraciones de ventas.\n\
            - Una **Descripción Corta** de máximo 20 palabras, mencionando los elementos principales.\n\
            - Una lista de **Palabras Clave (Tags)** optimizadas para SEO, separadas por comas.",
        },
        {
          role: "user",
          content: `Título del producto: "${nombreProducto}".\n\
                    Descripción general: "${caracteristicas}".\n\
                    Componentes incluidos: "${componentesTexto}".\n\
                    Genera una descripción detallada, una descripción corta y palabras clave SEO. No agregues encabezados ni numeración.`,
        },
      ],
      max_tokens: 400,
      temperature: 0.6,
    });

    const responseText = response.choices[0]?.message?.content || "";

    // Separar la respuesta en líneas y filtrar vacíos
    const sections = responseText.split("\n").filter((line) => line.trim() !== "");

    return {
      ok: true,
      description: sections[0] || "No se pudo generar una descripción detallada.",
      shortDescription: sections[1] || "No se pudo generar una descripción corta.",
      tags: sections[2] ? sections[2].split(",").map((tag) => tag.trim()) : [],
    };
  } catch (error) {
    console.error("Error al generar contenido con OpenAI:", error);
    return { ok: false, message: "Error al generar la descripción y tags con OpenAI." };
  }
}





