"use client";

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import clsx from "clsx";
import colombia from "@/config/colombia.json";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Alert } from "@mui/material";
import { motion } from "framer-motion"; // Para animaciones premium y elegantes
import { updatePerfilInformation } from "@/actions/auth/updatePerfilInformation";
import { Genero } from "@prisma/client"; // Importa el enum para tipado elegante

type FormInputs = {
  ciudad: string;
  genero: string; // Mantenemos string, pero casteamos al submit
  fechaNacimiento: Date;
};

interface ColombiaDepartment {
  id: number;
  departamento: string;
  ciudades: string[];
}

export const CompletePerfilInformation = ({ userId }: { userId: string }) => {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDepartamento, setSelectedDepartamento] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const router = useRouter();
  const { update } = useSession(); // Para actualizar sesión en tiempo real

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
      setSelectedCity("");
      setValue("ciudad", "");
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

    const { genero, fechaNacimiento, ciudad } = data;
    // Parsear ciudad para departamento y ciudad separadas (elegante para DB)
    const [ciudadParsed, departamentoParsed] = ciudad.split(" - ");

    const response = await updatePerfilInformation(
      userId,
      ciudadParsed,
      departamentoParsed,
      genero as Genero, // Cast elegante: resuelve el tipado, ya que valores coinciden
      fechaNacimiento
    );

    if (!response.ok) {
      setErrorMessage(response.message);
      setIsPending(false);
      return;
    }

    // Actualizar sesión en tiempo real (premium, como en LinkedIn)
    await update({ perfilCompleto: true });

    // Redirección SPA elegante
    router.push("/dashboard");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white flex flex-col justify-center p-8 max-w-md mx-auto rounded-lg shadow-lg"
    >
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Completa tu Perfil
      </h1>
      <p className="text-center text-gray-600 mb-8">
        ¡Bienvenido! Para personalizar tu experiencia y conectar mejor con la comunidad, por favor completa estos detalles. Es rápido y sencillo.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Campo hidden para ciudad completa */}
        <input
          type="hidden"
          {...register("ciudad", { required: "La ciudad es requerida (formato: Ciudad - Departamento)" })}
        />

        <div>
          <label htmlFor="departamento" className="block font-bold text-gray-700 mb-2">
            Departamento
          </label>
          <select
            value={selectedDepartamento}
            onChange={(e) => setSelectedDepartamento(e.target.value)}
            className={clsx(
              "w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition",
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

        <div>
          <label htmlFor="ciudad-select" className="block font-bold text-gray-700 mb-2">
            Ciudad
          </label>
          <Alert severity="info" className="mb-2">
            Selecciona un departamento primero para ver las ciudades disponibles.
          </Alert>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            disabled={!selectedDepartamento}
            className={clsx(
              "w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition",
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
          {errors.ciudad && <span className="text-red-500 text-sm mt-1">{errors.ciudad.message}</span>}
        </div>

        <div>
          <label htmlFor="genero" className="block font-bold text-gray-700 mb-2">
            Género
          </label>
          <select
            {...register("genero", { required: "El género es requerido" })}
            className={clsx(
              "w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition",
              { "border-red-500": errors.genero }
            )}
          >
            <option value="">Selecciona una opción</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
          </select>
          {errors.genero && <span className="text-red-500 text-sm mt-1">{errors.genero.message}</span>}
        </div>

        <div>
          <label htmlFor="fechaNacimiento" className="block font-bold text-gray-700 mb-2">
            Fecha de Nacimiento
          </label>
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => {
              setSelectedDate(date);
              if (date) {
                setValue("fechaNacimiento", date);
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
              "w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition",
              { "border-red-500": errors.fechaNacimiento }
            )}
            placeholderText="Selecciona tu fecha de nacimiento"
          />
          {errors.fechaNacimiento && (
            <span className="text-red-500 text-sm mt-1">{errors.fechaNacimiento.message}</span>
          )}
        </div>

        {errorMessage && <span className="text-red-500 text-sm block text-center">{errorMessage}</span>}

        <button
          type="submit"
          disabled={isPending}
          className={clsx(
            "w-full py-3 rounded-lg font-bold text-white transition",
            isPending ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
          )}
        >
          {isPending ? "Actualizando..." : "Actualizar Perfil"}
        </button>
      </form>
    </motion.div>
  );
};