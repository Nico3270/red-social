import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

interface Productotransacciones {
  id: string;
  nombre: string;
  precio: number;
}

interface State {
  productos: Productotransacciones[];
  isLoading: boolean;
  error: string | null;

  // Funciones
  fetchProductos: () => Promise<void>;
  setProductos: (productos: Productotransacciones[]) => void;
  clearProductos: () => void;
  addProducto: (producto: Productotransacciones) => void;
  updateProducto: (id: string, updatedData: Partial<Productotransacciones>) => void;
  setError: (error: string | null) => void;
}

export const useProductosTransaccionesStore = create<State>()(
  persist(
    (set, get) => ({
      productos: [],
      isLoading: false,
      error: null,

      fetchProductos: async (force = false) => {
        const { productos } = get();
        if (!force && productos.length > 0) return;

        set({ isLoading: true, error: null });
        try {
          const response = await fetch("/api/productosTransacciones");
          if (!response.ok) throw new Error("Error al cargar productos");

          const data: Productotransacciones[] = await response.json();
          set({ productos: data });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error desconocido";
          console.error("Error en fetchProductos:", message);
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      setProductos: (productos) => set({ productos }),

      clearProductos: () => set({ productos: [] }),

      addProducto: (producto) =>
        set((state) => ({
          productos: state.productos.some((p) => p.id === producto.id)
            ? state.productos
            : [...state.productos, producto],
        })),

        updateProducto: (id: string, updatedData: Partial<Productotransacciones>) =>
        set((state) => ({
          productos: state.productos.map((producto) =>
            producto.id === id ? { ...producto, ...updatedData } : producto
          ),
        })),

      setError: (error) => set({ error }),
    }),
    {
      name: "productosTransacciones",
      partialize: (state) => ({ productos: state.productos }),
    } as PersistOptions<State>
  )
);
