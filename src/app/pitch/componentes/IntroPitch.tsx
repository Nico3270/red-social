// components/pitch/IntroPitchEpicCompact.tsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function IntroPitchEpicCompact() {
  return (
    <section className="relative w-full h-[100vh] bg-black text-white overflow-hidden py-10">

      {/* Fondo */}
      <div className="absolute inset-0">
        <Image
          src="/imgs/tendero.png"
          alt="Negocios reales en Colombia"
          fill
          className="object-cover opacity-50"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center max-w-5xl mx-auto">

        {/* 42% — 1.7M PYMES */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <h1 className="text-5xl md:text-6xl font-black text-pink-500 leading-tight drop-shadow-xl">
            Solo el 42%
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mt-1">
            de 1.7 millones de PYMEs en Colombia están digitalizadas
          </p>
        </motion.div>

        {/* 52B — 16% */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-8"
        >
          <h2 className="text-4xl md:text-5xl font-black text-emerald-400 leading-tight drop-shadow-xl">
            $52.000 millones
          </h2>
          <p className="text-lg md:text-xl font-bold text-emerald-300 mt-1">
            +16% anual (2024 → 2027)
          </p>
        </motion.div>

        {/* Dolor */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 1 }}
          className="flex gap-8 mb-8"
        >
          <div className="text-center">
            <div className="text-4xl mb-1">💸</div>
            <p className="text-base md:text-lg text-gray-400">Caro</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-1">🤯</div>
            <p className="text-base md:text-lg text-gray-400">Difícil</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-1">🌀</div>
            <p className="text-base md:text-lg text-gray-400">Desordenado</p>
          </div>
        </motion.div>

        {/* Oportunidad */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 1 }}
        >
          <h3 className="text-3xl md:text-4xl font-black leading-tight">
            <span className="block text-gray-300">¿Y si la red social</span>
            <span className="block text-pink-500">fuera para negocios?</span>
          </h3>
        </motion.div>

      </div>
    </section>
  );
}
