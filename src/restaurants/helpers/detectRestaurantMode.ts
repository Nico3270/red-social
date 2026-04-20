/**
 * Restaurant Mode Detection
 * 
 * Detecta si un negocio debe usar la vista premium tipo menú/carta
 * basándose en señales editoriales (categoría, nombres de grupos, estructura)
 */

export interface RestaurantModeSignals {
  isRestaurant: boolean;
  confidence: "high" | "medium" | "low";
  signals: string[];
  restaurantType?: "restaurant" | "cafe" | "bar" | "bakery" | "food";
}

/**
 * Palabras clave restaurante/comida/bebidas en española e inglés
 */
const RESTAURANT_CATEGORIES = new Set([
  "restaurant",
  "restaurante",
  "comida",
  "food",
  "bebidas",
  "drinks",
  "café",
  "cafe",
  "coffee",
  "bar",
  "pub",
  "panadería",
  "bakery",
  "pizzería",
  "pizzeria",
  "italian",
  "asadero",
  "grill",
  "sushi",
  "seafood",
  "mariscos",
  "vegetarian",
  "vegetariano",
  "vegan",
  "vegano",
]);

/**
 * Nombres de grupos típicos de restaurante
 */
const RESTAURANT_GROUP_NAMES = new Set([
  "entradas",
  "appetizers",
  "starters",
  "platos",
  "platos fuertes",
  "platos principales",
  "main courses",
  "mains",
  "postres",
  "desserts",
  "bebidas",
  "drinks",
  "cócteles",
  "cocktails",
  "vinos",
  "wines",
  "cervezas",
  "beers",
  "licores",
  "spirits",
  "café",
  "coffee",
  "tés",
  "teas",
  "refrescos",
  "soft drinks",
  "desayuno",
  "breakfast",
  "almuerzo",
  "lunch",
  "cena",
  "dinner",
  "snacks",
  "sides",
  "acompañamientos",
  "sopa",
  "soups",
  "ensaladas",
  "salads",
  "pan",
  "bread",
  "pastas",
  "pasta",
  "arroces",
  "rice",
  "carnes",
  "meats",
  "aves",
  "poultry",
  "pescados",
  "fish",
  "mariscos",
  "seafood",
  "verduras",
  "vegetables",
]);

/**
 * Detecta si un negocio debe usar modo restaurante premium
 */
export function detectRestaurantMode(
  categoryNames?: string[],
  groupNames?: string[],
  totalGroups?: number
): RestaurantModeSignals {
  const signals: string[] = [];
  let confidence: "high" | "medium" | "low" = "low";

  // SIGNAL 1: Categoría del negocio
  if (categoryNames && categoryNames.length > 0) {
    const normalizedCategories = categoryNames.map(c => c.toLowerCase().trim());
    const hasRestaurantCategory = normalizedCategories.some(cat =>
      RESTAURANT_CATEGORIES.has(cat) ||
      normalizedCategories.some(c => RESTAURANT_CATEGORIES.has(c))
    );

    if (hasRestaurantCategory) {
      signals.push("restaurant_category");
      confidence = "high";
    }
  }

  // SIGNAL 2: Nombres de grupos
  if (groupNames && groupNames.length > 0) {
    const normalizedGroups = groupNames.map(g => g.toLowerCase().trim());
    const restaurantGroupCount = normalizedGroups.filter(group =>
      RESTAURANT_GROUP_NAMES.has(group) ||
      normalizedGroups.some(g => RESTAURANT_GROUP_NAMES.has(g))
    ).length;

    if (restaurantGroupCount >= 2) {
      signals.push("restaurant_groups");
      if (confidence === "low") confidence = "medium";
      if (restaurantGroupCount >= 4) confidence = "high";
    }
  }

  // SIGNAL 3: Complejidad editorial
  if (totalGroups && totalGroups >= 4) {
    signals.push("complex_structure");
    if (confidence === "low") confidence = "medium";
  }

  // DETERMINACIÓN FINAL
  const isRestaurant = confidence !== "low" && signals.length > 0;

  return {
    isRestaurant,
    confidence,
    signals,
    restaurantType: isRestaurant ? inferRestaurantType(categoryNames, groupNames) : undefined,
  };
}

/**
 * Infiere el tipo de restaurante (para personalización futura)
 */
function inferRestaurantType(
  categoryNames?: string[],
  groupNames?: string[]
): "restaurant" | "cafe" | "bar" | "bakery" | "food" {
  const allText = [
    ...(categoryNames || []),
    ...(groupNames || []),
  ]
    .join(" ")
    .toLowerCase();

  if (allText.includes("café") || allText.includes("coffee")) return "cafe";
  if (allText.includes("bar") || allText.includes("pub")) return "bar";
  if (allText.includes("panadería") || allText.includes("bakery")) return "bakery";
  if (allText.includes("restaurante") || allText.includes("restaurant")) return "restaurant";

  return "food";
}

/**
 * Validar si el modo restaurante es apropiado para este negocio
 * Fallback seguro si no tiene suficientes señales
 */
export function shouldUseRestaurantMenu(
  categoryNames?: string[],
  groupNames?: string[],
  totalGroups?: number
): boolean {
  const detection = detectRestaurantMode(categoryNames, groupNames, totalGroups);
  // Requiere al menos "medium" confidence para activar
  return detection.isRestaurant && (detection.confidence === "high" || detection.confidence === "medium");
}
