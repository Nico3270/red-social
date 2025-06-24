"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
  TextField,
  Button,
  Modal,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";

import { useRouter } from "next/navigation";

import ModifyTarjetImage from "./ModifyTarjetImage";
import { updateTarjet } from "../actions/quienesSomos";


// Interfaz para recibir el testimonio
interface ModifyTarjetProps {
  tarjet: {
    id: string;
    titulo: string;
    descripcion: string;
    imagen: string;
  };
}

interface TarjetFormData {
  titulo: string;
  descripcion: string;
  imagen?: string;
}


const ModifyTarjet: React.FC<ModifyTarjetProps> = ({ tarjet }) => {
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: tarjet,
  });

  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  // Manejo de envío del formulario
  const onSubmit = async (data: TarjetFormData) => {
    setLoading(true);
    try {
      await updateTarjet({
        id: tarjet.id,
        titulo: data.titulo,
        descripcion: data.descripcion,
        oldImageUrl: data.imagen,
      });
  
      setModalOpen(true);
    } catch (error) {
      console.error("Error al actualizar la tarjeta:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    router.push("/dashboard/quienesSomos"); // Redirige al cerrar el modal
  };

  // Función para manejar la imagen actualizada desde el componente hijo
  const handleImageUpdated = (newImageUrl: string) => {
    setValue("imagen", newImageUrl); // Actualiza el campo imagen en el formulario
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-lg space-y-6"
    >
      <h1 className="text-3xl font-bold text-center">
        Modificar Tarjeta - ¿Quiénes Somos?
      </h1>

      {/* Título */}
      <TextField
        fullWidth
        label="Título"
        {...register("titulo", { required: "El título es obligatorio" })}
      />

      {/* Descripción */}
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Descripción"
        {...register("descripcion", {
          required: "La descripción es obligatoria",
        })}
      />

      {/* Imagen (Usando el nuevo componente) */}
      <ModifyTarjetImage
        tarjetId={tarjet.id}
        initialImageUrl={tarjet.imagen}
        onImageUpdated={handleImageUpdated}
      />

      {/* Botón de Guardar */}
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : "Guardar Cambios"}
      </Button>

      {/* Modal de confirmación */}
      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box className="bg-white p-6 rounded-md max-w-sm mx-auto mt-20 text-center">
          <Typography>¡Tarjeta actualizada con éxito!</Typography>
          <Button
            onClick={handleCloseModal}
            variant="contained"
            className="mt-4"
          >
            Cerrar
          </Button>
        </Box>
      </Modal>
    </form>
  );
};

export default ModifyTarjet;
