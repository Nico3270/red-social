"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Alert,
  TextField,
  Button,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { PublicacionTipo } from "@prisma/client";
import { TituloPrincipal } from "@/ui/components/titulos/Titulos";
import { createUpdateTestimonio } from "../actions/createUpdateTestimonio";
import AutoUploadMedia from "@/ui/components/autoUpload/AutoUploadMedia";

export type ContextoPublicacion = "producto" | "negocio" | "usuario";

interface InformacionPublicacion {
  usuarioId?: string;
  negocioId?: string;
  publicacionId?: string;
  productoId?: string;
  tipo: PublicacionTipo;
  contexto: ContextoPublicacion;
  descripcion?: string;
  multimedia?: string[];
}

interface FormDataPublicacion {
  descripcion?: string;
  multimedia?: string | string[] | undefined;
  productoId?: string;
}

interface Props {
  infoPublicacion?: InformacionPublicacion;
  onCancel?: () => void;
  productos?: { id: string; nombre: string }[];
  onClose?: () => void;
  onSuccess?: (message?: string) => void;
}

export const TestimonioCrearEditar = ({ infoPublicacion, onCancel, productos, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormDataPublicacion>({
    defaultValues: {
      descripcion: infoPublicacion?.descripcion || "",
      multimedia: infoPublicacion?.multimedia?.[0] || undefined,
      productoId: infoPublicacion?.productoId || "",
    },
  });

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (infoPublicacion) {
      reset({
        descripcion: infoPublicacion.descripcion || "",
        multimedia: infoPublicacion.multimedia?.[0] || undefined,
        productoId: infoPublicacion.productoId || "",
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
      productoId: data.productoId,
      tipo: infoPublicacion?.tipo || PublicacionTipo.TESTIMONIO,
      contexto: infoPublicacion?.contexto || "usuario",
      descripcion: data.descripcion || "",
      multimedia: data.multimedia ? (Array.isArray(data.multimedia) ? data.multimedia : [data.multimedia]) : [],
      publicacionId: infoPublicacion?.publicacionId,
    };

    console.log({ submissionData });



    if (submissionData.contexto === "producto" && !submissionData.productoId) {
      setAlert({ type: "error", message: "Debes seleccionar un producto en este contexto." });
      setLoading(false);
      return;
    }
    if (submissionData.contexto === "negocio" && !submissionData.negocioId) {
      setAlert({ type: "error", message: "Falta el negocioId en este contexto." });
      setLoading(false);
      return;
    }

    const result = await createUpdateTestimonio(submissionData);
    setAlert({ type: result.ok ? "success" : "error", message: result.message });
    if (result.ok) {
      reset();
      onSuccess?.("Publicación creada exitosamente");
    }
    setLoading(false);
  };

  if (!session) {
    return <Alert severity="error">No estás autenticado. Por favor, inicia sesión.</Alert>;
  }

  // Variable bandera para decirle al componente que reciba uno o varios archivos
  const multiple = false;
  const dataEntrada = infoPublicacion?.multimedia

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg shadow-lg max-w-3xl mx-auto">
      <TituloPrincipal children={infoPublicacion?.publicacionId ? "Editar Testimonio" : "Crear Testimonio"} />

      {alert && (
        <Alert
          severity={alert.type}
          className="mb-6 rounded-lg"
          onClose={() => setAlert(null)}
          icon={alert.type === "success" ? <span>✅</span> : alert.type === "error" ? <span>❌</span> : <span>ℹ️</span>}
        >
          {alert.message}
        </Alert>
      )}


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
        multiple={multiple}
        onChange={(urls) => setValue("multimedia", urls, { shouldValidate: true })}
        onError={(message) => setAlert({ type: "error", message })}
        onLoading={setLoading}
        mediaType="mixto"
      />

      <div className="mt-6">
        <FormControl fullWidth className="mb-6">
          <FormLabel className="text-gray-700 font-medium mb-2">
            ¿Qué tienes en mente?
          </FormLabel>
          <TextField
            {...register("descripcion", {
              required: "La descripción es obligatoria",
              maxLength: { value: 280, message: "Máximo 280 caracteres" },
            })}
            multiline
            rows={4}
            placeholder="Escribe una descripción elegante y clara..."
            variant="outlined"
            error={!!errors.descripcion}
            helperText={errors.descripcion?.message}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "white",
                borderRadius: "16px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                padding: "8px 12px",
                "&.Mui-focused fieldset": {
                  borderColor: "#3B82F6", // Azul
                  borderWidth: 2,
                },
                "& fieldset": {
                  borderColor: "#E5E7EB", // gris suave
                },
              },
              "& .MuiInputBase-input": {
                color: "#1F2937", // texto gris oscuro
              },
              "& .MuiFormHelperText-root": {
                marginLeft: "4px",
              },
            }}
          />
          <div className="text-right text-xs text-gray-400 mt-2">
            {watch("descripcion")?.length || 0}/280
          </div>
        </FormControl>


        {infoPublicacion?.contexto === "negocio" && productos && (
          <div className="mb-6">
            <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg mb-4 text-sm font-medium shadow-sm">
              ¿Quieres mencionar un producto en esta publicación?
            </div>

            <Controller
              name="productoId"
              control={control}
              defaultValue={infoPublicacion?.productoId || ""}
              render={({ field }) => (
                <div className="relative">
                  <label className="block text-gray-700 font-medium mb-2 ml-1">
                    Producto relacionado (opcional)
                  </label>
                  <Select
                    {...field}
                    displayEmpty
                    variant="outlined"
                    fullWidth
                    sx={{
                      backgroundColor: "white",
                      borderRadius: "16px",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#E5E7EB",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#A5B4FC", // hover azul claro
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#3B82F6", // azul fuerte al focus
                        borderWidth: "2px",
                      },
                      "& .MuiSelect-select": {
                        padding: "12px",
                        fontSize: "0.95rem",
                        color: "#1F2937",
                      },
                    }}
                    renderValue={(selected) => {
                      if (!selected)
                        return (
                          <span className="text-gray-400">
                            Selecciona un producto (opcional)
                          </span>
                        );
                      const producto = productos.find((p) => p.id === selected);
                      return producto ? producto.nombre : "Producto no encontrado";
                    }}
                  >
                    <MenuItem value="" disabled className="text-gray-400">
                      Selecciona un producto
                    </MenuItem>
                    {productos.map((producto) => (
                      <MenuItem
                        key={producto.id}
                        value={producto.id}
                        className="hover:bg-gray-100"
                      >
                        {producto.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </div>
              )}
            />
            {errors.productoId && (
              <p className="text-red-600 text-sm mt-2 ml-1 flex items-center gap-1">
                <span>❌</span> {errors.productoId.message}
              </p>
            )}
          </div>
        )}

      </div>

      <div className="mt-8 flex justify-end gap-4">
        <Button
          type="button"
          onClick={onCancel}
          disabled={loading}
          sx={{ textTransform: "none" }}
          className={`
      px-6 py-2 rounded-xl text-sm font-medium
      border border-blue-600 text-blue-600
      bg-white hover:bg-blue-50 transition-all duration-200
      disabled:opacity-50 disabled:cursor-not-allowed
    `}
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          onClick={handleSubmit(onFormSubmit)}
          disabled={loading}
          color="inherit"
          sx={{ textTransform: "none", color: "white !important" }}
          className={`
    px-6 py-2 rounded-xl text-sm font-medium
    bg-gradient-to-r from-blue-500 to-indigo-600
    hover:bg-gray-800 hover:from-gray-800 hover:to-gray-800 shadow-md
    transition-all duration-200
    disabled:opacity-60 disabled:cursor-not-allowed
  `}
        >
          {loading ? (
            <CircularProgress size={20} className="text-white" />
          ) : infoPublicacion?.publicacionId ? "Actualizar" : "Publicar"}
        </Button>


      </div>

    </div>
  );
};