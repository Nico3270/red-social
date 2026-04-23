import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth.config';

// Sanitize query string to prevent SQL injection
function sanitizeQuery(query: string): string {
  return query.replace(/[^a-zA-Z0-9\s]/g, '').trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const type = searchParams.get('type') || '';

    // Validate limit (max 15 for performance)
    const safeLimit = Math.min(limit, 15);
    const safeQuery = sanitizeQuery(query);

    // If no query, return empty array
    if (!safeQuery) {
      return NextResponse.json([]);
    }

    // Get session for personalized results
    const session = await auth();
    const userId = session?.user?.id;

    // Build tsquery for full-text search
    const tsQuery = safeQuery
      .split(' ')
      .map((word) => `${word}:*`)
      .join(' & ');

    // Initialize results array
    const results: Array<{
      id: string;
      name: string;
      type: 'negocio' | 'usuario' | 'producto' | 'servicio' | 'category';
      slug: string;
      thumbnail?: string;
      tab?: string;
    }> = [];

    // Define types to query
    const typesToQuery = type
      ? [type]
      : ['negocio', 'usuario', 'producto', 'servicio', 'category'];

    // Negocio search
    if (typesToQuery.includes('negocio')) {
      const negocios = await prisma.$queryRaw<
        Array<{
          id: string;
          nombre: string;
          slug: string;
          fotoPerfil?: string;
          rank: number;
        }>
      >`
        SELECT 
          id,
          nombre,
          slug,
          "fotoPerfil" AS thumbnail,
          ts_rank(
            to_tsvector('spanish', coalesce(nombre, '') || ' ' || coalesce(descripcion, '') || ' ' || coalesce(tipo::text, '')),
            to_tsquery('spanish', ${tsQuery})
          ) AS rank
        FROM "Negocio"
        WHERE 
          estado = 'activo' AND
          "isTestData" = false AND
          "archivedAt" IS NULL AND
          (
            to_tsvector('spanish', coalesce(nombre, '') || ' ' || coalesce(descripcion, '') || ' ' || coalesce(tipo::text, '')) 
            @@ to_tsquery('spanish', ${tsQuery})
            OR nombre % ${safeQuery}
          )
        ORDER BY rank DESC, orden DESC
        LIMIT ${safeLimit} OFFSET ${offset}
      `;
      results.push(
        ...negocios.map((negocio) => ({
          id: negocio.id,
          name: negocio.nombre,
          type: 'negocio' as const,
          slug: negocio.slug,
          thumbnail: negocio.fotoPerfil
        })),
      );
    }

    // Product search
    if (typesToQuery.includes('producto')) {
      const productos = await prisma.$queryRaw<
        Array<{
          id: string;
          nombre: string;
          slug: string;
          imagen?: string;
          rank: number;
        }>
      >`
        SELECT 
          p.id,
          p.nombre,
          p.slug,
          (SELECT url FROM "Image" WHERE "productId" = p.id LIMIT 1) AS imagen,
          ts_rank(
            to_tsvector('spanish', coalesce(p.nombre, '') || ' ' || coalesce(p.descripcion, '') || ' ' || coalesce(p."descripcionCorta", '')),
            to_tsquery('spanish', ${tsQuery})
          ) AS rank
        FROM "Product" p
        JOIN "Negocio" n ON p."negocioId" = n.id
        WHERE 
          p.status = 'disponible' AND
          n.estado = 'activo' AND
          n."isTestData" = false AND
          n."archivedAt" IS NULL AND
          (
            to_tsvector('spanish', coalesce(p.nombre, '') || ' ' || coalesce(p.descripcion, '') || ' ' || coalesce(p."descripcionCorta", '')) 
            @@ to_tsquery('spanish', ${tsQuery})
            OR p.nombre % ${safeQuery}
          )
        ORDER BY rank DESC, "ratingPromedio" DESC NULLS LAST
        LIMIT ${safeLimit} OFFSET ${offset}
      `;
      results.push(
        ...productos.map((producto) => ({
          id: producto.id,
          name: producto.nombre,
          type: 'producto' as const,
          slug: producto.slug,
          thumbnail: producto.imagen,
        })),
      );
    }

    // Servicio search
    if (typesToQuery.includes('servicio')) {
      const servicios = await prisma.$queryRaw<
        Array<{
          id: string;
          nombre: string;
          slug: string;
          negocioSlug: string;
          imagen?: string;
          rank: number;
        }>
      >`
        SELECT 
          s.id,
          s.titulo AS nombre,
          n.slug AS "negocioSlug",
          (SELECT url FROM "Media" WHERE "servicioId" = s.id AND tipo = 'IMAGEN' LIMIT 1) AS imagen,
          ts_rank(
            to_tsvector('spanish', coalesce(s.titulo, '') || ' ' || array_to_string(s.descripcion, ' ')),
            to_tsquery('spanish', ${tsQuery})
          ) AS rank
        FROM "Servicio" s
        JOIN "Negocio" n ON s."negocioId" = n.id
        WHERE 
          s.status = 'disponible' AND
          n.estado = 'activo' AND
          n."isTestData" = false AND
          n."archivedAt" IS NULL AND
          (
            to_tsvector('spanish', coalesce(s.titulo, '') || ' ' || array_to_string(s.descripcion, ' ')) 
            @@ to_tsquery('spanish', ${tsQuery})
            OR s.titulo % ${safeQuery}
          )
        ORDER BY rank DESC, s.orden DESC
        LIMIT ${safeLimit} OFFSET ${offset}
      `;
      results.push(
        ...servicios.map((servicio) => ({
          id: servicio.id,
          name: servicio.nombre,
          type: 'servicio' as const,
          slug: servicio.negocioSlug,
          thumbnail: servicio.imagen,
          tab: 'Negocio',
        })),
      );
    }

    // Usuario search
    if (typesToQuery.includes('usuario')) {
      const usuarios = await prisma.$queryRaw<
        Array<{
          id: string;
          username: string;
          slug: string;
          fotoPerfil?: string;
          rank: number;
        }>
      >`
        SELECT 
          id,
          username AS nombre,
          username AS slug,
          "fotoPerfil" AS thumbnail,
          ts_rank(
            to_tsvector('spanish', coalesce(username, '') || ' ' || coalesce(biografia, '')),
            to_tsquery('spanish', ${tsQuery})
          ) AS rank
        FROM "Usuario"
        WHERE 
          estado = 'activo' AND
          (
            to_tsvector('spanish', coalesce(username, '') || ' ' || coalesce(biografia, '')) 
            @@ to_tsquery('spanish', ${tsQuery})
            OR username % ${safeQuery}
          )
        ORDER BY rank DESC
        LIMIT ${safeLimit} OFFSET ${offset}
      `;
      results.push(
        ...usuarios.map((usuario) => ({
          id: usuario.id,
          name: usuario.username,
          type: 'usuario' as const,
          slug: usuario.slug,
          thumbnail: usuario.fotoPerfil,
        })),
      );
    }

    // Category search
    if (typesToQuery.includes('category')) {
      const categories = await prisma.$queryRaw<
        Array<{
          id: string;
          nombre: string;
          slug: string;
          iconName?: string;
          rank: number;
        }>
      >`
        SELECT 
          id,
          nombre,
          slug,
          "iconName" AS thumbnail,
          ts_rank(
            to_tsvector('spanish', coalesce(nombre, '')),
            to_tsquery('spanish', ${tsQuery})
          ) AS rank
        FROM "Category"
        WHERE 
          "isActive" = true AND
          (
            to_tsvector('spanish', coalesce(nombre, '')) 
            @@ to_tsquery('spanish', ${tsQuery})
            OR nombre % ${safeQuery}
          )
        ORDER BY rank DESC
        LIMIT ${safeLimit} OFFSET ${offset}
      `;
      results.push(
        ...categories.map((category) => ({
          id: category.id,
          name: category.nombre,
          type: 'category' as const,
          slug: category.slug,

        })),
      );
    }

    // Personalize results for logged-in user
    if (userId && results.length > 0) {
      const followedBusinessIds = await prisma.follow.findMany({
        where: {
          followerId: userId,
          type: 'USER_TO_BUSINESS',
        },
        select: { followedBusinessId: true },
      });
      const followedIds = new Set(followedBusinessIds.map((f) => f.followedBusinessId));
      results.sort((a, b) => {
        const aIsFollowed = a.type === 'negocio' && followedIds.has(a.id) ? 1 : 0;
        const bIsFollowed = b.type === 'negocio' && followedIds.has(b.id) ? 1 : 0;
        return bIsFollowed - aIsFollowed;
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
