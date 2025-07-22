"use client";

import { useState } from "react";
import { RegisterForm } from "./ui/NewAcoount";

export default function NewAccountPage() {
  const [tipoUsuario, setTipoUsuario] = useState<null | boolean>(null);


  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Formulario solo si ya seleccionó */}
      {tipoUsuario !== null ? (
        <RegisterForm negocio={tipoUsuario} />
      ) : (
        <div className="md:w-1/2 flex flex-col items-center justify-center p-8 bg-white">
          <h2 className="text-2xl font-bold mb-6 text-center">
            ¿Qué tipo de cuenta deseas crear?
          </h2>
          <button
            onClick={() => setTipoUsuario(false)}
            className="mb-4 w-full max-w-xs py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Cuenta personal
          </button>
          <button
            onClick={() => setTipoUsuario(true)}
            className="w-full max-w-xs py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Cuenta de negocio
          </button>
        </div>
      )}

      {/* Lado derecho (informativo) */}
      <div className="md:w-1/2 hidden md:flex items-center justify-center bg-white p-8">
        {tipoUsuario === null ? (
          <h1 className="text-lg text-center">
            Elige el tipo de cuenta para comenzar con tu registro.
          </h1>
        ) : (
          <h1 className="text-lg text-center">
            Completá el formulario para crear tu cuenta {tipoUsuario ? "de negocio" : "personal"}.
          </h1>
        )}
      </div>
    </div>
  );
}
