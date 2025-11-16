// components/pitch/finanzas/FinanzasMyckeo.tsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Carga lazy: evita errores de contexto y SSR
const EscenariosFinancieros = dynamic(() => import('./EscenariosFinancieros'), { ssr: false });
const ProyeccionAnual = dynamic(() => import('./ProyeccionAnual'), { ssr: false });

export default function FinanzasMyckeo() {
  return (
    <section
      id="finanzas"
      className="w-full bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white px-6 py-12 md:py-16"
    >
      <div className="w-full max-w-7xl mx-auto space-y-12 md:space-y-16">
        <Suspense fallback={<div className="h-64 flex items-center justify-center"><p className="text-slate-600">Cargando finanzas...</p></div>}>
          <EscenariosFinancieros />
          
        </Suspense>
      </div>
    </section>
  );
}