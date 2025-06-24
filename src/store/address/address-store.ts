// src/store/address-store.ts

import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

// Definimos la interfaz para los datos de dirección
interface Address {
  senderName: string;
  senderPhone: string;
  recipientName?: string;
  recipientPhone: string;
  deliveryAddress: string;
  occasion?: string;
  dedicationMessage?: string;
  deliveryDate?: string;
  deliveryTime?: string;
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
        senderName: "",
        senderPhone: "",
        recipientName: "",
        recipientPhone: "",
        deliveryAddress: "",
        occasion: "",
        dedicationMessage: "",
        deliveryDate: "",
        deliveryTime: "",
        additionalComments: "",
      },
      setAddress: (data) => set({ address: data }),
      clearAddress: () =>
        set({
          address: {
            senderName: "",
            senderPhone: "",
            recipientName: "",
            recipientPhone: "",
            deliveryAddress: "",
            occasion: "",
            dedicationMessage: "",
            deliveryDate: "",
            deliveryTime: "",
            additionalComments: "",
          },
        }),
    }),
    {
      name: "address-store", // Nombre para el almacenamiento en localStorage
    } as PersistOptions<AddressState>
  )
);
