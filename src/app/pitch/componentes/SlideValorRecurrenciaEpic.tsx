// components/pitch/SlideValorRecurrencia.tsx
'use client';

import { motion } from "framer-motion";
import Image from "next/image";
import { DollarSign, Sparkles, Repeat } from "lucide-react";

export default function SlideValorRecurrencia() {
  return (
    <section className="relative w-full h-[90vh] bg-black text-white overflow-hidden rounded-3xl flex items-center justify-center">
      
      {/* Fondo real */}
      <Image
        src="/imgs/tendero2.png"
        alt="Negocio real"
        fill
        className="object-cover brightness-75"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/50" />

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-12">

        {/* Flujo visual – compacto y equilibrado */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 mb-12"
        >
          {/* 1. Gratis */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/30 shadow-xl">
              <Sparkles className="w-14 h-14 text-pink-400" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-pink-300">Abren gratis</p>
          </motion.div>

          {/* Flecha */}
          <div className="hidden md:block w-20 h-1 bg-gradient-to-r from-pink-400 to-emerald-400 rounded-full" />

          {/* 2. $10 – el centro */}
          <motion.div
            initial={{ scale: 0.9 }}
            whileInView={{ scale: 1.05 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, type: "spring", stiffness: 120 }}
            className="flex flex-col items-center"
          >
            <div className="w-36 h-36 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-3xl flex flex-col items-center justify-center shadow-2xl ring-8 ring-emerald-400/40 border-4 border-white/40">
              <DollarSign className="w-20 h-20 text-white" />
              <span className="text-5xl font-black text-white -mt-2">$10</span>
            </div>
            <p className="mt-4 text-3xl font-bold text-emerald-300">Cuando venden</p>
          </motion.div>

          {/* Flecha */}
          <div className="hidden md:block w-20 h-1 bg-gradient-to-r from-emerald-400 to-purple-400 rounded-full" />

          {/* 3. Recurrencia */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="flex flex-col items-center"
          >
            <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/30 shadow-xl">
              <Repeat className="w-14 h-14 text-purple-400 animate-pulse" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-purple-300">No se van</p>
          </motion.div>
        </motion.div>

        {/* Mensaje final – impactante pero contenido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="text-center max-w-4xl"
        >
          <h2 className="text-4xl md:text-5xl font-black leading-tight">
            Cobramos <span className="text-emerald-400">solo cuando generamos valor real</span>
          </h2>
          
          <p className="mt-8 text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-emerald-400">
            Y cuando un negocio empieza a vender…
          </p>
          
          <p className="mt-6 text-5xl md:text-7xl font-black text-emerald-400 drop-shadow-lg">
            ¡NO SE VA!
          </p>
        </motion.div>

        {/* Flecha sutil */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.7 }}
          viewport={{ once: true }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-5xl animate-bounce"
        >
          ↓
        </motion.div>
      </div>
    </section>
  );
}