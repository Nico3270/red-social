// components/pitch/SlideEscalabilidad.tsx
'use client';

import { motion } from "framer-motion";
import Image from "next/image";
import { Server, Database, Image as ImageIcon, MessageCircle, Building2, ArrowUpRight } from "lucide-react";

export default function SlideEscalabilidad() {
  return (
    <section className="relative w-full h-[80vh] bg-black overflow-hidden rounded-3xl flex items-center justify-center">
      
      {/* Fondo real */}
      <Image
        src="/imgs/escalabilidad.png"
        alt="Escalando en cada ciudad"
        fill
        className="object-cover brightness-75"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/50" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6">

        {/* Título compacto */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-4xl md:text-6xl font-black text-white mb-8"
        >
          Myckeo escala
          <span className="block text-emerald-400 mt-1">sin fricciones</span>
        </motion.h2>

        {/* Gráfico horizontal + vertical optimizado – aprovecha todo el ancho */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-6 md:gap-12"
        >
          {/* Servicios en horizontal – más compacto y legible */}
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
            {[
              { Icon: Server, label: "Servidores" },
              { Icon: Database, label: "Bases de datos" },
              { Icon: ImageIcon, label: "Imágenes" },
              { Icon: MessageCircle, label: "Mensajería" },
            ].map(({ Icon, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                  <Icon className="w-10 h-10 md:w-12 md:h-12 text-emerald-400" />
                </div>
                <p className="mt-3 text-sm md:text-base font-medium text-white">{label}</p>
              </motion.div>
            ))}
          </div>

          {/* Flecha de crecimiento */}
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
            className="flex items-center"
          >
            <ArrowUpRight className="w-20 h-20 md:w-28 md:h-28 text-emerald-400" />
          </motion.div>
        </motion.div>

        {/* Cierre épico – compacto y centrado */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 1.2 }}
          className="text-center mt-10"
        >
          <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-lg rounded-full px-8 py-5 border border-white/20">
            <Building2 className="w-12 h-12 text-emerald-400" />
            <h3 className="text-3xl md:text-5xl font-black text-white">
              Un centro comercial digital
            </h3>
            <Building2 className="w-12 h-12 text-emerald-400" />
          </div>
          <p className="text-4xl md:text-6xl font-black text-emerald-400 mt-6 drop-shadow-xl">
            en cada ciudad
          </p>
        </motion.div>

        {/* Flecha siguiente */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.7 }}
          viewport={{ once: true }}
          transition={{ delay: 1.6 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-5xl animate-bounce"
        >
          ↓
        </motion.div>
      </div>
    </section>
  );
}