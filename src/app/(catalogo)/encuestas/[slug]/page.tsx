import { getPreguntasNegocio } from "@/encuestas/actions/getPreguntasNegocio";
import RespuestaEncuestaNegocio from "@/encuestas/componentes/RespuestaNegocio";
import { TipoPregunta } from "@prisma/client";


// Interfaz actualizada para incluir id (necesario para relaciones)
export interface Pregunta {
    id: string; // Agregado para relacionar en pivot
    texto: string;
    tipo: TipoPregunta;
    creador: "ADMIN";
    requerida: true;
    categoria: string;
}

interface Props {
    params: Promise<
        { slug: string; }>
}

export const dynamic = "force-dynamic";

export default async function CrearEncuestaNegocioPage({ params }: Props) {
    const { slug } = await params;
    // Vamos a obtener las preguntas del negocio
    const preguntasNegocio = await getPreguntasNegocio(slug);
    if (!preguntasNegocio.ok) {
        return <div>Error: {preguntasNegocio.message}</div>;
    }

    const negocioId = preguntasNegocio.negocioId || "";
    const preguntas = preguntasNegocio.preguntas || [];
    const nombreNegocio = preguntasNegocio.nombreNegocio || "Negocio Desconocido";

    if (preguntas.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-600 p-6 bg-white rounded-xl shadow-lg max-w-md">
                    <h2 className="text-xl font-light mb-2">No hay encuesta configurada</h2>
                    <p>Contacta al dueño del negocio para más detalles.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 sm:mt-40">
            <RespuestaEncuestaNegocio preguntas={preguntas} negocioId={negocioId} slug={slug} nombreNegocio={nombreNegocio} />
        </div>
    );
}
