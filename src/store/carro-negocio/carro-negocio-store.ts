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
  cart: CartProduct[]; // Array de productos en el carrito para un solo negocio
  addProductToCart: (product: CartProduct) => void;
  getTotalItems: () => number;
  removeProduct: (cartItemId: string) => void;
  updateProductQuantity: (cartItemId: string, cantidad: number) => void;
  getTotalPrice: () => number;
  clearCart: () => void;
  getCart: () => CartProduct[]; // Acción para obtener el carrito
}

export const useCartNegocioStore = create<State>()(
  persist(
    (set, get) => ({
      cart: [], // Inicializa como array vacío

      addProductToCart: (product: CartProduct) => {
        set((state) => {
          // Verifica si el producto ya existe en el carrito (por id del producto)
          const existingProduct = state.cart.find((item) => item.id === product.id);
          if (existingProduct) {
            // Si existe, incrementa la cantidad (asumiendo que no quieres duplicados)
            return {
              cart: state.cart.map((item) =>
                item.id === product.id ? { ...item, cantidad: item.cantidad + product.cantidad } : item
              ),
            };
          }
          // Si no existe, agrega el nuevo producto
          return {
            cart: [...state.cart, product],
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
            item.cartItemId === cartItemId ? { ...item, cantidad: Math.max(1, cantidad) } : item // Evita cantidad <1
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