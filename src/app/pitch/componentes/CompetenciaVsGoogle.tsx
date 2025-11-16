// components/pitch/CompetenciaVsGoogle.tsx
'use client';

import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { titleFont } from '@/config/fonts';

export default function CompetenciaVsGoogle() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="bg-gradient-to-br from-indigo-50 via-white to-indigo-100/50 
                 rounded-3xl p-10 md:p-14 shadow-2xl border border-white/70"
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Globe className="w-12 h-12 text-indigo-600 drop-shadow-md" />
        <h3
          className={`text-3xl md:text-4xl font-extrabold tracking-tight 
                      text-slate-900 drop-shadow-sm text-center ${titleFont.className}`}
        >
          No competimos con Google —
          <span className="text-indigo-700"> lo potenciamos</span>
        </h3>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-xl text-slate-700 leading-relaxed">
          En Myckeo, cada{" "}
          <span className="font-semibold text-indigo-600">reseña</span>, cada{" "}
          <span className="font-semibold text-indigo-600">publicación</span> y cada{" "}
          <span className="font-semibold text-indigo-600">interacción</span>  genera <span className="font-bold text-amber-600">señales sociales reales </span>  
           que Google interpreta como autoridad y relevancia local.
        </p>

        {/* Tarjeta inferior premium */}
        <div className="mt-6 bg-white/90 rounded-2xl p-6 shadow-lg border border-slate-200">
          <p className="text-lg md:text-xl font-semibold text-slate-900">
            Google no es rival —{" "}
            <span className="text-indigo-700">es aliado.</span>
            <span className="block mt-1 font-bold text-amber-600">
              Más comunidad = más visibilidad.
            </span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
