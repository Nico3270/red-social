

import { getCarruselSections } from "@/principal/actions/carruselPrincipalActions";
import NewCarruselSection from "@/principal/componentes/NewCarruselSection";

export const dynamic = "force-dynamic";

export default async function SeccionesCarruselPage() {
  const secciones = await getCarruselSections();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-4xl font-bold text-center text-[#D91656]">
        Administración - Secciones del Carrusel
      </h1>

      <section>
        <NewCarruselSection initialSections={secciones} />  {/* 👈 Pasa las secciones iniciales */}
      </section>
    </main>
  );
}
