import { join } from 'node:path';
import {
  buildPublishedBusinessRelationWhere,
  buildPublishedBusinessWhere,
} from './src/lib/business/business-visibility-policy';

jest.mock('tsx/cjs', () => ({}));

type BusinessFixture = {
  slug: string | null;
  updatedAt: Date;
  estado: 'activo' | 'suspendido' | 'eliminado';
  isTestData: boolean;
  archivedAt: Date | null;
  usuario: {
    estado: 'activo' | 'suspendido' | 'eliminado';
    isPlaceholder: boolean;
    perfilCompleto: boolean;
  };
};

type ProductFixture = {
  slug: string | null;
  updatedAt: Date;
  negocio: BusinessFixture;
};

type CategoryFixture = {
  slug: string | null;
  updatedAt: Date;
};

type SurveyFixture = {
  id: string;
  updatedAt: Date;
  negocio: BusinessFixture;
};

type MockClient = {
  negocio: { findMany: jest.Mock };
  product: { findMany: jest.Mock };
  category: { findMany: jest.Mock };
  encuesta: { findMany: jest.Mock };
  $disconnect: jest.Mock;
};

type SitemapEntities = {
  negocios: Array<{ slug: string | null; updatedAt: Date }>;
  productos: Array<{ slug: string | null; updatedAt: Date }>;
  categorias: Array<{ slug: string | null; updatedAt: Date }>;
  encuestas: Array<{
    id: string;
    updatedAt: Date;
    negocio: { slug: string | null } | null;
  }>;
};

const {
  buildSitemapContent,
  fetchDynamicEntities,
  main,
}: {
  buildSitemapContent: (entities: SitemapEntities) => string;
  fetchDynamicEntities: (client: MockClient) => Promise<SitemapEntities>;
  main: (
    client: MockClient,
    fileSystem: { writeFileSync: jest.Mock },
  ) => Promise<void>;
} = require('./generate-sitemap.js');

const updatedAt = new Date('2026-08-17T12:00:00.000Z');
const expectedSiteUrl = process.env.SITE_URL || 'https://myckeo.com';

function business(
  overrides: Partial<Omit<BusinessFixture, 'usuario'>> = {},
  userOverrides: Partial<BusinessFixture['usuario']> = {},
): BusinessFixture {
  return {
    slug: 'negocio-publicado',
    updatedAt,
    estado: 'activo',
    isTestData: false,
    archivedAt: null,
    ...overrides,
    usuario: {
      estado: 'activo',
      isPlaceholder: false,
      perfilCompleto: true,
      ...userOverrides,
    },
  };
}

function matchesBusinessWhere(
  fixture: BusinessFixture,
  where: Record<string, any> | undefined,
): boolean {
  if (!where) return true;

  const userWhere = where.usuario?.is;
  return (
    (where.estado === undefined || fixture.estado === where.estado) &&
    (where.isTestData === undefined || fixture.isTestData === where.isTestData) &&
    (where.archivedAt === undefined || fixture.archivedAt === where.archivedAt) &&
    (!userWhere ||
      ((userWhere.estado === undefined || fixture.usuario.estado === userWhere.estado) &&
        (userWhere.isPlaceholder === undefined ||
          fixture.usuario.isPlaceholder === userWhere.isPlaceholder) &&
        (userWhere.perfilCompleto === undefined ||
          fixture.usuario.perfilCompleto === userWhere.perfilCompleto)))
  );
}

function createClient(
  fixtures: {
    negocios?: BusinessFixture[];
    productos?: ProductFixture[];
    categorias?: CategoryFixture[];
    encuestas?: SurveyFixture[];
  } = {},
): MockClient {
  const negocios = fixtures.negocios ?? [];
  const productos = fixtures.productos ?? [];
  const categorias = fixtures.categorias ?? [];
  const encuestas = fixtures.encuestas ?? [];

  return {
    negocio: {
      findMany: jest.fn(async ({ where }) =>
        negocios
          .filter((fixture) => matchesBusinessWhere(fixture, where))
          .map(({ slug, updatedAt: date }) => ({ slug, updatedAt: date })),
      ),
    },
    product: {
      findMany: jest.fn(async ({ where }) =>
        productos
          .filter((fixture) =>
            matchesBusinessWhere(fixture.negocio, where?.negocio?.is),
          )
          .map(({ slug, updatedAt: date }) => ({ slug, updatedAt: date })),
      ),
    },
    category: {
      findMany: jest.fn(async () => categorias),
    },
    encuesta: {
      findMany: jest.fn(async ({ where }) =>
        encuestas
          .filter((fixture) =>
            matchesBusinessWhere(fixture.negocio, where?.negocio?.is),
          )
          .map(({ id, updatedAt: date, negocio }) => ({
            id,
            updatedAt: date,
            negocio: { slug: negocio.slug },
          })),
      ),
    },
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };
}

function locations(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g), (match) => match[1]);
}

describe('generate-sitemap PUBLISHED visibility', () => {
  it('includes a PUBLISHED business', async () => {
    const entities = await fetchDynamicEntities(
      createClient({ negocios: [business()] }),
    );

    expect(entities.negocios.map(({ slug }) => slug)).toEqual([
      'negocio-publicado',
    ]);
  });

  it('excludes an UNLISTED placeholder business', async () => {
    const unlisted = business({}, { isPlaceholder: true, perfilCompleto: false });
    const entities = await fetchDynamicEntities(
      createClient({ negocios: [unlisted] }),
    );

    expect(entities.negocios).toEqual([]);
  });

  it('excludes a CLAIMED incomplete business', async () => {
    const claimed = business({}, { perfilCompleto: false });
    const entities = await fetchDynamicEntities(
      createClient({ negocios: [claimed] }),
    );

    expect(entities.negocios).toEqual([]);
  });

  it.each([
    ['suspended business', business({ estado: 'suspendido' })],
    ['eliminated business', business({ estado: 'eliminado' })],
    ['test business', business({ isTestData: true })],
    ['archived business', business({ archivedAt: updatedAt })],
    ['suspended owner', business({}, { estado: 'suspendido' })],
    ['eliminated owner', business({}, { estado: 'eliminado' })],
  ])('excludes a HIDDEN %s', async (_label, hidden) => {
    const entities = await fetchDynamicEntities(
      createClient({ negocios: [hidden] }),
    );

    expect(entities.negocios).toEqual([]);
  });

  it('includes a product only when its business is PUBLISHED', async () => {
    const entities = await fetchDynamicEntities(
      createClient({
        productos: [
          { slug: 'producto-publicado', updatedAt, negocio: business() },
        ],
      }),
    );

    expect(entities.productos.map(({ slug }) => slug)).toEqual([
      'producto-publicado',
    ]);
  });

  it('excludes a product from an UNLISTED business', async () => {
    const unlisted = business({}, { isPlaceholder: true, perfilCompleto: false });
    const entities = await fetchDynamicEntities(
      createClient({
        productos: [
          { slug: 'producto-unlisted', updatedAt, negocio: unlisted },
        ],
      }),
    );

    expect(entities.productos).toEqual([]);
  });

  it('includes a survey only when its business is PUBLISHED', async () => {
    const entities = await fetchDynamicEntities(
      createClient({
        encuestas: [{ id: 'survey-1', updatedAt, negocio: business() }],
      }),
    );

    expect(entities.encuestas.map(({ id }) => id)).toEqual(['survey-1']);
  });

  it('excludes a survey from an UNLISTED business', async () => {
    const unlisted = business({}, { isPlaceholder: true, perfilCompleto: false });
    const entities = await fetchDynamicEntities(
      createClient({
        encuestas: [{ id: 'survey-unlisted', updatedAt, negocio: unlisted }],
      }),
    );

    expect(entities.encuestas).toEqual([]);
  });

  it('keeps global categories independent from business visibility', async () => {
    const client = createClient({
      categorias: [{ slug: 'restaurantes', updatedAt }],
    });
    const entities = await fetchDynamicEntities(client);

    expect(entities.categorias).toEqual([
      { slug: 'restaurantes', updatedAt },
    ]);
    expect(client.category.findMany).toHaveBeenCalledWith({
      select: { slug: true, updatedAt: true },
    });
  });

  it('uses the canonical direct and relation builders in every business-dependent query', async () => {
    const client = createClient();

    await fetchDynamicEntities(client);

    expect(client.negocio.findMany).toHaveBeenCalledWith({
      where: buildPublishedBusinessWhere(),
      select: { slug: true, updatedAt: true },
    });
    expect(client.product.findMany).toHaveBeenCalledWith({
      where: { negocio: buildPublishedBusinessRelationWhere() },
      select: { slug: true, updatedAt: true },
    });
    expect(client.encuesta.findMany).toHaveBeenCalledWith({
      where: { negocio: buildPublishedBusinessRelationWhere() },
      select: {
        id: true,
        updatedAt: true,
        negocio: { select: { slug: true } },
      },
    });
  });

  it('excludes Presttigio conceptually through business, product and survey paths', async () => {
    const presttigio = business(
      { slug: 'presttigio' },
      { isPlaceholder: true, perfilCompleto: false },
    );
    const entities = await fetchDynamicEntities(
      createClient({
        negocios: [presttigio],
        productos: [
          { slug: 'producto-presttigio', updatedAt, negocio: presttigio },
        ],
        encuestas: [
          { id: 'survey-presttigio', updatedAt, negocio: presttigio },
        ],
      }),
    );

    expect(entities.negocios).toEqual([]);
    expect(entities.productos).toEqual([]);
    expect(entities.encuestas).toEqual([]);
  });

  it('preserves every current URL pattern and URL ordering', () => {
    const xml = buildSitemapContent({
      negocios: [{ slug: 'negocio-publicado', updatedAt }],
      productos: [{ slug: 'producto-publicado', updatedAt }],
      categorias: [{ slug: 'restaurantes', updatedAt }],
      encuestas: [
        {
          id: 'survey-1',
          updatedAt,
          negocio: { slug: 'negocio-publicado' },
        },
      ],
    });

    expect(locations(xml)).toEqual([
      `${expectedSiteUrl}/`,
      `${expectedSiteUrl}/inicio`,
      `${expectedSiteUrl}/carrusel`,
      `${expectedSiteUrl}/perfil/negocio-publicado`,
      `${expectedSiteUrl}/producto/producto-publicado`,
      `${expectedSiteUrl}/category/restaurantes`,
      `${expectedSiteUrl}/encuestas/negocio-publicado`,
    ]);
  });

  it('preserves XML, lastModified, changeFrequency and priority output', () => {
    const xml = buildSitemapContent({
      negocios: [{ slug: 'negocio-publicado', updatedAt }],
      productos: [{ slug: null, updatedAt }],
      categorias: [{ slug: null, updatedAt }],
      encuestas: [{ id: 'survey-1', updatedAt, negocio: null }],
    }).trim();

    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(xml).toContain('<lastmod>2026-08-17T12:00:00.000Z</lastmod>');
    expect(xml).toContain('<changefreq>daily</changefreq>');
    expect(xml).toContain('<priority>0.8</priority>');
    expect(locations(xml)).toHaveLength(4);
    expect(xml.endsWith('</urlset>')).toBe(true);
  });

  it('writes the same sitemap target through the production orchestration without DB access', async () => {
    const client = createClient({ negocios: [business()] });
    const fileSystem = { writeFileSync: jest.fn() };
    const consoleLog = jest.spyOn(console, 'log').mockImplementation();

    await main(client, fileSystem);

    expect(fileSystem.writeFileSync).toHaveBeenCalledWith(
      join(process.cwd(), 'public', 'sitemap.xml'),
      expect.stringContaining(
        `<loc>${expectedSiteUrl}/perfil/negocio-publicado</loc>`,
      ),
    );
    expect(client.$disconnect).toHaveBeenCalledTimes(1);
    consoleLog.mockRestore();
  });
});
