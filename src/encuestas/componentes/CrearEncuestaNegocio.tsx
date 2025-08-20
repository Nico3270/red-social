"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrash } from "react-icons/fa";
import { createEncuestaNegocio } from "../actions/createEncuestaNegocio";
import { TipoPregunta } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Interfaz actualizada para incluir id (necesario para relaciones)
export interface Pregunta {
  id: string; // Agregado para relacionar en pivot
  texto: string;
  tipo: TipoPregunta;
  creador: "ADMIN";
  requerida: true;
  categoria: string;
}

interface CrearEncuestaNegocioProps {
  preguntas: Pregunta[];
}

const CrearEncuestaNegocio: React.FC<CrearEncuestaNegocioProps> = ({ preguntas }) => {
  const [seleccionadas, setSeleccionadas] = useState<Pregunta[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [responseMessage, setResponseMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();
  const { update } = useSession();

  const router = useRouter();

  const slugNegocio = session?.user.negocioSlug || "dashboard/encuestas"; // Fallback si no hay slug

  // Dividir preguntas por tipo con memoización para performance
  const { calificables, texto } = useMemo(() => {
    return {
      calificables: preguntas.filter((p) => p.tipo === "CALIFICABLE"),
      texto: preguntas.filter((p) => p.tipo === "TEXTO"),
    };
  }, [preguntas]);

  // Contadores por tipo
  const conteoCalificables = seleccionadas.filter((p) => p.tipo === "CALIFICABLE").length;
  const conteoTexto = seleccionadas.filter((p) => p.tipo === "TEXTO").length;

  const handleSeleccionar = (pregunta: Pregunta) => {
    if (seleccionadas.includes(pregunta)) return; // Ya seleccionada

    if (pregunta.tipo === "CALIFICABLE" && conteoCalificables >= 10) {
      setModalMessage(`Has alcanzado el límite de 10 preguntas calificables. Puedes agregar hasta ${5 - conteoTexto} preguntas de texto abiertas más para mantener la encuesta atractiva.`);
      setShowModal(true);
      return;
    }

    if (pregunta.tipo === "TEXTO" && conteoTexto >= 5) {
      setModalMessage(`Has alcanzado el límite de 5 preguntas de texto. Puedes agregar hasta ${10 - conteoCalificables} preguntas calificables más, pero recuerda: encuestas cortas aumentan la completitud.`);
      setShowModal(true);
      return;
    }

    setSeleccionadas([...seleccionadas, pregunta]);
  };

  const handleQuitar = (pregunta: Pregunta) => {
    setSeleccionadas(seleccionadas.filter((p) => p.texto !== pregunta.texto));
  };

  const handleCrearEncuesta = () => {
    startTransition(async () => {
      const result = await createEncuestaNegocio(seleccionadas);
      setResponseMessage(result);
    });
  };

  // Efecto para redirección después de éxito (con delay para ver toast)
  useEffect(() => {
    if (responseMessage?.ok) {
      (async () => {
        await update({ configEncuestas: true });
        setTimeout(() => {
          router.push(`/perfil/${slugNegocio}`);
        }, 2000);
      })();
    }
  }, [responseMessage, router, slugNegocio, update]);


  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 flex flex-col items-center">
      {/* Banner Explicativo: Elegante y centrado */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl text-center bg-white rounded-xl shadow-lg p-6 mb-8"
      >
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Crea tu Encuesta Personalizada</h1>
        <p className="text-gray-600 mb-4">
          Selecciona hasta 10 preguntas calificables (1-5 estrellas) y 5 abiertas (texto libre) para que tus clientes evalúen tus productos o servicios. Usa preguntas útiles y necesarias — encuestas cortas son más atractivas y aumentan las respuestas. Máximo total recomendado: 10-15 para evitar tedio.
        </p>
        <p className="text-sm text-gray-500">Preguntas predefinidas por expertos para adaptarse a cualquier negocio.</p>
      </motion.div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sección Izquierda: Preguntas Calificables */}
        <div className="w-full bg-white rounded-xl shadow-lg p-4">
          <h2 className="text-xl font-medium text-gray-800 mb-4">Preguntas Calificables (Máx 10)</h2>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {calificables.map((pregunta) => (
              <motion.div
                key={pregunta.texto}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleSeleccionar(pregunta)}
                className={`cursor-pointer p-4 border rounded-lg shadow-sm transition-colors ${seleccionadas.includes(pregunta) ? "bg-green-100 border-green-500" : "bg-white hover:bg-gray-50"
                  }`}
              >
                <p className="text-gray-700">{pregunta.texto}</p>
                <p className="text-sm text-blue-600 font-medium">{pregunta.categoria}</p> {/* Color azul para destacar categoría */}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sección Centro: Preguntas de Texto */}
        <div className="w-full bg-white rounded-xl shadow-lg p-4">
          <h2 className="text-xl font-medium text-gray-800 mb-4">Preguntas Abiertas (Máx 5)</h2>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {texto.map((pregunta) => (
              <motion.div
                key={pregunta.texto}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleSeleccionar(pregunta)}
                className={`cursor-pointer p-4 border rounded-lg shadow-sm transition-colors ${seleccionadas.includes(pregunta) ? "bg-green-100 border-green-500" : "bg-white hover:bg-gray-50"
                  }`}
              >
                <p className="text-gray-700">{pregunta.texto}</p>
                <p className="text-sm text-blue-600 font-medium">{pregunta.categoria}</p> {/* Color azul para destacar categoría */}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sección Derecha: Stage de Seleccionadas */}
        <div className="w-full bg-white rounded-xl shadow-lg p-4">
          <h2 className="text-xl font-medium text-gray-800 mb-4">Preguntas Seleccionadas ({seleccionadas.length})</h2>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {seleccionadas.map((pregunta) => (
              <motion.div
                key={pregunta.texto}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-green-50 border border-green-300 rounded-lg flex justify-between items-center"
              >
                <div>
                  <p className="text-gray-700">{pregunta.texto}</p>
                  <p className="text-sm text-gray-500">{pregunta.tipo} - {pregunta.categoria}</p>
                </div>
                <button
                  onClick={() => handleQuitar(pregunta)}
                  className="flex items-center text-red-500 hover:text-red-700 text-sm"
                >
                  <FaTrash className="mr-1" /> Quitar
                </button>
              </motion.div>
            ))}
            {seleccionadas.length === 0 && (
              <p className="text-gray-500 text-center">Selecciona preguntas para armar tu encuesta.</p>
            )}
          </div>
          {/* Botón Finalizar */}
          <button
            onClick={handleCrearEncuesta}
            disabled={seleccionadas.length === 0 || isPending}
            className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300"
          >
            {isPending ? "Creando..." : "Crear Encuesta"}
          </button>
        </div>
      </div>

      {/* Modal Informativo para Límites (en lugar de alert) */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-white rounded-xl shadow-2xl p-6 max-w-md text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Límite Alcanzado</h3>
              <p className="text-gray-600 mb-4">{modalMessage}</p>
              <button
                onClick={() => setShowModal(false)}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast de Respuesta con AnimatePresence (positivo/negativo) */}
      <AnimatePresence>
        {responseMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white ${responseMessage.ok ? "bg-green-600" : "bg-red-600"
              }`}
          >
            <p>{responseMessage.message}</p>
            <button
              onClick={() => setResponseMessage(null)}
              className="ml-2 text-sm underline"
            >
              Cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CrearEncuestaNegocio;