import { CartProduct } from "@/interfaces/product.interface";
import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";


interface State {
  cart: CartProduct[];
  addProductToCart: (product: CartProduct) => void;
  getTotalItems: () => number;
  removeProduct: (cartItemId: string) => void;
  updateProductQuantity: (cartItemId: string, cantidad: number) => void;
  updateProductComment: (cartItemId: string, comentario: string) => void;
  getTotalPrice: () => number;
  clearCart: () => void;
}

export const useCartCatalogoStore = create<State>()(
  persist(
    (set, get) => ({
      cart: [],
      addProductToCart: (product: CartProduct) => {
        set((state) => ({ cart: [...state.cart, product] }));
      },
      getTotalItems: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + item.cantidad, 0);
      },
      updateProductQuantity: (cartItemId: string, cantidad: number) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.cartItemId === cartItemId ? { ...item, cantidad } : item
          ),
        })),
      updateProductComment: (cartItemId: string, comentario: string) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.cartItemId === cartItemId ? { ...item, comentario } : item
          ),
        })),
      removeProduct: (cartItemId: string) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.cartItemId !== cartItemId),
        })),
      getTotalPrice: () => {
        const { cart } = get();
        return cart.reduce((total, item) => {
          return total + item.precio * item.cantidad;
        }, 0);
      },
      clearCart: () => {
        set({ cart: [] });
      },
    }),
    {
      name: "shopping-cart",
    } as PersistOptions<State>
  )
);
