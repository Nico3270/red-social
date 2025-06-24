import React from "react";
import { getTestimonials } from "@/principal/actions/testimonialActions";
import NewTestimonial from "@/principal/componentes/NewTestimonial";
export const dynamic = "force-dynamic"; // Asegura que la acción no use caché

const TestimonialsPage = async () => {
  // Obtener testimonios desde la base de datos
  const testimoniosIniciales = await getTestimonials();

  return (
    <section className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-[#D91656] text-center">Gestionar Testimonios</h1>
      
      {/* Formulario y Listado en un solo componente */}
      <NewTestimonial initialTestimonials={testimoniosIniciales} />
    </section>
  );
};

export default TestimonialsPage;
