import {
  EMPTY_ADMIN_IMAGE_PROMPT_OVERRIDES,
  IMAGE_GENERATION_PURPOSES,
  getAdminImagePromptOverride,
  resolveAdminProductImagePrompt,
} from "./adminImageGeneration";

describe("adminImageGeneration helpers", () => {
  it("resuelve CATALOG sin reventar si el bag de overrides no existe", () => {
    expect(
      getAdminImagePromptOverride(
        undefined,
        IMAGE_GENERATION_PURPOSES.CATALOG,
      ),
    ).toBe("");
    expect(
      getAdminImagePromptOverride(
        EMPTY_ADMIN_IMAGE_PROMPT_OVERRIDES,
        IMAGE_GENERATION_PURPOSES.CATALOG,
      ),
    ).toBe("");
  });

  it("usa el prompt catálogo existente cuando el purpose es CATALOG", () => {
    expect(
      resolveAdminProductImagePrompt({
        purpose: IMAGE_GENERATION_PURPOSES.CATALOG,
        source: {
          nombre: "Brownie premium",
          promptCatalogo: "foto limpia del brownie sobre fondo neutro",
        },
      }),
    ).toBe("foto limpia del brownie sobre fondo neutro");
  });

  it("usa el prompt publicitario existente cuando el purpose es PROMOTIONAL", () => {
    expect(
      resolveAdminProductImagePrompt({
        purpose: IMAGE_GENERATION_PURPOSES.PROMOTIONAL,
        source: {
          nombre: "Combo brunch",
          promptPublicitario: "escena comercial cálida con el combo como protagonista",
        },
      }),
    ).toBe("escena comercial cálida con el combo como protagonista");
  });

  it("genera fallback seguro aunque falten prompts, negocio o categoría", () => {
    const prompt = resolveAdminProductImagePrompt({
      purpose: IMAGE_GENERATION_PURPOSES.CUSTOM,
      source: {
        nombre: "Caja brunch",
        descripcionCorta: "Incluye bebidas y panadería artesanal",
      },
    });

    expect(prompt).toContain("Caja brunch");
    expect(prompt).toContain("personalizada y realista");
  });

  it("genera fallback de catálogo con datos disponibles sin depender de prompts IA", () => {
    const prompt = resolveAdminProductImagePrompt({
      purpose: IMAGE_GENERATION_PURPOSES.CATALOG,
      source: {
        nombre: "Cheesecake",
        descripcion: "Postre frío con frutos rojos",
        categoriaNombre: "Postres",
      },
      businessName: "Pastelería Central",
    });

    expect(prompt).toContain("catálogo limpia y realista");
    expect(prompt).toContain("Categoría: Postres.");
    expect(prompt).toContain("Negocio: Pastelería Central.");
  });
});