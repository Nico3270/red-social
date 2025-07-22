// /ui/actions/productos/updateProduct.ts
"use server";

import { v2 as cloudinary } from "cloudinary";
import prisma from "@/lib/prisma";
import { Prisma, ProductStatus } from "@prisma/client";
import { auth } from "@/auth.config";

if (!process.env.CLOUDINARY_URL) {
  throw new Error("CLOUDINARY_URL no está configurado en las variables de entorno.");
}
cloudinary.config(process.env.CLOUDINARY_URL);

interface UpdateProductResult {
  ok: boolean;
  product?: {
    id: string;
    slug: string;
  };
  message?: string;
}

export async function updateProduct(productId: string, formData: FormData): Promise<UpdateProductResult> {
  console.log("Iniciando updateProduct con productId:", productId, "y formData:", Object.fromEntries(formData));
  const session = await auth();
  if (!session || !session.user) {
    return { ok: false, message: "No estás autenticado. Por favor, inicia sesión." };
  }

  const userSessionId = session.user.id;

  try {
    console.log("Extrayendo datos del formData...");
    const nombre = formData.get("nombre") as string;
    const precio = parseFloat(formData.get("precio") as string);
    const descripcion = formData.get("descripcion") as string;
    const descripcionCorta = formData.get("descripcionCorta") as string;
    const slug = formData.get("slug") as string;
    const prioridad = parseInt(formData.get("prioridad") as string);
    const status = formData.get("status") as ProductStatus;
    const tags = (formData.get("tags") as string).split(",").map((tag) => tag.trim());
    const seccionIds = formData.getAll("seccionIds") as string[];
    const imageUrls = formData.getAll("imageUrls") as string[];
    const componentes = formData.getAll("componentes") as string[];
    const usuarioId = formData.get("usuarioId") as string;
    const categoryId = formData.get("categoriaId") as string;

    if (userSessionId !== usuarioId) {
      return { ok: false, message: "No tienes permiso para actualizar productos para este usuario." };
    }
    
    //_ Verificar que el producto corresponda al negocio

    const productNegocioId = await prisma.product.findUnique({
      where: { id: productId },
      select: { negocioId: true, },
    });

    const negocioId = await prisma.negocio.findUnique({
      where: { usuarioId },
      select: { id: true },
    }); 

    if(productNegocioId?.negocioId !== negocioId?.id) {
      return { ok: false, message: "El producto no pertenece al negocio del usuario." };
    }

    console.log("Datos extraídos:", {
      nombre,
      precio,
      descripcion,
      slug,
      usuarioId,
      categoryId,
      seccionIds,
      imageUrls,
      componentes,
    });

    // Validations
    console.log("Validando datos de entrada...");
    if (!nombre || !descripcion || !precio || imageUrls.length === 0) {
      return { ok: false, message: "Faltan datos obligatorios: nombre, descripción, precio o imágenes." };
    }
    if (!usuarioId) {
      return { ok: false, message: "El ID del usuario es obligatorio." };
    }


    if (!categoryId) {
      return { ok: false, message: "El ID de la categoría es obligatorio." };
    }

    if (!Object.values(ProductStatus).includes(status)) {
      return { ok: false, message: "El estado del producto no es válido." };
    }

    
    // Posibles validacioes, que las haremos antes en la página de productos de usuario, para que el usuario no pueda enviar datos inválidos y verificar que el usuario dueño del producto es el mismo que el usuario que lo está actualizando.

    // console.log("Validando categoría...");
    // const categoryExists = await prisma.category.findUnique({
    //   where: { id: categoryId },
    // });
    // if (!categoryExists) {
    //   return { ok: false, message: "La categoría especificada no existe." };
    // }

    // console.log("Validando producto existente...");
    // const productExists = await prisma.product.findUnique({
    //   where: { id: productId },
    // });
    // if (!productExists) {
    //   return { ok: false, message: "El producto especificado no existe." };
    // }

    // console.log("Validando slug...");
    // const existingProduct = await prisma.product.findFirst({
    //   where: {
    //     slug,
    //     id: { not: productId },
    //   },
    // });
    // if (existingProduct) {
    //   return { ok: false, message: "El slug ya está en uso. Por favor, utiliza un slug diferente." };
    // }

    // console.log("Validando URLs de imágenes...");
    // const cloudinaryUrlPattern = /^https:\/\/res\.cloudinary\.com\//;
    // if (!imageUrls.every((url) => cloudinaryUrlPattern.test(url))) {
    //   return { ok: false, message: "Una o más URLs de imágenes no son válidas." };
    // }

    console.log("Actualizando producto en transacción...");
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Update product
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          nombre,
          precio,
          descripcion,
          descripcionCorta,
          slug,
          prioridad,
          status,
          tags,
          componentes,
          negocioId: negocioId?.id, // Use the negocioId associated with the user
          categoryId,
        },
      });

      // Delete existing images
      await tx.image.deleteMany({
        where: { productId },
      });

      // Create new images
      await tx.image.createMany({
        data: imageUrls.map((url) => ({
          url,
          productId,
        })),
      });

      // Validate and update sections
      console.log("Validando secciones...");
      if (seccionIds.length > 0) {
        const sectionsExist = await tx.section.findMany({
          where: { id: { in: seccionIds } },
        });
        console.log("Secciones encontradas:", sectionsExist);
        if (sectionsExist.length !== seccionIds.length) {
          throw new Error("Una o más secciones especificadas no existen.");
        }

        // Delete existing product-section relations
        await tx.productSection.deleteMany({
          where: { productId },
        });

        // Create new product-section relations
        console.log("Creando relaciones con secciones...");
        await tx.productSection.createMany({
          data: seccionIds.map((sectionId) => ({
            productId,
            sectionId,
          })),
        });
      } else {
        // If no sections are provided, remove all existing relations
        await tx.productSection.deleteMany({
          where: { productId },
        });
      }

      return product;
    });

    console.log("Producto actualizado exitosamente:", updatedProduct);
    return {
      ok: true,
      product: { id: updatedProduct.id, slug: updatedProduct.slug },
    };
  } catch (error: unknown) {
    console.error("Error al actualizar producto:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { ok: false, message: "El slug ya está en uso." };
      }
      if (error.code === "P2003") {
        return { ok: false, message: "Error de integridad: usuario, categoría o secciones no válidos." };
      }
    }
    const errorMessage = error instanceof Error ? error.message : "Error desconocido en el servidor";
    return { ok: false, message: `Error inesperado al actualizar el producto: ${errorMessage}` };
  }
}