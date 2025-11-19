// components/pitch/SlideLanzamientoColombia.tsx
'use client';

import { motion } from "framer-motion";
import Image from "next/image";
import {  Users, Megaphone, Sparkles, ArrowRight } from "lucide-react";

export default function SlideLanzamientoColombia() {
  return (
    <section className="relative w-full h-[100vh] bg-gradient-to-br from-orange-900 via-red-900 to-pink-900 overflow-hidden rounded-3xl flex items-center justify-center">

      {/* Fondo real Colombia – reemplaza con tu foto favorita */}
      <Image
        src="/imgs/plaza.png"   // ← Bogotá, Medellín, calle comercial, bandera, etc.
        alt="Lanzamiento en Colombia"
        fill
        className="object-cover brightness-70"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />

      <div className="relative z-10 max-w-7xl mx-auto px-8">

        {/* Título – potente y centrado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-5xl md:text-7xl font-black text-white">
            Iniciamos en
            <span className="block text-yellow-400 mt-2 text-6xl md:text-8xl">Colombia</span>
          </h2>
        </motion.div>

        {/* Estadística clave – gigante */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, type: "spring" }}
          className="text-center mb-12"
        >
          <p className="text-8xl md:text-9xl font-black text-red-400 drop-shadow-2xl">
            70%
          </p>
          <p className="text-3xl md:text-5xl font-bold text-white mt-4">
            de negocios sin vitrina digital
          </p>
        </motion.div>

        {/* Estrategia – flujo horizontal compacto */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12"
        >
          {/* Paso 1 */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-24 h-24 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center border border-white/30 shadow-xl mb-4">
              <Megaphone className="w-14 h-14 text-orange-400" />
            </div>
            <p className="text-xl md:text-2xl font-bold text-orange-300">Redes sociales</p>
          </motion.div>

          <ArrowRight className="w-12 h-12 text-yellow-400 hidden md:block" />

          {/* Paso 2 */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-24 h-24 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center border border-white/30 shadow-xl mb-4">
              <Sparkles className="w-14 h-14 text-yellow-400" />
            </div>
            <p className="text-xl md:text-2xl font-bold text-yellow-300">Contenido orgánico</p>
          </motion.div>

          <ArrowRight className="w-12 h-12 text-yellow-400 hidden md:block" />

          {/* Paso 3 */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-24 h-24 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center border border-white/30 shadow-xl mb-4">
              <Users className="w-14 h-14 text-pink-400" />
            </div>
            <p className="text-xl md:text-2xl font-bold text-pink-300">Construimos comunidad</p>
          </motion.div>
        </motion.div>

        {/* Cierre épico */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.8, type: "spring" }}
          className="text-center mt-12"
        >
          <p className="text-3xl md:text-6xl font-black text-white">
            Llenamos el centro comercial digital
          </p>
          <p className="text-5xl md:text-7xl font-black text-yellow-400 mt-4 drop-shadow-2xl">
            desde la primeras semanas
          </p>
        </motion.div>

        {/* Flecha siguiente */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.7 }}
          viewport={{ once: true }}
          transition={{ delay: 2.4 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-6xl animate-bounce"
        >
          ↓
        </motion.div>
      </div>
    </section>
  );
}