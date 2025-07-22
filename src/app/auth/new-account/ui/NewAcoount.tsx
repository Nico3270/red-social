"use client";

import React, { useState, useEffect, useRef, ReactNode } from "react";
import { FaGoogle } from "react-icons/fa";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import clsx from "clsx";
import colombia from "@/config/colombia.json";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { login } from "@/actions/auth/login";
import { registerUser } from "@/actions/auth/registerUser";
import { signIn } from "next-auth/react";
import { Alert } from "@mui/material";

const allCities = colombia.flatMap((d) =>
  d.ciudades.map((ciudad) => `${ciudad} - ${d.departamento}`)
);

function removeAccents(str: string) {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

type FormInputs = {
  nombre: string;
  apellido: string;
  email: string;
  contraseña: string;
  ciudad: string;
  genero: string;
  fechaNacimiento: Date;
};

type TipoUsuario = {
  negocio: boolean;
};

export const RegisterForm = ({ negocio }: TipoUsuario) => {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const suggestionsRef = useRef<HTMLUListElement>(null);


  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormInputs>();

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setErrorMessage("");
    setIsPending(true);
    const { nombre, email, contraseña, genero, fechaNacimiento, ciudad, apellido } = data;

    const response = await registerUser(
      nombre,
      apellido,
      email,
      contraseña,
      genero,
      fechaNacimiento,
      ciudad
    );

    if (!response.ok) {
      setErrorMessage(response.message);
      setIsPending(false);
      return;
    }

    if (!response.user) {
      setErrorMessage("No se pudo crear el usuario. Por favor, inténtalo de nuevo.");
      setIsPending(false);
      return;
    }

    // Iniciar sesión
    await login(email.toLowerCase(), contraseña);


    if (negocio) {
      window.location.replace(`/crear_negocio/${response.user.id}`);
    } else {
      window.location.replace("/perfil");
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setIsPending(true); // Iniciar estado de carga
      // Autenticación con Google usando NextAuth
      const response = await signIn("google", { redirect: false });

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

  useEffect(() => {
    if (cityInput.length >= 3) {
      const matches = allCities.filter((city) =>
        removeAccents(city.toLowerCase()).includes(removeAccents(cityInput.toLowerCase()))
      );
      setFilteredCities(matches.slice(0, 10));
    } else {
      setFilteredCities([]);
    }
  }, [cityInput]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setFilteredCities([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="md:w-1/2 bg-white flex flex-col justify-center p-8">
      <div className="max-w-md w-full mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">Crear una cuenta</h1>
        <form  onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block font-bold">Nombre</label>
            <input
              type="text"
              {...register("nombre", { required: "El nombre es requerido" })}
              className={clsx(
                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                { "border-red-500": errors.nombre }
              )}
              placeholder="Tu nombre"
            />
            {errors.nombre && <span className="text-red-500 text-sm">{errors.nombre.message}</span>}
          </div>

          <div>
            <label htmlFor="apellido" className="block font-bold">Apellido</label>
            <input
              type="text"
              {...register("apellido", { required: "El apellido es requerido" })}
              className={clsx(
                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                { "border-red-500": errors.apellido }
              )}
              placeholder="Tu apellido"
            />
            {errors.apellido && <span className="text-red-500 text-sm">{errors.apellido.message}</span>}
          </div>

          <div>
            <label htmlFor="email" className="block font-bold">Correo Electrónico</label>
            <input
              type="email"
              {...register("email", {
                required: "El correo es requerido",
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: "Correo no válido",
                },
              })}
              className={clsx(
                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                { "border-red-500": errors.email }
              )}
              placeholder="ejemplo@correo.com"
            />
            {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
          </div>

          <div>
            <label htmlFor="password" className="block font-bold">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register("contraseña", {
                  required: "La contraseña es requerida",
                  minLength: { value: 8, message: "Debe tener al menos 8 caracteres" },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,
                    message: "Debe incluir mayúsculas, minúsculas, número y símbolo",
                  },
                })}
                className={clsx(
                  "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                  { "border-red-500": errors.contraseña }
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
              </button>
            </div>
            {errors.contraseña && <span className="text-red-500 text-sm">{errors.contraseña.message}</span>}
          </div>


          <div className="relative">
            <label htmlFor="ciudad" className="block font-bold">Ciudad</label>
            <Alert severity="info">
              Por favor seleccione una ciudad válida de la lista que aparece al escribir, ejemplo: "Bogotá - Cundinamarca".
            </Alert>

            <input
              type="text"
              {...register("ciudad", { required: "La ciudad es requerida - verifica el formato (Ciudad - Departamento)" })}
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              className={clsx(
                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                { "border-red-500": errors.ciudad }
              )}
              placeholder="Ej. Medellín - Antioquia"
              autoComplete="off" // <- más confiable
              onFocus={(e) => e.currentTarget.removeAttribute('readOnly')} 
              name="fake_ciudad" // <- cambiar el "name" es clave
              id="ciudad-autocomplete-fix" // <- opcional para identificar
              spellCheck="false"
            />
            {errors.ciudad && <span className="text-red-500 text-sm">{errors.ciudad.message}</span>}
            {filteredCities.length > 0 && (
              <ul
                ref={suggestionsRef}
                className="absolute z-10 bg-white border rounded-md mt-1 max-h-48 overflow-y-auto shadow-md w-full"
              >
                {filteredCities.map((city) => (
                  <li
                    key={city}
                    onClick={() => {
                      setValue("ciudad", city);
                      setCityInput(city);
                      setFilteredCities([]);
                    }}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {city}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label htmlFor="genero" className="block font-bold">Género</label>
            <select
              {...register("genero", { required: "El género es requerido" })}
              className={clsx(
                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                { "border-red-500": errors.genero }
              )}
            >
              <option value="">Selecciona una opción</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
            {errors.genero && <span className="text-red-500 text-sm">{errors.genero.message}</span>}
          </div>

          <div>
            <label htmlFor="fechaNacimiento" className="block font-bold">Fecha de nacimiento</label>
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => {
                setSelectedDate(date);
                if (date) {
                  setValue("fechaNacimiento", date); // No hagas .toISOString(), pasa el Date directamente
                }
              }}
              peekNextMonth
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              maxDate={new Date()}
              minDate={new Date("1900-01-01")}
              dateFormat="dd/MM/yyyy"
              className={clsx(
                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                { "border-red-500": errors.fechaNacimiento }
              )}
              placeholderText="Selecciona tu fecha de nacimiento"
            />
            {errors.fechaNacimiento && (
              <span className="text-red-500 text-sm">{errors.fechaNacimiento.message}</span>
            )}
          </div>

          {errorMessage && <span className="text-red-500 text-sm">{errorMessage}</span>}

          <button
            type="submit"
            disabled={isPending}
            className={clsx(
              "w-full py-2 rounded-lg transition",
              isPending ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700"
            )}
          >
            {isPending ? "Cargando..." : "Crear cuenta"}
          </button>
        </form>

        <div className="flex items-center justify-between mt-6">
          <div className="border-t w-full border-gray-300"></div>
          <span className="mx-4">o</span>
          <div className="border-t w-full border-gray-300"></div>
        </div>

        <button
          onClick={handleGoogleRegister}
          disabled={isPending}
          className={clsx(
            "w-full flex items-center justify-center bg-blue-600 text-white py-2 rounded-lg mt-4",
            isPending ? "bg-gray-400 cursor-not-allowed" : "hover:bg-blue-700 transition"
          )}
        >
          <FaGoogle className="mr-2" />
          {isPending ? "Cargando..." : "Iniciar con Google"}
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
}