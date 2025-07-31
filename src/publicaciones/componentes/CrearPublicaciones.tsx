"use client"

import React, { useState } from 'react';
import { ModalPublicaciones } from './ModalPublicaciones';
import FormCrearCarruselImagenes from './Form_Carrusel_Imagenes';
import { TestimonioCrearEditar } from "@/publicaciones/componentes/TestimonioCrearEditar";
import { useSession } from 'next-auth/react';
import { PublicacionTipo } from '@prisma/client';
import { PlusCircle, Image, Star } from 'lucide-react';

type ContextoPublicacion = "producto" | "negocio" | "usuario";

interface InformacionPublicacion {
    usuarioId?: string;
    negocioId?: string;
    publicacionId?: string;
    productoId?: string;
    tipo: PublicacionTipo;
    contexto: ContextoPublicacion;
    descripcion?: string;
    multimedia?: string[];
    productos?: { id: string; nombre: string }[];
}

interface Props {
    infoInicialProducto?: InformacionPublicacion;
}

export const CrearPublicacionesNegocio = ({ infoInicialProducto }: Props) => {
    const [isModalCarruselOpen, setIsModalCarruselOpen] = useState(false);
    const [isModalTestimonioOpen, setIsModalTestimonioOpen] = useState(false);
    const { data: session } = useSession();
    const userId = session?.user?.id;

    return (
        <div className="w-full max-w-2xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <PlusCircle className="w-6 h-6 text-indigo-600" />
                    Crear Nueva Publicación
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Botón para Carrusel de Imágenes */}
                    <button
                        className="group flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium py-4 px-6 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                        onClick={() => setIsModalCarruselOpen(true)}
                    >
                        <Image className="w-5 h-5 group-hover:animate-pulse" />
                        Publicar Carrusel
                    </button>

                    {/* Botón para Testimonio */}
                    <button
                        className="group flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium py-4 px-6 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                        onClick={() => setIsModalTestimonioOpen(true)}
                    >
                        <Star className="w-5 h-5 group-hover:animate-pulse" />
                        Publicar Testimonio
                    </button>
                </div>

                {/* Modal para Carrusel */}
                {isModalCarruselOpen && (
                    <ModalPublicaciones
                        onClose={() => setIsModalCarruselOpen(false)}
                        userId={userId}
                    >
                        <div className="animate-fade-in">
                            <FormCrearCarruselImagenes />
                        </div>
                    </ModalPublicaciones>
                )}

                {/* Modal para Testimonio */}
                {isModalTestimonioOpen && (
                    <ModalPublicaciones
                        onClose={() => setIsModalTestimonioOpen(false)}
                        userId={userId}
                    >
                        <div className="animate-fade-in">
                            <TestimonioCrearEditar
                                infoPublicacion={infoInicialProducto}
                                productos={infoInicialProducto?.productos}
                            />
                        </div>
                    </ModalPublicaciones>
                )}
            </div>

            {/* Custom CSS for animations */}
            <style jsx>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};