'use server';

import { signIn } from "@/auth.config";

interface SignInError extends Error {
  type?: string;
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
){
  try {
    

    await signIn('credentials', {
      ...Object.fromEntries(formData),
      redirect: false,
    });

    return 'Success';
  } catch (error) {
    console.error("Error en login:", error);  // Usar error aquí
    const signInError = error as SignInError;

    if (signInError.type === "CredentialsSignin") {
      return "CredentialsSignin";
    }

    return 'UnknownError';
  }
};


export const login = async (email: string, password: string) => {

  try {
    await signIn ("credentials", {email, password});
    return {ok: true}  
  } catch (error) {
    console.error("Error en login:", error);  // Usar error aquí
    return {ok:false, message:"No se pudo iniciar sesión"}
  }
}
