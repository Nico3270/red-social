import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcryptjs from "bcryptjs";
import {
  EstadoNegocio,
  Genero,
  PrismaClient,
  ProductStatus,
  Role,
} from "@prisma/client";
import { getGroupProductsPublic } from "../../src/actions/catalogGroups/getGroupProductsPublic";
import { getUngroupedProductsPublic } from "../../src/actions/catalogGroups/getUngroupedProductsPublic";
import { preloadProfileCatalogData } from "../../src/actions/catalogGroups/preloadProfileCatalog";
import {
  findGroupInTree,
  findRootGroupIdForGroupId,
  getFirstValidGroup,
} from "../../src/perfil/helpers/catalog-group-url";
import { loadLocalEnv } from "../../scripts/load-local-env.mjs";

loadLocalEnv({ cwd: process.cwd() });

const prisma = new PrismaClient();
const outputPath = path.join(process.cwd(), "e2e", "smoke", ".generated", "fixtures.json");
const invalidGroupSlug = "grupo-smoke-inexistente";
const smokeBootstrapEnabled = ["1", "true", "yes"].includes(
  (process.env.SMOKE_BOOTSTRAP_FIXTURES ?? "").toLowerCase()
);
const smokeGenericUserEmail = "smoke.cataloggroups.fixture@myckeo.local";
const smokeGenericUsername = "smoke_cataloggroups_fixture";
const smokeGenericBusinessSlug = "smoke-catalog-groups-no-restaurante";
const smokeGenericBusinessName = "Smoke Catalog Groups";
const smokeGenericRootGroupSlug = "colecciones";
const smokeGenericPrimaryGroupSlug = "temporada-actual";
const smokeGenericSecondaryGroupSlug = "accesorios-destacados";
const smokeGenericPrimaryProductSlug = "chaqueta-smoke-catalog-groups";
const smokeGenericSecondaryProductSlug = "bolso-smoke-catalog-groups";
const smokeGenericUngroupedProductSlug = "collar-smoke-catalog-groups";
const smokeBootstrapBusinessImageUrl = "/imgs/placeholder-negocio-2.png";
const smokeBootstrapProductImageUrl = "/imgs/placeholder_productos.png";
const smokeBootstrapPhoneNumber = "573001112233";
const preferredNonRestaurantCategorySlugs = [
  "moda",
  "tecnologia",
  "hogar",
  "belleza",
  "deportes",
  "libros",
  "servicios",
  "negocios",
];

type CatalogGroupsProfileStatus = "existing" | "bootstrapped" | "missing";

interface ProductFixture {
  slug: string;
  name: string;
  hasWhatsApp: boolean;
  hasVariants: boolean;
  isOutOfStock: boolean;
}

interface TraditionalProfileFixture {
  slug: string;
  businessName: string;
  product: ProductFixture;
}

interface GroupTargetFixture {
  id: string;
  slug: string;
  name: string;
  rootName: string;
  sampleProduct: ProductFixture;
}

interface CatalogGroupsProfileFixture {
  slug: string;
  businessName: string;
  fixtureSource: Exclude<CatalogGroupsProfileStatus, "missing">;
  fallbackTarget: GroupTargetFixture;
  ungroupedSampleProduct?: ProductFixture | null;
}

interface SmokeFixturesFile {
  fixtureVersion: number;
  generatedAt: string;
  invalidGroupSlug: string;
  catalogGroupsProfileStatus: CatalogGroupsProfileStatus;
  catalogGroupsProfileReason?: string;
  traditionalProfile: TraditionalProfileFixture;
  catalogGroupsProfile: CatalogGroupsProfileFixture | null;
  restaurantProfile: CatalogGroupsProfileFixture;
}

interface ResolvedCatalogGroupsTarget {
  slug: string | null;
  status: CatalogGroupsProfileStatus;
  reason: string;
}

interface EnsureSmokeProductInput {
  negocioId: string;
  categoryId: string;
  sectionId: string | null;
  slug: string;
  nombre: string;
  precio: number;
  descripcion: string;
  descripcionCorta: string;
  prioridad: number;
  tags: string[];
  componentes: string[];
}

function toProductFixture(product: {
  slug: string;
  nombre: string;
  telefonoContacto?: string | null;
  usaVariantes?: boolean;
  variantes?: Array<{
    isActive: boolean;
    stockIlimitado?: boolean | null;
    stock?: number | null;
  }>;
  stockIlimitado?: boolean | null;
  stock?: number | null;
}): ProductFixture {
  const activeVariants = (product.variantes ?? []).filter((variant) => variant.isActive);
  const hasVariants = Boolean(product.usaVariantes && activeVariants.length > 0);
  const areAllVariantsOutOfStock =
    hasVariants &&
    activeVariants.every(
      (variant) =>
        variant.stockIlimitado === false &&
        typeof variant.stock === "number" &&
        variant.stock <= 0
    );
  const simpleOutOfStock =
    !hasVariants &&
    product.stockIlimitado === false &&
    typeof product.stock === "number" &&
    product.stock <= 0;

  return {
    slug: product.slug,
    name: product.nombre,
    hasWhatsApp: Boolean(product.telefonoContacto?.replace(/\D/g, "")),
    hasVariants,
    isOutOfStock: hasVariants ? areAllVariantsOutOfStock : simpleOutOfStock,
  };
}

async function resolvePreferredTraditionalSlug(): Promise<string> {
  const preferredSlug = "vestidos-bogota-bogota-1aog";
  const preferred = await prisma.negocio.findUnique({
    where: { slug: preferredSlug },
    select: { slug: true },
  });

  if (preferred?.slug) {
    return preferred.slug;
  }

  const fallbackProduct = await prisma.product.findFirst({
    where: {
      status: "disponible",
      negocio: {
        catalogGroups: {
          none: {
            isActive: true,
          },
        },
      },
    },
    select: {
      negocio: {
        select: {
          slug: true,
        },
      },
    },
    orderBy: [{ negocio: { slug: "asc" } }, { slug: "asc" }],
  });

  if (!fallbackProduct?.negocio?.slug) {
    throw new Error("No se encontró un perfil tradicional con producto disponible para smoke tests.");
  }

  return fallbackProduct.negocio.slug;
}

async function buildTraditionalProfileFixture(slug: string): Promise<TraditionalProfileFixture> {
  const negocio = await prisma.negocio.findUnique({
    where: { slug },
    select: {
      slug: true,
      nombre: true,
      telefonoContacto: true,
    },
  });

  if (!negocio?.slug) {
    throw new Error(`No se encontró el negocio tradicional ${slug}.`);
  }

  const product = await prisma.product.findFirst({
    where: {
      status: "disponible",
      negocio: {
        slug,
      },
    },
    select: {
      slug: true,
      nombre: true,
      usaVariantes: true,
      stockIlimitado: true,
      stock: true,
      variantes: {
        where: {
          isActive: true,
        },
        select: {
          isActive: true,
          stockIlimitado: true,
          stock: true,
        },
        orderBy: {
          orden: "asc",
        },
      },
    },
    orderBy: [{ prioridad: "desc" }, { slug: "asc" }],
  });

  if (!product) {
    throw new Error(`El negocio tradicional ${slug} no tiene productos disponibles para smoke tests.`);
  }

  return {
    slug: negocio.slug,
    businessName: negocio.nombre || negocio.slug,
    product: toProductFixture({
      ...product,
      telefonoContacto: negocio.telefonoContacto,
    }),
  };
}

async function resolveCatalogGroupsBusinessSlug(options: {
  preferredSlug?: string;
  restaurantMode: boolean;
}): Promise<string | null> {
  if (options.preferredSlug) {
    const preferred = await prisma.negocio.findUnique({
      where: { slug: options.preferredSlug },
      select: { slug: true },
    });

    if (preferred?.slug) {
      const preload = await preloadProfileCatalogData(preferred.slug);
      if (Boolean(preload.hasCatalogGroups) && Boolean(preload.isRestaurantMenuMode) === options.restaurantMode) {
        return preferred.slug;
      }
    }
  }

  const negocios = await prisma.negocio.findMany({
    where: {
      catalogGroups: {
        some: {
          isActive: true,
        },
      },
    },
    select: {
      slug: true,
    },
    orderBy: {
      slug: "asc",
    },
  });

  for (const negocio of negocios) {
    const preload = await preloadProfileCatalogData(negocio.slug);
    if (Boolean(preload.hasCatalogGroups) && Boolean(preload.isRestaurantMenuMode) === options.restaurantMode) {
      return negocio.slug;
    }
  }

  return null;
}

function getCatalogGroupsFixtureStatusForSlug(
  slug: string
): Exclude<CatalogGroupsProfileStatus, "missing"> {
  return slug === smokeGenericBusinessSlug ? "bootstrapped" : "existing";
}

async function resolveBootstrapCategoryAndSection(): Promise<{
  categoryId: string;
  sectionId: string | null;
}> {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      slug: {
        notIn: ["comida", "bebidas"],
      },
    },
    select: {
      id: true,
      slug: true,
    },
    orderBy: {
      slug: "asc",
    },
  });

  if (categories.length === 0) {
    throw new Error(
      "No hay categorías activas no-restaurante disponibles para bootstrap de smoke tests."
    );
  }

  const preferredCategory =
    preferredNonRestaurantCategorySlugs
      .map((slug) => categories.find((category) => category.slug === slug))
      .find(Boolean) ?? categories[0];

  const section = await prisma.section.findFirst({
    where: {
      categoryId: preferredCategory.id,
      isActive: true,
    },
    select: {
      id: true,
    },
    orderBy: [{ order: "asc" }, { slug: "asc" }],
  });

  return {
    categoryId: preferredCategory.id,
    sectionId: section?.id ?? null,
  };
}

async function ensureBootstrapUser(): Promise<string> {
  const existingByUsername = await prisma.usuario.findUnique({
    where: { username: smokeGenericUsername },
    select: { email: true },
  });

  if (existingByUsername && existingByUsername.email !== smokeGenericUserEmail) {
    throw new Error(
      `El username ${smokeGenericUsername} ya existe y no pertenece al fixture de smoke.`
    );
  }

  const existingUser = await prisma.usuario.findUnique({
    where: { email: smokeGenericUserEmail },
    select: {
      id: true,
      negocio: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (existingUser?.negocio && existingUser.negocio.slug !== smokeGenericBusinessSlug) {
    throw new Error(
      `El usuario de fixture ${smokeGenericUserEmail} ya tiene otro negocio asociado.`
    );
  }

  const passwordHash = bcryptjs.hashSync("SmokeFixture#2026", 10);

  if (existingUser) {
    await prisma.usuario.update({
      where: { id: existingUser.id },
      data: {
        nombre: "Smoke",
        apellido: "CatalogGroups",
        role: Role.negocio,
        ciudad: "Bogota",
        departamento: "Bogota",
        pais: "Colombia",
        genero: Genero.otro,
        fechaNacimiento: new Date("1990-01-01T00:00:00.000Z"),
        contraseña: passwordHash,
        perfilCompleto: true,
        isPlaceholder: true,
        emailVerified: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    return existingUser.id;
  }

  const createdUser = await prisma.usuario.create({
    data: {
      nombre: "Smoke",
      apellido: "CatalogGroups",
      username: smokeGenericUsername,
      contraseña: passwordHash,
      email: smokeGenericUserEmail,
      ciudad: "Bogota",
      departamento: "Bogota",
      pais: "Colombia",
      genero: Genero.otro,
      fechaNacimiento: new Date("1990-01-01T00:00:00.000Z"),
      role: Role.negocio,
      preferencias: [],
      perfilCompleto: true,
      isPlaceholder: true,
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    },
    select: {
      id: true,
    },
  });

  return createdUser.id;
}

async function ensureBootstrapBusiness(userId: string): Promise<{
  id: string;
  slug: string;
  nombre: string;
}> {
  const existingBusinessBySlug = await prisma.negocio.findUnique({
    where: { slug: smokeGenericBusinessSlug },
    select: {
      id: true,
      slug: true,
      nombre: true,
      usuarioId: true,
    },
  });

  if (existingBusinessBySlug && existingBusinessBySlug.usuarioId !== userId) {
    throw new Error(
      `El negocio ${smokeGenericBusinessSlug} ya existe y no pertenece al usuario fixture.`
    );
  }

  const existingBusinessByUser = await prisma.negocio.findUnique({
    where: { usuarioId: userId },
    select: {
      id: true,
      slug: true,
    },
  });

  if (existingBusinessByUser && existingBusinessByUser.slug !== smokeGenericBusinessSlug) {
    throw new Error(
      `El usuario fixture ${smokeGenericUserEmail} ya tiene otro negocio asociado.`
    );
  }

  if (existingBusinessBySlug) {
    await prisma.negocio.update({
      where: { id: existingBusinessBySlug.id },
      data: {
        nombre: smokeGenericBusinessName,
        descripcion:
          "Perfil de smoke para CatalogGroups no-restaurante con datos deterministas.",
        ciudad: "Bogota",
        departamento: "Bogota",
        direccion: "Smoke Fixture Street 17",
        telefonoContacto: smokeBootstrapPhoneNumber,
        estado: EstadoNegocio.activo,
        imagenes: [smokeBootstrapBusinessImageUrl],
        fotoPerfil: smokeBootstrapBusinessImageUrl,
        fotoPortada: smokeBootstrapBusinessImageUrl,
        usuarioId: userId,
      },
    });

    return {
      id: existingBusinessBySlug.id,
      slug: existingBusinessBySlug.slug,
      nombre: smokeGenericBusinessName,
    };
  }

  const createdBusiness = await prisma.negocio.create({
    data: {
      usuarioId: userId,
      nombre: smokeGenericBusinessName,
      slug: smokeGenericBusinessSlug,
      descripcion:
        "Perfil de smoke para CatalogGroups no-restaurante con datos deterministas.",
      ciudad: "Bogota",
      departamento: "Bogota",
      direccion: "Smoke Fixture Street 17",
      telefonoContacto: smokeBootstrapPhoneNumber,
      estado: EstadoNegocio.activo,
      imagenes: [smokeBootstrapBusinessImageUrl],
      fotoPerfil: smokeBootstrapBusinessImageUrl,
      fotoPortada: smokeBootstrapBusinessImageUrl,
    },
    select: {
      id: true,
      slug: true,
      nombre: true,
    },
  });

  return createdBusiness;
}

async function ensureBootstrapRelations(
  negocioId: string,
  categoryId: string,
  sectionId: string | null
): Promise<void> {
  await prisma.negocioCategory.upsert({
    where: {
      negocioId_categoryId: {
        negocioId,
        categoryId,
      },
    },
    update: {},
    create: {
      negocioId,
      categoryId,
    },
  });

  if (sectionId) {
    await prisma.negocioSection.upsert({
      where: {
        negocioId_sectionId: {
          negocioId,
          sectionId,
        },
      },
      update: {},
      create: {
        negocioId,
        sectionId,
        prioridad: 0,
      },
    });
  }
}

async function ensureSmokeProduct(
  input: EnsureSmokeProductInput
): Promise<{ id: string; slug: string; nombre: string }> {
  const existingProduct = await prisma.product.findUnique({
    where: { slug: input.slug },
    select: {
      id: true,
      negocioId: true,
    },
  });

  if (existingProduct && existingProduct.negocioId !== input.negocioId) {
    throw new Error(`El producto ${input.slug} ya existe y no pertenece al fixture de smoke.`);
  }

  const product = existingProduct
    ? await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          nombre: input.nombre,
          descripcion: input.descripcion,
          descripcionCorta: input.descripcionCorta,
          precio: input.precio,
          prioridad: input.prioridad,
          status: ProductStatus.disponible,
          tags: input.tags,
          componentes: input.componentes,
          negocioId: input.negocioId,
          categoryId: input.categoryId,
          stock: 12,
          stockIlimitado: false,
          usaVariantes: false,
        },
        select: {
          id: true,
          slug: true,
          nombre: true,
        },
      })
    : await prisma.product.create({
        data: {
          nombre: input.nombre,
          slug: input.slug,
          descripcion: input.descripcion,
          descripcionCorta: input.descripcionCorta,
          precio: input.precio,
          prioridad: input.prioridad,
          status: ProductStatus.disponible,
          tags: input.tags,
          componentes: input.componentes,
          negocioId: input.negocioId,
          categoryId: input.categoryId,
          stock: 12,
          stockIlimitado: false,
          usaVariantes: false,
        },
        select: {
          id: true,
          slug: true,
          nombre: true,
        },
      });

  await prisma.image.deleteMany({
    where: { productId: product.id },
  });

  await prisma.image.create({
    data: {
      productId: product.id,
      url: smokeBootstrapProductImageUrl,
    },
  });

  if (input.sectionId) {
    await prisma.productSection.upsert({
      where: {
        productId_sectionId: {
          productId: product.id,
          sectionId: input.sectionId,
        },
      },
      update: {},
      create: {
        productId: product.id,
        sectionId: input.sectionId,
      },
    });
  }

  return product;
}

async function ensureNonRestaurantCatalogGroupsSmokeBusiness(): Promise<string> {
  const { categoryId, sectionId } = await resolveBootstrapCategoryAndSection();
  const userId = await ensureBootstrapUser();
  const business = await ensureBootstrapBusiness(userId);

  await ensureBootstrapRelations(business.id, categoryId, sectionId);

  const rootGroup = await prisma.catalogGroup.upsert({
    where: {
      negocioId_slug: {
        negocioId: business.id,
        slug: smokeGenericRootGroupSlug,
      },
    },
    update: {
      nombre: "Colecciones",
      parentId: null,
      order: 0,
      isActive: true,
      description: "Raíz del catálogo smoke no-restaurante.",
    },
    create: {
      negocioId: business.id,
      nombre: "Colecciones",
      slug: smokeGenericRootGroupSlug,
      parentId: null,
      order: 0,
      isActive: true,
      description: "Raíz del catálogo smoke no-restaurante.",
    },
  });

  const primaryGroup = await prisma.catalogGroup.upsert({
    where: {
      negocioId_slug: {
        negocioId: business.id,
        slug: smokeGenericPrimaryGroupSlug,
      },
    },
    update: {
      nombre: "Temporada actual",
      parentId: rootGroup.id,
      order: 0,
      isActive: true,
      description: "Grupo principal del fixture smoke no-restaurante.",
    },
    create: {
      negocioId: business.id,
      nombre: "Temporada actual",
      slug: smokeGenericPrimaryGroupSlug,
      parentId: rootGroup.id,
      order: 0,
      isActive: true,
      description: "Grupo principal del fixture smoke no-restaurante.",
    },
  });

  const secondaryGroup = await prisma.catalogGroup.upsert({
    where: {
      negocioId_slug: {
        negocioId: business.id,
        slug: smokeGenericSecondaryGroupSlug,
      },
    },
    update: {
      nombre: "Accesorios destacados",
      parentId: rootGroup.id,
      order: 1,
      isActive: true,
      description: "Grupo secundario del fixture smoke no-restaurante.",
    },
    create: {
      negocioId: business.id,
      nombre: "Accesorios destacados",
      slug: smokeGenericSecondaryGroupSlug,
      parentId: rootGroup.id,
      order: 1,
      isActive: true,
      description: "Grupo secundario del fixture smoke no-restaurante.",
    },
  });

  const primaryProduct = await ensureSmokeProduct({
    negocioId: business.id,
    categoryId,
    sectionId,
    slug: smokeGenericPrimaryProductSlug,
    nombre: "Chaqueta Smoke de catálogo",
    precio: 189000,
    descripcion:
      "Producto estable para smoke tests de CatalogGroups no-restaurante.",
    descripcionCorta: "Chaqueta estable para smoke tests.",
    prioridad: 100,
    tags: ["smoke", "catalog-groups", "moda"],
    componentes: ["Tela premium", "Cierre frontal"],
  });

  const secondaryProduct = await ensureSmokeProduct({
    negocioId: business.id,
    categoryId,
    sectionId,
    slug: smokeGenericSecondaryProductSlug,
    nombre: "Bolso Smoke de catálogo",
    precio: 129000,
    descripcion:
      "Producto secundario para el fixture estable de CatalogGroups no-restaurante.",
    descripcionCorta: "Bolso estable para smoke tests.",
    prioridad: 90,
    tags: ["smoke", "catalog-groups", "accesorios"],
    componentes: ["Correa ajustable", "Forro interno"],
  });

  await ensureSmokeProduct({
    negocioId: business.id,
    categoryId,
    sectionId,
    slug: smokeGenericUngroupedProductSlug,
    nombre: "Collar Smoke sin grupo",
    precio: 69000,
    descripcion:
      "Producto estable sin grupo para validar visibilidad pública en CatalogGroups.",
    descripcionCorta: "Producto sin grupo para smoke tests.",
    prioridad: 80,
    tags: ["smoke", "catalog-groups", "sin-grupo"],
    componentes: ["Acabado metálico", "Detalle principal"],
  });

  await prisma.catalogGroupProduct.upsert({
    where: {
      catalogGroupId_productId: {
        catalogGroupId: primaryGroup.id,
        productId: primaryProduct.id,
      },
    },
    update: {
      order: 0,
      isFeatured: true,
    },
    create: {
      catalogGroupId: primaryGroup.id,
      productId: primaryProduct.id,
      order: 0,
      isFeatured: true,
    },
  });

  await prisma.catalogGroupProduct.upsert({
    where: {
      catalogGroupId_productId: {
        catalogGroupId: secondaryGroup.id,
        productId: secondaryProduct.id,
      },
    },
    update: {
      order: 0,
      isFeatured: false,
    },
    create: {
      catalogGroupId: secondaryGroup.id,
      productId: secondaryProduct.id,
      order: 0,
      isFeatured: false,
    },
  });

  const preload = await preloadProfileCatalogData(business.slug);
  if (!preload.hasCatalogGroups) {
    throw new Error(
      "El fixture bootstrap de CatalogGroups no-restaurante no quedó navegable después de provisionarse."
    );
  }

  if (preload.isRestaurantMenuMode) {
    throw new Error(
      "El fixture bootstrap fue clasificado como restaurante; revisa categorías o nombres de grupos."
    );
  }

  return business.slug;
}

async function resolveCatalogGroupsProfileTarget(): Promise<ResolvedCatalogGroupsTarget> {
  const existingSlug = await resolveCatalogGroupsBusinessSlug({
    preferredSlug: smokeGenericBusinessSlug,
    restaurantMode: false,
  });

  if (existingSlug) {
    if (existingSlug === smokeGenericBusinessSlug) {
      await ensureNonRestaurantCatalogGroupsSmokeBusiness();
    }

    return {
      slug: existingSlug,
      status: getCatalogGroupsFixtureStatusForSlug(existingSlug),
      reason:
        existingSlug === smokeGenericBusinessSlug
          ? "Fixture estable no-restaurante ya provisionada en la base activa."
          : "Se encontró un negocio real con CatalogGroups no-restaurante en la base activa.",
    };
  }

  if (!smokeBootstrapEnabled) {
    return {
      slug: null,
      status: "missing",
      reason:
        "No se encontró un negocio real con CatalogGroups no-restaurante. Activa SMOKE_BOOTSTRAP_FIXTURES=1 para provisionar un fixture estable.",
    };
  }

  const bootstrappedSlug = await ensureNonRestaurantCatalogGroupsSmokeBusiness();
  return {
    slug: bootstrappedSlug,
    status: "bootstrapped",
    reason: "Fixture estable provisionada por SMOKE_BOOTSTRAP_FIXTURES.",
  };
}

async function buildCatalogGroupsFixture(
  slug: string,
  fixtureSource: Exclude<CatalogGroupsProfileStatus, "missing"> = "existing"
): Promise<CatalogGroupsProfileFixture> {
  const negocio = await prisma.negocio.findUnique({
    where: { slug },
    select: {
      slug: true,
      nombre: true,
    },
  });

  if (!negocio?.slug) {
    throw new Error(`No se encontró el negocio con CatalogGroups ${slug}.`);
  }

  const preload = await preloadProfileCatalogData(slug);
  const tree = preload.catalogGroupsTree ?? [];
  const targetGroupId = preload.initialGroupId || getFirstValidGroup(tree);

  if (!preload.hasCatalogGroups || !targetGroupId) {
    throw new Error(`El negocio ${slug} no tiene un grupo público válido para smoke tests.`);
  }

  const targetGroup = findGroupInTree(targetGroupId, tree);
  if (!targetGroup) {
    throw new Error(`No se pudo resolver el grupo inicial ${targetGroupId} para ${slug}.`);
  }

  const rootGroupId = findRootGroupIdForGroupId(targetGroupId, tree) || targetGroupId;
  const rootGroup = findGroupInTree(rootGroupId, tree) || targetGroup;

  const initialProducts = preload.initialGroupProducts?.length
    ? preload.initialGroupProducts
    : undefined;

  const groupProducts = initialProducts
    ? initialProducts
    : (await getGroupProductsPublic(targetGroupId, slug)).products?.map((row) => ({
        slug: row.product.slug,
        nombre: row.product.nombre,
        telefonoContacto: row.product.negocio?.telefonoContacto,
        usaVariantes: row.product.usaVariantes,
        variantes: row.product.variantes,
        stockIlimitado: row.product.stockIlimitado,
        stock: row.product.stock,
      })) || [];

  const sampleProduct = groupProducts[0];
  if (!sampleProduct) {
    throw new Error(`El grupo inicial ${targetGroup.slug} de ${slug} no tiene productos visibles.`);
  }

  const ungroupedProducts = await getUngroupedProductsPublic(slug);
  const ungroupedSampleProduct =
    ungroupedProducts.ok && ungroupedProducts.products?.length
      ? toProductFixture(ungroupedProducts.products[0])
      : null;

  return {
    slug: negocio.slug,
    businessName: negocio.nombre || negocio.slug,
    fixtureSource,
    fallbackTarget: {
      id: targetGroup.id,
      slug: targetGroup.slug,
      name: targetGroup.nombre,
      rootName: rootGroup.nombre,
      sampleProduct: toProductFixture(sampleProduct),
    },
    ungroupedSampleProduct,
  };
}

async function main(): Promise<void> {
  const traditionalSlug = await resolvePreferredTraditionalSlug();
  const restaurantSlug = await resolveCatalogGroupsBusinessSlug({
    preferredSlug: "parrilla-internacional-tunja-tunja-r3jq",
    restaurantMode: true,
  });

  if (!restaurantSlug) {
    throw new Error("No se encontró un perfil restaurante con CatalogGroups para smoke tests.");
  }

  const genericCatalogGroupsTarget = await resolveCatalogGroupsProfileTarget();

  const fixtures: SmokeFixturesFile = {
    fixtureVersion: 2,
    generatedAt: new Date().toISOString(),
    invalidGroupSlug,
    catalogGroupsProfileStatus: genericCatalogGroupsTarget.status,
    catalogGroupsProfileReason: genericCatalogGroupsTarget.reason,
    traditionalProfile: await buildTraditionalProfileFixture(traditionalSlug),
    catalogGroupsProfile: genericCatalogGroupsTarget.slug
      ? await buildCatalogGroupsFixture(
          genericCatalogGroupsTarget.slug,
          genericCatalogGroupsTarget.status === "bootstrapped" ? "bootstrapped" : "existing"
        )
      : null,
    restaurantProfile: await buildCatalogGroupsFixture(restaurantSlug, "existing"),
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(fixtures, null, 2)}\n`, "utf8");
  console.log(`Fixtures de smoke generadas en ${outputPath}`);
}

void main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error(`Error generando fixtures de smoke: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
