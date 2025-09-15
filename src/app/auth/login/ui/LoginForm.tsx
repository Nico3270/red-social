"use client";

import { useState, useEffect } from "react";
import { FaGoogle } from "react-icons/fa";
import Link from "next/link";
import { IoInformationOutline } from "react-icons/io5";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // 👈 íconos para mostrar/ocultar
import clsx from "clsx";
import { signIn } from "next-auth/react";
import { authenticate } from "@/actions/auth/login";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { titleFont } from "@/config/fonts";


export const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false); // 👈 estado para visibilidad
  const [state, setState] = useState<
    "Idle" | "Loading" | "Success" | "Error" | "CredentialsSignin" | "UnknownError"
  >("Idle");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // En esta parte se comprueba el estado de la autenticación y en caso de ser Success se redirige al usuario a la ruta principal, todo esto mediante
  // el useEffect

  useEffect(() => {
  if (state === "Success") {
    window.location.replace(callbackUrl);
  }
}, [state, callbackUrl]);


// Función para autenticación con Credentials
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("Loading");

    const formData = new FormData(e.currentTarget);
    // Se crea el formData que se va a enviar a la función de autenticación

    try {
      const result = await authenticate(undefined, formData);

      // Posibles estados que se pueden presentar al intentar hacer la autenticación
      setState(result); // "Success" | "CredentialsSignin" | "UnknownError"
    } catch {
      setState("Error");
    }
  };


  // Función para hacer el Login mediante google
  const handleGoogleLogin = async () => {
    try {
      await signIn("google", { callbackUrl });

    } catch {
      setState("Error");
    }
  };

  return (
    <div className="md:w-1/2 bg-white flex flex-col justify-center p-8">
      <div className="max-w-md w-full mx-auto">
        <div className="flex justify-center items-center mb-4">
          <Image
            src="/imgs/Logo Final (1).png" // Reemplaza con la ruta real de tu logo
            alt="Myckeo Logo"
            width={100}
            height={100}
            className="mr-2"
          />
          <h1 className={`text-3xl font-bold text-gray-800 ${titleFont.className}`}>Bienvenido a Myckeo</h1>
        </div>
        <h1 className="text-4xl font-bold mb-4 text-center">Iniciar Sesión</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block font-bold text-gray-800">
              Correo Electrónico
            </label>
            <input
              type="email"
              name="email"
              className="w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 text-gray-800 focus:ring-red-600"
              placeholder="Ingresa tu correo"
              required
            />
          </div>
          {/* Campo contraseña con botón para mostrar/ocultar */}
          <div>
            <label htmlFor="password" className="block font-bold text-gray-800">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="w-full border rounded-lg text-gray-800 p-2 mt-2 pr-10 focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="Ingresa tu contraseña"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center text-gray-800">
              <input type="checkbox" className="mr-2" />
              <span>Recuérdame</span>
            </label>
            <Link href="/forgot-password" className="text-red-600 hover:underline">
              Olvidé mi contraseña
            </Link>
          </div>

          {state === "CredentialsSignin" && (
            <div className="flex flex-row mb-2">
              <IoInformationOutline className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-500">La información no es correcta</p>
            </div>
          )}
          {state === "UnknownError" && (
            <div className="flex flex-row mb-2">
              <IoInformationOutline className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-500">Ocurrió un error desconocido.</p>
            </div>
          )}
          {state === "Error" && (
            <div className="flex flex-row mb-2">
              <IoInformationOutline className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-500">Ocurrió un error. Intenta de nuevo.</p>
            </div>
          )}

          <LoginButton isLoading={state === "Loading"} />
        </form>
        <div className="flex items-center justify-between mt-6">
          <div className="border-t w-full border-gray-300"></div>
          <span className="mx-4">o</span>
          <div className="border-t w-full border-gray-300"></div>
        </div>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center bg-blue-600 text-white py-2 rounded-lg mt-4 hover:bg-blue-700 transition"
        >
          <FaGoogle className="mr-2" />
          Iniciar con Google
        </button>
        <div className="text-center mt-4">
          <span>¿No tienes cuenta?</span>
          <Link href="/auth/new-account" className="text-red-600 hover:underline ml-1">
            Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
};

interface LoginButtonProps {
  isLoading: boolean;
}

function LoginButton({ isLoading }: LoginButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className={clsx(
        "w-full py-2 rounded-lg transition",
        isLoading ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700"
      )}
    >
      {isLoading ? "Cargando..." : "Iniciar Sesión"}
    </button>
  );
}