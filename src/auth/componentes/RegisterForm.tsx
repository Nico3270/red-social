"use client";

import React, { useState } from "react";
import { FaGoogle } from "react-icons/fa";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import clsx from "clsx";
import { signIn } from "next-auth/react"; // Importar signIn de NextAuth
import { registerUser } from "../actions/registerUser";
import { login } from "../actions/login";

type FormInputs = {
  name: string;
  email: string;
  password: string;
};

export const RegisterForm = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, setIsPending] = useState(false); // Estado de carga
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInputs>();

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setErrorMessage("");
    setIsPending(true); // Iniciar estado de carga
    const { name, email, password } = data;

    // Registrar usuario con nombre, email y contraseña
    const response = await registerUser(name, email, password);
    if (!response.ok) {
      setErrorMessage(response.message);
      setIsPending(false); // Terminar estado de carga si hay error
      return;
    }

    // Iniciar sesión con credenciales después del registro exitoso
    await login(email.toLowerCase(), password);
    window.location.replace("/");
  };

  // Iniciar sesión con Google (en lugar de registro separado)
  const handleGoogleRegister = async () => {
    try {
      setIsPending(true); // Iniciar estado de carga
      // Autenticación con Google usando NextAuth
      const response = await signIn("google", { redirect: true });

      if (response?.error) {
        // Si hay un error, mostrar mensaje
        setErrorMessage("No se pudo completar el inicio de sesión con Google");
        setIsPending(false); // Terminar estado de carga si hay error
      }
    } catch {
      setErrorMessage("No se pudo completar el inicio de sesión con Google");
      setIsPending(false);
    }
  };

  return (
    <div className="md:w-1/2 bg-white flex flex-col justify-center p-8">
      <div className="max-w-md w-full mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">Crear una cuenta</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block font-bold">
              Nombre
            </label>
            <input
              type="text"
              {...register("name", { required: "El nombre es requerido" })}
              id="name"
              className={clsx(
                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                { "border-red-500": errors.name }
              )}
              placeholder="Ingresa tu nombre"
              aria-invalid={errors.name ? "true" : "false"}
            />
            {errors.name && (
              <span className="text-red-500 text-sm">
                {errors.name.message}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block font-bold">
              Correo Electrónico
            </label>
            <input
              {...register("email", {
                required: "El correo es requerido",
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: "Correo no válido",
                },
              })}
              type="email"
              className={clsx(
                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                { "border-red-500": errors.email }
              )}
              placeholder="Ingresa tu correo"
              aria-invalid={errors.email ? "true" : "false"}
            />
            {errors.email && (
              <span className="text-red-500 text-sm">
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block font-bold">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              {...register("password", {
                required: "La contraseña es requerida",
                minLength: {
                  value: 6,
                  message: "La contraseña debe tener al menos 6 caracteres",
                },
              })}
              className={clsx(
                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                { "border-red-500": errors.password }
              )}
              placeholder="Ingresa tu contraseña"
              aria-invalid={errors.password ? "true" : "false"}
            />
            {errors.password && (
              <span className="text-red-500 text-sm">
                {errors.password.message}
              </span>
            )}
          </div>

          {errorMessage !== "" && (
            <span className="text-red-500">{errorMessage}</span>
          )}

          <button
            type="submit"
            disabled={isPending} // Deshabilitar el botón mientras está en estado pendiente
            className={clsx(
              "w-full py-2 rounded-lg transition",
              isPending ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700"
            )}
          >
            {isPending ? "Cargando..." : "Crear cuenta"} {/* Cambiar texto según el estado */}
          </button>
        </form>

        <div className="flex items-center justify-between mt-6">
          <div className="border-t w-full border-gray-300"></div>
          <span className="mx-4">o</span>
          <div className="border-t w-full border-gray-300"></div>
        </div>

        {/* Botón para iniciar sesión con Google */}
        <button
          onClick={handleGoogleRegister}
          disabled={isPending} // Deshabilitar el botón mientras está en estado pendiente
          className={clsx(
            "w-full flex items-center justify-center bg-blue-600 text-white py-2 rounded-lg mt-4",
            isPending ? "bg-gray-400 cursor-not-allowed" : "hover:bg-blue-700 transition"
          )}
        >
          <FaGoogle className="mr-2" />
          {isPending ? "Cargando..." : "Iniciar con Google"} {/* Cambiar texto según el estado */}
        </button>

        <div className="text-center mt-4">
          <span>¿Ya tienes cuenta?</span>
          <Link href="/auth/login" className="text-red-600 hover:underline ml-1">
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
};
