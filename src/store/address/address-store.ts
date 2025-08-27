// src/store/address-store.ts

import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

// Definimos la interfaz para los datos de dirección
interface Address {
  country: string;
  departamento: string;
  ciudad: string;
  clientName: string;
  clientPhone: string;
  deliveryAddress: string;
  deliveryDate: string;
  additionalComments?: string;
}

// Definimos la interfaz para el estado del store
interface AddressState {
  address: Address;
  setAddress: (data: Address) => void;
  clearAddress: () => void;
}


// Implementamos el store usando Zustand y la persistencia
export const useAddressStore = create<AddressState>()(
  persist(
    (set) => ({
      address: {
        country:"",
        departamento:"",
        ciudad:"",
        clientName:"",
        clientPhone:"",
        deliveryAddress: "",
        deliveryDate: "",
        additionalComments: "",
      },
      setAddress: (data) => set({ address: data }),
      clearAddress: () =>
        set({
          address: {
        country:"",
        departamento:"",
        ciudad:"",
        clientName:"",
        clientPhone:"",
        deliveryAddress: "",
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
