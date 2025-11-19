// components/pitch/SlideFinalEpic.tsx
'use client';

import { motion } from "framer-motion";
import Image from "next/image";

export default function SlideFinalEpic() {
  return (
    <section className="relative w-full h-[120vh] bg-black overflow-hidden rounded-3xl flex items-center justify-center">

      {/* Fondo real */}
      <Image
        src="/imgs/comercial.png"
        alt="El centro comercial del futuro"
        fill
        className="object-cover brightness-80"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />

      <div className="relative z-10 text-center px-8 max-w-6xl mx-auto">

        {/* NO es un marketplace más – compacto */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-bold text-red-400 line-through opacity-90 mb-8"
        >
          Myckeo no es un marketplace más
        </motion.p>

        {/* ES EL CENTRO COMERCIAL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mb-10"
        >
          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight">
            Es el centro comercial
          </h1>
          <h2 className="text-6xl md:text-8xl font-black text-emerald-400 mt-3">
            abierto 24/7
          </h2>
        </motion.div>

        {/* Donde los negocios van a querer estar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="mb-12"
        >
          <p className="text-4xl md:text-6xl font-bold text-white">
            donde los negocios
          </p>
          <p className="text-5xl md:text-7xl font-black text-emerald-400 mt-3">
            van a querer estar
          </p>
        </motion.div>

        {/* Y EMPIEZA AHORA – potente pero contenido */}
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.4, duration: 1 }}
          className="text-6xl md:text-8xl font-black text-emerald-400 drop-shadow-2xl"
        >
          Y EMPIEZA AHORA
        </motion.p>

        {/* Logo Myckeo – sutil y elegante */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.9 }}
          viewport={{ once: true }}
          transition={{ delay: 1.8 }}
          className="mt-12"
        >
          <Image
            src="/imgs/Logo Final.png"
            alt="Myckeo"
            width={180}
            height={180}
            className="mx-auto rounded-full shadow-2xl"
          />
        </motion.div>
      </div>
    </section>
  );
}