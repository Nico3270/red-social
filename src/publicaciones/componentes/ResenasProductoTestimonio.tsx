"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button, Modal, Box } from "@mui/material";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";
import { MultimediaTipo } from "@prisma/client";
import { TituloPrincipal } from "@/ui/components/titulos/Titulos";
import { interFont, sansFont, titleFont, titulo2 } from "@/config/fonts";

interface ResenaProductoTestimonio {
    descripcion?: string;
    usuarioNombre: string;
    mediaUrl?: string;
    mediaTipo: MultimediaTipo;
    fechaCreacion: Date;
}

interface ResenasProductoProps {
    resenas: ResenaProductoTestimonio[];
}


export const ResenasProducto: React.FC<ResenasProductoProps> = ({ resenas }) => {
    const [selectedResena, setSelectedResena] = useState<ResenaProductoTestimonio | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    

    // Inicializar videoRefs con null para cada reseña al montar
    useEffect(() => {
        videoRefs.current = Array(resenas.length).fill(null);
    }, [resenas.length]);

    // Ordenar reseñas por fecha descendente
    const sortedResenas = resenas.sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime());

    if (!resenas || resenas.length === 0) return null; // No mostrar si no hay reseñas

    const truncateText = (text: string | undefined, maxLength: number) =>
        text ? (text.length > maxLength ? text.slice(0, maxLength) + "..." : text) : "";

    const handleOpenModal = (resena: ResenaProductoTestimonio, index: number) => {
        // Pausar el video en la card al abrir el modal
        if (videoRefs.current[index]) {
            videoRefs.current[index]?.pause();
        }
        setSelectedResena(resena);
    };

    const handleCloseModal = () => {
        setSelectedResena(null);
    };

    const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const scrollLeft = () => {
        if (containerRef.current) {
            containerRef.current.scrollBy({ left: -600, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (containerRef.current) {
            containerRef.current.scrollBy({ left: 600, behavior: "smooth" });
        }
    };

    return (
        <div className="w-full py-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Reseñas</h2>
            <div className="relative">
                <div ref={containerRef} className="overflow-x-auto scrollbar-hide flex space-x-4 p-2 snap-x scroll-smooth w-full">
                    {sortedResenas.map((resena, index) => {
                        const hasMedia = !!resena.mediaUrl;
                        const isImage = resena.mediaTipo === MultimediaTipo.IMAGEN;
                        const isVideo = resena.mediaTipo === MultimediaTipo.VIDEO;

                        return (
                            <div
                                key={index}
                                className="relative bg-white border-2 border-gray-100 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 flex flex-col justify-between h-[500px] min-w-[360px] max-w-lg"
                                onClick={() => handleOpenModal(resena, index)}
                            >
                                <div className="flex flex-col h-full">
                                    {hasMedia ? (
                                        <div className="w-full h-full sm:h-80 overflow-hidden rounded-md">
                                            {isImage ? (
                                                <img src={resena.mediaUrl} alt="Reseña" className="w-full h-full object-cover" />
                                            ) : isVideo ? (
                                                <video
                                                    ref={(el) => {
                                                        videoRefs.current[index] = el;
                                                    }}
                                                    src={resena.mediaUrl}
                                                    className="w-full h-80 object-cover"
                                                    controls={false}
                                                />
                                            ) : null}
                                        </div>
                                    ) : (
                                        <div className="w-full h-72 flex items-center justify-center">
                                            <p className="text-4xl font-serif text-gray-800 text-center font-medium italic shadow-sm">
                                                {truncateText(resena.descripcion, 200) || "Sin descripción"}
                                            </p>
                                        </div>
                                    )}
                                    <div className="mt-4 flex-grow">
                                        {hasMedia && (
                                            <p className={`text-lg sm:text-xl text-gray-600 ${sansFont.className}`}>{truncateText(resena.descripcion, 150)}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <p className="text-xl font-semibold text-gray-900">{resena.usuarioNombre}</p>
                                    <p className="text-md text-gray-500">{formatDate(resena.fechaCreacion)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={scrollLeft}
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-blue-800 text-white hover:bg-white hover:text-blue-800 shadow-md rounded-full p-2 hidden lg:block"
                >
                    <MdKeyboardArrowLeft size={36} />
                </button>
                <button
                    onClick={scrollRight}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-blue-800 text-white hover:bg-white hover:text-blue-800 shadow-md rounded-full p-2 hidden lg:block"
                >
                    <MdKeyboardArrowRight size={36} />
                </button>
            </div>

            <Modal open={!!selectedResena} onClose={handleCloseModal}>
                <Box
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: { xs: "90%", sm: "80%", md: "70%" },
                        maxHeight: { xs: "90vh", md: "600px" }, // Limitar alto en pantallas grandes
                        bgcolor: "background.paper",
                        boxShadow: 24,
                        p: 4,
                        borderRadius: 2,
                        overflowY: "auto", // Scroll si el contenido excede
                    }}
                >
                    {selectedResena && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Reseña de {selectedResena.usuarioNombre}</h2>
                            {selectedResena.mediaUrl && (
                                <div className="mb-4">
                                    {selectedResena.mediaTipo === MultimediaTipo.IMAGEN ? (
                                        <img
                                            src={selectedResena.mediaUrl}
                                            alt="Reseña completa"
                                            className="w-full max-h-[400px] md:max-h-[500px] object-contain rounded-md mx-auto"
                                        />

                                    ) : (
                                        <video
                                            src={selectedResena.mediaUrl}
                                            className="w-full max-h-[400px] md:max-h-[500px] object-contain rounded-md mx-auto"
                                            controls
                                            autoPlay
                                        />
                                    )}
                                </div>
                            )}
                            <p className={`text-gray-700 ${sansFont.className}`}>{selectedResena.descripcion || "Sin descripción"}</p>
                            <p className="text-sm text-gray-500 mt-2">{formatDate(selectedResena.fechaCreacion)}</p>
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={handleCloseModal}
                                className="mt-4 border-[#274494] text-[#274494] hover:bg-gray-50"
                            >
                                Cerrar
                            </Button>
                        </div>
                    )}
                </Box>
            </Modal>
        </div>
    );
};