import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

export interface CartProduct {
  cartItemId: string;
  id: string;
  slug: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen: string;
  seccionIds: string[];
  descripcionCorta?: string;

  // Nuevos campos opcionales para variantes / inventario
  productVariantId?: string | null;
  variantLabel?: string | null;
  stock?: number | null;
  stockIlimitado?: boolean;
  usaVariantes?: boolean;

  negocioFotoPerfil?: string;
}

interface State {
  carts: Record<string, CartProduct[]>;
  addProductToCart: (negocioId: string, product: CartProduct) => void;
  getTotalItems: () => number;
  removeProduct: (negocioId: string, cartItemId: string) => void;
  updateProductQuantity: (negocioId: string, cartItemId: string, cantidad: number) => void;
  getTotalPrice: () => number;
  clearCart: () => void;
  clearCartForNegocio: (negocioId: string) => void;
  getCartForNegocio: (negocioId: string) => CartProduct[];
  getTotalNegociosWithItems: () => number;
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

export const useCartCatalogoStore = create<State>()(
  persist(
    (set, get) => ({
      carts: {},

      addProductToCart: (negocioId: string, product: CartProduct) => {
        set((state) => {
          const negocioCart = state.carts[negocioId] || [];

          const existingProduct = negocioCart.find((item) => isSameCartLine(item, product));

          if (existingProduct) {
            return {
              carts: {
                ...state.carts,
                [negocioId]: negocioCart.map((item) => {
                  if (!isSameCartLine(item, product)) return item;

                  const nextQuantity = clampQuantityByStock(
                    item,
                    item.cantidad + product.cantidad
                  );

                  return {
                    ...item,
                    cantidad: nextQuantity,
                  };
                }),
              },
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
            carts: {
              ...state.carts,
              [negocioId]: [...negocioCart, normalizedProduct],
            },
          };
        });
      },

      getTotalItems: () => {
        const { carts } = get();
        return Object.values(carts).reduce((total, negocioCart) => {
          return total + negocioCart.reduce((subtotal, item) => subtotal + item.cantidad, 0);
        }, 0);
      },

      updateProductQuantity: (negocioId: string, cartItemId: string, cantidad: number) =>
        set((state) => {
          const negocioCart = state.carts[negocioId] || [];

          return {
            carts: {
              ...state.carts,
              [negocioId]: negocioCart.map((item) => {
                if (item.cartItemId !== cartItemId) return item;

                return {
                  ...item,
                  cantidad: clampQuantityByStock(item, cantidad),
                };
              }),
            },
          };
        }),

      removeProduct: (negocioId: string, cartItemId: string) =>
        set((state) => {
          const negocioCart = state.carts[negocioId] || [];
          const updatedCart = negocioCart.filter((item) => item.cartItemId !== cartItemId);
          const newCarts = { ...state.carts };

          if (updatedCart.length > 0) {
            newCarts[negocioId] = updatedCart;
          } else {
            delete newCarts[negocioId];
          }

          return { carts: newCarts };
        }),

      getTotalPrice: () => {
        const { carts } = get();
        return Object.values(carts).reduce((total, negocioCart) => {
          return total + negocioCart.reduce((subtotal, item) => subtotal + item.precio * item.cantidad, 0);
        }, 0);
      },

      clearCart: () => {
        set({ carts: {} });
      },

      clearCartForNegocio: (negocioId: string) => {
        set((state) => {
          const newCarts = { ...state.carts };
          delete newCarts[negocioId];
          return { carts: newCarts };
        });
      },

      getCartForNegocio: (negocioId: string) => {
        return get().carts[negocioId] || [];
      },

      getTotalNegociosWithItems: () => {
        return Object.keys(get().carts).length;
      },
    }),
    {
      name: "carro_negocios",
      partialize: (state) => ({ carts: state.carts }),
    } as PersistOptions<State>
  )
);