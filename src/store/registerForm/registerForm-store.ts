import { RegisterForm } from "@/app/auth/new-account/ui/NewAcoount";
import { inter } from "@/config/fonts";
import { create } from "zustand"
import { persist } from "zustand/middleware";
import { PersistOptions } from "zustand/middleware";


interface RegisterFormState {
  nombre: string;
  apellido: string;
  email: string;
  contraseña: string;
  genero: string;
  fechaNacimiento: string;
  ciudad: string;
  departamento: string;
  preferencias: string[];
}

interface initialtRegisterFormStore {
    initialForm: RegisterFormState;
    setAddress: (data: RegisterFormState) => void;
    clearAddress: () => void;           
}

export const useRegisterFormStore = create<initialtRegisterFormStore>()(
    persist(
        (set) => ({
        initialForm: {
            nombre: "",
            apellido: "",
            email: "",
            contraseña: "",
            genero: "",
            fechaNacimiento: "",
            ciudad: "",
            departamento: "",
            preferencias: [],
        },
        setAddress: (data) => set({ initialForm: data }),
        clearAddress: () =>
            set({
            initialForm: {
                nombre: "",
                apellido: "",
                email: "",
                contraseña: "",
                genero: "",
                fechaNacimiento: "",
                ciudad: "",
                departamento: "",
                preferencias: [],
            },
            }),
        }),
        {
        name: "register-form-storage",
        getStorage: () => localStorage,
        } as PersistOptions<initialtRegisterFormStore>
    )   
)
