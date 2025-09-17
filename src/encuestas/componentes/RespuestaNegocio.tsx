"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaStar } from "react-icons/fa";
import { TipoPregunta } from "@prisma/client";
import { useRouter } from "next/navigation";
import { responderEncuestaNegocio } from "../actions/responderEncuestaNegocio";
import Divider from "@/ui/components/divider/Divider";


export interface Pregunta {
    id: string;
    texto: string;
    tipo: TipoPregunta;
    creador: "ADMIN";
    requerida: true;
    categoria: string;
}

interface RespuestaEncuestaNegocioProps {
    preguntas: Pregunta[];
    negocioId: string;
    slug: string;
    nombreNegocio?: string; // Opcional, si quieres mostrar nombre del negocio
}

const RespuestaEncuestaNegocio: React.FC<RespuestaEncuestaNegocioProps> = ({ preguntas, negocioId, slug, nombreNegocio }) => {
    const [respuestas, setRespuestas] = useState<{ [key: string]: string | number }>({});
    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Dividir preguntas por tipo con memoización
    const { calificables, texto } = useMemo(() => {
        return {
            calificables: preguntas.filter((p) => p.tipo === "CALIFICABLE"),
            texto: preguntas.filter((p) => p.tipo === "TEXTO"),
        };
    }, [preguntas]);

    const handleCalificacion = (preguntaId: string, value: number) => {
        setRespuestas((prev) => ({ ...prev, [preguntaId]: value }));
    };

    const handleTexto = (preguntaId: string, value: string) => {
        setRespuestas((prev) => ({ ...prev, [preguntaId]: value }));
    };

    const handleEnviar = () => {
        startTransition(async () => {
            // Preparar data para action: Array de { preguntaId, tipo, valor (string para TEXTO, number para CALIFICABLE) }
            const dataRespuestas = preguntas.map((p) => ({
                preguntaId: p.id,
                tipo: p.tipo,
                valor: p.tipo === "TEXTO" ? (respuestas[p.id] as string) : undefined,
                calificacion: p.tipo === "CALIFICABLE" ? (respuestas[p.id] as number) : undefined,
            }));

            const result = await responderEncuestaNegocio({
                negocioId,
                respuestas: dataRespuestas,
                nombre: nombre || undefined, // Opcional
                telefono: telefono || undefined, // Opcional
            });

            setModalMessage(result.message);
            setIsSuccess(result.ok);
            setShowModal(true);
            setShowModal(true);

            if (!result.ok) {
                // Reactivar botón si error
                // isPending ya maneja, pero no necesitamos extra ya que transition finaliza
            }
        });
    };

    // Redirección si éxito (después de modal visible)
    useEffect(() => {
        if (showModal && isSuccess) {
            const timer = setTimeout(() => {
                router.push(`/perfil/${slug}`);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [showModal, isSuccess, router, slug]);

    return (
        <div className="min-h-screen bg-white p-6 md:p-12 flex flex-col items-center mb-20">
            <h1 className="text-3xl md:text-4xl font-light text-gray-900 tracking-tight text-center mb-10">
                Tu opinión sobre <span className="font-semibold text-blue-800">{nombreNegocio}</span>
            </h1>
            <Divider />

            {/* Preguntas Calificables: Elegante con estrellas */}
            {calificables.length > 0 && (
                <div className="w-full max-w-2xl space-y-6 mb-12">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                        Califica tu experiencia
                    </h2>

                    {calificables.map((pregunta) => (
                        <div key={pregunta.id} className="bg-gray-50 rounded-xl p-6 shadow-sm">
                            <p className="text-lg font-medium text-center text-gray-800 mb-3">{pregunta.texto}</p>
                            <div className="flex justify-center space-x-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <FaStar
                                        key={star}
                                        size={28}
                                        className={`cursor-pointer transition-colors duration-200 hover:scale-110 ${(respuestas[pregunta.id] as number) >= star
                                            ? "text-yellow-500"
                                            : "text-gray-300"
                                            }`}
                                        onClick={() => handleCalificacion(pregunta.id, star)}
                                    />
                                ))}
                            </div>

                        </div>
                    ))}
                </div>
            )}
            <Divider />
            {/* Preguntas de Texto: Caja elegante con autosize */}
            {texto.length > 0 && (
                <div className="w-full max-w-2xl space-y-6 mb-12">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                        Comparte tu opinión
                    </h2>

                    {texto.map((pregunta) => (
                        <div key={pregunta.id} className="bg-gray-50 rounded-xl p-6 shadow-sm">
                            <p className="text-lg font-medium text-center text-gray-800 mb-3">
                                {pregunta.texto}
                            </p>

                            <textarea
                                className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-gray-400 text-gray-800 placeholder-gray-400"
                                rows={3}
                                value={respuestas[pregunta.id] as string || ""}
                                onChange={(e) => handleTexto(pregunta.id, e.target.value)}
                                style={{ minHeight: "80px", overflow: "hidden" }} // Autosize básico con CSS
                            />

                        </div>
                    ))}
                </div>
            )}

            <Divider />

            {/* Campos Opcionales: Nombre y Teléfono */}
            <div className="w-full max-w-2xl space-y-6 mb-12">
                <h2 className="text-xl font-bold text-center text-gray-700 mb-4">Datos Opcionales</h2>
                <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                    <p className="text-gray-800 mb-2">Nombre (opcional)</p>
                    <input
                        type="text"
                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 text-gray-900"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                    />
                </div>
                <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                    <p className="text-gray-800 mb-2">Teléfono (opcional)</p>
                    <input
                        type="tel"
                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 text-gray-900"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                    />
                </div>
            </div>

            {/* Botón Enviar */}
            <button
                onClick={handleEnviar}
                disabled={isPending}
                className="w-full max-w-2xl bg-gray-800 text-white py-3 rounded-lg hover:bg-gray-900 transition-colors disabled:bg-gray-400"
            >
                {isPending ? "Enviando..." : "Enviar Respuestas"}
            </button>

            {/* Modal de Respuesta con AnimatePresence */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className={`bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border ${isSuccess ? "border-green-500/70" : "border-red-500/70"
                                }`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-2xl font-light text-gray-900 mb-3">
                                {isSuccess ? "¡Listo!" : "Ups…"}
                            </h3>
                            <p className="text-gray-600 leading-relaxed mb-6">{modalMessage}</p>
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                            >
                                Cerrar
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Spinner de Carga (toast central durante pending) */}
            <AnimatePresence>
                {isPending && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
                    >
                        <div className="bg-white rounded-xl p-6 shadow-lg text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-4"></div>
                            <p className="text-gray-600">Enviando respuestas...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RespuestaEncuestaNegocio;