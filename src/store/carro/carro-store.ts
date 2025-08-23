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
}

interface State {
  carts: Record<string, CartProduct[]>; // Clave: negocioId, Valor: array de productos en el carrito de ese negocio
  addProductToCart: (negocioId: string, product: CartProduct) => void;
  getTotalItems: () => number;
  removeProduct: (negocioId: string, cartItemId: string) => void;
  updateProductQuantity: (negocioId: string, cartItemId: string, cantidad: number) => void;
  getTotalPrice: () => number;
  clearCart: () => void;
  clearCartForNegocio: (negocioId: string) => void; // Nueva acción para vaciar un carrito específico
  getCartForNegocio: (negocioId: string) => CartProduct[]; // Nueva acción para obtener el carrito de un negocio
  getTotalNegociosWithItems: () => number; // Nueva acción para contar negocios con items (opcional, pero útil para UI)
}

export const useCartCatalogoStore = create<State>()(
  persist(
    (set, get) => ({
      carts: {}, // Inicializa como objeto vacío

      addProductToCart: (negocioId: string, product: CartProduct) => {
        set((state) => {
          const negocioCart = state.carts[negocioId] || [];
          // Verifica si el producto ya existe en el carrito del negocio (por id del producto)
          const existingProduct = negocioCart.find((item) => item.id === product.id);
          if (existingProduct) {
            // Si existe, incrementa la cantidad (asumiendo que no quieres duplicados)
            return {
              carts: {
                ...state.carts,
                [negocioId]: negocioCart.map((item) =>
                  item.id === product.id ? { ...item, cantidad: item.cantidad + product.cantidad } : item
                ),
              },
            };
          }
          // Si no existe, agrega el nuevo producto
          return {
            carts: {
              ...state.carts,
              [negocioId]: [...negocioCart, product],
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
              [negocioId]: negocioCart.map((item) =>
                item.cartItemId === cartItemId ? { ...item, cantidad: Math.max(1, cantidad) } : item // Evita cantidad <1
              ),
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
            delete newCarts[negocioId]; // Borra la entrada si el carrito queda vacío
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
      partialize: (state) => ({ carts: state.carts }), // Solo persiste los carts para optimizar
    } as PersistOptions<State>
  )
);