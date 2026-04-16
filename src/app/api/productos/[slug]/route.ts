import { NextRequest, NextResponse } from "next/server";
import { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import prisma from "@/lib/prisma";



export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> } // Ajuste en el tipo de params
) {
  // Espera la resolución de params
  const params = await context.params;
  const { slug } = params;

  const url = req.nextUrl;
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const take = parseInt(url.searchParams.get("take") || "10");

  try {
    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "El slug del negocio es obligatorio." },
        { status: 400 }
      );
    }

    const products = await prisma.product.findMany({
      where: { negocio: { slug } },
      skip,
      take,
      select: {
        id: true,
        nombre: true,
        precio: true,
        slug: true,
        status: true,
        etiquetaEspecial: true,
        descripcion: true,
        descripcionCorta: true,
        prioridad: true,
        tags: true,
        categoryId: true,
        componentes: true,
        stock: true,
        stockIlimitado: true,
        usaVariantes: true,
        category: {
          select: {
            nombre: true,
            slug: true,
          },
        },
        secciones: {
          select: {
            section: {
              select: {
                nombre: true,
                slug: true,
                id: true,
              },
            },
          },
        },
        negocio: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            telefonoContacto: true,
            fotoPerfil: true,
          },
        },
        imagenes: {
          select: {
            url: true,
          },
        },
        variantes: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            nombre: true,
            sku: true,
            precio: true,
            stock: true,
            stockIlimitado: true,
            isActive: true,
            imagenUrl: true,
            orden: true,
            options: {
              select: {
                id: true,
                nombre: true,
                valor: true,
                orden: true,
              },
              orderBy: {
                orden: "asc",
              },
            },
          },
          orderBy: {
            orden: "asc",
          },
        },
      },
    });

    if (!products || products.length === 0) {
      return NextResponse.json(
        { ok: true, products: [], message: "No hay más productos." },
        { status: 200 }
      );
    }

    const formattedProducts: ProductRedSocial[] = products.map((product) => ({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      descripcion: product.descripcion || "",
      descripcionCorta: product.descripcionCorta || "",
      slug: product.slug,
      prioridad: product.prioridad || 1,
      status: product.status,
      etiquetaEspecial: product.etiquetaEspecial,
      tags: product.tags,
      categoriaId: product.categoryId,
      imagenes: product.imagenes.map((img) => img.url),
      componentes: product.componentes,
      sections: product.secciones.map((s) => s.section.id),
      slugNegocio: product.negocio.slug,
      nombreNegocio: product.negocio.nombre,
      telefonoContacto: product.negocio.telefonoContacto || "",
      negocioId: product.negocio.id,
      negocioFotoPerfil: product.negocio.fotoPerfil || "",
      stock: product.stock,
      stockIlimitado: product.stockIlimitado,
      usaVariantes: product.usaVariantes,
      variantes: product.variantes.map((variante) => ({
        id: variante.id,
        nombre: variante.nombre,
        sku: variante.sku,
        precio: variante.precio,
        stock: variante.stock,
        stockIlimitado: variante.stockIlimitado,
        isActive: variante.isActive,
        imagenUrl: variante.imagenUrl,
        orden: variante.orden,
        options: variante.options.map((option) => ({
          id: option.id,
          nombre: option.nombre,
          valor: option.valor,
          orden: option.orden,
        })),
      })),
    }));

    return NextResponse.json(
      { ok: true, products: formattedProducts, message: "productos obtenidos exitosamente" },
      { status: 200, headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" } }
    );
  } catch (error) {
    console.error("Error en getNegocioProductsBySlug:", error);
    return NextResponse.json(
      { ok: false, message: "Error al obtener los productos del negocio." },
      { status: 500 }
    );
  }
}
