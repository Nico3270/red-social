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
import { signIn, SignInResponse, useSession } from "next-auth/react";
import { Alert } from "@mui/material";
import { useSearchParams, useRouter } from "next/navigation";
import { es } from "date-fns/locale";

type FormInputs = {
  nombre: string;
  apellido: string;
  email: string;
  contraseña: string;
  ciudad: string;
  genero: string;
  fechaNacimiento: Date;
  acceptedPolicies?: boolean; // Campo para aceptar políticas
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
  const [acceptedPolicies, setAcceptedPolicies] = useState(false); // Estado para checkbox
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const router = useRouter();
  const { update } = useSession();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    trigger,
  } = useForm<FormInputs>({
    mode: "onChange", // Validar en tiempo real para habilitar botón dinámicamente
    defaultValues: {
      fechaNacimiento: new Date("1990-01-01"), // Valor inicial para evitar undefined
    },
  });

  const departments = (colombia as ColombiaDepartment[]).map((dept) => dept.departamento);

  useEffect(() => {
    if (selectedDepartamento) {
      const departmentData = (colombia as ColombiaDepartment[]).find(
        (dept) => dept.departamento === selectedDepartamento
      );
      setCities(departmentData ? departmentData.ciudades : []);
      setSelectedCity("");
      setValue("ciudad", "");
      trigger("ciudad"); // Revalidar ciudad al cambiar departamento
    } else {
      setCities([]);
      setSelectedCity("");
      setValue("ciudad", "");
      trigger("ciudad");
    }
  }, [selectedDepartamento, setValue, trigger]);

  useEffect(() => {
    if (selectedCity && selectedDepartamento) {
      setValue("ciudad", `${selectedCity} - ${selectedDepartamento}`, { shouldValidate: true });
      trigger("ciudad"); // Revalidar al seleccionar ciudad
    } else {
      setValue("ciudad", "", { shouldValidate: true });
      trigger("ciudad");
    }
  }, [selectedCity, selectedDepartamento, setValue, trigger]);

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

    try {
      const signInResponse: SignInResponse | undefined = await signIn("credentials", {
        email: email.toLowerCase(),
        password: contraseña,
        redirect: false,
      });

      if (signInResponse?.error) {
        setErrorMessage("Error al iniciar sesión: " + signInResponse.error);
        setIsPending(false);
        return;
      }

      await update({ perfilCompleto: true });

      if (negocio) {
        router.push(`/crear_negocio/${response.user.id}`);
      } else {
        router.push(callbackUrl);
      }
    } catch (error) {
      console.error("Error en signIn cliente:", error);
      setErrorMessage("Error inesperado al iniciar sesión.");
      setIsPending(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setIsPending(true);
      const response: SignInResponse | undefined = await signIn("google", {
        callbackUrl: callbackUrl,
        redirect: false,
      });

      if (response?.error) {
        setErrorMessage("No se pudo completar el inicio de sesión con Google");
        setIsPending(false);
      } else {
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
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">Crear una cuenta en Myckeo</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              aria-label="Nombre del administrador"
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
              aria-label="Apellido del administrador"
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
              aria-label="Correo Electrónico"
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
      aria-label="Contraseña"
      onChange={(e) => setValue("contraseña", e.target.value, { shouldValidate: true })}
    />
    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
    >
      {showPassword ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
    </button>
  </div>

  {/* Mostrar errores de validación si existen */}
  {errors.contraseña && (
    <span className="text-red-500 text-sm">{errors.contraseña.message}</span>
  )}

  {/* Indicador de requisitos dinámico */}
  <PasswordRequirements password={watch("contraseña")} />
</div>


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
              aria-label="Selecciona un departamento"
            >
              <option value="">Selecciona un departamento</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            {errors.ciudad && !selectedDepartamento && <span className="text-red-500 text-sm">Selecciona un departamento</span>}
          </div>

          <div className="relative">
            <label htmlFor="ciudad-select" className="block font-bold">Ciudad</label>
            <Alert severity="info" className="mb-2">
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
              aria-label="Selecciona una ciudad"
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
              aria-label="Selecciona tu género"
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
            <div className="flex justify-center items-center"> {/* Centrar el DatePicker */}
              <DatePicker
                selected={selectedDate}
                onChange={(date: Date | null) => {
                  setSelectedDate(date);
                  if (date) {
                    setValue("fechaNacimiento", date, { shouldValidate: true });
                    trigger("fechaNacimiento"); // Revalidar explícitamente para limpiar errores
                  } else {
                    setValue("fechaNacimiento", new Date("1990-01-01"), { shouldValidate: true });
                    trigger("fechaNacimiento");
                  }
                }}
                peekNextMonth
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                maxDate={new Date()}
                minDate={new Date("1900-01-01")}
                dateFormat="dd/MM/yyyy"
                locale={es}
                wrapperClassName="w-full" // Asegurar ancho completo
                className={clsx(
                  "w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-600 text-center cursor-pointer", // Centrar texto y cursor pointer
                  { "border-red-500": errors.fechaNacimiento }
                )}
                placeholderText="Selecciona tu fecha de nacimiento"
                aria-label="Selecciona tu fecha de nacimiento"
                popperClassName="react-datepicker-popper z-50" // Asegurar visibilidad en móviles
                calendarClassName="border rounded-lg shadow-lg bg-white" // Estilos modernos para el calendario
              />
            </div>
            {errors.fechaNacimiento && (
              <span className="text-red-500 text-sm">{errors.fechaNacimiento.message}</span>
            )}
          </div>

          <input
            type="hidden"
            {...register("fechaNacimiento", {
              required: "La fecha de nacimiento es requerida",
              validate: (value: Date | null) => {
                if (!value) return "La fecha de nacimiento es requerida";
                const today = new Date();
                const birthDate = new Date(value);
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                  age--;
                }
                return age >= 18 || "Debes ser mayor de 18 años";
              },
            })}
          />

          {/* Checkbox para aceptar políticas */}
          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              {...register("acceptedPolicies", { required: "Debes aceptar las políticas para continuar" })}
              checked={acceptedPolicies}
              onChange={(e) => {
                setAcceptedPolicies(e.target.checked);
                setValue("acceptedPolicies", e.target.checked, { shouldValidate: true });
              }}
              className={clsx(
                "h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded",
                { "border-red-500": errors.acceptedPolicies }
              )}
              aria-label="Aceptar Políticas de Privacidad y Cookies"
              aria-describedby="policy-info"
            />
            <label htmlFor="acceptedPolicies" className="ml-2 block text-sm text-gray-900">
              Acepto la <Link href="/politica-privacidad" className="text-blue-600 underline">Política de Privacidad</Link> y la <Link href="/politica-cookies" className="text-blue-600 underline">Política de Cookies</Link>.
            </label>
            {errors.acceptedPolicies && (
              <span id="policy-info" className="text-red-500 text-sm ml-2">{errors.acceptedPolicies.message}</span>
            )}
          </div>

          {errorMessage && <span className="text-red-500 text-sm">{errorMessage}</span>}

          <button
            type="submit"
            disabled={isPending || !isValid}
            className={clsx(
              "w-full py-2 rounded-lg transition",
              isPending || !isValid
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
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
          disabled={isPending || !isValid}
          className={clsx(
            "w-full flex items-center justify-center bg-blue-600 text-white py-2 rounded-lg mt-4",
            isPending || !isValid ? "bg-gray-400 cursor-not-allowed" : "hover:bg-blue-700 transition"
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


const PasswordRequirements = ({ password = "" }: { password: string }) => {
  const requirements = [
    { label: "Mínimo 8 caracteres", test: (pw: string) => pw.length >= 8 },
    { label: "Al menos una letra mayúscula (A-Z)", test: (pw: string) => /[A-Z]/.test(pw) },
    { label: "Al menos una letra minúscula (a-z)", test: (pw: string) => /[a-z]/.test(pw) },
    { label: "Al menos un número (0-9)", test: (pw: string) => /\d/.test(pw) },
    { label: "Al menos un símbolo (!@#$...)", test: (pw: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw) },
  ];

  return (
    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
      <p className="font-semibold mb-2 text-gray-800">La contraseña debe contener:</p>
      <ul className="space-y-1">
        {requirements.map((req, i) => {
          const passed = req.test(password);
          return (
            <li key={i} className="flex items-center">
              <span
                className={clsx(
                  "mr-2 flex items-center justify-center w-4 h-4 rounded-full border",
                  passed
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-gray-400 text-gray-400"
                )}
              >
                {passed ? "✓" : "•"}
              </span>
              <span className={passed ? "text-green-600" : "text-gray-600"}>
                {req.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
