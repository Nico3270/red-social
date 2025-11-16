// components/pitch/CompetenciaMyckeo.tsx
'use client';

import CompetenciaMatriz from './CompetenciaMatriz';
import CompetenciaVsGoogle from './CompetenciaVsGoogle';
import CompetenciaVsLandingPages from './CompetenciaVsLandingPages';
import CompetenciaSinergiaRedes from './CompetenciaSinergiaRedes';

export default function CompetenciaMyckeo() {
  return (
    <section
      id="competencia"
      className="w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-6 pt-12 md:pt-6 pb-6"
    >
      <div className="w-full max-w-7xl mx-auto space-y-8 md:space-y-4">
        <CompetenciaMatriz />
        <CompetenciaVsGoogle />
        <CompetenciaVsLandingPages />
        <CompetenciaSinergiaRedes />
      </div>
    </section>
  );
}