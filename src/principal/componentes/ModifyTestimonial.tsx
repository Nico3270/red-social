"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { TextField, Button, Modal, Box, Typography, CircularProgress } from "@mui/material";

import ModifyTestimonialImage from "./ModifyTestimonialImage";
import { useRouter } from "next/navigation";
import { updateTestimonial } from "../actions/testimonialActions";

interface ModifyTestimonialProps {
  testimonial: {
    id: string;
    titulo: string;
    descripcion: string;
    imagen: string;
  };
}

interface TestimonialForm {
  titulo: string;
  descripcion: string;
  imagen: string;
}

const ModifyTestimonial: React.FC<ModifyTestimonialProps> = ({ testimonial }) => {
  const { register, handleSubmit, setValue } = useForm<TestimonialForm>({
    defaultValues: testimonial,
  });

  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  // Manejo de envío del formulario
  const onSubmit = async (data: TestimonialForm) => {
    setLoading(true);
    try {
      // Actualiza el testimonio con los datos
      await updateTestimonial(testimonial.id, {
        titulo: data.titulo,
        descripcion: data.descripcion,
        imagen: data.imagen,  // La imagen actualizada la maneja ModifyTestimonialImage
      });

      setModalOpen(true);
    } catch (error) {
      console.error("Error al actualizar el testimonio:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    router.push("/dashboard/testimonials"); // Redirigir al cerrar el modal
  };

  // Función para manejar la imagen actualizada desde el componente hijo
  const handleImageUpdated = (newImageUrl: string) => {
    setValue("imagen", newImageUrl);  // Actualiza el valor en el formulario
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-lg space-y-6"
    >
      <h1 className="text-3xl font-bold text-center">Modificar Testimonio</h1>

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
        {...register("descripcion", { required: "La descripción es obligatoria" })}
      />

      {/* Imagen (Usando el nuevo componente) */}
      <ModifyTestimonialImage
        testimonialId={testimonial.id}
        initialImageUrl={testimonial.imagen}
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
          <Typography>¡Testimonio actualizado con éxito!</Typography>
          <Button onClick={handleCloseModal} variant="contained" className="mt-4">
            Cerrar
          </Button>
        </Box>
      </Modal>
    </form>
  );
};

export default ModifyTestimonial;
