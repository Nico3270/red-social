// components/pitch/SlideCirculoVirtuoso.tsx
'use client';

import { motion } from "framer-motion";
import Image from "next/image";
import { Store, ShoppingBag,  Users, ArrowRight, Sparkles } from "lucide-react";

export default function SlideCirculoVirtuoso() {
  return (
    <section className="relative w-full h-[100vh] bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 overflow-hidden rounded-3xl flex items-center justify-center">

      {/* Fondo real – mercado lleno, gente comprando, tenderos felices */}
      <Image
        src="/imgs/plaza 2.png"   // ← mercado lleno, gente comprando, energía positiva
        alt="Círculo virtuoso Myckeo"
        fill
        className="object-cover brightness-70"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />

      <div className="relative z-10 max-w-7xl mx-auto px-8">

        {/* Título – impactante */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-5xl md:text-7xl font-black text-white mb-12"
        >
          Un círculo
          <span className="block text-emerald-400 mt-2">poderoso</span>
        </motion.h2>

        {/* Círculo virtuoso – 4 pasos en forma de anillo (compacto y visual) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="relative w-full max-w-3xl mx-auto"
        >
          {/* Anillo decorativo sutil */}
          <div className="absolute inset-0 -m-8 rounded-full border-4 border-emerald-400/30 blur-xl" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0">

            {/* 1. Negocios */}
            <motion.div
              initial={{ opacity: 0, rotate: -20 }}
              whileInView={{ opacity: 1, rotate: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 bg-emerald-500/20 backdrop-blur rounded-full flex items-center justify-center border-2 border-emerald-400 shadow-xl mb-4">
                <Store className="w-14 h-14 text-emerald-400" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-emerald-300">+ Negocios</p>
            </motion.div>

            {/* 2. Productos */}
            <motion.div
              initial={{ opacity: 0, rotate: 20 }}
              whileInView={{ opacity: 1, rotate: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 bg-cyan-500/20 backdrop-blur rounded-full flex items-center justify-center border-2 border-cyan-400 shadow-xl mb-4">
                <ShoppingBag className="w-14 h-14 text-cyan-400" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-cyan-300">+ Productos</p>
            </motion.div>

            {/* 3. Usuarios */}
            <motion.div
              initial={{ opacity: 0, rotate: -20 }}
              whileInView={{ opacity: 1, rotate: 0 }}
              transition={{ delay: 1.0 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 bg-purple-500/20 backdrop-blur rounded-full flex items-center justify-center border-2 border-purple-400 shadow-xl mb-4">
                <Users className="w-14 h-14 text-purple-400" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-purple-300">+ Usuarios</p>
            </motion.div>

            {/* 4. Suscripciones */}
            <motion.div
              initial={{ opacity: 0, rotate: 20 }}
              whileInView={{ opacity: 1, rotate: 0 }}
              transition={{ delay: 1.2 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 bg-pink-500/20 backdrop-blur rounded-full flex items-center justify-center border-2 border-pink-400 shadow-xl mb-4">
                <Sparkles className="w-14 h-14 text-pink-400" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-pink-300">Suscripciones</p>
            </motion.div>
          </div>

          {/* Flechas circulares (solo en desktop) */}
          <div className="hidden md:block absolute inset-0 pointer-events-none">
            <ArrowRight className="absolute top-10 left-1/2 -translate-x-1/2 rotate-90 w-16 h-16 text-emerald-400/60" />
            <ArrowRight className="absolute bottom-10 left-1/2 -translate-x-1/2 -rotate-90 w-16 h-16 text-emerald-400/60" />
            <ArrowRight className="absolute left-10 top-1/2 -translate-y-1/2 -rotate-180 w-16 h-16 text-emerald-400/60" />
            <ArrowRight className="absolute right-10 top-1/2 -translate-y-1/2 w-16 h-16 text-emerald-400/60" />
          </div>
        </motion.div>

        {/* Cierre – el ciclo se paga solo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.6, type: "spring" }}
          className="text-center mt-12"
        >
          <p className="text-5xl md:text-7xl font-black text-emerald-400 drop-shadow-2xl">
            Se pagan solas
          </p>
        </motion.div>

        {/* Flecha siguiente */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.7 }}
          viewport={{ once: true }}
          transition={{ delay: 2.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-6xl animate-bounce"
        >
          ↓
        </motion.div>
      </div>
    </section>
  );
}