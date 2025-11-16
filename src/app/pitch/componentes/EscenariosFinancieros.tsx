// components/pitch/finanzas/EscenariosFinancieros.tsx
'use client';

import { createContext, useContext, useState } from 'react';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  TrendingUp, 
  Users, 
  DollarSign,
  Target,
  Zap
} from 'lucide-react';
import Link from 'next/link';

// === CONTEXTO GLOBAL ===
type Scenario = 'pesimista' | 'intermedio' | 'optimista';

interface ScenarioData {
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
  conversionRate: number;
  cac: number;
  ltv: number;
  monthlyGrowth: number;
  churnRate: number;
  arpu: number;
}

interface FinancialContextType {
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  data: ScenarioData;
}

const FinancialContext = createContext<FinancialContextType | null>(null);

export const useFinanzas = () => {
  const context = useContext(FinancialContext);
  if (!context) throw new Error('useFinanzas debe usarse dentro de EscenariosFinancieros');
  return context;
};

// === ESCENARIOS (Benchmarks LATAM 2025) ===
const scenarioData: Record<Scenario, ScenarioData> = {
  pesimista: {
    label: "Escenario Pesimista",
    shortLabel: "Pesimista",
    description: "Crecimiento lento, alta competencia y adopción cautelosa.",
    icon: <ArrowDownRight className="w-5 h-5" />,
    conversionRate: 0.05,
    cac: 15,
    ltv: 120,
    monthlyGrowth: 0.08,
    churnRate: 0.25,
    arpu: 5
  },
  intermedio: {
    label: "Escenario Intermedio",
    shortLabel: "Intermedio",
    description: "Crecimiento moderado, adopción orgánica y competencia media.",
    icon: <TrendingUp className="w-5 h-5" />,
    conversionRate: 0.10,
    cac: 10,
    ltv: 200,
    monthlyGrowth: 0.15,
    churnRate: 0.15,
    arpu: 5
  },
  optimista: {
    label: "Escenario Optimista",
    shortLabel: "Optimista",
    description: "Crecimiento viral, alta retención y liderazgo de mercado.",
    icon: <ArrowUpRight className="w-5 h-5" />,
    conversionRate: 0.20,
    cac: 8,
    ltv: 300,
    monthlyGrowth: 0.25,
    churnRate: 0.08,
    arpu: 5
  }
};

export default function EscenariosFinancieros() {
  const [scenario, setScenario] = useState<Scenario>('intermedio');
  const data = scenarioData[scenario];

  return (
    <FinancialContext.Provider value={{ scenario, setScenario, data }}>
      {/* CARD PRINCIPAL */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-4 text-white">
          <div className="flex items-center justify-center">
            <div>
              <h3 className="text-3xl font-bold flex items-center gap-3">
                <Target className="w-8 h-8 text-indigo-400" />
                Modelo Financiero Dinámico
              </h3>
              <p className="text-yellow-400 font-bold mt-2 max-w-2xl leading-relaxed text-center">
                Basado en benchmarks reales de startups LATAM 2025 (Latitud, ProfitWell, Startup Genome).
              </p>
              <p className="text-gray-200 text-lg mt-1 max-w-2xl leading-relaxed text-center">
                Ajusta el escenario para visualizar cómo cambian los indicadores clave.
              </p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-7 space-y-4">
          {/* BOTONES DE ESCENARIO */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 justify-center">
              {Object.entries(scenarioData).map(([key, s]) => {
                const isActive = scenario === key;
                return (
                  <button
                    key={key}
                    onClick={() => setScenario(key as Scenario)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                      isActive 
                        ? 'bg-slate-900 text-white shadow-xl scale-105 ring-2 ring-slate-300'
                        : 'bg-white text-slate-700 shadow hover:shadow-md hover:scale-105 border border-slate-200'
                    }`}
                  >
                    {isActive && s.icon}
                    {s.shortLabel}
                    {isActive && (
                      <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                        Activo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* DESCRIPCIÓN DEL ESCENARIO */}
            <p className="text-center text-lg font-bold text-slate-600 italic max-w-3xl mx-auto">
              {data.description}
            </p>
          </div>

          <hr className="border-slate-200" />

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <KpiCard
              title="Conversión"
              icon={<Users className="w-4 h-4" />}
              value={`${(data.conversionRate * 100).toFixed(0)}%`}
              gradient="from-blue-50 to-indigo-50"
              textColor="text-blue-900"
            />
            <KpiCard
              title="CAC"
              icon={<DollarSign className="w-4 h-4" />}
              value={`$${data.cac}`}
              gradient="from-green-50 to-emerald-50"
              textColor="text-green-900"
            />
            <KpiCard
              title="LTV"
              icon={<TrendingUp className="w-4 h-4" />}
              value={`$${data.ltv}`}
              gradient="from-purple-50 to-violet-50"
              textColor="text-purple-900"
            />
            <KpiCard
              title="Crecimiento mensual"
              icon={<Zap className="w-4 h-4" />}
              value={`${(data.monthlyGrowth * 100).toFixed(0)}%`}
              gradient="from-orange-50 to-amber-50"
              textColor="text-orange-900"
            />
          </div>

          {/* FOOTER */}
          <div className="flex flex-wrap justify-center gap-5 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              Churn anual: {(data.churnRate * 100).toFixed(0)}%
            </div>
            <span className="hidden sm:inline text-slate-400">•</span>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              ARPU: ${data.arpu}/mes
            </div>
          </div>

          {/* FUENTES */}
         <div className="text-xs text-slate-500 text-center mt-6">
  <p className="font-medium text-slate-600 mb-1">Fuentes</p>
  <div className="flex justify-center flex-wrap gap-3">
    <Link href="https://latitud.com/reports" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">
      Latitud Report 2025
    </Link>
    <Link href="https://www.profitwell.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">
      ProfitWell
    </Link>
    <Link href="https://startupgenome.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">
      Startup Genome
    </Link>
    <Link href="https://www.ycombinator.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">
      Y Combinator
    </Link>
  </div>
</div>

        </div>
      </div>
    </FinancialContext.Provider>
  );
}

// === COMPONENTE REUTILIZABLE: KpiCard ===
function KpiCard({
  title,
  icon,
  value,
  gradient,
  textColor
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  gradient: string;
  textColor: string;
}) {
  return (
    <div className={`p-5 rounded-xl border bg-gradient-to-br ${gradient} border-slate-200 shadow-sm`}>
      <p className="text-xs font-medium text-slate-600 flex items-center gap-2 mb-1">
        {icon} {title}
      </p>
      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}