import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

export interface CartProduct {
  cartItemId: string; // Identificador único del producto en el carrito
  id: string; // Identificador del producto (relacionado con la base de datos)
  slug: string; // Slug del producto para generar rutas dinámicas
  nombre: string; // Nombre del producto
  precio: number; // Precio del producto
  cantidad: number; // Cantidad seleccionada por el usuario
  imagen: string; // Imagen principal del producto
  seccionIds: string[]; // IDs de las secciones asociadas
  descripcionCorta?: string; // Descripción corta del producto (opcional)
  productVariantId?: string | null;
  variantLabel?: string | null;
  stock?: number | null;
  stockIlimitado?: boolean;
  usaVariantes?: boolean;
}

interface State {
  cart: CartProduct[]; // Array de productos en el carrito para un solo negocio
  addProductToCart: (product: CartProduct) => void;
  getTotalItems: () => number;
  removeProduct: (cartItemId: string) => void;
  updateProductQuantity: (cartItemId: string, cantidad: number) => void;
  getTotalPrice: () => number;
  clearCart: () => void;
  getCart: () => CartProduct[]; // Acción para obtener el carrito
}

const isSameCartLine = (a: CartProduct, b: CartProduct) => {
  const aUsesVariants = a.usaVariantes === true;
  const bUsesVariants = b.usaVariantes === true;

  if (aUsesVariants || bUsesVariants) {
    return a.id === b.id && (a.productVariantId ?? null) === (b.productVariantId ?? null);
  }

  return a.id === b.id;
};

const clampQuantityByStock = (item: CartProduct, desiredQuantity: number) => {
  if (item.stockIlimitado !== false) {
    return Math.max(1, desiredQuantity);
  }

  if (typeof item.stock !== "number") {
    return Math.max(1, desiredQuantity);
  }

  return Math.max(1, Math.min(desiredQuantity, item.stock));
};

export const useCartNegocioStore = create<State>()(
  persist(
    (set, get) => ({
      cart: [], // Inicializa como array vacío

      addProductToCart: (product: CartProduct) => {
        set((state) => {
          const existingProduct = state.cart.find((item) => isSameCartLine(item, product));

          if (existingProduct) {
            return {
              cart: state.cart.map((item) =>
                isSameCartLine(item, product)
                  ? {
                      ...item,
                      cantidad: clampQuantityByStock(item, item.cantidad + product.cantidad),
                    }
                  : item
              ),
            };
          }

          const normalizedProduct: CartProduct = {
            ...product,
            cantidad: clampQuantityByStock(product, product.cantidad),
            stockIlimitado: product.stockIlimitado ?? true,
            usaVariantes: product.usaVariantes ?? false,
            productVariantId: product.productVariantId ?? null,
            variantLabel: product.variantLabel ?? null,
          };

          return {
            cart: [...state.cart, normalizedProduct],
          };
        });
      },

      getTotalItems: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + item.cantidad, 0);
      },

      updateProductQuantity: (cartItemId: string, cantidad: number) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, cantidad: clampQuantityByStock(item, cantidad) }
              : item
          ),
        })),

      removeProduct: (cartItemId: string) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.cartItemId !== cartItemId),
        })),

      getTotalPrice: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + item.precio * item.cantidad, 0);
      },

      clearCart: () => {
        set({ cart: [] });
      },

      getCart: () => {
        return get().cart;
      },
    }),
    {
      name: "cart_negocio",
      partialize: (state) => ({ cart: state.cart }), // Solo persiste el cart para optimizar
    } as PersistOptions<State>
  )
);
