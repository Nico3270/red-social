"use client";

import { useState, useEffect } from "react";
import { FaGoogle } from "react-icons/fa";
import Link from "next/link";
import { IoInformationOutline } from "react-icons/io5";
import clsx from "clsx";
import { signIn } from "next-auth/react";
import { authenticate } from "../actions/authenticate";

export const LoginForm = () => {
  const [state, setState] = useState<
    "Idle" | "Loading" | "Success" | "Error" | "CredentialsSignin" | "UnknownError"
  >("Idle");

  useEffect(() => {
    if (state === "Success") {
      window.location.replace("/");
    }
  }, [state]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("Loading");

    const formData = new FormData(e.currentTarget);

    try {
      const result = await authenticate(undefined, formData);
      setState(result); // "Success" | "CredentialsSignin" | "UnknownError"
    } catch {
      setState("Error");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signIn("google", { redirect: true });
    } catch {
      setState("Error");
    }
  };

  return (
    <div className="md:w-1/2 bg-white flex flex-col justify-center p-8">
      <div className="max-w-md w-full mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">Iniciar Sesión</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block font-bold">
              Correo Electrónico
            </label>
            <input
              type="email"
              name="email"
              className="w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600"
              placeholder="Ingresa tu correo"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block font-bold">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              className="w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600"
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center">
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
