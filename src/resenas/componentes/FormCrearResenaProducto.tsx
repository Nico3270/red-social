"use client";

import { useSession } from "next-auth/react";
import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Button, CircularProgress, IconButton, Tooltip } from "@mui/material";
import { FaTimes, FaCog, FaEye, FaStar } from "react-icons/fa";
import { Visibilidad } from "@prisma/client";
import AutoUploadMedia from "@/ui/components/autoUpload/AutoUploadMedia";
import debounce from "lodash/debounce";
import { createResenaProducto, CreateResenaProductoProps } from "../actions/createResenaProducto";


interface FormDataResena {
  descripcion?: string;
  multimedia?: string | string[] | undefined;
  calificacion?: number;
  visibilidad?: Visibilidad;
}

interface Props {
  productoId: string;
  productoNombre: string;
  productoDescripcion?: string;
  resenaId?: string;
  onCancel?: () => void;
  onSuccess?: (message?: string) => void;
}

const FormCrearResenaProducto = ({ productoId, productoNombre, productoDescripcion, resenaId, onCancel, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormDataResena>({
    defaultValues: {
      descripcion: "",
      multimedia: [],
      calificacion: undefined,
      visibilidad: Visibilidad.PUBLICA,
    },
  });

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [calificacionHover, setCalificacionHover] = useState<number>(-1);
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const descripcion = useWatch({ control, name: "descripcion" });
  const calificacion = useWatch({ control, name: "calificacion" });

  console.log("FormCrearResenaProducto: productoId recibido =", productoId); // Log para depuración

  // Fetch de datos si es modo edición
  useEffect(() => {
    if (resenaId) {
      const fetchResena = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/resenas/${resenaId}`);
          const data = await response.json();
          if (data.ok) {
            reset({
              descripcion: data.resena.descripcion || "",
              multimedia: data.resena.multimedia.map((m: { url: string }) => m.url) || [],
              calificacion: data.resena.calificacion,
              visibilidad: data.resena.visibilidad || Visibilidad.PUBLICA,
            });
          } else {
            setAlert({ type: "error", message: data.message || "Error al cargar la reseña." });
          }
        } catch (error) {
          setAlert({ type: "error", message: "Error al cargar la reseña." });
        } finally {
          setLoading(false);
        }
      };
      fetchResena();
    }
  }, [resenaId, reset]);

  const onFormSubmit = async (data: FormDataResena) => {
    setLoading(true);
    try {
      if (!userId) {
        throw new Error("No estás autenticado. Por favor, inicia sesión.");
      }

      const submissionData: CreateResenaProductoProps = {
        publicacionId: resenaId,
        productoId,
        descripcion: data.descripcion || "",
        multimedia: data.multimedia ? (Array.isArray(data.multimedia) ? data.multimedia : [data.multimedia]) : [],
        calificacion: data.calificacion!,
        visibilidad: data.visibilidad || Visibilidad.PUBLICA,
      };

      console.log("FormCrearResenaProducto: Enviando datos a createResenaProducto =", submissionData); // Log para depuración

      const result = await createResenaProducto(submissionData);
      setAlert({ type: result.ok ? "success" : "error", message: result.message });
      if (result.ok) {
        reset();
        onSuccess?.("Reseña procesada exitosamente");
      }
    } catch (error) {
      setAlert({ type: "error", message: (error as Error).message || "Error inesperado." });
    } finally {
      setLoading(false);
    }
  };

  const debouncedSetValue = useMemo(() => debounce(setValue, 300), [setValue]);

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
            {resenaId ? `Editar Reseña de "${productoNombre}"` : `Nueva Reseña de "${productoNombre}"`}
          </h2>
          <div className="relative">
            <Tooltip title="Configurar visibilidad" arrow placement="bottom" enterDelay={300}>
              <span>
                <IconButton
                  onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                  aria-label="Configurar visibilidad"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaCog size={20} />
                </IconButton>
              </span>
            </Tooltip>
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
                            className={`w-full text-left px-4 py-2 text-sm ${
                              field.value === vis
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

        {/* Sección de calificación con estrellas */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Califica el producto</h3>
          <div className="flex justify-center gap-1">
            {[...Array(5)].map((_, index) => {
              const ratingValue = index + 1;
              return (
                <Controller
                  key={index}
                  name="calificacion"
                  control={control}
                  rules={{ required: "La calificación es obligatoria" }}
                  render={({ field }) => (
                    <button
                      type="button"
                      onClick={() => field.onChange(ratingValue)}
                      onMouseEnter={() => setCalificacionHover(ratingValue)}
                      onMouseLeave={() => setCalificacionHover(-1)}
                      className="relative p-1 transition-all duration-200 ease-in-out"
                      aria-label={`Calificar con ${ratingValue} estrellas`}
                    >
                      <FaStar
                        size={32}
                        className={`${
                          ratingValue <= (calificacionHover > 0 ? calificacionHover : calificacion || 0)
                            ? "text-yellow-400"
                            : "text-gray-200"
                        } hover:scale-110 transition-transform duration-200`}
                      />
                    </button>
                  )}
                />
              );
            })}
          </div>
          {errors.calificacion && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="text-red-600 text-sm mt-2 text-center flex items-center justify-center gap-1"
            >
              <span>❌</span>
              {errors.calificacion.message}
            </motion.p>
          )}
        </div>

        {/* Área de multimedia */}
        <div className="p-6 relative">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Agrega fotos o videos (opcional)</h3>
          <AutoUploadMedia
            initialData={[]}
            multiple={true}
            onChange={(urls) => debouncedSetValue("multimedia", urls, { shouldValidate: true })}
            onError={(message) => setAlert({ type: "error", message })}
            onLoading={setLoading}
            mediaType="mixto"
            titulo="Sube evidencia visual de tu reseña"
          />
        </div>

        {/* Área de descripción */}
        <div className="px-6 pt-0 pb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Escribe tu reseña</h3>
          <div className="relative rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] ring-1 ring-gray-200 transition-all">
            <textarea
              {...register("descripcion", {
                required: "La descripción es obligatoria",
                maxLength: { value: 1000, message: "Máximo 1000 caracteres" },
              })}
              placeholder={`¿Qué te gustó o no de "${productoNombre}"? ${
                productoDescripcion ? `(Descripción: ${productoDescripcion.slice(0, 50)}... )` : ""
              }`}
              rows={6}
              className={`
                w-full resize-none rounded-2xl p-5 text-gray-800 placeholder-gray-400 bg-transparent 
                focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200
                ${errors.descripcion ? "ring-2 ring-red-300" : ""}
              `}
              aria-label="Descripción de la reseña"
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
              {descripcion?.length || 0}/1000
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
              backgroundColor: "#ef4444",
              "&:hover": {
                backgroundColor: "#b91c1c",
              },
            }}
            disabled={loading}
            className="font-medium text-sm px-6 py-2 rounded-lg shadow transition-all"
            aria-label="Cancelar reseña"
          >
            Cancelar
          </Button>

          <div className="flex gap-3">
            <IconButton
              onClick={() => setAlert({ type: "info", message: "Vista previa no implementada aún" })}
              disabled={loading}
              className="text-gray-500 hover:bg-gray-100 rounded-full"
              aria-label="Ver vista previa de la reseña"
            >
              <FaEye size={20} />
            </IconButton>
            <Button
              sx={{
                textTransform: "none",
                color: "white",
                "&:hover": {
                  background: "#1f2937",
                },
              }}
              onClick={handleSubmit(onFormSubmit)}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg px-6 py-2 transition-all shadow-md"
              aria-label={resenaId ? "Actualizar reseña" : "Publicar reseña"}
            >
              {loading ? (
                <CircularProgress size={20} className="text-white" />
              ) : resenaId ? (
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
              className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded-xl shadow-md flex items-center gap-2 z-50 ${
                alert.type === "success"
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

export default FormCrearResenaProducto;