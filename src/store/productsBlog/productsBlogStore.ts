import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SelectedProduct {
  id: string;
  nombre: string;
  slug: string;
  imagenes: string[];
  enlace?: string;
}

interface SelectedProductsStore {
  selectedProducts: SelectedProduct[];
  addProduct: (product: SelectedProduct) => void;
  removeProduct: (id: string) => void;
  clearSelectedProducts: () => void; // 🔥 Nueva función para limpiar el store
}

export const useSelectedProductsMagicSurprise = create<SelectedProductsStore>()(
  persist(
    (set, get) => ({
      selectedProducts: [],
      
      addProduct: (product) => {
        const { selectedProducts } = get();
        if (!selectedProducts.some((p) => p.id === product.id)) {
          set({ selectedProducts: [...selectedProducts, product] });
        }
      },

      removeProduct: (id) =>
        set((state) => ({
          selectedProducts: state.selectedProducts.filter((p) => p.id !== id),
        })),
        clearSelectedProducts: () => set({ selectedProducts: [] }), // ✅ Limpia el store completamente
    }),
    { name: "selected-products" }
  )
);
