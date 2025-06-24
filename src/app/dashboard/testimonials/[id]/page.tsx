
import { getTestimonialById } from "@/principal/actions/testimonialActions";
import ModifyTestimonial from "@/principal/componentes/ModifyTestimonial";

import { notFound } from "next/navigation";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function TestimonialPage({ params }: Props) {
  const { id } = await params;
  const testimonial = await getTestimonialById(id);

  if (!testimonial) {
    notFound(); // Redirige a una página 404 si no se encuentra el testimonio
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <ModifyTestimonial testimonial={testimonial} />
    </div>
  );
}




