"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Button, CircularProgress, IconButton } from "@mui/material";
import { FaTimes, FaCog, FaEye, FaPlus } from "react-icons/fa";
import { PublicacionTipo, Visibilidad } from "@prisma/client";
import AutoUploadMedia from "@/ui/components/autoUpload/AutoUploadMedia";
import { createUpdateCarruselImagenes } from "../actions/createUpdateCarruselImagenes";


interface InformacionPublicacion {
    usuarioId?: string;
    negocioId?: string;
    publicacionId?: string;
    tipo: PublicacionTipo;
    descripcion?: string;
    multimedia?: string[];
    visibilidad?: Visibilidad;
}

interface FormDataPublicacion {
    descripcion?: string;
    multimedia?: string | string[] | undefined;
    visibilidad?: Visibilidad;
}

interface Props {
    infoPublicacion?: InformacionPublicacion;
    onCancel?: () => void;
    onSuccess?: (message?: string) => void;
}

const FormCrearCarruselImagenes = ({ infoPublicacion, onCancel, onSuccess }: Props) => {
    const {
        register,
        handleSubmit,
        control,
        setValue,
        reset,
        formState: { errors },
    } = useForm<FormDataPublicacion>({
        defaultValues: {
            descripcion: infoPublicacion?.descripcion || "",
            multimedia: infoPublicacion?.multimedia,
            visibilidad: infoPublicacion?.visibilidad || Visibilidad.PUBLICA,
        },
    });

    const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
    const router = useRouter();
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false); // Estado para modal de reseña

    // Watch the descripcion and multimedia fields for dynamic updates
    const descripcion = useWatch({ control, name: "descripcion" });
    const multimedia = useWatch({ control, name: "multimedia" });

    useEffect(() => {
        if (infoPublicacion) {
            reset({
                descripcion: infoPublicacion.descripcion || "",
                multimedia: infoPublicacion.multimedia,
                visibilidad: infoPublicacion.visibilidad || Visibilidad.PUBLICA,
            });
        }
    }, [infoPublicacion, reset]);

    const onFormSubmit = async (data: FormDataPublicacion) => {
        setLoading(true);
        if (!userId) {
            setAlert({ type: "error", message: "No estás autenticado. Por favor, inicia sesión." });
            setLoading(false);
            return;
        }

        const submissionData: InformacionPublicacion = {
            usuarioId: userId,
            negocioId: infoPublicacion?.negocioId,
            tipo: infoPublicacion?.tipo || PublicacionTipo.CARRUSEL_IMAGENES,
            descripcion: data.descripcion || "",
            multimedia: data.multimedia ? (Array.isArray(data.multimedia) ? data.multimedia : [data.multimedia]) : [],
            publicacionId: infoPublicacion?.publicacionId,
            visibilidad: data.visibilidad || Visibilidad.PUBLICA,
        };

        const result = await createUpdateCarruselImagenes(submissionData);
        setAlert({ type: result.ok ? "success" : "error", message: result.message });
        if (result.ok) {
            reset();
            onSuccess?.("Publicación creada exitosamente");
            
        }
        setLoading(false);
    };

    if (!session) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-2xl mx-auto p-4"
            >
                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-2 shadow-sm">
                    <span>❌</span>
                    No estás autenticado. Por favor, inicia sesión.
                </div>
            </motion.div>
        );
    }

    const multiple = true;
    const dataEntrada = infoPublicacion?.multimedia;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8"
        >
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden relative">
                {/* Barra superior */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <IconButton
                        onClick={onCancel}
                        aria-label="Cerrar formulario"
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <FaTimes size={20} />
                    </IconButton>
                    <h2 className="text-lg font-medium text-gray-900">
                        {infoPublicacion?.publicacionId ? "Editar galería" : "Nueva galería"}
                    </h2>
                    <div className="relative">
                        <IconButton
                            onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                            aria-label="Configurar visibilidad"
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <FaCog size={20} />
                        </IconButton>
                        <AnimatePresence>
                            {showVisibilityMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-md z-10"
                                >
                                    <Controller
                                        name="visibilidad"
                                        control={control}
                                        render={({ field }) => (
                                            <div className="p-2">
                                                {Object.values(Visibilidad).map((vis) => (
                                                    <button
                                                        key={vis}
                                                        onClick={() => {
                                                            setValue("visibilidad", vis);
                                                            setShowVisibilityMenu(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2 text-sm ${field.value === vis
                                                            ? "bg-blue-50 text-blue-700 font-medium"
                                                            : "text-gray-700 hover:bg-gray-50"
                                                            } rounded-md`}
                                                    >
                                                        {vis}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Área de multimedia */}
                <div className="p-6 relative">

                    <AutoUploadMedia
                        initialData={
                            multiple
                                ? Array.isArray(dataEntrada)
                                    ? dataEntrada
                                    : dataEntrada
                                        ? [dataEntrada]
                                        : []
                                : Array.isArray(dataEntrada)
                                    ? dataEntrada[0]
                                    : dataEntrada
                        }
                        multiple={true}
                        onChange={(urls) => setValue("multimedia", urls, { shouldValidate: true })}
                        onError={(message) => setAlert({ type: "error", message })}
                        onLoading={setLoading}
                        mediaType="mixto"
                        titulo="Crea tu Carrusel de Imagenes"
                    />
                </div>

                {/* Área de descripción */}
                <div className="px-6 pt-0 pb-6">
                    <div className="relative rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] ring-1 ring-gray-200 transition-all">
                        <textarea
                            {...register("descripcion", {
                                required: "La descripción es obligatoria",
                                maxLength: { value: 280, message: "Máximo 280 caracteres" },
                            })}
                            placeholder="Escribe una descripción elegante y clara..."
                            rows={4}
                            className={`
        w-full resize-none rounded-2xl p-5 text-gray-800 placeholder-gray-400 bg-transparent 
        focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200
        ${errors.descripcion ? "ring-2 ring-red-300" : ""}
      `}
                            aria-label="Descripción de la galería de imágenes"
                        />
                        {errors.descripcion && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="text-red-600 text-sm mt-2 ml-1 flex items-center gap-1"
                            >
                                <span>❌</span>
                                {errors.descripcion.message}
                            </motion.p>
                        )}
                        <div className="absolute bottom-3 right-4 text-gray-400 text-xs">
                            {descripcion?.length || 0}/280
                        </div>
                    </div>
                </div>


                {/* Barra de acciones inferior */}
                <div className="flex justify-between items-center p-4 border-t border-gray-100 sticky bottom-0 bg-white">
                    <Button
                        onClick={onCancel}
                        sx={{
                            textTransform: "none",
                            color: "white",
                            backgroundColor: "#ef4444", // Tailwind red-500
                            "&:hover": {
                                backgroundColor: "#b91c1c", // Tailwind red-700
                            },
                        }}
                        disabled={loading}
                        className="font-medium text-sm px-6 py-2 rounded-lg shadow transition-all"
                        aria-label="Cancelar creación de galería"
                    >
                        Cancelar
                    </Button>

                    <div className="flex gap-3">
                        <IconButton
                            onClick={() => setAlert({ type: "info", message: "Vista previa no implementada aún" })}
                            disabled={loading}
                            className="text-gray-500 hover:bg-gray-100 rounded-full"
                            aria-label="Ver vista previa de la galería"
                        >
                            <FaEye size={20} />
                        </IconButton>
                        <Button
                            sx={{
                                textTransform: "none",
                                color: "white", // Forzar texto blanco
                                "&:hover": {
                                    background: "#1f2937", // gris oscuro (tailwind: gray-800)
                                },
                            }}
                            onClick={handleSubmit(onFormSubmit)}
                            disabled={loading}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg px-6 py-2 transition-all shadow-md"
                            aria-label={infoPublicacion?.publicacionId ? "Actualizar galería" : "Publicar galería"}
                        >
                            {loading ? (
                                <CircularProgress size={20} className="text-white" />
                            ) : infoPublicacion?.publicacionId ? (
                                "Actualizar"
                            ) : (
                                "Publicar"
                            )}
                        </Button>
                    </div>
                </div>

                {/* Notificación tipo toast */}
                <AnimatePresence>
                    {alert && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                            className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded-xl shadow-md flex items-center gap-2 z-50 ${alert.type === "success"
                                ? "bg-green-50 text-green-700"
                                : alert.type === "error"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-blue-50 text-blue-700"
                                }`}
                        >
                            <span>{alert.type === "success" ? "✅" : alert.type === "error" ? "❌" : "ℹ️"}</span>
                            {alert.message}
                            <button
                                onClick={() => setAlert(null)}
                                className="ml-2 text-sm font-medium hover:underline"
                                aria-label="Cerrar notificación"
                            >
                                Cerrar
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default FormCrearCarruselImagenes;