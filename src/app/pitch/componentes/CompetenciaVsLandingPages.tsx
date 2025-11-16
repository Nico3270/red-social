// components/pitch/CompetenciaVsLandingPages.tsx
'use client';

import { motion } from 'framer-motion';
import { Sparkles, XCircle, Check } from 'lucide-react';
import { titleFont } from '@/config/fonts';

export default function CompetenciaVsLandingPages() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl ring-1 ring-slate-200"
    >
      <div className="flex items-center gap-4 mb-6">
        <Sparkles className="w-10 h-10 text-purple-600" />
        <h3 className={`text-2xl md:text-3xl font-bold text-slate-900 ${titleFont.className}`}>
          Myckeo ≠ Landing Page Estática
        </h3>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h4 className="font-bold text-red-600 mb-3">Landing Pages (Wix, etc.)</h4>
          <ul className="space-y-2 text-slate-600">
            <li className="flex items-start gap-2"><XCircle className="w-5 h-5 text-red-500 mt-0.5" /> Estática, sin interacción</li>
            <li className="flex items-start gap-2"><XCircle className="w-5 h-5 text-red-500 mt-0.5" /> Actualización manual</li>
            <li className="flex items-start gap-2"><XCircle className="w-5 h-5 text-red-500 mt-0.5" /> Sin comunidad</li>
            <li className="flex items-start gap-2"><XCircle className="w-5 h-5 text-red-500 mt-0.5" /> SEO limitado</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-emerald-600 mb-3">Myckeo: Landing Viva</h4>
          <ul className="space-y-2 text-slate-700">
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-emerald-500 mt-0.5" /> Publicaciones + productos en vivo</li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-emerald-500 mt-0.5" /> Auto-actualización</li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-emerald-500 mt-0.5" /> Comunidad activa</li>
            <li className="flex items-start gap-2"><Check className="w-5 h-5 text-emerald-500 mt-0.5" /> SEO social potente</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}