const mockAuth = jest.fn();
const mockTransaction = jest.fn();
const mockRootNegocioFindFirst = jest.fn();
const mockTxNegocioFindFirst = jest.fn();
const mockTxProductFindMany = jest.fn();
const mockTxProductFindUnique = jest.fn();
const mockTxDeliveryDataCreate = jest.fn();
const mockTxOrderCreate = jest.fn();
const mockTxOrderItemCreateMany = jest.fn();
const mockTxOrderStatusHistoryCreate = jest.fn();
const mockNotify = jest.fn();
const mockBuildVariantLabel = jest.fn(
  (variant: { nombre?: string | null }) => variant.nombre || "Variante",
);
const publishedWhere = {
  estado: "activo",
  isTestData: false,
  archivedAt: null,
  usuario: {
    is: {
      estado: "activo",
      isPlaceholder: false,
      perfilCompleto: true,
    },
  },
};
const mockBuildPublishedBusinessWhere = jest.fn(() => publishedWhere);

const transactionClient = {
  negocio: { findFirst: mockTxNegocioFindFirst },
  product: {
    findMany: mockTxProductFindMany,
    findUnique: mockTxProductFindUnique,
  },
  deliveryData: { create: mockTxDeliveryDataCreate },
  order: { create: mockTxOrderCreate },
  orderItem: { createMany: mockTxOrderItemCreateMany },
  orderStatusHistory: { create: mockTxOrderStatusHistoryCreate },
};

jest.mock("@/auth.config", () => ({ auth: mockAuth }), { virtual: true });
jest.mock(
  "@/lib/business/business-visibility-policy",
  () => ({ buildPublishedBusinessWhere: mockBuildPublishedBusinessWhere }),
  { virtual: true },
);
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    negocio: { findFirst: mockRootNegocioFindFirst },
    $transaction: mockTransaction,
  },
}), { virtual: true });
jest.mock("@/reservas/helpers/notifyReserva", () => ({
  notifyReservaConfirmadaCliente: mockNotify,
}), { virtual: true });
jest.mock("@/reservas/interfaces/interfaces.whatsapp", () => ({
  PlantillaWhatsApp: {
    PEDIDO_CREADO_NEGOCIO: "PEDIDO_CREADO_NEGOCIO",
    PEDIDO_CREADO_NEGOCIO_USUARIO: "PEDIDO_CREADO_NEGOCIO_USUARIO",
    PEDIDO_CREADO_USUARIO_USUARIO: "PEDIDO_CREADO_USUARIO_USUARIO",
  },
}), { virtual: true });
jest.mock("@/ui/components/productos/variantDisplay", () => ({
  buildVariantLabel: mockBuildVariantLabel,
}), { virtual: true });

import { createNewPedido } from "./createNewPedido";
import {
  classifyBusinessVisibility,
  type BusinessVisibilityInput,
} from "../../lib/business/business-visibility-policy";
import {
  EstadoNegocio,
  EstadoUsuario,
  ProductStatus,
  TipoUsuario,
} from "@prisma/client";

const publicSlug = "negocio-publico";
const negocioId = "negocio-1";
const productId = "00000000-0000-4000-8000-000000000001";
const secondProductId = "00000000-0000-4000-8000-000000000002";
const thirdProductId = "00000000-0000-4000-8000-000000000003";
const variantId = "10000000-0000-4000-8000-000000000001";
const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

let transactionActive = false;
let transactionEvents: string[] = [];

const publishedFixture: BusinessVisibilityInput = {
  estado: EstadoNegocio.activo,
  isTestData: false,
  archivedAt: null,
  usuario: {
    estado: EstadoUsuario.activo,
    isPlaceholder: false,
    perfilCompleto: true,
  },
};

interface CatalogVariantFixture {
  id: string;
  nombre: string | null;
  precio: number | null;
  stock: number | null;
  stockIlimitado: boolean;
  isActive: boolean;
  orden: number;
  options: Array<{
    id: string;
    nombre: string;
    valor: string;
    orden: number;
  }>;
}

interface CatalogProductFixture {
  id: string;
  nombre: string;
  precio: number;
  negocioId: string;
  stock: number | null;
  stockIlimitado: boolean;
  usaVariantes: boolean;
  variantes: CatalogVariantFixture[];
}

function catalogVariant(
  overrides: Partial<CatalogVariantFixture> = {},
): CatalogVariantFixture {
  return {
    id: variantId,
    nombre: "Tamaño grande",
    precio: 60000,
    stock: null,
    stockIlimitado: true,
    isActive: true,
    orden: 0,
    options: [
      {
        id: "option-1",
        nombre: "Tamaño",
        valor: "Grande",
        orden: 0,
      },
    ],
    ...overrides,
  };
}

function catalogProduct(
  overrides: Partial<CatalogProductFixture> = {},
): CatalogProductFixture {
  return {
    id: productId,
    nombre: "Producto del servidor",
    precio: 25,
    negocioId,
    stock: null,
    stockIlimitado: true,
    usaVariantes: false,
    variantes: [],
    ...overrides,
  };
}

function pedidoItem(
  overrides: Partial<{
    productId?: string;
    productVariantId?: string | null;
    variantLabel?: string | null;
    quantity: number;
    price: number;
    subtotal: number;
    description: string;
  }> = {},
) {
  return {
    productId,
    productVariantId: null,
    variantLabel: null,
    quantity: 2,
    price: 1,
    subtotal: 2,
    description: "Producto enviado por el cliente",
    ...overrides,
  };
}

function pedidoInput(
  options: {
    slug?: string;
    includeSlug?: boolean;
    items?: ReturnType<typeof pedidoItem>[];
    totalAmount?: number;
  } = {},
) {
  const includeSlug = options.includeSlug ?? true;

  return {
    ...(includeSlug ? { slug: options.slug ?? publicSlug } : {}),
    items: options.items ?? [pedidoItem()],
    deliveryData: {
      orderType: "DELIVERY" as const,
      country: "Colombia",
      departamento: "Cundinamarca",
      ciudad: "Bogotá",
      clientName: "Cliente prueba",
      clientPhone: "+573001112233",
      deliveryAddress: "Calle 1 # 2-3",
      additionalComments: "Sin cebolla",
    },
    totalAmount: options.totalAmount ?? 2,
  };
}

function makeBusinessLookup(fixture: BusinessVisibilityInput | null) {
  mockTxNegocioFindFirst.mockImplementation(async (args) => {
    expect(transactionActive).toBe(true);
    transactionEvents.push("published-guard");
    expect(args).toEqual({
      where: {
        AND: [publishedWhere, { slug: publicSlug }],
      },
      select: { id: true, telefonoContacto: true },
    });

    if (!fixture || classifyBusinessVisibility(fixture) !== "PUBLISHED") {
      return null;
    }

    return {
      id: negocioId,
      telefonoContacto: "+573004445566",
    };
  });
}

function mockPublicProducts(products: CatalogProductFixture[]) {
  mockTxProductFindMany.mockImplementation(async () => {
    transactionEvents.push("product-batch-lookup");
    return products;
  });
}

function expectNoWritesOrNotifications() {
  expect(mockTxDeliveryDataCreate).not.toHaveBeenCalled();
  expect(mockTxOrderCreate).not.toHaveBeenCalled();
  expect(mockTxOrderItemCreateMany).not.toHaveBeenCalled();
  expect(mockTxOrderStatusHistoryCreate).not.toHaveBeenCalled();
  expect(mockNotify).not.toHaveBeenCalled();
}

function expectOrderItemsNotAvailable(
  result: Awaited<ReturnType<typeof createNewPedido>>,
) {
  expect(result).toEqual({
    ok: false,
    code: "ORDER_ITEMS_NOT_AVAILABLE",
    message: "Uno o más productos no están disponibles para este pedido.",
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  transactionActive = false;
  transactionEvents = [];

  mockAuth.mockResolvedValue(null);
  makeBusinessLookup(publishedFixture);
  mockPublicProducts([catalogProduct()]);

  mockTxProductFindUnique.mockImplementation(async () => {
    transactionEvents.push("product-lookup");
    return catalogProduct();
  });
  mockTxDeliveryDataCreate.mockImplementation(async () => {
    transactionEvents.push("delivery-write");
    return { id: "delivery-1" };
  });
  mockTxOrderCreate.mockImplementation(async () => {
    transactionEvents.push("order-write");
    return { id: "order-1" };
  });
  mockTxOrderItemCreateMany.mockImplementation(async () => {
    transactionEvents.push("items-write");
    return { count: 1 };
  });
  mockTxOrderStatusHistoryCreate.mockImplementation(async () => {
    transactionEvents.push("history-write");
    return { id: "history-1" };
  });
  mockNotify.mockResolvedValue({ ok: true, message: "enviada" });
  mockTransaction.mockImplementation(async (callback) => {
    transactionActive = true;
    try {
      return await callback(transactionClient);
    } finally {
      transactionActive = false;
    }
  });
});

afterAll(() => {
  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

describe("createNewPedido public business visibility", () => {
  it("permite un pedido público PUBLISHED y ejecuta el guard antes de los writes", async () => {
    const result = await createNewPedido(pedidoInput());

    expect(result).toEqual({ ok: true, message: "Pedido creado exitosamente." });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockRootNegocioFindFirst).not.toHaveBeenCalled();
    expect(mockTxNegocioFindFirst).toHaveBeenCalledTimes(1);
    expect(mockBuildPublishedBusinessWhere).toHaveBeenCalledTimes(1);
    expect(mockTxProductFindMany).toHaveBeenCalledTimes(1);
    expect(mockTxProductFindUnique).not.toHaveBeenCalled();
    expect(mockTxProductFindMany).toHaveBeenCalledWith({
      where: {
        id: { in: [productId] },
        negocioId,
        status: ProductStatus.disponible,
      },
      select: expect.objectContaining({
        id: true,
        nombre: true,
        precio: true,
        negocioId: true,
        stock: true,
        stockIlimitado: true,
        usaVariantes: true,
        variantes: expect.objectContaining({
          where: { isActive: true },
        }),
      }),
    });
    expect(transactionEvents).toEqual([
      "published-guard",
      "product-batch-lookup",
      "delivery-write",
      "order-write",
      "items-write",
      "history-write",
    ]);
    expect(mockTxOrderCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        negocioId,
        TipoUsuario: TipoUsuario.usuario,
        deliveryDataId: "delivery-1",
      }),
    });
    expect(mockTxOrderItemCreateMany).toHaveBeenCalledTimes(1);
    expect(mockTxOrderStatusHistoryCreate).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      "PREVIEW_READY",
      {
        ...publishedFixture,
        usuario: {
          estado: EstadoUsuario.activo,
          isPlaceholder: true,
          perfilCompleto: false,
        },
      },
    ],
    [
      "CLAIMED incomplete",
      {
        ...publishedFixture,
        usuario: {
          estado: EstadoUsuario.activo,
          isPlaceholder: false,
          perfilCompleto: false,
        },
      },
    ],
    [
      "Negocio suspendido",
      { ...publishedFixture, estado: EstadoNegocio.suspendido },
    ],
    ["Negocio test", { ...publishedFixture, isTestData: true }],
    [
      "Negocio archived",
      { ...publishedFixture, archivedAt: new Date("2026-08-17T00:00:00.000Z") },
    ],
    [
      "Usuario inactivo",
      {
        ...publishedFixture,
        usuario: {
          estado: EstadoUsuario.suspendido,
          isPlaceholder: false,
          perfilCompleto: true,
        },
      },
    ],
  ] satisfies Array<[string, BusinessVisibilityInput]>) (
    "bloquea invocación directa para %s con BUSINESS_NOT_AVAILABLE y cero writes",
    async (_label, fixture) => {
      makeBusinessLookup(fixture);

      const result = await createNewPedido(
        pedidoInput({ slug: publicSlug }),
      );

      expect(result).toEqual({
        ok: false,
        code: "BUSINESS_NOT_AVAILABLE",
        message: "Este negocio no está disponible para esta acción.",
      });
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockTxNegocioFindFirst).toHaveBeenCalledTimes(1);
      expect(transactionEvents).toEqual(["published-guard"]);
      expectNoWritesOrNotifications();
    },
  );

  it("trata un slug inexistente con el mismo contrato no revelador", async () => {
    makeBusinessLookup(null);

    const result = await createNewPedido(pedidoInput());

    expect(result).toEqual({
      ok: false,
      code: "BUSINESS_NOT_AVAILABLE",
      message: "Este negocio no está disponible para esta acción.",
    });
    expectNoWritesOrNotifications();
  });
});

describe("createNewPedido public item integrity", () => {
  it("rechaza una invocación pública directa con item sin productId", async () => {
    const result = await createNewPedido(
      pedidoInput({
        items: [
          pedidoItem({
            productId: undefined,
            description: "Producto caro",
            price: 1,
            subtotal: 1,
          }),
        ],
      }),
    );

    expectOrderItemsNotAvailable(result);
    expect(mockTxProductFindMany).not.toHaveBeenCalled();
    expect(mockTxProductFindUnique).not.toHaveBeenCalled();
    expect(transactionEvents).toEqual(["published-guard"]);
    expectNoWritesOrNotifications();
  });

  it.each([
    ProductStatus.agotado,
    ProductStatus.oculto,
    ProductStatus.descontinuado,
  ])("bloquea un producto con status %s mediante el filtro disponible", async () => {
    mockPublicProducts([]);

    const result = await createNewPedido(pedidoInput());

    expectOrderItemsNotAvailable(result);
    expect(mockTxProductFindMany).toHaveBeenCalledTimes(1);
    expect(mockTxProductFindMany.mock.calls[0][0].where).toEqual({
      id: { in: [productId] },
      negocioId,
      status: ProductStatus.disponible,
    });
    expectNoWritesOrNotifications();
  });

  it("bloquea productId de otro negocio sin revelar la causa", async () => {
    mockPublicProducts([]);

    const result = await createNewPedido(pedidoInput());

    expectOrderItemsNotAvailable(result);
    expect(mockTxProductFindMany.mock.calls[0][0].where.negocioId).toBe(
      negocioId,
    );
    expectNoWritesOrNotifications();
  });

  it("reconstruye descripción, precio, subtotal y total públicos desde DB", async () => {
    mockPublicProducts([
      catalogProduct({
        nombre: "Hamburguesa Especial",
        precio: 50000,
      }),
    ]);

    const result = await createNewPedido(
      pedidoInput({
        items: [
          pedidoItem({
            description: "texto manipulado",
            price: 1,
            subtotal: 2,
            quantity: 2,
          }),
        ],
        totalAmount: 2,
      }),
    );

    expect(result).toEqual({ ok: true, message: "Pedido creado exitosamente." });
    const persistedItem = mockTxOrderItemCreateMany.mock.calls[0][0].data[0];
    expect(persistedItem.description).toBe("Hamburguesa Especial");
    expect(persistedItem.price.toString()).toBe("50000");
    expect(persistedItem.subtotal.toString()).toBe("100000");
    expect(
      mockTxOrderCreate.mock.calls[0][0].data.totalAmount.toString(),
    ).toBe("100000");
  });

  it("usa variante activa, precio y label autoritativos de DB", async () => {
    mockPublicProducts([
      catalogProduct({
        nombre: "Hamburguesa",
        precio: 50000,
        usaVariantes: true,
        variantes: [catalogVariant()],
      }),
    ]);

    const result = await createNewPedido(
      pedidoInput({
        items: [
          pedidoItem({
            productVariantId: variantId,
            variantLabel: "Label manipulado",
            price: 1,
            quantity: 1,
            subtotal: 1,
          }),
        ],
        totalAmount: 1,
      }),
    );

    expect(result).toEqual({ ok: true, message: "Pedido creado exitosamente." });
    const persistedItem = mockTxOrderItemCreateMany.mock.calls[0][0].data[0];
    expect(persistedItem.description).toBe("Hamburguesa");
    expect(persistedItem.price.toString()).toBe("60000");
    expect(persistedItem.variantLabel).toBe("Tamaño grande");
    expect(persistedItem.productVariantId).toBe(variantId);
    expect(mockBuildVariantLabel).toHaveBeenCalled();
  });

  it.each([
    ["inexistente", "variant-inexistente"],
    ["inactiva", "variant-inactiva"],
    ["de otro producto", "variant-otro-producto"],
  ])("bloquea variante %s", async (_label, requestedVariantId) => {
    mockPublicProducts([
      catalogProduct({
        usaVariantes: true,
        variantes: [catalogVariant()],
      }),
    ]);

    const result = await createNewPedido(
      pedidoInput({
        items: [pedidoItem({ productVariantId: requestedVariantId })],
      }),
    );

    expectOrderItemsNotAvailable(result);
    expectNoWritesOrNotifications();
  });

  it("bloquea producto que requiere variante cuando no se envía variantId", async () => {
    mockPublicProducts([
      catalogProduct({
        usaVariantes: true,
        variantes: [catalogVariant()],
      }),
    ]);

    const result = await createNewPedido(pedidoInput());

    expectOrderItemsNotAvailable(result);
    expectNoWritesOrNotifications();
  });

  it("valida stock agregado y bloquea dos líneas 3 + 3 con stock 5", async () => {
    mockPublicProducts([
      catalogProduct({ stock: 5, stockIlimitado: false }),
    ]);

    const result = await createNewPedido(
      pedidoInput({
        items: [pedidoItem({ quantity: 3 }), pedidoItem({ quantity: 3 })],
      }),
    );

    expectOrderItemsNotAvailable(result);
    expect(mockTxProductFindMany).toHaveBeenCalledTimes(1);
    expectNoWritesOrNotifications();
  });

  it("permite duplicados separados cuando su stock agregado 3 + 2 alcanza exactamente 5", async () => {
    mockPublicProducts([
      catalogProduct({ stock: 5, stockIlimitado: false }),
    ]);

    const result = await createNewPedido(
      pedidoInput({
        items: [pedidoItem({ quantity: 3 }), pedidoItem({ quantity: 2 })],
        totalAmount: 125,
      }),
    );

    expect(result).toEqual({ ok: true, message: "Pedido creado exitosamente." });
    expect(mockTxProductFindMany).toHaveBeenCalledTimes(1);
    expect(mockTxOrderItemCreateMany.mock.calls[0][0].data).toHaveLength(2);
  });

  it("hace un solo findMany para múltiples productos y no usa findUnique", async () => {
    mockPublicProducts([
      catalogProduct(),
      catalogProduct({
        id: secondProductId,
        nombre: "Segundo producto",
        precio: 40,
      }),
    ]);

    const result = await createNewPedido(
      pedidoInput({
        items: [
          pedidoItem(),
          pedidoItem({ productId: secondProductId, quantity: 1 }),
        ],
        totalAmount: 90,
      }),
    );

    expect(result).toEqual({ ok: true, message: "Pedido creado exitosamente." });
    expect(mockTxProductFindMany).toHaveBeenCalledTimes(1);
    expect(mockTxProductFindUnique).not.toHaveBeenCalled();
    expect(mockTxProductFindMany.mock.calls[0][0].where.id.in).toEqual([
      productId,
      secondProductId,
    ]);
  });

  it("aborta mezcla de tres productos válidos y uno inexistente", async () => {
    const missingProductId = "00000000-0000-4000-8000-000000000004";
    mockPublicProducts([
      catalogProduct(),
      catalogProduct({ id: secondProductId, nombre: "Segundo producto" }),
      catalogProduct({ id: thirdProductId, nombre: "Tercer producto" }),
    ]);

    const result = await createNewPedido(
      pedidoInput({
        items: [
          pedidoItem(),
          pedidoItem({ productId: secondProductId }),
          pedidoItem({ productId: thirdProductId }),
          pedidoItem({ productId: missingProductId }),
        ],
      }),
    );

    expectOrderItemsNotAvailable(result);
    expect(mockTxProductFindMany).toHaveBeenCalledTimes(1);
    expectNoWritesOrNotifications();
  });

  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])("bloquea quantity pública inválida: %p", async (quantity) => {
    const result = await createNewPedido(
      pedidoInput({ items: [pedidoItem({ quantity })] }),
    );

    expectOrderItemsNotAvailable(result);
    expect(mockTxProductFindMany).not.toHaveBeenCalled();
    expectNoWritesOrNotifications();
  });
});

describe("createNewPedido owner branch", () => {
  it("preserva el pedido owner sin slug aunque el negocio sea conceptualmente UNLISTED", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "owner-user-1",
        role: "negocio",
        negocioId,
        negocioSlug: "owner-unlisted",
      },
    });

    const result = await createNewPedido(
      pedidoInput({ includeSlug: false }),
    );

    expect(result).toEqual({ ok: true, message: "Pedido creado exitosamente." });
    expect(mockRootNegocioFindFirst).not.toHaveBeenCalled();
    expect(mockTxNegocioFindFirst).not.toHaveBeenCalled();
    expect(mockBuildPublishedBusinessWhere).not.toHaveBeenCalled();
    expect(mockTxProductFindMany).not.toHaveBeenCalled();
    expect(mockTxProductFindUnique).toHaveBeenCalledTimes(1);
    expect(transactionEvents).toEqual([
      "product-lookup",
      "delivery-write",
      "order-write",
      "items-write",
      "history-write",
    ]);
    expect(mockTxOrderCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        negocioId,
        TipoUsuario: TipoUsuario.negocio,
      }),
    });
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it("preserva un item manual owner sin productId con descripción y precio actuales", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "owner-user-1",
        role: "negocio",
        negocioId,
        negocioSlug: "owner-unlisted",
      },
    });

    const result = await createNewPedido(
      pedidoInput({
        includeSlug: false,
        items: [
          pedidoItem({
            productId: undefined,
            description: "Línea manual owner",
            price: 12345,
            subtotal: 12345,
            quantity: 1,
          }),
        ],
        totalAmount: 12345,
      }),
    );

    expect(result).toEqual({ ok: true, message: "Pedido creado exitosamente." });
    expect(mockTxProductFindMany).not.toHaveBeenCalled();
    expect(mockTxProductFindUnique).not.toHaveBeenCalled();
    const persistedItem = mockTxOrderItemCreateMany.mock.calls[0][0].data[0];
    expect(persistedItem.description).toBe("Línea manual owner");
    expect(persistedItem.price.toString()).toBe("12345");
    expect(persistedItem.productId).toBeNull();
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });
});
