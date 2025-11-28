"use client";

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import colombia from "@/config/colombia.json";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { es } from "date-fns/locale";
import { Genero } from "@prisma/client";
import { UpdateUserInput, updateUserSchema } from "@/lib/validators/updateUserSchema";
import { updateUserProfile } from "@/helpers/usuario/updateUserProfile";

interface ColombiaDepartment {
  id: number;
  departamento: string;
  ciudades: string[];
}

interface UsuarioParaEditar {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  ciudad: string;
  departamento: string;
  genero: Genero;
  fechaNacimiento: Date;
  fotoPerfil: string | null;
  biografia: string | null;
  isPlaceholder: boolean;
  perfilCompleto: boolean;
}

interface Props {
  usuario: UsuarioParaEditar;
  esModoObligatorio?: boolean;
}

export const EditarUsuarioForm = ({ usuario, esModoObligatorio = false }: Props) => {
  const [isPending, setIsPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDepartamento, setSelectedDepartamento] = useState(usuario.departamento || "");
  const [selectedCity, setSelectedCity] = useState(usuario.ciudad || "");
  const [cities, setCities] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { update } = useSession();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      nombre: usuario.nombre || "",
      apellido: usuario.apellido || "",
      email: usuario.email || "",
      username: usuario.username || "",
      ciudadCompleta: usuario.ciudad && usuario.departamento
        ? `${usuario.ciudad} - ${usuario.departamento}`
        : "",
      genero: usuario.genero || "otro",
      fechaNacimiento: usuario.fechaNacimiento ? new Date(usuario.fechaNacimiento) : undefined,
      nuevaContraseña: "",
      confirmarContraseña: "",
    },
  });

  const nuevaContraseña = watch("nuevaContraseña");
  const confirmarContraseña = watch("confirmarContraseña");
  const passwordsCoinciden = nuevaContraseña && confirmarContraseña && nuevaContraseña === confirmarContraseña;

  const departments = (colombia as ColombiaDepartment[]).map((dept) => dept.departamento);

  useEffect(() => {
    if (selectedDepartamento) {
      const dept = (colombia as ColombiaDepartment[]).find(d => d.departamento === selectedDepartamento);
      setCities(dept?.ciudades || []);
      if (selectedCity && dept && !dept.ciudades.includes(selectedCity)) {
        setSelectedCity("");
      }
    } else {
      setCities([]);
      setSelectedCity("");
    }
  }, [selectedDepartamento, selectedCity]);

  useEffect(() => {
    const value = selectedCity && selectedDepartamento ? `${selectedCity} - ${selectedDepartamento}` : "";
    setValue("ciudadCompleta", value, { shouldValidate: true });
  }, [selectedCity, selectedDepartamento, setValue]);

  const onSubmit: SubmitHandler<UpdateUserInput> = async (data) => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsPending(true);

    // Convertir fecha a string ISO antes de enviar (Zod ya validó)
    const dataToSend = {
      ...data,
      fechaNacimiento: data.fechaNacimiento?.toISOString().split("T")[0] || "",
    };

    const result = await updateUserProfile(usuario.id, dataToSend);

    if (!result.ok) {
      setErrorMessage(result.message || "Error al actualizar perfil");
      setIsPending(false);
      return;
    }

    await update({
      isPlaceholder: false,
      perfilCompleto: true,
    });

    setSuccessMessage("¡Perfil actualizado con éxito! Redirigiendo...");
    setIsPending(false);

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-8">
        {esModoObligatorio ? "Completa tu perfil" : "Editar perfil"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Nombre y Apellido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-bold text-gray-700">Nombre</label>
            <input
              {...register("nombre")}
              type="text"
              className={clsx(
                "w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-red-600",
                errors.nombre ? "border-red-500" : "border-gray-300"
              )}
              placeholder="Tu nombre"
            />
            {errors.nombre && <p className="text-red-500 text-sm mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block font-bold text-gray-700">Apellido</label>
            <input
              {...register("apellido")}
              type="text"
              className={clsx(
                "w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-red-600",
                errors.apellido ? "border-red-500" : "border-gray-300"
              )}
              placeholder="Tu apellido"
            />
            {errors.apellido && <p className="text-red-500 text-sm mt-1">{errors.apellido.message}</p>}
          </div>
        </div>

        {/* Email y Username */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-bold text-gray-700">Correo electrónico</label>
            <input
              {...register("email")}
              type="email"
              disabled={esModoObligatorio}
              className={clsx(
                "w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-red-600",
                errors.email ? "border-red-500" : "border-gray-300",
                esModoObligatorio && "bg-gray-100 cursor-not-allowed"
              )}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block font-bold text-gray-700">Nombre de usuario</label>
            <input
              {...register("username")}
              type="text"
              className={clsx(
                "w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-red-600",
                errors.username ? "border-red-500" : "border-gray-300"
              )}
              placeholder="tu_usuario"
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
          </div>
        </div>

        {/* Departamento y Ciudad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-bold text-gray-700">Departamento</label>
            <select
              value={selectedDepartamento}
              onChange={(e) => setSelectedDepartamento(e.target.value)}
              className={clsx(
                "w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-red-600",
                !selectedDepartamento && errors.ciudadCompleta ? "border-red-500" : "border-gray-300"
              )}
            >
              <option value="">Selecciona departamento</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700">Ciudad</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              disabled={!selectedDepartamento}
              className={clsx(
                "w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-red-600",
                errors.ciudadCompleta ? "border-red-500" : "border-gray-300"
              )}
            >
              <option value="">Selecciona ciudad</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {errors.ciudadCompleta && <p className="text-red-500 text-sm mt-1">{errors.ciudadCompleta.message}</p>}
          </div>
        </div>

        {/* Género y Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-bold text-gray-700">Género</label>
            <select
              {...register("genero")}
              className={clsx(
                "w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-red-600",
                errors.genero ? "border-red-500" : "border-gray-300"
              )}
            >
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro / Prefiero no decir</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700">Fecha de nacimiento</label>
            <DatePicker
              selected={watch("fechaNacimiento") ?? null}
              onChange={(date) => setValue("fechaNacimiento", date || undefined, { shouldValidate: true })}
              maxDate={new Date()}
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              dateFormat="dd/MM/yyyy"
              locale={es}
              className={clsx(
                "w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-red-600",
                errors.fechaNacimiento ? "border-red-500" : "border-gray-300"
              )}
              placeholderText="dd/mm/aaaa"
            />
            {errors.fechaNacimiento && <p className="text-red-500 text-sm mt-1">{errors.fechaNacimiento.message}</p>}
          </div>
        </div>

        {/* Cambio de contraseña */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Cambiar contraseña (opcional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-bold text-gray-700">Nueva contraseña</label>
              <div className="relative">
                <input
                  {...register("nuevaContraseña")}
                  type={showPassword ? "text" : "password"}
                  className="w-full border rounded-lg p-3 mt-1 pr-12 focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="Deja vacío para mantener actual"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-4 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700">Confirmar nueva contraseña</label>
              <div className="relative">
                <input
                  {...register("confirmarContraseña")}
                  type={showConfirmPassword ? "text" : "password"}
                  className={clsx(
                    "w-full border rounded-lg p-3 mt-1 pr-12 focus:outline-none focus:ring-2 focus:ring-red-600",
                    errors.confirmarContraseña || (confirmarContraseña && nuevaContraseña !== confirmarContraseña)
                      ? "border-red-500"
                      : passwordsCoinciden ? "border-green-500" : "border-gray-300"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-4 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>

                {/* Check o error al lado derecho */}
                {confirmarContraseña && (
                  <div className="absolute right-10 top-4">
                    {passwordsCoinciden ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>

              {/* Mensaje dinámico */}
              {confirmarContraseña && (
                <p className={clsx(
                  "text-sm mt-1 flex items-center gap-1",
                  passwordsCoinciden ? "text-green-600" : "text-red-500"
                )}>
                  {passwordsCoinciden ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Las contraseñas coinciden
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Las contraseñas no coinciden
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Indicador de contraseña segura */}
          {nuevaContraseña && <PasswordRequirements password={nuevaContraseña} />}
        </div>

        {/* Mensajes */}
        {errorMessage && (
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex flex-col items-center gap-3 text-green-600 bg-green-50 p-6 rounded-lg text-center">
            <CheckCircle2 className="w-12 h-12" />
            <p className="text-lg font-bold">{successMessage}</p>
            <p className="text-sm animate-pulse">Preparando tu experiencia...</p>
          </div>
        )}

        {/* Botón */}
        <button
          type="submit"
          disabled={isPending}
          className={clsx(
            "w-full py-3 rounded-lg font-bold text-white text-lg transition",
            isPending
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700"
          )}
        >
          {isPending ? "Guardando..." : esModoObligatorio ? "Completar Perfil" : "Guardar Cambios"}
        </button>
      </form>
    </div>
  );
};

// Componente de requisitos de contraseña
const PasswordRequirements = ({ password }: { password: string }) => {
  const requirements = [
    { label: "Mínimo 8 caracteres", test: (pw: string) => pw.length >= 8 },
    { label: "Una mayúscula", test: (pw: string) => /[A-Z]/.test(pw) },
    { label: "Una minúscula", test: (pw: string) => /[a-z]/.test(pw) },
    { label: "Un número", test: (pw: string) => /\d/.test(pw) },
    { label: "Un símbolo", test: (pw: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw) },
  ];

  return (
    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
      <p className="font-semibold mb-2">La contraseña debe tener:</p>
      <ul className="space-y-1">
        {requirements.map((req, i) => {
          const passed = req.test(password);
          return (
            <li key={i} className="flex items-center text-xs">
              <span className={clsx(
                "mr-2 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs",
                passed ? "bg-green-500" : "bg-gray-300"
              )}>
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