"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import type { EstadoNegocio, Role, TipoNegocio } from "@prisma/client";

export type AdminBusinessProfileCategory = {
  negocioId: string;
  categoryId: string;
  category: {
    id: string;
    nombre: string;
    slug: string;
    iconName: string | null;
    isActive: boolean;
  };
};

export type AdminBusinessProfileSection = {
  negocioId: string;
  sectionId: string;
  prioridad: number;
  section: {
    id: string;
    nombre: string;
    slug: string;
    iconName: string | null;
    order: number;
    isActive: boolean;
    categoryId: string | null;
    category: {
      id: string;
      nombre: string;
      slug: string;
    } | null;
  };
};

export type AdminBusinessProfileOwner = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  role: Role;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  tiktok: string | null;
  youtube: string | null;
};

export type AdminBusinessProfileCategoryOption = {
  id: string;
  nombre: string;
  slug: string;
  iconName: string | null;
  isActive: boolean;
};

export type AdminBusinessProfileSectionOption = {
  id: string;
  nombre: string;
  slug: string;
  iconName: string | null;
  order: number;
  isActive: boolean;
  categoryId: string | null;
  category: {
    id: string;
    nombre: string;
    slug: string;
  } | null;
};

export type AdminBusinessProfileOptions = {
  categories: AdminBusinessProfileCategoryOption[];
  sections: AdminBusinessProfileSectionOption[];
};

export type AdminBusinessProfile = {
  id: string;
  usuarioId: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  ciudad: string;
  departamento: string;
  direccion: string | null;
  telefonoContacto: string | null;
  fotoPerfil: string | null;
  fotoPortada: string | null;
  sitioWeb: string | null;
  urlGoogleMaps: string | null;
  latitud: number | null;
  longitud: number | null;
  estado: EstadoNegocio;
  tipo: TipoNegocio;
  isTestData: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  categorias: AdminBusinessProfileCategory[];
  secciones: AdminBusinessProfileSection[];
  owner: AdminBusinessProfileOwner;
};

export type GetAdminBusinessProfileBySlugActionResult =
  | {
      ok: true;
      business: AdminBusinessProfile;
      options: AdminBusinessProfileOptions;
      error: null;
    }
  | {
      ok: false;
      business: null;
      options: null;
      error: string;
    };

const LOG_PREFIX = "[getAdminBusinessProfileBySlugAction]";

function buildTraceId() {
  return `admin-business-profile-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeSlug(value: string) {
  return typeof value === "string" ? value.trim() : "";
}

export async function getAdminBusinessProfileBySlugAction(
  rawSlug: string
): Promise<GetAdminBusinessProfileBySlugActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();
  const slug = normalizeSlug(rawSlug);

  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.warn(`${LOG_PREFIX}[${traceId}] Sesión no válida`);
      return {
        ok: false,
        business: null,
        options: null,
        error: "No autorizado.",
      };
    }

    if (session.user.role !== "super_admin") {
      console.warn(`${LOG_PREFIX}[${traceId}] Acceso denegado por rol`, {
        userId: session.user.id,
        role: session.user.role,
      });

      return {
        ok: false,
        business: null,
        options: null,
        error: "No tienes permisos para consultar este negocio.",
      };
    }

    if (!slug) {
      console.warn(`${LOG_PREFIX}[${traceId}] Slug vacío`, {
        actorUserId: session.user.id,
      });

      return {
        ok: false,
        business: null,
        options: null,
        error: "El slug del negocio es obligatorio.",
      };
    }

    console.info(`${LOG_PREFIX}[${traceId}] Inicio`, {
      actorUserId: session.user.id,
      slug,
    });

    const [business, categoryOptions, sectionOptions] = await Promise.all([
      prisma.negocio.findUnique({
        where: {
          slug,
        },
        select: {
          id: true,
          usuarioId: true,
          nombre: true,
          slug: true,
          descripcion: true,
          ciudad: true,
          departamento: true,
          direccion: true,
          telefonoContacto: true,
          fotoPerfil: true,
          fotoPortada: true,
          sitioWeb: true,
          urlGoogleMaps: true,
          latitud: true,
          longitud: true,
          estado: true,
          tipo: true,
          isTestData: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
          categorias: {
            select: {
              negocioId: true,
              categoryId: true,
              category: {
                select: {
                  id: true,
                  nombre: true,
                  slug: true,
                  iconName: true,
                  isActive: true,
                },
              },
            },
            orderBy: {
              category: {
                nombre: "asc",
              },
            },
          },
          secciones: {
            select: {
              negocioId: true,
              sectionId: true,
              prioridad: true,
              section: {
                select: {
                  id: true,
                  nombre: true,
                  slug: true,
                  iconName: true,
                  order: true,
                  isActive: true,
                  categoryId: true,
                  Category: {
                    select: {
                      id: true,
                      nombre: true,
                      slug: true,
                    },
                  },
                },
              },
            },
            orderBy: [
              {
                prioridad: "asc",
              },
              {
                section: {
                  order: "asc",
                },
              },
            ],
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
              role: true,
              facebook: true,
              instagram: true,
              twitter: true,
              tiktok: true,
              youtube: true,
            },
          },
        },
      }),
      prisma.category.findMany({
        orderBy: {
          nombre: "asc",
        },
        select: {
          id: true,
          nombre: true,
          slug: true,
          iconName: true,
          isActive: true,
        },
      }),
      prisma.section.findMany({
        orderBy: [
          {
            order: "asc",
          },
          {
            nombre: "asc",
          },
        ],
        select: {
          id: true,
          nombre: true,
          slug: true,
          iconName: true,
          order: true,
          isActive: true,
          categoryId: true,
          Category: {
            select: {
              id: true,
              nombre: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    if (!business) {
      console.info(`${LOG_PREFIX}[${traceId}] Negocio no encontrado`, {
        actorUserId: session.user.id,
        slug,
        elapsedMs: Date.now() - startedAt,
      });

      return {
        ok: false,
        business: null,
        options: null,
        error: "No se encontró un negocio con ese slug.",
      };
    }

    const options: AdminBusinessProfileOptions = {
      categories: categoryOptions,
      sections: sectionOptions.map((section) => ({
        ...section,
        category: section.Category,
      })),
    };

    const profile: AdminBusinessProfile = {
      ...business,
      secciones: business.secciones.map((relation) => ({
        ...relation,
        section: {
          ...relation.section,
          category: relation.section.Category,
        },
      })),
      owner: business.usuario,
    };

    console.info(`${LOG_PREFIX}[${traceId}] Consulta OK`, {
      actorUserId: session.user.id,
      businessId: profile.id,
      slug: profile.slug,
      categoryOptions: options.categories.length,
      sectionOptions: options.sections.length,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      business: profile,
      options,
      error: null,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX}[${traceId}] Error inesperado`, {
      error,
      slug,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: false,
      business: null,
      options: null,
      error: "No fue posible cargar el negocio en este momento.",
    };
  }
}
