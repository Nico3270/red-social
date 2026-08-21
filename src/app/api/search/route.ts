import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth.config';
import { Prisma } from '@prisma/client';

const publishedBusinessPredicate = Prisma.sql`
  n."estado" = 'activo' AND
  n."isTestData" = false AND
  n."archivedAt" IS NULL AND
  u."estado" = 'activo' AND
  u."isPlaceholder" = false AND
  u."perfilCompleto" = true
`;

const searchableUserPredicate = Prisma.sql`
  u."estado" = 'activo' AND
  u."isPlaceholder" = false AND
  (
    NOT EXISTS (
      SELECT 1
      FROM "Negocio" AS un
      WHERE un."usuarioId" = u."id"
    )
    OR (
      u."perfilCompleto" = true AND
      EXISTS (
        SELECT 1
        FROM "Negocio" AS un
        WHERE un."usuarioId" = u."id"
          AND un."estado" = 'activo'
          AND un."isTestData" = false
          AND un."archivedAt" IS NULL
      )
    )
  )
`;

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
          n.id,
          n.nombre,
          n.slug,
          n."fotoPerfil" AS thumbnail,
          ts_rank(
            to_tsvector('spanish', coalesce(n.nombre, '') || ' ' || coalesce(n.descripcion, '') || ' ' || coalesce(n.tipo::text, '')),
            to_tsquery('spanish', ${tsQuery})
          ) AS rank
        FROM "Negocio" AS n
        JOIN "Usuario" AS u ON u."id" = n."usuarioId"
        WHERE 
          ${publishedBusinessPredicate} AND
          (
            to_tsvector('spanish', coalesce(n.nombre, '') || ' ' || coalesce(n.descripcion, '') || ' ' || coalesce(n.tipo::text, ''))
            @@ to_tsquery('spanish', ${tsQuery})
            OR n.nombre % ${safeQuery}
          )
        ORDER BY rank DESC, n.orden DESC
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
        JOIN "Usuario" u ON u.id = n."usuarioId"
        WHERE 
          p.status = 'disponible' AND
          ${publishedBusinessPredicate} AND
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
        JOIN "Usuario" u ON u.id = n."usuarioId"
        WHERE 
          s.status = 'disponible' AND
          ${publishedBusinessPredicate} AND
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
          u.id,
          u.username AS nombre,
          u.username AS slug,
          u."fotoPerfil" AS thumbnail,
          ts_rank(
            to_tsvector('spanish', coalesce(u.username, '') || ' ' || coalesce(u.biografia, '')),
            to_tsquery('spanish', ${tsQuery})
          ) AS rank
        FROM "Usuario" AS u
        WHERE 
          ${searchableUserPredicate} AND
          (
            to_tsvector('spanish', coalesce(u.username, '') || ' ' || coalesce(u.biografia, ''))
            @@ to_tsquery('spanish', ${tsQuery})
            OR u.username % ${safeQuery}
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
