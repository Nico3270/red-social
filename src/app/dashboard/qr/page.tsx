"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import { getNegocioInfo } from "@/qr/getNegocioInfo";
import { QRPersonalizado } from "@/qr/QRPersonalizado";

export default function QRPage() {
  const [qrData, setQrData] = useState<{ url: string; nombre: string; imagen: string } | null>(null);
  const [imagenGenerada, setImagenGenerada] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true); // Inicia en loading para generación auto

  // Generación automática al cargar la página
  useEffect(() => {
    const generarAuto = async () => {
      setLoading(true);
      try {
        const info = await getNegocioInfo();
        const nombre = info.nombre;
        const slug = info.slug;
        const imagen = info.fotoPerfil || "/imgs/perfil-negocio2.png";

        const url = `https://myckeo.com/perfil/${slug}`;
        setQrData({ url, nombre, imagen });

        // Captura automática del componente visible después de render
        setTimeout(async () => {
          if (qrRef.current) {
            const canvas = await html2canvas(qrRef.current, { scale: 2, useCORS: true });
            setImagenGenerada(canvas.toDataURL("image/png"));
          }
        }, 500); // Delay sutil para render completo
      } catch (error) {
        console.error("Error generando QR:", error);
      } finally {
        setLoading(false);
      }
    };

    generarAuto();
  }, []); // Ejecuta solo al mount

  const handleDescargar = () => {
    if (imagenGenerada) {
      const link = document.createElement("a");
      link.href = imagenGenerada;
      link.download = "qr-myckeo.png";
      link.click();
    }
  };

  const handleCompartir = async () => {
    if (imagenGenerada && navigator.share) {
      const response = await fetch(imagenGenerada);
      const blob = await response.blob();
      const file = new File([blob], "qr-myckeo.png", { type: "image/png" });

      await navigator.share({
        title: "Mi QR de Myckeo",
        text: "¡Escanea mi QR para visitar mi perfil!",
        files: [file],
      });
    } else {
      alert("Compartir no soportado en este navegador.");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-4 sm:p-8 bg-white">
      {/* Título posicionado más arriba, con margen superior reducido para balance */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl sm:text-3xl font-bold mt-8 sm:mt-12 mb-2 text-gray-800 text-center"
      >
        Tu QR Personalizado
      </motion.h1>

      {/* Saludo amigable, curioso y conectivo (minimalista, como en redes sociales) */}
      <p className="text-base sm:text-lg text-gray-600 mb-8 text-center max-w-md">
        Comparte este QR con miles de personas y descubre cómo tu negocio gana vistas reales. ¡Es simple, rápido y efectivo para conectar con nuevos clientes!
      </p>

      {loading ? (
        <p className="text-gray-500">Generando tu QR...</p>
      ) : (
        qrData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center w-full max-w-sm"
          >
            {/* Render visible de la tarjeta QR (con ref para captura) */}
            <div ref={qrRef} className="w-full max-w-[400px] mb-6">
              <QRPersonalizado
                url={qrData.url}
                nombreNegocio={qrData.nombre}
                imagenPerfil={qrData.imagen}
              />
            </div>

            {/* Botones de acción (elegantes, minimalistas y responsive) */}
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <button
                onClick={handleDescargar}
                className="px-6 py-3 rounded-full bg-gray-800 text-white font-semibold transition-all duration-300 hover:bg-gray-900 shadow-md w-full sm:w-auto"
              >
                Descargar
              </button>
              <button
                onClick={handleCompartir}
                className="px-6 py-3 rounded-full bg-gray-800 text-white font-semibold transition-all duration-300 hover:bg-gray-900 shadow-md w-full sm:w-auto"
              >
                Compartir
              </button>
            </div>
          </motion.div>
        )
      )}
    </div>
  );
}