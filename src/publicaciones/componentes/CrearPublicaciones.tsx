"use client"

import React, { useState } from 'react'
import { ModalPublicaciones } from './ModalPublicaciones';
import FormCrearCarruselImagenes from './Form_Carrusel_Imagenes';
import { useSession } from 'next-auth/react';
import { TestimonioCrearEditar } from "@/publicaciones/componentes/TestimonioCrearEditar";
import { PublicacionTipo } from '@prisma/client';

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
    infoInicialProducto?: InformacionPublicacion
}

export const CrearPublicacionesNegocio = ({ infoInicialProducto }: Props) => {
    const [isModalCarruselOpen, setIsModalCarruselOpen] = useState(false);
    const [isModalTestimonioOpen, setIsModalTestimonioOpen] = useState(false);
    const { data: session } = useSession();
    const userId = session?.user?.id;


    return (
        <div className='w-full '>
            <button
                className="flex items-center justify-center gap-2 bg-[#274494] hover:bg-[#2c5282] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all"
                onClick={() => setIsModalCarruselOpen(true)}
            >Botón para abrir modal carrusel</button>
            {
                isModalCarruselOpen && (
                    <ModalPublicaciones
                        onClose={() => setIsModalCarruselOpen(false)}
                        userId={userId}
                    >
                        <FormCrearCarruselImagenes />
                    </ModalPublicaciones>
                )
            };

            <button
                className="flex items-center justify-center gap-2 bg-[#274494] hover:bg-[#2c5282] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all"
                onClick={() => setIsModalTestimonioOpen(true)}
            >Botón para abrir modal Testimonio</button>
            {
                isModalTestimonioOpen && (
                    <ModalPublicaciones
                        onClose={() => setIsModalTestimonioOpen(false)} // ✅ Esto sí cierra el modal correcto
                        userId={userId}
                    >
                        <TestimonioCrearEditar
                            infoPublicacion={infoInicialProducto}
                            productos={infoInicialProducto?.productos}
                        />
                    </ModalPublicaciones>
                )
            }

        </div >
    )
}
