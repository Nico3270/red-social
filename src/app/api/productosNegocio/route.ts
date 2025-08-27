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
        imagenes: true,
        secciones: true,
        descripcionCorta: true,
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
      imagen: p.imagenes[0]?.url || '', // Tomar la URL de la primera imagen, o cadena vacía si no hay
      seccionIds: p.secciones.map((sec) => sec.sectionId), // Extraer solo los sectionId como array de strings
      descripcionCorta: p.descripcionCorta,
    }));

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}