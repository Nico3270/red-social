// components/pitch/PitchModel.tsx
'use client';

import { motion } from 'framer-motion';
import { Users, DollarSign, TrendingUp, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function PitchModel() {
  return (
    <section className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center px-8 py-20">

      {/* Fondo con efecto sutil */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-pink-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-32 w-80 h-80 bg-emerald-500 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* Título gigante (tú lo dices, esto solo impacta) */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-7xl md:text-9xl lg:text-[180px] font-black text-center leading-none mb-20"
        >
          <span className="block text-emerald-400">$0</span>
          <span className="block text-white mt-4">para empezar</span>
        </motion.h1>

        {/* Flujo del modelo — 3 pasos visuales */}
        <div className="grid md:grid-cols-3 gap-12 mb-24">
          {/* Paso 1: Gratis */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="w-48 h-48 mx-auto mb-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-2xl">
              <Users className="w-24 h-24" />
            </div>
            <p className="text-6xl font-black text-emerald-400">$0</p>
            <p className="text-3xl mt-4 opacity-80">Abre gratis</p>
          </motion.div>

          {/* Paso 2: Cuando vende → $10 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="text-center relative"
          >
            <ArrowRight className="hidden md:block absolute -left-16 top-24 w-32 h-32 text-pink-400 opacity-60" />
            <ArrowRight className="hidden md:block absolute 2xl:block absolute -right-16 top-24 w-32 h-32 text-pink-400 opacity-60" />

            <div className="w-48 h-48 mx-auto mb-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
              <DollarSign className="w-24 h-24" />
            </div>
            <p className="text-6xl font-black text-pink-400">$10</p>
            <p className="text-3xl mt-4 opacity-80">Cuando vende</p>
          </motion.div>

          {/* Paso 3: Escala sin fricción */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.9 }}
            className="text-center"
          >
            <div className="w-48 h-48 mx-auto mb-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
              <TrendingUp className="w-24 h-24" />
            </div>
            <p className="text-6xl font-black text-purple-400">∞</p>
            <p className="text-3xl mt-4 opacity-80">Escala sin fricción</p>
          </motion.div>
        </div>

        {/* Cierre épico */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 1.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-8 bg-white/10 backdrop-blur-lg rounded-full px-12 py-8 border border-white/20">
            <Building2 className="w-20 h-20 text-emerald-400" />
            <h2 className="text-6xl md:text-8xl font-black">
              Un centro comercial digital
            </h2>
            <Building2 className="w-20 h-20 text-emerald-400" />
          </div>
          <p className="text-5xl md:text-7xl font-bold mt-12 text-pink-300">
            en cada ciudad
          </p>
        </motion.div>

        {/* Check final — tú cierras con esto */}
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 2.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mt-24"
        >
          <div className="bg-emerald-500/20 p-8 rounded-full">
            <CheckCircle2 className="w-32 h-32 text-emerald-400" />
          </div>
        </motion.div>

        {/* Flecha para siguiente slide */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.6 }}
          viewport={{ once: true }}
          transition={{ delay: 2.8 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <p className="text-5xl animate-bounce">↓</p>
        </motion.div>
      </div>
    </section>
  );
}