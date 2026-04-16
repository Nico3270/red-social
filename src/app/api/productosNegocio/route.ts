import { auth } from '@/auth.config';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  if (!session || !session.user.negocioId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = session.user.negocioId;

  try {
    const productos = await prisma.product.findMany({
      where: { negocioId },
      select: {
        id: true,
        nombre: true,
        slug: true,
        precio: true,
        stock: true,
        stockIlimitado: true,
        usaVariantes: true,
        imagenes: true,
        secciones: true,
        descripcionCorta: true,
        variantes: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            nombre: true,
            precio: true,
            stock: true,
            stockIlimitado: true,
            imagenUrl: true,
            options: {
              select: {
                nombre: true,
                valor: true,
                orden: true,
              },
              orderBy: {
                orden: 'asc',
              },
            },
          },
          orderBy: {
            orden: 'asc',
          },
        },
      },
    });

    if (!productos || productos.length === 0) {
      return NextResponse.json({ message: 'No se encontraron productos' }, { status: 200 });
    }

    // Mapear los productos al formato base de CartProduct (sin cartItemId y cantidad, que se agregan al carrito)
    const products = productos.map((p) => ({
      id: p.id,
      slug: p.slug,
      nombre: p.nombre,
      precio: p.precio,
      stock: p.stock,
      stockIlimitado: p.stockIlimitado,
      usaVariantes: p.usaVariantes,
      imagen: p.imagenes[0]?.url || '', // Tomar la URL de la primera imagen, o cadena vacía si no hay
      seccionIds: p.secciones.map((sec) => sec.sectionId), // Extraer solo los sectionId como array de strings
      descripcionCorta: p.descripcionCorta,
      variantes: p.variantes.map((variant) => ({
        id: variant.id,
        nombre: variant.nombre,
        precio: variant.precio,
        stock: variant.stock,
        stockIlimitado: variant.stockIlimitado,
        imagenUrl: variant.imagenUrl,
        options: variant.options.map((option) => ({
          nombre: option.nombre,
          valor: option.valor,
        })),
      })),
    }));

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
