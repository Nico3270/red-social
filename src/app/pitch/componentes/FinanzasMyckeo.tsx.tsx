// components/pitch/finanzas/FinanzasMyckeo.tsx
'use client';


import DashboardFinanciero from './DashboardFinanciero';
import EscenariosFinancieros from './EscenariosFinancieros';
import ProyeccionAnual from './ProyeccionAnual';
import TablaCostos from './TablaCostos';

export default function FinanzasMyckeo() {
  return (
    <section id="finanzas" className="w-full bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white px-6 py-4">
      <div className="max-w-7xl mx-auto space-y-2">
        <EscenariosFinancieros />
        <ProyeccionAnual />
        <TablaCostos />
        <DashboardFinanciero />
      </div>
    </section>
  );
}