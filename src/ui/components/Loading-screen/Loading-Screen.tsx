"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { SeccionesFont } from "@/config/fonts";

interface LoadingScreenProps {
  isLoading: boolean;
  imageUrl?: string;
  message?: string;
}

export default function LoadingScreen({
  isLoading,
  imageUrl = "https://res.cloudinary.com/dkfsejtx9/image/upload/v1741196902/magicSurprise_images/Bienvenida_ixf7k2.png",
  message = " Bienvenido a MagiSurprise Tunja",
}: LoadingScreenProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loading-screen"
          className="absolute inset-0 flex flex-col justify-center items-center bg-white z-50"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <div className="relative w-64 h-64">
            <Image
              src={imageUrl}
              alt="Cargando..."
              fill
              className="object-contain"
            />
          </div>
          <p className={`mt-4 text-center color-principal text-2xl font-semibold ${SeccionesFont.className}`}>{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
