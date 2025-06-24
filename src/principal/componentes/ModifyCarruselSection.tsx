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

import { updateCarruselSection } from "../actions/carruselPrincipalActions";
import ModifyCarruselImage from "./ModifyCarruselImage";


// Interfaz para recibir la sección del carrusel
interface ModifyCarruselSectionProps {
  section: {
    id: string;
    titulo: string;
    descripcion: string;
    imagen: string;
    url: string;
  };
}


interface CarruselSectionForm {
  titulo: string;
  descripcion: string;
  url: string;
  imagen: string;
}


const ModifyCarruselSection: React.FC<ModifyCarruselSectionProps> = ({
  section,
}) => {
  const { register, handleSubmit, setValue } = useForm<CarruselSectionForm>({
    defaultValues: section,
  });

  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  // Manejo de envío del formulario
  const onSubmit = async (data: CarruselSectionForm) => {
    setLoading(true);
    try {
      await updateCarruselSection(
        section.id,
        {
          titulo: data.titulo,
          descripcion: data.descripcion,
          url: data.url,
        },
        undefined,  // No hay nueva imagen
        data.imagen  // Imagen anterior
      );
  
      setModalOpen(true);
    } catch (error) {
      console.error("Error al actualizar la sección del carrusel:", error);
    } finally {
      setLoading(false);
    }
  };
  

  const handleCloseModal = () => {
    setModalOpen(false);
    router.push("/dashboard/seccionesCarrusel");  // Redirige a la lista de secciones
  };

  // Actualizar imagen desde el componente hijo
  const handleImageUpdated = (newImageUrl: string) => {
    setValue("imagen", newImageUrl);  // Actualiza el campo imagen en el formulario
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-lg space-y-6"
    >
      <h1 className="text-3xl font-bold text-center">
        Modificar Sección del Carrusel
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

      {/* URL */}
      <TextField
        fullWidth
        label="URL de Destino"
        {...register("url", { required: "El URL es obligatorio" })}
      />

      {/* Imagen (Usando el nuevo componente) */}
      <ModifyCarruselImage
        sectionId={section.id}
        initialImageUrl={section.imagen}
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
          <Typography>¡Sección del carrusel actualizada con éxito!</Typography>
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

export default ModifyCarruselSection;
