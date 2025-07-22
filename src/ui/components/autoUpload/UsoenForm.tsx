"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Alert, TextField, Button, FormControl, FormLabel, CircularProgress } from "@mui/material";
import { PublicacionTipo } from "@prisma/client";
import { TituloPrincipal } from "@/ui/components/titulos/Titulos";
import AutoUploadMedia from "./AutoUploadMedia";
import { createUpdateTestimonio } from "@/publicaciones/actions/createUpdateTestimonio";


export type ContextoPublicacion = "producto" | "negocio" | "usuario";

interface InformacionPublicacion {
  usuarioId?: string;
  publicacionId?: string;
  productoId: string;
  tipo: PublicacionTipo;
  contexto: ContextoPublicacion;
  nombreProducto: string;
  imagenProducto: string;
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
  onSuccess?: () => void;
}

export const TestimonioProductoCrearEditar = ({ infoPublicacion, onCancel, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormDataPublicacion>({
    defaultValues: {
      descripcion: infoPublicacion?.descripcion || "",
      multimedia: infoPublicacion?.multimedia || undefined,
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
        multimedia: infoPublicacion.multimedia || undefined,
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
      productoId: infoPublicacion?.productoId || "",
      tipo: infoPublicacion?.tipo || PublicacionTipo.TESTIMONIO,
      contexto: infoPublicacion?.contexto || "producto",
      descripcion: data.descripcion || "",
      multimedia: data.multimedia ? (Array.isArray(data.multimedia) ? data.multimedia : [data.multimedia]) : [],
      publicacionId: infoPublicacion?.publicacionId,
      nombreProducto: infoPublicacion?.nombreProducto || "",
      imagenProducto: infoPublicacion?.imagenProducto || "",
    };

    if (submissionData.contexto === "producto" && !submissionData.productoId) {
      setAlert({ type: "error", message: "Debes seleccionar un producto en este contexto." });
      setLoading(false);
      return;
    }

    const result = await createUpdateTestimonio(submissionData);
    setAlert({ type: result.ok ? "success" : "error", message: result.message });
    if (result.ok) {
      reset();
      if (onSuccess) onSuccess();
    }
    setLoading(false);
  };

  if (!session) {
    return <Alert severity="error">No estás autenticado. Por favor, inicia sesión.</Alert>;
  }

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
        initialData={infoPublicacion?.multimedia}
        onChange={(urls) => setValue("multimedia", urls, { shouldValidate: true })}
        onError={(message) => setAlert({ type: "error", message })}
        onLoading={setLoading}
        multiple={false} // Cambiar a true para permitir múltiples archivos
      />

      <div className="mt-6">
        <FormControl fullWidth className="mb-6">
          <FormLabel className="text-gray-700 font-medium mb-2">¿Qué tienes en mente?</FormLabel>
          <TextField
            {...register("descripcion", { required: "La descripción es obligatoria" })}
            multiline
            placeholder="Comparte tu historia o pensamientos..."
            rows={4}
            variant="outlined"
            className="bg-white rounded-lg border border-gray-200 focus-within:border-blue-500 transition-all"
            error={!!errors.descripcion}
            helperText={errors.descripcion?.message}
          />
        </FormControl>
      </div>

      <div className="mt-6 flex justify-between items-center">
        <Button
          sx={{ textTransform: "none" }}
          type="button"
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
          className="text-blue-600 border-blue-600 hover:bg-blue-50 rounded-lg px-6 py-2 transition-all"
        >
          Cancelar
        </Button>
        <Button
          sx={{ textTransform: "none" }}
          type="submit"
          variant="contained"
          color="primary"
          onClick={handleSubmit(onFormSubmit)}
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 rounded-lg px-6 py-2 transition-all shadow-md"
        >
          {loading ? <CircularProgress size={24} /> : infoPublicacion?.publicacionId ? "Actualizar" : "Publicar"}
        </Button>
      </div>
    </div>
  );
};