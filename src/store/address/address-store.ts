import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

// Definimos el tipo para orderType
type OrderType = "DELIVERY" | "ON_SITE";

// Definimos la interfaz para los datos de dirección
interface Address {
  orderType: OrderType; // Nuevo: Indica si es entrega a domicilio o en sitio
  country?: string; // Opcional: Solo para DELIVERY
  departamento?: string; // Opcional: Solo para DELIVERY
  ciudad?: string; // Opcional: Solo para DELIVERY
  clientName: string;
  clientPhone: string;
  deliveryAddress?: string; // Opcional: Solo para DELIVERY
  onSiteLocation?: string; // Nuevo: Opcional, para pedidos en sitio (e.g., "Mesa 4")
  deliveryDate?: string;
  additionalComments?: string;
}

// Definimos la interfaz para el estado del store
interface AddressState {
  address: Address;
  setAddress: (data: Partial<Address>) => void; // Cambiado a Partial para permitir actualizaciones parciales
  clearAddress: () => void;
}

// Implementamos el store usando Zustand y la persistencia
export const useAddressStore = create<AddressState>()(
  persist(
    (set) => ({
      address: {
        orderType: "DELIVERY", // Valor por defecto
        country: "Colombia", // Valor por defecto para DELIVERY
        departamento: "",
        ciudad: "",
        clientName: "",
        clientPhone: "",
        deliveryAddress: "",
        onSiteLocation: "", // Inicialmente vacío
        deliveryDate: "",
        additionalComments: "",
      },
      setAddress: (data) =>
        set((state) => ({
          address: { ...state.address, ...data },
        })),
      clearAddress: () =>
        set({
          address: {
            orderType: "DELIVERY",
            country: "Colombia",
            departamento: "",
            ciudad: "",
            clientName: "",
            clientPhone: "",
            deliveryAddress: "",
            onSiteLocation: "",
            deliveryDate: "",
            additionalComments: "",
          },
        }),
    }),
    {
      name: "informacionEnvio-store", // Nombre para el almacenamiento en localStorage
    } as PersistOptions<AddressState>
  )
);