import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { buildPublishedBusinessWhere } from '../../../../lib/business/business-visibility-policy';
import { buildPublicBusinessBySlugWhere } from '../../../../lib/business/publicBusinessVisibility';

type BusinessFixture = {
  slug: string;
  estado: 'activo' | 'suspendido' | 'eliminado';
  isTestData: boolean;
  archivedAt: Date | null;
  usuario: {
    estado: 'activo' | 'suspendido' | 'eliminado';
    isPlaceholder: boolean;
    perfilCompleto: boolean;
  };
};

type BusinessWhere = {
  slug?: string;
  estado?: BusinessFixture['estado'];
  isTestData?: boolean;
  archivedAt?: Date | null;
  usuario?: {
    is?: Partial<BusinessFixture['usuario']>;
  };
};

const pagePath = join(__dirname, 'page.tsx');
const loaderPath = join(
  process.cwd(),
  'src/actions/perfil/getInfoPerfilSlugNegocio.ts',
);
const pageSource = readFileSync(pagePath, 'utf8');
const staticParamsSource = pageSource.slice(
  pageSource.indexOf('export async function generateStaticParams'),
  pageSource.indexOf('// Página principal del perfil de negocio'),
);
const metadataSource = pageSource.slice(
  pageSource.indexOf('export async function generateMetadata'),
);
const pageComponentSource = pageSource.slice(
  pageSource.indexOf('export default async function NegocioPage'),
  pageSource.indexOf('// Revalidación ISR'),
);

type MetadataProfile = {
  visibility: 'HIDDEN' | 'UNLISTED' | 'PUBLISHED';
  nombreNegocio: string;
  descripcionNegocio: string;
  imagenPortada: string;
  imagenPerfil: string;
  ciudadNegocio: string;
  departamentoNegocio: string;
  telefonoNegocio: string;
  facebook: string;
  instagram: string;
};

type GeneratedMetadata = {
  title?: unknown;
  description?: unknown;
  robots?: unknown;
  alternates?: { canonical?: unknown };
  openGraph?: Record<string, unknown>;
  twitter?: Record<string, unknown>;
  other?: Record<string, string>;
};

let metadataProfile: MetadataProfile | undefined;
const mockMetadataLoader = jest.fn(async () => ({ negocio: metadataProfile }));

function requireForCompiledPage(moduleId: string): unknown {
  switch (moduleId) {
    case 'react/jsx-runtime':
      return { jsx: jest.fn(), jsxs: jest.fn() };
    case '@/actions/perfil/getInfoPerfilSlugNegocio':
      return { getInfoPerfilBySlugNegocio: mockMetadataLoader };
    case '@/actions/productos/getNegocioProductsBySlug':
      return { getNegocioProductsBySlug: jest.fn() };
    case '@/publicaciones/actions/getPublicaciones':
      return { getPublicacionesNegocio: jest.fn() };
    case '@/lib/prisma':
      return {
        __esModule: true,
        default: { negocio: { findMany: jest.fn() } },
      };
    case '@/auth.config':
      return { auth: jest.fn() };
    case '@/ui/components/perfil-usuario-header/PerfilUsuarioHeader':
      return { __esModule: true, default: jest.fn() };
    case 'react':
      return { Suspense: jest.fn() };
    case 'next/cache':
      return { unstable_cache: jest.fn() };
    case '@/perfil/actions/getConteosSecciones':
      return { getConteosSecciones: jest.fn() };
    case '@/actions/catalogGroups/preloadProfileCatalog':
      return { preloadProfileCatalogData: jest.fn() };
    case '@/lib/business/business-visibility-policy':
      return { buildPublishedBusinessWhere: jest.fn() };
    case '@/lib/media/resolveSafeImageSource':
      return {
        PLACEHOLDER_BUSINESS_IMAGE: '/placeholder-business.svg',
        resolveSafeImageSource: (source: string, fallback: string) =>
          source || fallback,
      };
    default:
      throw new Error(`Unexpected compiled page import: ${moduleId}`);
  }
}

function loadGenerateMetadata(): (
  props: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string>>;
  },
) => Promise<GeneratedMetadata> {
  const compiledSource = ts.transpileModule(pageSource, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const compiledModule: { exports: Record<string, unknown> } = { exports: {} };

  runInNewContext(compiledSource, {
    console,
    exports: compiledModule.exports,
    module: compiledModule,
    process,
    require: requireForCompiledPage,
  });

  return compiledModule.exports.generateMetadata as ReturnType<
    typeof loadGenerateMetadata
  >;
}

const generateMetadataUnderTest = loadGenerateMetadata();
const siteUrl = (process.env.SITE_URL || 'https://myckeo.com').replace(/\/$/, '');

function profile(
  visibility: MetadataProfile['visibility'],
): MetadataProfile {
  return {
    visibility,
    nombreNegocio: 'Negocio fixture',
    descripcionNegocio: 'Descripción fixture',
    imagenPortada: 'https://images.example/portada.jpg',
    imagenPerfil: 'https://images.example/perfil.jpg',
    ciudadNegocio: 'Bogotá',
    departamentoNegocio: 'Cundinamarca',
    telefonoNegocio: '+573001112233',
    facebook: 'https://facebook.example/business',
    instagram: 'https://instagram.example/business',
  };
}

async function metadataFor(
  visibility: MetadataProfile['visibility'],
  slug = 'negocio-fixture',
): Promise<GeneratedMetadata> {
  metadataProfile = profile(visibility);
  return generateMetadataUnderTest({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve({}),
  });
}

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function business(
  overrides: Partial<Omit<BusinessFixture, 'usuario'>> = {},
  userOverrides: Partial<BusinessFixture['usuario']> = {},
): BusinessFixture {
  return {
    slug: 'negocio-publicado',
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
  input: unknown,
): boolean {
  const where = input as BusinessWhere | undefined;
  if (!where) return true;

  const userWhere = where.usuario?.is;
  return (
    (where.slug === undefined || fixture.slug === where.slug) &&
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

function staticParamsFor(fixtures: BusinessFixture[]): Array<{ slug: string }> {
  const where = buildPublishedBusinessWhere();
  return fixtures
    .filter((fixture) => matchesBusinessWhere(fixture, where))
    .map(({ slug }) => ({ slug }));
}

describe('/perfil/[slug] generateStaticParams PUBLISHED visibility', () => {
  it('includes a PUBLISHED slug', () => {
    expect(staticParamsFor([business({ slug: 'negocio-publicado' })])).toEqual([
      { slug: 'negocio-publicado' },
    ]);
  });

  it('excludes an UNLISTED placeholder slug', () => {
    const presttigio = business(
      { slug: 'presttigio' },
      { isPlaceholder: true, perfilCompleto: false },
    );

    expect(staticParamsFor([presttigio])).toEqual([]);
  });

  it('excludes a CLAIMED incomplete slug', () => {
    const claimed = business(
      { slug: 'claimed-incomplete' },
      { perfilCompleto: false },
    );

    expect(staticParamsFor([claimed])).toEqual([]);
  });

  it.each([
    ['suspended business', business({ estado: 'suspendido' })],
    ['eliminated business', business({ estado: 'eliminado' })],
    ['test business', business({ isTestData: true })],
    ['archived business', business({ archivedAt: new Date('2026-08-17') })],
    ['suspended owner', business({}, { estado: 'suspendido' })],
    ['eliminated owner', business({}, { estado: 'eliminado' })],
  ])('excludes a HIDDEN %s', (_label, hidden) => {
    expect(staticParamsFor([hidden])).toEqual([]);
  });

  it('uses the canonical PUBLISHED builder while preserving select and take', () => {
    expect(pageSource).toContain(
      'import { buildPublishedBusinessWhere } from "@/lib/business/business-visibility-policy"',
    );
    expect(staticParamsSource).toMatch(
      /where:\s*buildPublishedBusinessWhere\(\)/,
    );
    expect(staticParamsSource).toContain('select: { slug: true }');
    expect(staticParamsSource).toContain('take: 100');
  });

  it('preserves the params shape as { slug: string }', () => {
    const params = staticParamsFor([
      business({ slug: 'primero' }),
      business({ slug: 'segundo' }),
    ]);

    expect(params).toEqual([{ slug: 'primero' }, { slug: 'segundo' }]);
    expect(Object.keys(params[0])).toEqual(['slug']);
    expect(staticParamsSource).toContain(
      'return slugs.map((negocio) => ({ slug: negocio.slug }))',
    );
  });

  it('contains no DIRECT builder in generateStaticParams', () => {
    expect(staticParamsSource).not.toContain(
      'buildPublicBusinessVisibilityWhere',
    );
    expect(staticParamsSource).not.toContain(
      'buildDirectVisibleBusinessWhere',
    );
  });

  it('keeps the page loader on the DIRECT by-slug seam', () => {
    const loaderSource = readFileSync(loaderPath, 'utf8');

    expect(pageSource).toContain('getInfoPerfilBySlugNegocio(slug)');
    expect(loaderSource).toContain(
      'where: buildPublicBusinessBySlugWhere(slugNegocio)',
    );
  });

  it('keeps an UNLISTED placeholder eligible for the DIRECT loader predicate', () => {
    const presttigio = business(
      { slug: 'presttigio' },
      { isPlaceholder: true, perfilCompleto: false },
    );

    expect(
      matchesBusinessWhere(
        presttigio,
        buildPublicBusinessBySlugWhere('presttigio'),
      ),
    ).toBe(true);
  });

  it('keeps HIDDEN businesses outside the DIRECT loader predicate', () => {
    const hidden = business({ slug: 'hidden', estado: 'suspendido' });

    expect(
      matchesBusinessWhere(hidden, buildPublicBusinessBySlugWhere('hidden')),
    ).toBe(false);
  });

  describe('SEO metadata by canonical visibility', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      metadataProfile = undefined;
    });

    it('keeps PUBLISHED indexable and followable', async () => {
      const metadata = await metadataFor('PUBLISHED');

      expect(metadata.robots).toBe('index, follow');
    });

    it('makes UNLISTED noindex and nofollow without contradictory googleBot directives', async () => {
      const metadata = plain(await metadataFor('UNLISTED'));

      expect(metadata.robots).toEqual({ index: false, follow: false });
      expect(metadata.robots).not.toHaveProperty('googleBot');
      expect(metadataSource).not.toContain('googleBot');
    });

    it('keeps the PUBLISHED canonical unchanged', async () => {
      const metadata = await metadataFor('PUBLISHED', 'publicado');

      expect(metadata.alternates?.canonical).toBe(
        `${siteUrl}/perfil/publicado`,
      );
    });

    it('keeps an UNLISTED self-canonical URL', async () => {
      const metadata = await metadataFor('UNLISTED', 'presttigio');

      expect(metadata.alternates?.canonical).toBe(
        `${siteUrl}/perfil/presttigio`,
      );
    });

    it('keeps existing PUBLISHED title, description, OpenGraph and Twitter metadata', async () => {
      const metadata = plain(await metadataFor('PUBLISHED', 'publicado'));

      expect(metadata.title).toBe('Negocio fixture | Myckeo');
      expect(metadata.description).toBe('Descripción fixture');
      expect(metadata.openGraph).toEqual({
        title: 'Negocio fixture | Myckeo',
        description: 'Descripción fixture',
        url: `${siteUrl}/perfil/publicado`,
        siteName: 'Myckeo',
        images: [
          {
            url: 'https://images.example/portada.jpg',
            width: 1200,
            height: 630,
            alt: 'Negocio fixture',
          },
        ],
        locale: 'es_ES',
        type: 'website',
      });
      expect(metadata.twitter).toEqual({
        card: 'summary_large_image',
        title: 'Negocio fixture | Myckeo',
        description: 'Descripción fixture',
        images: ['https://images.example/portada.jpg'],
      });
    });

    it('keeps useful title, description, OpenGraph and Twitter metadata for UNLISTED sharing', async () => {
      const metadata = plain(await metadataFor('UNLISTED', 'presttigio'));

      expect(metadata.title).toBe('Negocio fixture | Myckeo');
      expect(metadata.description).toBe('Descripción fixture');
      expect(metadata.openGraph).toEqual(
        expect.objectContaining({
          title: 'Negocio fixture | Myckeo',
          description: 'Descripción fixture',
          url: `${siteUrl}/perfil/presttigio`,
          images: [
            expect.objectContaining({
              url: 'https://images.example/portada.jpg',
            }),
          ],
        }),
      );
      expect(metadata.twitter).toEqual(
        expect.objectContaining({
          card: 'summary_large_image',
          title: 'Negocio fixture | Myckeo',
        }),
      );
    });

    it('keeps LocalBusiness JSON-LD for PUBLISHED', async () => {
      const metadata = await metadataFor('PUBLISHED', 'publicado');
      const structuredData = JSON.parse(
        metadata.other?.['script:ld+json'] || '{}',
      );

      expect(structuredData).toEqual(
        expect.objectContaining({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'Negocio fixture',
          url: `${siteUrl}/perfil/publicado`,
        }),
      );
    });

    it('omits LocalBusiness JSON-LD entirely for UNLISTED', async () => {
      const metadata = await metadataFor('UNLISTED', 'presttigio');

      expect(metadata.other).toBeUndefined();
    });

    it('treats CLAIMED incomplete through its canonical UNLISTED visibility', async () => {
      const metadata = plain(
        await metadataFor('UNLISTED', 'claimed-incomplete'),
      );

      expect(metadata.robots).toEqual({ index: false, follow: false });
      expect(metadata.other).toBeUndefined();
      expect(metadata.alternates?.canonical).toBe(
        `${siteUrl}/perfil/claimed-incomplete`,
      );
    });

    it('preserves the unavailable fallback when HIDDEN is excluded by the loader', async () => {
      metadataProfile = undefined;

      const metadata = plain(
        await generateMetadataUnderTest({
          params: Promise.resolve({ slug: 'hidden' }),
          searchParams: Promise.resolve({}),
        }),
      );

      expect(metadata).toEqual({
        title: 'Perfil no disponible | Myckeo',
        description: 'El perfil solicitado no está disponible en este momento.',
        robots: 'noindex, nofollow',
        alternates: { canonical: `${siteUrl}/perfil/hidden` },
      });
    });

    it('uses profile.visibility as the only SEO authority', () => {
      expect(metadataSource).toContain(
        'const isPublished = negocio.visibility === "PUBLISHED"',
      );
      expect(metadataSource).not.toMatch(/isPlaceholder|perfilCompleto/);
      expect(metadataSource).not.toMatch(/isTestData|archivedAt/);
    });

    it('does not alter the visual page or add claim-token behavior', () => {
      expect(pageComponentSource).not.toContain('visibility');
      expect(pageSource).not.toMatch(/claimToken|claim-token|\/activar\//);
    });
  });

  it('keeps dynamic params enabled by default and revalidate unchanged', () => {
    expect(pageSource).not.toMatch(
      /export\s+const\s+dynamicParams\s*=\s*false/,
    );
    expect(pageSource).toContain('export const revalidate = 60');
  });

  it('keeps the /perfil/[slug] URL and canonical path unchanged', () => {
    expect(pagePath).toContain('/perfil/[slug]/page.tsx');
    expect(metadataSource).toContain(
      'const canonicalUrl = `${siteUrl}/perfil/${slug}`',
    );
  });
});
