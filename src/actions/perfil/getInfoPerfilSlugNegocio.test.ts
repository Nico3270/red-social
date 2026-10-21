import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EstadoNegocio } from '@prisma/client';
import { buildPublicBusinessBySlugWhere } from '../../lib/business/publicBusinessVisibility';

const mockNegocioFindFirst = jest.fn();
const mockUsuarioFindUnique = jest.fn();
const mockAvailabilityCount = jest.fn();
const mockEncuestaCount = jest.fn();
const mockReportOperationalError = jest.fn();

jest.mock(
  '@/lib/prisma',
  () => ({
    __esModule: true,
    default: {
      negocio: { findFirst: mockNegocioFindFirst },
      usuario: { findUnique: mockUsuarioFindUnique },
      businessAvailability: { count: mockAvailabilityCount },
      encuesta: { count: mockEncuestaCount },
    },
  }),
  { virtual: true },
);
jest.mock(
  '@/lib/business/publicBusinessVisibility',
  () => jest.requireActual('../../lib/business/publicBusinessVisibility'),
  { virtual: true },
);
jest.mock(
  '@/lib/business/business-visibility-policy',
  () => jest.requireActual('../../lib/business/business-visibility-policy'),
  { virtual: true },
);
jest.mock(
  '@/lib/observability/operationalLogger',
  () => ({ reportOperationalError: mockReportOperationalError }),
  { virtual: true },
);

import { getInfoPerfilBySlugNegocio } from './getInfoPerfilSlugNegocio';

type BusinessFixture = {
  id: string;
  usuarioId: string;
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

const loaderPath = join(__dirname, 'getInfoPerfilSlugNegocio.ts');
const loaderSource = readFileSync(loaderPath, 'utf8');
const pageSource = readFileSync(
  join(process.cwd(), 'src/app/(catalogo)/perfil/[slug]/page.tsx'),
  'utf8',
);

let currentFixture: BusinessFixture;

function business(
  overrides: Partial<Omit<BusinessFixture, 'usuario'>> = {},
  userOverrides: Partial<BusinessFixture['usuario']> = {},
): BusinessFixture {
  return {
    id: 'business-1',
    usuarioId: 'user-1',
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

function selectedBusiness(fixture: BusinessFixture) {
  return {
    id: fixture.id,
    usuarioId: fixture.usuarioId,
    estado: fixture.estado,
    isTestData: fixture.isTestData,
    archivedAt: fixture.archivedAt,
    usuario: { ...fixture.usuario },
  };
}

function detailedUserResult(fixture: BusinessFixture) {
  return {
    id: fixture.usuarioId,
    facebook: 'https://facebook.example/business',
    instagram: 'https://instagram.example/business',
    twitter: 'https://twitter.example/business',
    tiktok: 'https://tiktok.example/business',
    youtube: 'https://youtube.example/business',
    negocio: {
      id: fixture.id,
      nombre: 'Negocio fixture',
      slug: fixture.slug,
      descripcion: 'Descripción fixture',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      direccion: 'Calle 1',
      telefonoContacto: '+573001112233',
      fotoPerfil: 'perfil.jpg',
      fotoPortada: 'portada.jpg',
      sitioWeb: 'https://business.example',
      urlGoogleMaps: 'https://maps.example/business',
      latitud: 4.7,
      longitud: -74.1,
      secciones: [{ sectionId: 'section-1' }],
      categorias: [{ categoryId: 'category-1' }],
      estado: fixture.estado,
    },
  };
}

describe('getInfoPerfilBySlugNegocio canonical visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentFixture = business();
    mockNegocioFindFirst.mockImplementation(
      async ({ where }: { where: unknown }) =>
        matchesBusinessWhere(currentFixture, where)
          ? selectedBusiness(currentFixture)
          : null,
    );
    mockUsuarioFindUnique.mockImplementation(async () =>
      detailedUserResult(currentFixture),
    );
    mockAvailabilityCount.mockResolvedValue(1);
    mockEncuestaCount.mockResolvedValue(1);
  });

  it('keeps the slug lookup on the DIRECT predicate', async () => {
    await getInfoPerfilBySlugNegocio('negocio-publicado');

    expect(mockNegocioFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: buildPublicBusinessBySlugWhere('negocio-publicado'),
      }),
    );
  });

  it('returns PUBLISHED for a completed claimed business', async () => {
    const result = await getInfoPerfilBySlugNegocio('negocio-publicado');

    expect(result.ok).toBe(true);
    expect(result.negocio?.visibility).toBe('PUBLISHED');
  });

  it('returns UNLISTED for a placeholder while keeping the profile loadable', async () => {
    currentFixture = business(
      { slug: 'presttigio' },
      { isPlaceholder: true, perfilCompleto: false },
    );

    const result = await getInfoPerfilBySlugNegocio('presttigio');

    expect(result.ok).toBe(true);
    expect(result.negocio?.slugNegocio).toBe('presttigio');
    expect(result.negocio?.visibility).toBe('UNLISTED');
  });

  it('returns UNLISTED for a CLAIMED incomplete business', async () => {
    currentFixture = business(
      { slug: 'claimed-incomplete' },
      { perfilCompleto: false },
    );

    const result = await getInfoPerfilBySlugNegocio('claimed-incomplete');

    expect(result.ok).toBe(true);
    expect(result.negocio?.visibility).toBe('UNLISTED');
  });

  it.each([
    ['suspended business', business({ estado: 'suspendido' })],
    ['eliminated business', business({ estado: 'eliminado' })],
    ['test business', business({ isTestData: true })],
    ['archived business', business({ archivedAt: new Date('2026-08-17') })],
    ['suspended owner', business({}, { estado: 'suspendido' })],
    ['eliminated owner', business({}, { estado: 'eliminado' })],
  ])('keeps a HIDDEN %s outside the loader result', async (_label, hidden) => {
    currentFixture = hidden;

    const result = await getInfoPerfilBySlugNegocio(hidden.slug);

    expect(result).toEqual({ ok: false, message: 'Negocio no encontrado' });
    expect(mockUsuarioFindUnique).not.toHaveBeenCalled();
  });

  it('classifies a defensive hidden result as HIDDEN', async () => {
    currentFixture = business({ estado: 'suspendido' });
    mockNegocioFindFirst.mockResolvedValueOnce(
      selectedBusiness(currentFixture),
    );

    const result = await getInfoPerfilBySlugNegocio(currentFixture.slug);

    expect(result.negocio?.visibility).toBe('HIDDEN');
  });

  it('selects only the six internal visibility fields in the existing slug query', async () => {
    await getInfoPerfilBySlugNegocio('negocio-publicado');

    expect(mockNegocioFindFirst).toHaveBeenCalledWith({
      where: buildPublicBusinessBySlugWhere('negocio-publicado'),
      select: {
        id: true,
        usuarioId: true,
        estado: true,
        isTestData: true,
        archivedAt: true,
        usuario: {
          select: {
            estado: true,
            isPlaceholder: true,
            perfilCompleto: true,
          },
        },
      },
    });
  });

  it('uses the canonical classifier without duplicating flag interpretation', () => {
    expect(loaderSource).toContain(
      'const visibility = classifyBusinessVisibility(negocio)',
    );
    expect(loaderSource).not.toMatch(
      /negocio\.usuario\.(isPlaceholder|perfilCompleto)\s*[|&?:=]/,
    );
  });

  it('adds no query beyond the four existing loader reads', async () => {
    await getInfoPerfilBySlugNegocio('negocio-publicado');

    expect(mockNegocioFindFirst).toHaveBeenCalledTimes(1);
    expect(mockUsuarioFindUnique).toHaveBeenCalledTimes(1);
    expect(mockAvailabilityCount).toHaveBeenCalledTimes(1);
    expect(mockEncuestaCount).toHaveBeenCalledTimes(1);
  });

  it('preserves the previous DTO and adds only visibility', async () => {
    const result = await getInfoPerfilBySlugNegocio('negocio-publicado');

    expect(result).toEqual({
      ok: true,
      message: 'Perfil del negocio obtenido correctamente',
      negocio: {
        nombreNegocio: 'Negocio fixture',
        slugNegocio: 'negocio-publicado',
        descripcionNegocio: 'Descripción fixture',
        telefonoNegocio: '+573001112233',
        ciudadNegocio: 'Bogotá',
        departamentoNegocio: 'Cundinamarca',
        direccionNegocio: 'Calle 1',
        telefonoContacto: '+573001112233',
        imagenPerfil: 'perfil.jpg',
        imagenPortada: 'portada.jpg',
        sitioWeb: 'https://business.example',
        urlGoogleMaps: 'https://maps.example/business',
        facebook: 'https://facebook.example/business',
        instagram: 'https://instagram.example/business',
        twitter: 'https://twitter.example/business',
        tiktok: 'https://tiktok.example/business',
        youtube: 'https://youtube.example/business',
        latitudNegocio: 4.7,
        longitudNegocio: -74.1,
        categoriaIds: ['category-1'],
        seccionesIds: ['section-1'],
        estadoNegocio: EstadoNegocio.activo,
        visibility: 'PUBLISHED',
        configReservation: true,
        configEncuestas: true,
        negocioId: 'business-1',
      },
    });
  });

  it('does not expose new raw visibility flags in the DTO', async () => {
    const result = await getInfoPerfilBySlugNegocio('negocio-publicado');
    const dto = result.negocio;

    expect(dto).toBeDefined();
    expect(dto).not.toHaveProperty('isTestData');
    expect(dto).not.toHaveProperty('archivedAt');
    expect(dto).not.toHaveProperty('isPlaceholder');
    expect(dto).not.toHaveProperty('perfilCompleto');
    expect(dto).not.toHaveProperty('usuario');
    expect(JSON.parse(JSON.stringify(dto))).toHaveProperty(
      'visibility',
      'PUBLISHED',
    );
  });

  it('preserves the slug input and both runtime callers', async () => {
    const slug = 'slug-conservado';
    currentFixture = business({ slug });

    await getInfoPerfilBySlugNegocio(slug);

    expect(mockNegocioFindFirst.mock.calls[0][0].where.slug).toBe(slug);
    expect(
      pageSource.match(/getInfoPerfilBySlugNegocio\(slug\)/g),
    ).toHaveLength(2);
  });
});
