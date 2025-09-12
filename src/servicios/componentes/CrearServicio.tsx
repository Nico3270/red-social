"use client";

import { useSession } from "next-auth/react";
import React, { useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Button, CircularProgress, IconButton, Chip, TextField, MenuItem, Select } from "@mui/material";
import { FaTimes, FaCog, FaEye, FaPlus } from "react-icons/fa";
import AutoUploadMedia from "@/ui/components/autoUpload/AutoUploadMedia";
import { Currency, ServicioStatus } from "@prisma/client";
import { createUpdateServicio } from "../actions/createUpdateServicio";
import ServicioViewer from "./ServicioViewer";
import { ServicioData } from "../interfaces/servicios.interface";

// FormData usa string para textarea, split en submit
interface FormData {
  titulo: string;
  descripcion: string; // Single string con \n
  precio?: number;
  currency?: Currency;
  status?: ServicioStatus;
  tags?: string[];
  multimedia?: string[]; // URLs simples en form
}

interface Props {
  servicio?: ServicioData; // Opcional para edición
  onCancel?: () => void;
  onSuccess?: (data?: ServicioData | string) => void; // Union para string o ServicioData
}

const CrearServicio: React.FC<Props> = ({ servicio, onCancel, onSuccess }) => {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      titulo: servicio?.titulo || "",
      descripcion: servicio?.descripcion.join('\n') || "",
      precio: servicio?.precio,
      currency: servicio?.currency || Currency.COP,
      status: servicio?.status || ServicioStatus.disponible,
      tags: servicio?.tags || [],
      multimedia: servicio?.multimedia?.map(item => item.url) || [],
    },
  });

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { data: session } = useSession();
  const negocioId = session?.user?.negocioId;

  // Watch fields for dynamic updates
  const titulo = useWatch({ control, name: "titulo" });
  const descripcionWatch = useWatch({ control, name: "descripcion" });
  const multimedia = useWatch({ control, name: "multimedia" });
  const tags = useWatch({ control, name: "tags" });
  const precio = useWatch({ control, name: "precio" });
  const currencyWatch = useWatch({ control, name: "currency" });
  const status = useWatch({ control, name: "status" });

  useEffect(() => {
    if (servicio) {
      reset({
        titulo: servicio.titulo,
        descripcion: servicio.descripcion.join('\n'),
        precio: servicio.precio,
        currency: servicio.currency,
        status: servicio.status,
        tags: servicio.tags,
        multimedia: servicio.multimedia?.map(item => item.url) || [],
      });
    }
  }, [servicio, reset]);

  const addTag = () => {
    if (tagsInput.trim()) {
      setValue("tags", [...(tags || []), tagsInput.trim()]);
      setTagsInput("");
    }
  };

  const removeTag = (index: number) => {
    setValue("tags", (tags || []).filter((_, i) => i !== index));
  };

  const onFormSubmit = async (data: FormData) => {
    setLoading(true);
    if (!negocioId) {
      setAlert({ type: "error", message: "No estás autenticado o no tienes un negocio asociado." });
      setLoading(false);
      return;
    }

    const parsedDescripcion = data.descripcion
      ? data.descripcion.split(/\n/).filter((p) => p.trim())
      : [];

    const submissionData: ServicioData = {
      titulo: data.titulo,
      descripcion: parsedDescripcion,
      precio: data.precio,
      currency: data.currency,
      status: data.status,
      tags: data.tags,
      multimedia: (data.multimedia || []).map((url, index) => ({ url, orden: index, tipo: url.endsWith('.mp4') || url.endsWith('.mov') ? 'VIDEO' : 'IMAGEN' })),
      negocioId,
      id: servicio?.id,
      negocioSlug: "", // Rellenado en backend
      nombreNegocio: "", // Rellenado en backend
      telefonoNegocio: "", // Rellenado en backend
      negocioFotoPerfil: "", // Rellenado en backend
    };

    console.log({ submissionData });

    const result = await createUpdateServicio(submissionData);
    setAlert({ type: result.ok ? "success" : "error", message: result.message });
    if (result.ok) {
      // Reset completo
      reset({
        titulo: "",
        descripcion: "",
        precio: undefined,
        currency: Currency.COP,
        status: ServicioStatus.disponible,
        tags: [],
        multimedia: [],
      });
      // Manual set for persistent fields
      setValue("tags", []);
      setValue("multimedia", []);
      setValue("precio", undefined);
      setTagsInput("");
      // Si AutoUploadMedia tiene state interno, considera prop reset o callback
      onSuccess?.("Servicio creado/actualizado exitosamente");
    }
    setLoading(false);
  };

  // Generar preview data del form
  const previewData: ServicioData = {
    titulo: titulo || "Título de Prueba",
    descripcion: descripcionWatch ? descripcionWatch.split(/\n/).filter((p) => p.trim()) : [],
    precio: precio,
    currency: currencyWatch,
    status: status,
    tags: tags,
    multimedia: (multimedia || []).map((url, index) => ({ url, orden: index, tipo: url.endsWith('.mp4') || url.endsWith('.mov') ? 'VIDEO' : 'IMAGEN' })),
    negocioId: negocioId || "preview",
    negocioSlug: session?.user?.negocioSlug || "",
    nombreNegocio: "",
    telefonoNegocio:  "",
    negocioFotoPerfil:  "",
    id: servicio?.id,
  };

  if (!session) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-2xl mx-auto p-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-2 shadow-sm">
          <span>❌</span>
          No estás autenticado. Por favor, inicia sesión.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8">
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden relative transition-shadow hover:shadow-md">
        {/* Barra superior */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <IconButton onClick={onCancel} aria-label="Cerrar formulario" className="text-gray-500 hover:text-gray-700">
            <FaTimes size={20} />
          </IconButton>
          <h2 className="text-lg font-medium text-gray-900">
            {servicio?.id ? "Editar Servicio/Experiencia" : "Nuevo Servicio/Experiencia"}
          </h2>
          <div className="relative">
            <IconButton onClick={() => setShowStatusMenu(!showStatusMenu)} aria-label="Configurar status" className="text-gray-500 hover:text-gray-700">
              <FaCog size={20} />
            </IconButton>
            <AnimatePresence>
              {showStatusMenu && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="absolute right-0 mt-2 w-48 bg-white rounded-3xl shadow-md z-10">
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <div className="p-2">
                        {Object.values(ServicioStatus).map((stat) => (
                          <button
                            key={stat}
                            onClick={() => {
                              setValue("status", stat);
                              setShowStatusMenu(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm ${field.value === stat ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50"} rounded-md`}
                          >
                            {stat}
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

        {/* Título */}
        <div className="px-6 py-4">
          <TextField
            {...register("titulo", { required: "El título es obligatorio" })}
            placeholder="Título del servicio o experiencia (e.g., Maquillaje Personalizado)"
            fullWidth
            variant="outlined"
            className="rounded-3xl"
            aria-label="Título del servicio"
            error={!!errors.titulo}
            helperText={errors.titulo?.message}
          />
        </div>

        {/* Área de multimedia */}
        <div className="p-6 relative align-center ">
          <AutoUploadMedia
            key={servicio?.id || (alert?.type === "success" ? Date.now() : "new")}
            initialData={servicio?.multimedia?.map(item => item.url) || []}
            multiple={true}
            onChange={(urls) => {
              const newUrls = (Array.isArray(urls) ? urls : [urls]).filter(Boolean) as string[];
              const current = multimedia || [];

              // Evitar loop si no hay cambios reales
              if (current.length !== newUrls.length || !current.every((v, i) => v === newUrls[i])) {
                setValue("multimedia", newUrls, { shouldValidate: true });
              }
            }}
            onError={(message) => setAlert({ type: "error", message })}
            onLoading={setLoading}
            mediaType="mixto"
          />
        </div>

        {/* Descripción como single textarea */}
        <div className="px-6 pb-4">
          <TextField
            {...register("descripcion")}
            placeholder="Describe el servicio o experiencia... "
            fullWidth
            multiline
            rows={6}
            variant="outlined"
            className="rounded-3xl"
            aria-label="Descripción del servicio"
            error={!!errors.descripcion}
            helperText={errors.descripcion?.message}
          />
        </div>

        {/* Precio y Currency */}
        <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            {...register("precio", { valueAsNumber: true })}
            type="number"
            placeholder="Precio (opcional)"
            fullWidth
            variant="outlined"
            className="rounded-3xl"
            aria-label="Precio del servicio"
          />
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select {...field} fullWidth variant="outlined" className="rounded-3xl">
                {Object.values(Currency).map((curr) => (
                  <MenuItem key={curr} value={curr}>
                    {curr}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </div>

        {/* Tags */}
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <TextField
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Agrega tags (e.g., maquillaje, personalizado)"
              fullWidth
              variant="outlined"
              className="rounded-3xl"
              aria-label="Agregar tags"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            />
            <IconButton onClick={addTag} aria-label="Agregar tag" className="text-gray-500 hover:text-gray-700">
              <FaPlus size={20} />
            </IconButton>
          </div>
          <div className="flex flex-wrap gap-2">
            {(tags || []).map((tag, index) => (
              <Chip key={index} label={tag} onDelete={() => removeTag(index)} color="default" variant="outlined" />
            ))}
          </div>
        </div>

        {/* Barra de acciones inferior */}
        <div className="flex justify-between items-center p-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <Button onClick={onCancel} sx={{ textTransform: "none", color: "gray", backgroundColor: "#f3f3f3", "&:hover": { backgroundColor: "#e0e0e0" } }} disabled={loading} className="font-medium text-sm px-6 py-2 rounded-3xl shadow-sm transition-all" aria-label="Cancelar">
            Cancelar
          </Button>
          <div className="flex gap-3">
            <IconButton onClick={() => setIsPreviewOpen(true)} disabled={loading} className="text-gray-500 hover:bg-gray-100 rounded-full" aria-label="Ver vista previa">
              <FaEye size={20} />
            </IconButton>
            <Button sx={{ textTransform: "none", color: "white" }} onClick={handleSubmit(onFormSubmit)} disabled={loading} className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-3xl px-6 py-2 transition-all shadow-md" aria-label={servicio?.id ? "Actualizar" : "Publicar"}>
              {loading ? <CircularProgress size={20} className="text-white" /> : servicio?.id ? "Actualizar" : "Publicar"}
            </Button>
          </div>
        </div>

        {/* Notificación toast */}
        <AnimatePresence>
          {alert && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className={`fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded-3xl shadow-md flex items-center gap-2 z-50 ${alert.type === "success" ? "bg-green-50 text-green-700" : alert.type === "error" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
              <span>{alert.type === "success" ? "✅" : alert.type === "error" ? "❌" : "ℹ️"}</span>
              {alert.message}
              <button onClick={() => setAlert(null)} className="ml-2 text-sm font-medium hover:underline" aria-label="Cerrar notificación">
                Cerrar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Preview */}
        <AnimatePresence>
          {isPreviewOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
              onClick={() => setIsPreviewOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 50 }}
                transition={{ duration: 0.3 }}
                className="relative w-full max-w-4xl max-h-[80vh] bg-white rounded-3xl shadow-xl overflow-y-auto p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <IconButton onClick={() => setIsPreviewOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                  <FaTimes size={24} />
                </IconButton>
                <ServicioViewer servicio={previewData} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CrearServicio;