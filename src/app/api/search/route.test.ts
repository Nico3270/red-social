import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Prisma } from '@prisma/client';

const mockQueryRaw = jest.fn();
const mockFollowFindMany = jest.fn();
const mockAuth = jest.fn();

jest.mock(
  '@/lib/prisma',
  () => ({
    __esModule: true,
    default: {
      $queryRaw: mockQueryRaw,
      follow: { findMany: mockFollowFindMany },
    },
  }),
  { virtual: true },
);

jest.mock(
  '@/auth.config',
  () => ({
    auth: mockAuth,
  }),
  { virtual: true },
);

import { GET } from './route';

type CapturedQuery = {
  text: string;
  values: readonly unknown[];
};

const capturedQueries: CapturedQuery[] = [];
const queuedResults: unknown[][] = [];

function compactSql(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function request(
  query: string,
  type?: 'negocio' | 'usuario' | 'producto' | 'servicio' | 'category',
  extra = '',
): Request {
  const typeParam = type ? `&type=${type}` : '';
  return new Request(`http://localhost/api/search?query=${encodeURIComponent(query)}${typeParam}${extra}`);
}

function onlyQuery(): CapturedQuery {
  expect(capturedQueries).toHaveLength(1);
  return capturedQueries[0];
}

function expectPublishedBusinessSql(text: string): void {
  expect(text).toContain(`n."estado" = 'activo'`);
  expect(text).toContain('n."isTestData" = false');
  expect(text).toContain('n."archivedAt" IS NULL');
  expect(text).toContain(`u."estado" = 'activo'`);
  expect(text).toContain('u."isPlaceholder" = false');
  expect(text).toContain('u."perfilCompleto" = true');
}

function expectUserBaseSql(text: string): void {
  expect(text).toContain(`u."estado" = 'activo'`);
  expect(text).toContain('u."isPlaceholder" = false');
  expect(text.indexOf(`u."estado" = 'activo'`)).toBeLessThan(text.indexOf('NOT EXISTS'));
  expect(text.indexOf('u."isPlaceholder" = false')).toBeLessThan(text.indexOf('NOT EXISTS'));
}

function expectOrdinaryUserBranchSql(text: string): void {
  expect(text).toMatch(
    /NOT EXISTS \( SELECT 1 FROM "Negocio" AS un WHERE un\."usuarioId" = u\."id" \) OR \( u\."perfilCompleto" = true AND EXISTS/,
  );
}

function expectPublishedOwnerBranchSql(text: string): void {
  expect(text).toContain('u."perfilCompleto" = true AND EXISTS');
  expect(text).toContain('un."usuarioId" = u."id"');
  expect(text).toContain(`un."estado" = 'activo'`);
  expect(text).toContain('un."isTestData" = false');
  expect(text).toContain('un."archivedAt" IS NULL');
}

describe('GET /api/search PUBLISHED visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedQueries.length = 0;
    queuedResults.length = 0;
    mockAuth.mockResolvedValue(null);
    mockFollowFindMany.mockResolvedValue([]);
    mockQueryRaw.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = Prisma.sql(strings, ...values);
      capturedQueries.push({
        text: compactSql(sql.text),
        values: sql.values,
      });
      return Promise.resolve(queuedResults.shift() ?? []);
    });
  });

  it('returns the existing empty contract without auth or SQL for a sanitized-empty query', async () => {
    const response = await GET(request('---'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
    expect(mockAuth).not.toHaveBeenCalled();
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it('requires a PUBLISHED owner for direct business search and preserves its response', async () => {
    queuedResults.push([
      {
        id: 'business-1',
        nombre: 'Negocio publicado',
        slug: 'negocio-publicado',
        fotoPerfil: 'profile.jpg',
        rank: 1,
      },
    ]);

    const response = await GET(request('negocio', 'negocio'));
    const query = onlyQuery();

    expect(query.text).toContain('FROM "Negocio" AS n');
    expect(query.text).toContain('JOIN "Usuario" AS u ON u."id" = n."usuarioId"');
    expectPublishedBusinessSql(query.text);
    await expect(response.json()).resolves.toEqual([
      {
        id: 'business-1',
        name: 'Negocio publicado',
        type: 'negocio',
        slug: 'negocio-publicado',
        thumbnail: 'profile.jpg',
      },
    ]);
  });

  it('excludes an UNLISTED business from direct business discovery', async () => {
    await GET(request('unlisted', 'negocio'));

    const { text } = onlyQuery();
    expectPublishedBusinessSql(text);
    expect(text).toContain('JOIN "Usuario" AS u');
  });

  it('requires Product -> Negocio -> Usuario PUBLISHED while preserving availability', async () => {
    queuedResults.push([
      {
        id: 'product-1',
        nombre: 'Producto publicado',
        slug: 'producto-publicado',
        imagen: 'product.jpg',
        rank: 1,
      },
    ]);

    const response = await GET(request('producto', 'producto'));
    const query = onlyQuery();

    expect(query.text).toContain('FROM "Product" p');
    expect(query.text).toContain('JOIN "Negocio" n ON p."negocioId" = n.id');
    expect(query.text).toContain('JOIN "Usuario" u ON u.id = n."usuarioId"');
    expect(query.text).toContain(`p.status = 'disponible'`);
    expectPublishedBusinessSql(query.text);
    await expect(response.json()).resolves.toEqual([
      {
        id: 'product-1',
        name: 'Producto publicado',
        type: 'producto',
        slug: 'producto-publicado',
        thumbnail: 'product.jpg',
      },
    ]);
  });

  it('excludes a product owned by an UNLISTED business', async () => {
    await GET(request('unlisted product', 'producto'));

    const { text } = onlyQuery();
    expect(text).toContain('JOIN "Negocio" n ON p."negocioId" = n.id');
    expect(text).toContain('JOIN "Usuario" u ON u.id = n."usuarioId"');
    expectPublishedBusinessSql(text);
  });

  it('requires Servicio -> Negocio -> Usuario PUBLISHED while preserving availability', async () => {
    queuedResults.push([
      {
        id: 'service-1',
        nombre: 'Servicio publicado',
        negocioSlug: 'negocio-publicado',
        imagen: 'service.jpg',
        rank: 1,
      },
    ]);

    const response = await GET(request('servicio', 'servicio'));
    const query = onlyQuery();

    expect(query.text).toContain('FROM "Servicio" s');
    expect(query.text).toContain('JOIN "Negocio" n ON s."negocioId" = n.id');
    expect(query.text).toContain('JOIN "Usuario" u ON u.id = n."usuarioId"');
    expect(query.text).toContain(`s.status = 'disponible'`);
    expectPublishedBusinessSql(query.text);
    await expect(response.json()).resolves.toEqual([
      {
        id: 'service-1',
        name: 'Servicio publicado',
        type: 'servicio',
        slug: 'negocio-publicado',
        thumbnail: 'service.jpg',
        tab: 'Negocio',
      },
    ]);
  });

  it('excludes a service owned by an UNLISTED business', async () => {
    await GET(request('unlisted service', 'servicio'));

    const { text } = onlyQuery();
    expect(text).toContain('JOIN "Negocio" n ON s."negocioId" = n.id');
    expect(text).toContain('JOIN "Usuario" u ON u.id = n."usuarioId"');
    expectPublishedBusinessSql(text);
  });

  it('keeps an active non-placeholder ordinary user eligible without requiring perfilCompleto', async () => {
    queuedResults.push([
      {
        id: 'ordinary-1',
        username: 'ordinary',
        slug: 'ordinary',
        fotoPerfil: 'ordinary.jpg',
        rank: 1,
      },
    ]);

    const response = await GET(request('ordinary', 'usuario'));
    const query = onlyQuery();

    expectUserBaseSql(query.text);
    expectOrdinaryUserBranchSql(query.text);
    await expect(response.json()).resolves.toEqual([
      {
        id: 'ordinary-1',
        name: 'ordinary',
        type: 'usuario',
        slug: 'ordinary',
        thumbnail: 'ordinary.jpg',
      },
    ]);
  });

  it('keeps perfilCompleto=false eligible in the ordinary-user no-business branch', async () => {
    await GET(request('incomplete ordinary', 'usuario'));

    const { text } = onlyQuery();
    expectUserBaseSql(text);
    expectOrdinaryUserBranchSql(text);
    const ordinaryBranch = text.slice(text.indexOf('NOT EXISTS'), text.indexOf('OR ( u."perfilCompleto" = true'));
    expect(ordinaryBranch).not.toContain('perfilCompleto');
  });

  it('allows a business owner only through the PUBLISHED EXISTS branch', async () => {
    queuedResults.push([
      {
        id: 'owner-1',
        username: 'published-owner',
        slug: 'published-owner',
        fotoPerfil: 'owner.jpg',
        rank: 1,
      },
    ]);

    const response = await GET(request('owner', 'usuario'));
    const { text } = onlyQuery();

    expectUserBaseSql(text);
    expectPublishedOwnerBranchSql(text);
    await expect(response.json()).resolves.toEqual([
      {
        id: 'owner-1',
        name: 'published-owner',
        type: 'usuario',
        slug: 'published-owner',
        thumbnail: 'owner.jpg',
      },
    ]);
  });

  it('excludes a placeholder without a business from user discovery', async () => {
    await GET(request('placeholder', 'usuario'));

    const { text } = onlyQuery();
    expectUserBaseSql(text);
    expectOrdinaryUserBranchSql(text);
  });

  it('excludes an UNLISTED placeholder owner from user discovery', async () => {
    await GET(request('unlisted placeholder owner', 'usuario'));

    const { text } = onlyQuery();
    expectUserBaseSql(text);
    expectPublishedOwnerBranchSql(text);
  });

  it('excludes a CLAIMED incomplete owner from user discovery', async () => {
    await GET(request('claimed incomplete', 'usuario'));

    const { text } = onlyQuery();
    expectUserBaseSql(text);
    expectPublishedOwnerBranchSql(text);
  });

  it('excludes HIDDEN businesses and owners from user discovery', async () => {
    await GET(request('hidden owner', 'usuario'));

    const { text } = onlyQuery();
    expectUserBaseSql(text);
    expectPublishedOwnerBranchSql(text);
  });

  it('leaves Category SQL and response behavior unchanged', async () => {
    queuedResults.push([
      {
        id: 'category-1',
        nombre: 'Restaurantes',
        slug: 'restaurantes',
        iconName: 'restaurant',
        rank: 1,
      },
    ]);

    const response = await GET(request('restaurantes', 'category'));
    const query = onlyQuery();

    expect(query.text).toContain('FROM "Category"');
    expect(query.text).toContain('"isActive" = true');
    expect(query.text).not.toContain('JOIN "Usuario"');
    expect(query.text).not.toContain('isPlaceholder');
    await expect(response.json()).resolves.toEqual([
      {
        id: 'category-1',
        name: 'Restaurantes',
        type: 'category',
        slug: 'restaurantes',
      },
    ]);
  });

  it.each([
    ['negocio', 'FROM "Negocio" AS n'],
    ['usuario', 'FROM "Usuario" AS u'],
    ['producto', 'FROM "Product" p'],
    ['servicio', 'FROM "Servicio" s'],
    ['category', 'FROM "Category"'],
  ] as const)('keeps type=%s limited to its existing branch', async (type, from) => {
    await GET(request('needle', type));

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(onlyQuery().text).toContain(from);
  });

  it('preserves full-text, trigram and entity-specific ranking', async () => {
    await GET(request('needle'));

    expect(capturedQueries).toHaveLength(5);
    for (const query of capturedQueries) {
      expect(query.text).toContain("to_tsvector('spanish'");
      expect(query.text).toContain("to_tsquery('spanish'");
      expect(query.text).toContain('ts_rank(');
      expect(query.text).toContain('ORDER BY rank DESC');
      expect(query.text).toContain(' % ');
    }
    expect(capturedQueries[0].text).toContain('ORDER BY rank DESC, n.orden DESC');
    expect(capturedQueries[1].text).toContain('ORDER BY rank DESC, "ratingPromedio" DESC NULLS LAST');
    expect(capturedQueries[2].text).toContain('ORDER BY rank DESC, s.orden DESC');
  });

  it('preserves followed-business personalization after SQL eligibility', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'viewer-1' } });
    mockFollowFindMany.mockResolvedValue([{ followedBusinessId: 'business-followed' }]);
    queuedResults.push(
      [
        {
          id: 'business-other',
          nombre: 'Otro negocio',
          slug: 'otro-negocio',
          rank: 2,
        },
        {
          id: 'business-followed',
          nombre: 'Negocio seguido',
          slug: 'negocio-seguido',
          rank: 1,
        },
      ],
      [
        {
          id: 'ordinary-1',
          username: 'ordinary',
          slug: 'ordinary',
          rank: 1,
        },
      ],
      [],
      [],
      [],
    );

    const response = await GET(request('needle'));
    const body = await response.json();

    expect(mockFollowFindMany).toHaveBeenCalledWith({
      where: {
        followerId: 'viewer-1',
        type: 'USER_TO_BUSINESS',
      },
      select: { followedBusinessId: true },
    });
    expect(body.map((result: { id: string }) => result.id)).toEqual([
      'business-followed',
      'business-other',
      'ordinary-1',
    ]);
  });

  it('keeps query, limit and offset parameterized for hostile input', async () => {
    await GET(request("x'); DROP TABLE Usuario; --", 'negocio', '&limit=99&offset=3'));

    const query = onlyQuery();
    expect(query.text).not.toContain('DROP TABLE');
    expect(query.text).toContain('LIMIT $4 OFFSET $5');
    expect(query.values).toEqual([
      'x:* & DROP:* & TABLE:* & Usuario:*',
      'x:* & DROP:* & TABLE:* & Usuario:*',
      'x DROP TABLE Usuario',
      15,
      3,
    ]);
  });

  it('structurally excludes a PREVIEW_READY business from all four discovery paths', async () => {
    for (const type of ['negocio', 'producto', 'servicio'] as const) {
      capturedQueries.length = 0;
      await GET(request('presttigio', type));
      expectPublishedBusinessSql(onlyQuery().text);
    }

    capturedQueries.length = 0;
    await GET(request('presttigio', 'usuario'));
    const userSql = onlyQuery().text;
    expect(userSql).toContain('u."isPlaceholder" = false');
    expect(userSql).toContain('u."perfilCompleto" = true AND EXISTS');
  });

  it('uses only tagged queryRaw and fixed Prisma.sql fragments', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/api/search/route.ts'), 'utf8');

    expect(source).not.toContain('$queryRawUnsafe');
    expect(source).not.toContain('Prisma.raw');
    expect(source).not.toMatch(/export\s+(const|function)\s+(publishedBusinessPredicate|searchableUserPredicate)/);
    expect(source.match(/Prisma\.sql`/g)).toHaveLength(2);
  });

  it('preserves the existing 500 response when a search query fails', async () => {
    const error = new Error('raw search failed');
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockQueryRaw.mockRejectedValueOnce(error);

    const response = await GET(request('needle', 'negocio'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Internal server error',
    });
    expect(consoleError).toHaveBeenCalledWith('Search API error:', error);
    consoleError.mockRestore();
  });
});
