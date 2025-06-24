import { getTarjets } from "@/secondary/actions/quienesSomos";
import NewTarjet from "@/secondary/componentes/NewTarjetQuienesSomos";

export const dynamic = "force-dynamic";

export default async function QuienesSomosPage() {
  const tarjetas = await getTarjets();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-4xl font-bold text-center text-[#D91656]">
        Administración - ¿Quiénes Somos?
      </h1>

      <section>
        <NewTarjet initialTarjets={tarjetas} />  {/* 👈 Pasa las tarjetas iniciales */}
      </section>
    </main>
  );
}
