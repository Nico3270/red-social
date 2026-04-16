import { initialData } from "@/seed/seed";
import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import type {
  BusinessGuideAction,
  BusinessGuideBusinessInfo,
  BusinessGuideConfig,
  BusinessGuideIcon,
  BusinessGuidePreset,
  BusinessGuidePresetId,
  BusinessGuideRecommendation,
  BusinessGuideResolvedPreset,
  BusinessGuideVertical,
  ContextualGuidePresetId,
  ProductGuideExploreContext,
} from "./business-guide.types";

type PriceStrategy = "low" | "balanced" | "premium";

interface EnrichedGuideProduct {
  product: ProductRedSocial;
  price: number;
  normalizedText: string;
  categorySlug: string;
  sectionIds: string[];
  sectionSlugs: string[];
  sectionNames: string[];
  sectionCategorySlugs: string[];
}

interface CatalogSignals {
  products: EnrichedGuideProduct[];
  businessText: string;
  businessCategorySlugs: string[];
  businessSectionIds: string[];
  businessSectionSlugs: string[];
  businessSectionCategorySlugs: string[];
  dominantSectionIds: string[];
  prices: number[];
  hasContactChannel: boolean;
  contactHref: string | null;
}

interface GuideProfileMatch {
  vertical: BusinessGuideVertical;
  confidence: number;
  scores: Record<BusinessGuideVertical, number>;
}

interface ContextualPresetRule {
  id: ContextualGuidePresetId;
  verticals: BusinessGuideVertical[];
  label: string;
  hint: string;
  shortResultLabel: string;
  icon: BusinessGuideIcon;
  keywords: string[];
  preferredSectionSlugs: string[];
  preferredCategorySlugs: string[];
  minEvidence: number;
  priceStrategy: PriceStrategy;
  specialLabels: string[];
  priorityWeight: number;
  defaultReason: string;
}

interface ScoreRule {
  keywords: string[];
  preferredSectionSlugs: string[];
  preferredCategorySlugs: string[];
  priceStrategy: PriceStrategy;
  specialLabels: string[];
  priorityWeight: number;
  defaultReason: string;
}

interface GuideProfileSignalsDefinition {
  categories: string[];
  sectionSlugs: string[];
  keywords: string[];
}

const categoryById = new Map(initialData.categorias.map((category) => [category.id, category]));
const sectionById = new Map(initialData.secciones.map((section) => [section.id, section]));

const unique = <T>(values: T[]) => Array.from(new Set(values));

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizeTokens = (values: string[]) =>
  unique(values.map((value) => normalizeText(value)).filter(Boolean));

const templateIdToLabel = (value: string) =>
  value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const getEffectivePrice = (product: ProductRedSocial) => {
  const variantPrices = (product.variantes ?? [])
    .filter(
      (variant) =>
        variant.isActive &&
        typeof variant.precio === "number" &&
        !Number.isNaN(variant.precio)
    )
    .map((variant) => Number(variant.precio));

  return variantPrices.length > 0 ? Math.min(...variantPrices) : product.precio;
};

const productPool = (products: ProductRedSocial[]) => {
  const available = products.filter((product) => product.status === "disponible");
  return available.length > 0 ? available : products;
};

const buildContactHref = (products: ProductRedSocial[]) => {
  const phone = products
    .map((product) => product.telefonoContacto?.replace(/\D/g, "") ?? "")
    .find(Boolean);

  if (!phone) {
    return null;
  }

  return `https://wa.me/${phone}`;
};

export const extractCatalogSignals = (
  business: BusinessGuideBusinessInfo,
  products: ProductRedSocial[]
): CatalogSignals => {
  const availableProducts = productPool(products);

  const enrichedProducts = availableProducts.map((product) => {
    const sections = product.sections.map((sectionId) => sectionById.get(sectionId)).filter(Boolean);
    const sectionSlugs = sections.map((section) => normalizeText(section?.slug ?? ""));
    const sectionNames = sections.map((section) => normalizeText(section?.nombre ?? ""));
    const sectionCategorySlugs = sections.map((section) => normalizeText(section?.categorySlug ?? ""));
    const categorySlug = normalizeText(categoryById.get(product.categoriaId)?.slug ?? "");
    const textFragments = [
      product.nombre,
      product.descripcion,
      product.descripcionCorta ?? "",
      product.tags.join(" "),
      product.componentes.join(" "),
      sectionSlugs.join(" "),
      sectionNames.join(" "),
      sectionCategorySlugs.join(" "),
      categorySlug,
      product.etiquetaEspecial ?? "",
    ];

    return {
      product,
      price: getEffectivePrice(product),
      normalizedText: normalizeText(textFragments.join(" ")),
      categorySlug,
      sectionIds: product.sections,
      sectionSlugs,
      sectionNames,
      sectionCategorySlugs,
    };
  });

  const businessCategorySlugs = normalizeTokens(
    business.categoriaIds.map((categoryId) => categoryById.get(categoryId)?.slug ?? "")
  );

  const businessSections = business.seccionesIds
    .map((sectionId) => sectionById.get(sectionId))
    .filter(Boolean);

  const businessSectionSlugs = normalizeTokens(
    businessSections.map((section) => section?.slug ?? "")
  );

  const businessSectionCategorySlugs = normalizeTokens(
    businessSections.map((section) => section?.categorySlug ?? "")
  );

  const businessText = normalizeText(
    [
      business.nombreNegocio,
      business.descripcionNegocio,
      businessCategorySlugs.join(" "),
      businessSectionSlugs.join(" "),
      enrichedProducts.map((product) => product.normalizedText).join(" "),
    ].join(" ")
  );

  const sectionUsage = new Map<string, number>();
  enrichedProducts.forEach((product) => {
    unique(product.sectionIds).forEach((sectionId) => {
      sectionUsage.set(sectionId, (sectionUsage.get(sectionId) ?? 0) + 1);
    });
  });

  const dominantSectionIds = [...sectionUsage.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([sectionId]) => sectionId);

  const contactHref = buildContactHref(availableProducts);

  return {
    products: enrichedProducts,
    businessText,
    businessCategorySlugs,
    businessSectionIds: business.seccionesIds,
    businessSectionSlugs,
    businessSectionCategorySlugs,
    dominantSectionIds,
    prices: enrichedProducts.map((product) => product.price),
    hasContactChannel: Boolean(contactHref),
    contactHref,
  };
};

const profileSignals: Record<
  Exclude<BusinessGuideVertical, "generic">,
  GuideProfileSignalsDefinition
> = {
  restaurant: {
    categories: ["comida", "bebidas"],
    sectionSlugs: [
      "comida-rapida",
      "almuerzos",
      "menus-dia",
      "desayunos",
      "hamburguesas",
      "pizzas",
      "jugos",
      "limonadas",
      "cafes",
    ],
    keywords: [
      "restaurante",
      "cafeteria",
      "cafe",
      "pizza",
      "hamburguesa",
      "almuerzo",
      "desayuno",
      "bebida",
      "menu del dia",
      "comida rapida",
    ],
  },
  fashion: {
    categories: ["moda"],
    sectionSlugs: [
      "camisas",
      "camisetas",
      "vestidosmujer",
      "vestidos-hombre",
      "blusas",
      "hoodies",
      "accesorios",
      "zapatos",
      "bolsos",
      "pantalones",
    ],
    keywords: [
      "moda",
      "ropa",
      "outfit",
      "look",
      "boutique",
      "fashion",
      "vestido",
      "blusa",
      "camisa",
      "accesorio",
    ],
  },
  flowers_gifts: {
    categories: ["jardineria", "negocios"],
    sectionSlugs: ["regalos", "plantas", "decoracion-jardin", "panaderia-pasteleria"],
    keywords: [
      "flor",
      "flores",
      "ramo",
      "bouquet",
      "rosa",
      "regalo",
      "detalle",
      "aniversario",
      "cumpleanos",
      "romantico",
    ],
  },
  tech: {
    categories: ["tecnologia"],
    sectionSlugs: [
      "audio",
      "gaming",
      "celulares",
      "laptops",
      "tablets",
      "smartwatches",
      "smart-home",
      "accesorios-tech",
    ],
    keywords: [
      "tech",
      "tecnologia",
      "gamer",
      "gaming",
      "laptop",
      "celular",
      "audio",
      "smart",
      "setup",
      "tablet",
    ],
  },
  home: {
    categories: ["hogar"],
    sectionSlugs: ["decoracion", "muebles", "cocina", "iluminacion", "ropa-de-cama"],
    keywords: [
      "hogar",
      "home",
      "decoracion",
      "cocina",
      "mueble",
      "iluminacion",
      "ambiente",
      "cozy",
      "espacio",
    ],
  },
};

export const detectGuideProfile = (
  business: BusinessGuideBusinessInfo,
  products: ProductRedSocial[]
): GuideProfileMatch => {
  const signals = extractCatalogSignals(business, products);

  const scores: Record<BusinessGuideVertical, number> = {
    restaurant: 0,
    fashion: 0,
    flowers_gifts: 0,
    tech: 0,
    home: 0,
    generic: 0,
  };

  (Object.keys(profileSignals) as Array<Exclude<BusinessGuideVertical, "generic">>).forEach(
    (vertical) => {
      const definition = profileSignals[vertical];

      const categoryHits = signals.businessCategorySlugs.filter((slug) =>
        definition.categories.includes(slug)
      ).length;
      const sectionCategoryHits = signals.businessSectionCategorySlugs.filter((slug) =>
        definition.categories.includes(slug)
      ).length;
      const sectionHits =
        signals.businessSectionSlugs.filter((slug) => definition.sectionSlugs.includes(slug)).length +
        signals.products.flatMap((product) => product.sectionSlugs).filter((slug) =>
          definition.sectionSlugs.includes(slug)
        ).length;
      const keywordHits = definition.keywords.filter((keyword) =>
        signals.businessText.includes(keyword)
      ).length;

      scores[vertical] =
        categoryHits * 6 +
        sectionCategoryHits * 5 +
        Math.min(20, sectionHits * 2) +
        Math.min(14, keywordHits * 2.5);
    }
  );

  const ranked = Object.entries(scores)
    .filter(([vertical]) => vertical !== "generic")
    .sort((left, right) => right[1] - left[1]);

  const [topEntry, secondEntry] = ranked;
  const topScore = topEntry?.[1] ?? 0;
  const secondScore = secondEntry?.[1] ?? 0;
  const topVertical = (topEntry?.[0] as BusinessGuideVertical | undefined) ?? "generic";
  const confidence = topScore - secondScore;

  if (topScore < 9 || confidence < 3) {
    return {
      vertical: "generic",
      confidence: 0,
      scores,
    };
  }

  return {
    vertical: topVertical,
    confidence,
    scores,
  };
};

const universalPresetTemplates: Array<{
  id: BusinessGuidePresetId;
  label: string;
  hint: string;
  shortResultLabel: string;
  icon: BusinessGuideIcon;
}> = [
  {
    id: "universal:catalog",
    label: "Ver catálogo",
    hint: "Una vista segura para empezar por opciones representativas del negocio.",
    shortResultLabel: "Selección del catálogo",
    icon: "catalog",
  },
  {
    id: "universal:popular",
    label: "Lo más popular",
    hint: "Productos con señales de tracción o protagonismo dentro del catálogo.",
    shortResultLabel: "Lo más popular",
    icon: "popular",
  },
  {
    id: "universal:budget",
    label: "Económico",
    hint: "Opciones más amables con el presupuesto para empezar rápido.",
    shortResultLabel: "Opciones económicas",
    icon: "budget",
  },
  {
    id: "universal:new",
    label: "Novedades",
    hint: "Una ruta segura para encontrar lo nuevo o lo más reciente del negocio.",
    shortResultLabel: "Novedades",
    icon: "new",
  },
  {
    id: "universal:contact",
    label: "Hablar con el negocio",
    hint: "Abrimos una ruta rápida para conversar con contexto real del catálogo.",
    shortResultLabel: "Productos para conversar",
    icon: "contact",
  },
];

const contextualPresetRules: ContextualPresetRule[] = [
  {
    id: "contextual:quick",
    verticals: ["restaurant"],
    label: "Algo rápido",
    hint: "Opciones fáciles de decidir y pedir cuando buscas ir al punto.",
    shortResultLabel: "Opciones rápidas",
    icon: "quick",
    keywords: normalizeTokens([
      "rapido",
      "express",
      "combo",
      "almuerzo",
      "menu del dia",
      "comida rapida",
      "hamburguesa",
      "empanada",
      "taco",
      "wrap",
      "desayuno",
    ]),
    preferredSectionSlugs: [
      "comida-rapida",
      "almuerzos",
      "menus-dia",
      "desayunos",
      "hamburguesas",
      "empanadas",
      "tacos",
      "wraps",
    ],
    preferredCategorySlugs: ["comida"],
    minEvidence: 2,
    priceStrategy: "balanced",
    specialLabels: ["mas_vendido", "promocion"],
    priorityWeight: 1.15,
    defaultReason: "Buena opción para pedir sin vueltas.",
  },
  {
    id: "contextual:drinks",
    verticals: ["restaurant"],
    label: "Ver bebidas",
    hint: "Solo aparece si el catálogo realmente tiene bebidas u opciones afines.",
    shortResultLabel: "Bebidas recomendadas",
    icon: "drink",
    keywords: normalizeTokens([
      "bebida",
      "jugo",
      "gaseosa",
      "cafe",
      "limonada",
      "malteada",
      "granizado",
      "cerveza",
      "coctel",
      "te",
      "agua",
      "vino",
      "whisky",
    ]),
    preferredSectionSlugs: [
      "agua",
      "bebidas-frias",
      "cafes",
      "cervezas",
      "cocteles",
      "gaseosas",
      "granizados",
      "jugos",
      "limonadas",
      "malteadas",
      "tes",
      "vinos",
      "whiskies",
    ],
    preferredCategorySlugs: ["bebidas"],
    minEvidence: 2,
    priceStrategy: "balanced",
    specialLabels: ["mas_vendido", "promocion", "novedad"],
    priorityWeight: 0.9,
    defaultReason: "Encaja bien si quieres empezar por bebidas.",
  },
  {
    id: "contextual:share",
    verticals: ["restaurant"],
    label: "Para compartir",
    hint: "Pensado para mesa, combos o antojos que suelen disfrutarse mejor en grupo.",
    shortResultLabel: "Para compartir",
    icon: "share",
    keywords: normalizeTokens([
      "compartir",
      "familiar",
      "para dos",
      "para cuatro",
      "combo",
      "tabla",
      "picada",
      "parrillada",
      "pizza",
      "bucket",
      "entrada",
    ]),
    preferredSectionSlugs: ["pizzas", "entradas", "carnes", "pollo", "comida-rapida"],
    preferredCategorySlugs: ["comida"],
    minEvidence: 2,
    priceStrategy: "premium",
    specialLabels: ["mas_vendido", "promocion"],
    priorityWeight: 1.1,
    defaultReason: "Tiene señales de funcionar bien para grupo o mesa.",
  },
  {
    id: "contextual:casual",
    verticals: ["fashion"],
    label: "Casual",
    hint: "Looks o piezas de uso diario con señales reales en el catálogo.",
    shortResultLabel: "Opciones casuales",
    icon: "casual",
    keywords: normalizeTokens([
      "casual",
      "diario",
      "everyday",
      "street",
      "basico",
      "básico",
      "jean",
      "camiseta",
      "hoodie",
      "short",
    ]),
    preferredSectionSlugs: ["camisetas", "hoodies", "shorts", "ropa-deportiva1", "pantalones", "zapatos-deportivos"],
    preferredCategorySlugs: ["moda"],
    minEvidence: 2,
    priceStrategy: "balanced",
    specialLabels: ["mas_vendido", "novedad"],
    priorityWeight: 1.05,
    defaultReason: "Buena ruta para looks más relajados.",
  },
  {
    id: "contextual:elegant",
    verticals: ["fashion"],
    label: "Elegante",
    hint: "Se activa solo cuando el catálogo tiene señales de formalidad o ocasión especial.",
    shortResultLabel: "Opciones elegantes",
    icon: "elegant",
    keywords: normalizeTokens([
      "elegante",
      "formal",
      "fiesta",
      "noche",
      "premium",
      "vestido",
      "blazer",
      "saco",
      "corbata",
    ]),
    preferredSectionSlugs: ["vestidosmujer", "vestidos-hombre", "sacos", "corbatas", "zapatos-hombre", "zapatos-mujer"],
    preferredCategorySlugs: ["moda"],
    minEvidence: 2,
    priceStrategy: "premium",
    specialLabels: ["novedad", "promocion"],
    priorityWeight: 1.2,
    defaultReason: "Buena ruta para ocasiones más especiales.",
  },
  {
    id: "contextual:gift",
    verticals: ["flowers_gifts", "generic"],
    label: "Para regalo",
    hint: "Solo aparece si hay señales reales de detalles, regalos o productos afines.",
    shortResultLabel: "Ideas para regalo",
    icon: "gift",
    keywords: normalizeTokens([
      "regalo",
      "detalle",
      "gift",
      "sorpresa",
      "bouquet",
      "ramo",
      "box",
      "caja",
    ]),
    preferredSectionSlugs: ["regalos", "plantas", "panaderia-pasteleria"],
    preferredCategorySlugs: ["jardineria", "negocios"],
    minEvidence: 2,
    priceStrategy: "balanced",
    specialLabels: ["novedad", "promocion"],
    priorityWeight: 1.0,
    defaultReason: "Tiene señales claras de servir como regalo.",
  },
  {
    id: "contextual:birthday",
    verticals: ["flowers_gifts", "generic"],
    label: "Cumpleaños",
    hint: "Ruta contextual si el negocio ofrece detalles o productos típicos para celebrar.",
    shortResultLabel: "Opciones para cumpleaños",
    icon: "birthday",
    keywords: normalizeTokens([
      "cumpleanos",
      "cumple",
      "celebracion",
      "celebrar",
      "party",
      "fiesta",
      "torta",
      "cake",
    ]),
    preferredSectionSlugs: ["regalos", "panaderia-pasteleria"],
    preferredCategorySlugs: ["negocios", "jardineria"],
    minEvidence: 2,
    priceStrategy: "balanced",
    specialLabels: ["novedad", "promocion"],
    priorityWeight: 1.0,
    defaultReason: "Se siente alineado con celebraciones.",
  },
  {
    id: "contextual:romantic",
    verticals: ["flowers_gifts"],
    label: "Romántico",
    hint: "Se activa cuando el catálogo tiene señales reales de flores, aniversarios o detalles románticos.",
    shortResultLabel: "Selección romántica",
    icon: "romantic",
    keywords: normalizeTokens([
      "romantico",
      "amor",
      "aniversario",
      "rosa",
      "rosas",
      "pareja",
      "love",
    ]),
    preferredSectionSlugs: ["plantas", "regalos"],
    preferredCategorySlugs: ["jardineria"],
    minEvidence: 1,
    priceStrategy: "premium",
    specialLabels: ["novedad", "promocion"],
    priorityWeight: 1.05,
    defaultReason: "Tiene señales de detalle especial.",
  },
  {
    id: "contextual:audio",
    verticals: ["tech"],
    label: "Audio",
    hint: "Solo aparece si el catálogo realmente tiene audio o accesorios de sonido.",
    shortResultLabel: "Audio destacado",
    icon: "audio",
    keywords: normalizeTokens(["audio", "audifono", "parlante", "speaker", "sonido", "headphone"]),
    preferredSectionSlugs: ["audio", "accesorios-tech"],
    preferredCategorySlugs: ["tecnologia"],
    minEvidence: 1,
    priceStrategy: "balanced",
    specialLabels: ["mas_vendido", "novedad"],
    priorityWeight: 1.05,
    defaultReason: "Buen punto de partida si buscas audio.",
  },
  {
    id: "contextual:gaming",
    verticals: ["tech"],
    label: "Gaming",
    hint: "Se activa cuando hay señales reales de productos gamer.",
    shortResultLabel: "Selección gaming",
    icon: "gaming",
    keywords: normalizeTokens(["gaming", "gamer", "console", "joystick", "rgb", "play"]),
    preferredSectionSlugs: ["gaming"],
    preferredCategorySlugs: ["tecnologia"],
    minEvidence: 1,
    priceStrategy: "premium",
    specialLabels: ["novedad", "mas_vendido"],
    priorityWeight: 1.1,
    defaultReason: "Muy alineado con gaming.",
  },
  {
    id: "contextual:setup",
    verticals: ["tech"],
    label: "Para tu setup",
    hint: "Una ruta contextual para accesorios o equipos que ayudan a montar un setup.",
    shortResultLabel: "Opciones para setup",
    icon: "setup",
    keywords: normalizeTokens(["setup", "smart", "desk", "escritorio", "accesorio", "productividad"]),
    preferredSectionSlugs: ["accesorios-tech", "laptops", "tablets", "smart-home"],
    preferredCategorySlugs: ["tecnologia"],
    minEvidence: 2,
    priceStrategy: "balanced",
    specialLabels: ["novedad", "promocion"],
    priorityWeight: 1.0,
    defaultReason: "Ayuda a explorar opciones para un setup más completo.",
  },
  {
    id: "contextual:decor",
    verticals: ["home"],
    label: "Decoración",
    hint: "Solo si el catálogo realmente tiene productos para ambientar o decorar.",
    shortResultLabel: "Ideas de decoración",
    icon: "decor",
    keywords: normalizeTokens(["decoracion", "decorar", "ambiente", "estilo", "diseño", "diseno"]),
    preferredSectionSlugs: ["decoracion", "iluminacion", "muebles"],
    preferredCategorySlugs: ["hogar"],
    minEvidence: 2,
    priceStrategy: "balanced",
    specialLabels: ["novedad", "promocion"],
    priorityWeight: 1.05,
    defaultReason: "Buena ruta para ambientar tu espacio.",
  },
  {
    id: "contextual:cozy_home",
    verticals: ["home"],
    label: "Para tu hogar",
    hint: "Una selección más práctica y transversal para casa, si el catálogo lo soporta.",
    shortResultLabel: "Opciones para hogar",
    icon: "home",
    keywords: normalizeTokens(["hogar", "cocina", "cama", "cozy", "casa", "practico", "práctico"]),
    preferredSectionSlugs: ["cocina", "ropa-de-cama", "muebles", "decoracion"],
    preferredCategorySlugs: ["hogar"],
    minEvidence: 2,
    priceStrategy: "balanced",
    specialLabels: ["mas_vendido", "promocion"],
    priorityWeight: 0.95,
    defaultReason: "Se siente muy alineado con casa y funcionalidad.",
  },
];

const contextualRuleById = new Map(
  contextualPresetRules.map((rule) => [rule.id, rule])
);

const buildBusinessGuidePreset = (
  partial: Omit<BusinessGuidePreset, "vertical"> & { vertical?: BusinessGuideVertical }
): BusinessGuidePreset => ({
  vertical: partial.vertical ?? "generic",
  ...partial,
});

const sectionPresetFromId = (sectionId: string, vertical: BusinessGuideVertical): BusinessGuidePreset => {
  const section = sectionById.get(sectionId);
  const normalizedName = section?.nombre ?? templateIdToLabel(sectionId);

  return buildBusinessGuidePreset({
    id: `section:${sectionId}`,
    kind: "section",
    vertical,
    label: `Ver ${normalizedName.toLowerCase()}`,
    hint: `Ruta directa hacia ${normalizedName.toLowerCase()}, basada en el catálogo real del negocio.`,
    shortResultLabel: normalizedName,
    icon: "section",
    preferredSectionId: sectionId,
    evidence: [normalizedName],
  });
};

const countPresetEvidence = (
  signals: CatalogSignals,
  rule: ContextualPresetRule
) => {
  const matchingProducts = signals.products.filter((product) => {
    const hasKeyword = rule.keywords.some((keyword) => product.normalizedText.includes(keyword));
    const hasSection = product.sectionSlugs.some((slug) => rule.preferredSectionSlugs.includes(slug));
    const hasCategory =
      product.sectionCategorySlugs.some((slug) => rule.preferredCategorySlugs.includes(slug)) ||
      rule.preferredCategorySlugs.includes(product.categorySlug);

    return hasKeyword || hasSection || hasCategory;
  });

  return {
    evidence: matchingProducts.length,
    sectionId:
      matchingProducts.flatMap((product) => product.sectionIds).find((sectionId) => {
        const section = sectionById.get(sectionId);
        if (!section) return false;
        return (
          rule.preferredSectionSlugs.includes(normalizeText(section.slug)) ||
          rule.preferredCategorySlugs.includes(normalizeText(section.categorySlug))
        );
      }) ?? null,
  };
};

const buildUniversalPresets = (
  profile: GuideProfileMatch,
  signals: CatalogSignals
) => {
  const base = universalPresetTemplates
    .filter((preset) => preset.id !== "universal:contact" || signals.hasContactChannel)
    .map((preset) =>
      buildBusinessGuidePreset({
        id: preset.id,
        kind: "universal",
        vertical: profile.vertical,
        label: preset.label,
        hint: preset.hint,
        shortResultLabel: preset.shortResultLabel,
        icon: preset.icon,
      })
    );

  return base;
};

const buildContextualPresets = (
  profile: GuideProfileMatch,
  signals: CatalogSignals
) =>
  contextualPresetRules
    .filter((rule) => rule.verticals.includes(profile.vertical))
    .map((rule) => {
      const evidence = countPresetEvidence(signals, rule);

      return {
        rule,
        evidence,
      };
    })
    .filter(({ rule, evidence }) => evidence.evidence >= rule.minEvidence)
    .sort((left, right) => right.evidence.evidence - left.evidence.evidence)
    .slice(0, 2)
    .map(({ rule, evidence }) =>
      buildBusinessGuidePreset({
        id: rule.id,
        kind: "contextual",
        vertical: profile.vertical,
        label: rule.label,
        hint: rule.hint,
        shortResultLabel: rule.shortResultLabel,
        icon: rule.icon,
        preferredSectionId: evidence.sectionId,
        evidence: rule.keywords.slice(0, 2),
      })
    );

const buildSectionFallbackPresets = (
  profile: GuideProfileMatch,
  signals: CatalogSignals
) =>
  signals.dominantSectionIds
    .filter((sectionId) => {
      const section = sectionById.get(sectionId);
      if (!section) return false;
      return Boolean(section.nombre && section.slug);
    })
    .slice(0, 2)
    .map((sectionId) => sectionPresetFromId(sectionId, profile.vertical));

const getGuideCopy = (vertical: BusinessGuideVertical): Pick<BusinessGuideConfig, "title" | "subtitle" | "helperText"> => {
  switch (vertical) {
    case "restaurant":
      return {
        title: "Te ayudamos a decidir mejor",
        subtitle: "Primero te mostramos rutas seguras y luego productos recomendados sin salir de esta vista.",
        helperText: "La guía solo activa atajos que el catálogo realmente puede sostener.",
      };
    case "fashion":
      return {
        title: "Te ayudamos a encontrar un buen punto de partida",
        subtitle: "Rutas rápidas para explorar el catálogo según estilo, precio o señales reales del negocio.",
        helperText: "Usamos secciones, nombres, tags y prioridad del catálogo actual.",
      };
    case "flowers_gifts":
      return {
        title: "Te ayudamos a elegir un detalle con mejor contexto",
        subtitle: "La guía prioriza rutas seguras y solo activa atajos especiales cuando el catálogo los justifica.",
        helperText: "Ideal para explorar regalos, detalles o rutas por ocasión cuando realmente existen.",
      };
    default:
      return {
        title: "Te ayudamos a elegir",
        subtitle: "Empieza por una ruta general segura y te mostramos productos alineados con esa intención.",
        helperText: "La guía se construye con señales reales del catálogo, no con presets fijos.",
      };
  }
};

const dedupePresets = (presets: BusinessGuidePreset[]) => {
  const presetMap = new Map<BusinessGuidePresetId, BusinessGuidePreset>();
  presets.forEach((preset) => {
    if (!presetMap.has(preset.id)) {
      presetMap.set(preset.id, preset);
    }
  });
  return [...presetMap.values()];
};

export const getBusinessGuideConfig = (
  business: BusinessGuideBusinessInfo,
  products: ProductRedSocial[]
): BusinessGuideConfig | null => {
  if (products.length === 0) {
    return null;
  }

  const profile = detectGuideProfile(business, products);
  const signals = extractCatalogSignals(business, products);
  const universalPresets = buildUniversalPresets(profile, signals);
  const contextualPresets = buildContextualPresets(profile, signals);

  const needsSectionFallback =
    profile.vertical === "generic" || contextualPresets.length === 0;

  const fallbackSectionPresets = needsSectionFallback
    ? buildSectionFallbackPresets(profile, signals)
    : [];

  const copy = getGuideCopy(profile.vertical);

  return {
    vertical: profile.vertical,
    title: copy.title,
    subtitle: copy.subtitle,
    helperText: copy.helperText,
    presets: dedupePresets([
      ...universalPresets,
      ...contextualPresets,
      ...fallbackSectionPresets,
    ]),
  };
};

const scoreByPrice = (price: number, prices: number[], strategy: PriceStrategy) => {
  if (prices.length === 0) return 0;

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (minPrice === maxPrice) {
    return strategy === "premium" ? 10 : 18;
  }

  const normalized = (price - minPrice) / (maxPrice - minPrice);

  if (strategy === "low") {
    return (1 - normalized) * 32;
  }

  if (strategy === "premium") {
    return normalized * 18;
  }

  return (1 - Math.abs(normalized - 0.42)) * 18;
};

const specialScore = (product: ProductRedSocial, specialLabels: string[]) => {
  const label = product.etiquetaEspecial ?? "";
  if (!label || label === "ninguna") return 0;
  return specialLabels.includes(label) ? 24 : 8;
};

const priorityScore = (product: ProductRedSocial, weight: number) =>
  Math.min(28, (product.prioridad ?? 0) * 3 * weight);

const buildReason = (
  product: EnrichedGuideProduct,
  rule: ScoreRule,
  matchedKeywords: string[]
) => {
  const reasonCandidates: string[] = [];

  if (product.product.etiquetaEspecial && product.product.etiquetaEspecial !== "ninguna") {
    reasonCandidates.push(product.product.etiquetaEspecial.replaceAll("_", " "));
  }

  if (matchedKeywords.some((keyword) => keyword.includes("promo") || keyword.includes("econom"))) {
    reasonCandidates.push("precio amable");
  }

  if (matchedKeywords.some((keyword) => keyword.includes("nuevo") || keyword.includes("novedad"))) {
    reasonCandidates.push("señales de novedad");
  }

  const sectionName = product.sectionIds
    .map((sectionId) => sectionById.get(sectionId)?.nombre)
    .find(Boolean);

  if (reasonCandidates.length === 0 && sectionName) {
    reasonCandidates.push(sectionName);
  }

  const firstReason = reasonCandidates[0];
  if (!firstReason) {
    return rule.defaultReason;
  }

  return firstReason.charAt(0).toUpperCase() + firstReason.slice(1);
};

const uniqueSignals = (signals: string[]) => unique(signals.filter(Boolean));

const getProductDedupeKey = (product: ProductRedSocial) =>
  product.id ||
  product.slug ||
  normalizeText([product.nombre, product.categoriaId, product.nombreNegocio ?? ""].join("-"));

const dedupeGuideRecommendations = (
  items: BusinessGuideRecommendation[],
  presetId: BusinessGuidePresetId
) => {
  const map = new Map<string, BusinessGuideRecommendation>();

  items.forEach((item) => {
    const dedupeKey = getProductDedupeKey(item.product);
    const existing = map.get(dedupeKey);
    const mergedSignals = uniqueSignals([
      ...(existing?.matchedSignals ?? []),
      ...item.matchedSignals,
    ]);

    const nextItem: BusinessGuideRecommendation = {
      ...item,
      key: `${presetId}:${dedupeKey}`,
      matchedSignals: mergedSignals,
    };

    if (!existing || item.score > existing.score) {
      map.set(dedupeKey, nextItem);
      return;
    }

    map.set(dedupeKey, {
      ...existing,
      matchedSignals: mergedSignals,
      key: `${presetId}:${dedupeKey}`,
    });
  });

  return [...map.values()];
};

const diverseFallback = (signals: CatalogSignals, limit: number) =>
  [...signals.products]
    .sort((left, right) => {
      const leftScore =
        priorityScore(left.product, 1.2) +
        specialScore(left.product, ["mas_vendido", "mas_buscado", "novedad", "promocion"]);
      const rightScore =
        priorityScore(right.product, 1.2) +
        specialScore(right.product, ["mas_vendido", "mas_buscado", "novedad", "promocion"]);

      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.price - right.price;
    })
    .slice(0, limit + 3)
    .map<BusinessGuideRecommendation>((item) => ({
      key: `fallback:${getProductDedupeKey(item.product)}`,
      product: item.product,
      reason: "Buena puerta de entrada",
      matchedSignals: [],
      score:
        priorityScore(item.product, 1.2) +
        specialScore(item.product, ["mas_vendido", "mas_buscado", "novedad", "promocion"]),
    }));

const scoreProduct = (
  product: EnrichedGuideProduct,
  signals: CatalogSignals,
  rule: ScoreRule
) => {
  const matchedKeywords = uniqueSignals(
    rule.keywords.filter((keyword) => product.normalizedText.includes(keyword))
  );

  const sectionHits = product.sectionSlugs.filter((slug) =>
    rule.preferredSectionSlugs.includes(slug)
  ).length;
  const categoryHits =
    product.sectionCategorySlugs.filter((slug) =>
      rule.preferredCategorySlugs.includes(slug)
    ).length +
    (rule.preferredCategorySlugs.includes(product.categorySlug) ? 1 : 0);

  const score =
    matchedKeywords.length * 16 +
    sectionHits * 18 +
    categoryHits * 16 +
    scoreByPrice(product.price, signals.prices, rule.priceStrategy) +
    priorityScore(product.product, rule.priorityWeight) +
    specialScore(product.product, rule.specialLabels);

  return {
    score,
    matchedKeywords,
  };
};

const getPresetRule = (preset: BusinessGuidePreset): ScoreRule => {
  if (preset.kind === "section" && preset.preferredSectionId) {
    const section = sectionById.get(preset.preferredSectionId);
    return {
      keywords: normalizeTokens([section?.nombre ?? "", section?.slug ?? ""]),
      preferredSectionSlugs: normalizeTokens([section?.slug ?? ""]),
      preferredCategorySlugs: normalizeTokens([section?.categorySlug ?? ""]),
      priceStrategy: "balanced",
      specialLabels: ["mas_vendido", "novedad", "promocion"],
      priorityWeight: 1.05,
      defaultReason: `Relacionado con ${section?.nombre ?? "esta sección"}`,
    };
  }

  const contextualRule =
    preset.kind === "contextual" ? contextualRuleById.get(preset.id as ContextualGuidePresetId) : null;

  if (contextualRule) {
    return {
      keywords: contextualRule.keywords,
      preferredSectionSlugs: contextualRule.preferredSectionSlugs,
      preferredCategorySlugs: contextualRule.preferredCategorySlugs,
      priceStrategy: contextualRule.priceStrategy,
      specialLabels: contextualRule.specialLabels,
      priorityWeight: contextualRule.priorityWeight,
      defaultReason: contextualRule.defaultReason,
    };
  }

  switch (preset.id) {
    case "universal:budget":
      return {
        keywords: normalizeTokens(["promo", "promocion", "economico", "oferta"]),
        preferredSectionSlugs: [],
        preferredCategorySlugs: [],
        priceStrategy: "low",
        specialLabels: ["promocion"],
        priorityWeight: 0.8,
        defaultReason: "Buena opción para empezar cuidando el presupuesto.",
      };
    case "universal:new":
      return {
        keywords: normalizeTokens(["nuevo", "nueva", "novedad", "reciente", "lanzamiento"]),
        preferredSectionSlugs: [],
        preferredCategorySlugs: [],
        priceStrategy: "balanced",
        specialLabels: ["novedad", "reciente"],
        priorityWeight: 1.0,
        defaultReason: "Tiene señales de novedad en el catálogo.",
      };
    case "universal:contact":
      return {
        keywords: normalizeTokens(["recomendado", "favorito", "popular"]),
        preferredSectionSlugs: [],
        preferredCategorySlugs: [],
        priceStrategy: "balanced",
        specialLabels: ["mas_vendido", "mas_buscado", "promocion"],
        priorityWeight: 1.2,
        defaultReason: "Buen punto de partida para conversar con el negocio.",
      };
    case "universal:popular":
      return {
        keywords: normalizeTokens(["popular", "favorito", "recomendado", "top", "estrella"]),
        preferredSectionSlugs: [],
        preferredCategorySlugs: [],
        priceStrategy: "balanced",
        specialLabels: ["mas_vendido", "mas_buscado", "novedad"],
        priorityWeight: 1.5,
        defaultReason: "Suele ser una de las elecciones más fuertes del negocio.",
      };
    default:
      return {
        keywords: normalizeTokens(["destacado", "recomendado", "especial", "favorito"]),
        preferredSectionSlugs: [],
        preferredCategorySlugs: [],
        priceStrategy: "balanced",
        specialLabels: ["mas_vendido", "mas_buscado", "novedad", "promocion"],
        priorityWeight: 1.1,
        defaultReason: "Resume bien una entrada segura al catálogo.",
      };
  }
};

const dominantSectionId = (
  items: BusinessGuideRecommendation[],
  preset: BusinessGuidePreset
) => {
  if (preset.preferredSectionId) {
    return preset.preferredSectionId;
  }

  const counts = new Map<string, number>();
  items.forEach((item) => {
    item.product.sections.forEach((sectionId) => {
      counts.set(sectionId, (counts.get(sectionId) ?? 0) + 1);
    });
  });

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
};

const buildPrimaryAction = (
  preset: BusinessGuidePreset,
  signals: CatalogSignals
): BusinessGuideAction | null => {
  if (preset.id !== "universal:contact" || !signals.contactHref) {
    return null;
  }

  return {
    label: "Hablar ahora",
    href: signals.contactHref,
    external: true,
  };
};

export const resolveBusinessGuidePreset = ({
  business,
  products,
  presetId,
  maxResults = 4,
}: {
  business: BusinessGuideBusinessInfo;
  products: ProductRedSocial[];
  presetId: BusinessGuidePresetId;
  maxResults?: number;
}): BusinessGuideResolvedPreset | null => {
  const config = getBusinessGuideConfig(business, products);
  if (!config || maxResults <= 0) {
    return null;
  }

  const preset = config.presets.find((item) => item.id === presetId);
  if (!preset) {
    return null;
  }

  const signals = extractCatalogSignals(business, products);
  if (signals.products.length === 0) {
    return null;
  }

  const rule = getPresetRule(preset);
  const ranked = signals.products
    .map((product) => {
      const result = scoreProduct(product, signals, rule);
      const dedupeKey = getProductDedupeKey(product.product);

      return {
        key: `${preset.id}:${dedupeKey}`,
        product: product.product,
        reason: buildReason(product, rule, result.matchedKeywords),
        matchedSignals: result.matchedKeywords.slice(0, 2),
        score: result.score,
      } satisfies BusinessGuideRecommendation;
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if ((right.product.prioridad ?? 0) !== (left.product.prioridad ?? 0)) {
        return (right.product.prioridad ?? 0) - (left.product.prioridad ?? 0);
      }
      return getEffectivePrice(left.product) - getEffectivePrice(right.product);
    });

  const dedupedRanked = dedupeGuideRecommendations(ranked, preset.id);
  const minimumResults = Math.min(3, signals.products.length);
  const strongMatches = dedupedRanked.filter((item) => item.score > 12);
  let selected = strongMatches.slice(0, maxResults);
  let isFallback = false;

  if (selected.length < minimumResults) {
    isFallback = true;
    const fallback = dedupeGuideRecommendations(diverseFallback(signals, maxResults + minimumResults), preset.id);
    const selectedIds = new Set(selected.map((item) => getProductDedupeKey(item.product)));

    fallback.forEach((item) => {
      if (selected.length >= Math.min(maxResults, signals.products.length)) return;
      const dedupeKey = getProductDedupeKey(item.product);
      if (selectedIds.has(dedupeKey)) return;
      selected.push(item);
      selectedIds.add(dedupeKey);
    });
  }

  selected = dedupeGuideRecommendations(selected, preset.id).slice(0, maxResults);

  const summary = isFallback
    ? `No encontramos coincidencias perfectas para “${preset.label}”, así que te mostramos una selección general y segura del negocio.`
    : `${preset.shortResultLabel} construidas con señales reales del catálogo de ${business.nombreNegocio}.`;

  const preferredSectionId = dominantSectionId(selected, preset);
  const exploreContext: ProductGuideExploreContext = {
    requestKey: `${preset.id}-${Date.now()}`,
    presetId: preset.id,
    title: preset.label,
    summary,
    preferredSectionId,
  };

  return {
    preset,
    title: preset.shortResultLabel,
    summary,
    items: selected,
    exploreContext,
    isFallback,
    primaryAction: buildPrimaryAction(preset, signals),
  };
};
