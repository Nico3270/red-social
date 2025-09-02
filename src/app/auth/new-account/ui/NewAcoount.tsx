"use client";

import React, { useState, useEffect } from "react";
import { FaGoogle } from "react-icons/fa";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import clsx from "clsx";
import colombia from "@/config/colombia.json";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerUser } from "@/actions/auth/registerUser";
import { signIn, SignInResponse } from "next-auth/react";
import { Alert } from "@mui/material";
import { useSearchParams, useRouter } from "next/navigation"; // Agregado useRouter para redirecciones elegantes


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

interface ColombiaDepartment {
  id: number;
  departamento: string;
  ciudades: string[];
}

export const RegisterForm = ({ negocio }: TipoUsuario) => {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDepartamento, setSelectedDepartamento] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const router = useRouter(); // Para redirecciones SPA-modernas

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormInputs>();

  const departments = (colombia as ColombiaDepartment[]).map((dept) => dept.departamento);

  useEffect(() => {
    if (selectedDepartamento) {
      const departmentData = (colombia as ColombiaDepartment[]).find(
        (dept) => dept.departamento === selectedDepartamento
      );
      setCities(departmentData ? departmentData.ciudades : []);
      setSelectedCity(""); // Reset city when department changes
      setValue("ciudad", ""); // Clear ciudad value
    } else {
      setCities([]);
      setSelectedCity("");
      setValue("ciudad", "");
    }
  }, [selectedDepartamento, setValue]);

  useEffect(() => {
    if (selectedCity && selectedDepartamento) {
      setValue("ciudad", `${selectedCity} - ${selectedDepartamento}`);
    } else {
      setValue("ciudad", "");
    }
  }, [selectedCity, selectedDepartamento, setValue]);

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

    // Iniciar sesión directamente en cliente con signIn (evita server action y NEXT_REDIRECT)
    try {
      const signInResponse: SignInResponse | undefined = await signIn("credentials", {
        email: email.toLowerCase(),
        password: contraseña,
        redirect: false, // Evita redirect automático
      });

      if (signInResponse?.error) {
        setErrorMessage("Error al iniciar sesión: " + signInResponse.error);
        setIsPending(false);
        return;
      }

      // Redirección manual (elegante y sin errores en consola)
      if (negocio) {
        router.push(`/crear_negocio/${response.user.id}`); // Usa router.push para SPA-feel
      } else {
        router.push(callbackUrl);
      }
    } catch (error) {
      console.error("Error en signIn cliente:", error); // Log solo si es error real, no NEXT_REDIRECT
      setErrorMessage("Error inesperado al iniciar sesión.");
      setIsPending(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setIsPending(true);
      // Autenticación con Google (ya es cliente, no cambia)
      const response: SignInResponse | undefined = await signIn("google", {
        callbackUrl: callbackUrl,
        redirect: false,
      });

      if (response?.error) {
        setErrorMessage("No se pudo completar el inicio de sesión con Google");
        setIsPending(false);
      } else {
        // Maneja redirección manual si es necesario
        router.push(callbackUrl);
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
            <label htmlFor="nombre" className="block font-bold">Nombre del administrador</label>
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
            <label htmlFor="apellido" className="block font-bold">Apellido del administrador</label>
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

          {/* Campo hidden para ciudad */}
          <input
            type="hidden"
            {...register("ciudad", { required: "La ciudad es requerida - verifica el formato (Ciudad - Departamento)" })}
          />

          <div>
            <label htmlFor="departamento" className="block font-bold">Departamento</label>
            <select
              value={selectedDepartamento}
              onChange={(e) => setSelectedDepartamento(e.target.value)}
              className={clsx(
                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                { "border-red-500": errors.ciudad && !selectedDepartamento }
              )}
            >
              <option value="">Selecciona un departamento</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label htmlFor="ciudad-select" className="block font-bold">Ciudad</label>
            <Alert severity="info">
              Por favor selecciona un departamento primero, luego una ciudad válida.
            </Alert>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              disabled={!selectedDepartamento}
              className={clsx(
                "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600",
                { "border-red-500": errors.ciudad }
              )}
            >
              <option value="">Selecciona una ciudad</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            {errors.ciudad && <span className="text-red-500 text-sm">{errors.ciudad.message}</span>}
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