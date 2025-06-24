"use client";


import { titulosPrincipales } from "@/config/fonts";
import { CarruselSections} from "./CarruselSections";
import RedesSocialesContact from "./RedesSocialesContact";
import Testimonials from "./Testimonials";

interface Section {
  titulo: string;
  descripcion: string;
  imagen: string;
  url: string;
}

// Interfaz para testimonios
interface Testimonial {
  imagen: string;
  titulo: string;
  descripcion: string;
}

interface PrincipalSectionProps {
  testimonios: Testimonial[];
  secciones: Section[];
}
const PrincipalSection : React.FC<PrincipalSectionProps> = ({ testimonios, secciones }) => {
  return (
    <section className="container mx-auto px-1">
      <h1 className={`text-4xl font-bold text-center color-titulo-tarjeta mb-4 mt-2 ${titulosPrincipales.className}`}>
        Somos Detalles Sorpresas y Regalos
      </h1>
     

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
        {/* Carrusel */}
        <div className="lg:col-span-2 bg-gradient-to-b from-[#FBFBFB] to-[#FBFBFB] p-1 mt-5">
          
          <CarruselSections secciones={secciones} />
        </div>

        {/* Columnas para redes sociales y testimonios */}
        <div className="flex flex-col gap-4">
          {/* Caja superior: Redes Sociales e Información de Contacto */}
          <div className="flex-1 bg-gradient-to-b from-[#FBFBFB] to-[#FBFBFB] flex items-center justify-center p-1">
            
            <RedesSocialesContact />
          </div>

          {/* Caja inferior: Testimonios */}
          <div className="flex-1 bg-gradient-to-b from-[#FBFBFB] to-[#FBFBFB] flex items-center justify-center p-1">
            
            <Testimonials testimonios={testimonios} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrincipalSection;
