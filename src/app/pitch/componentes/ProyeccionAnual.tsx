// components/pitch/finanzas/ProyeccionAnual.tsx
'use client';

import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

type Scenario = 'pesimista' | 'intermedio' | 'optimista';

interface ScenarioData {
  label: string;
  conversionRate: number;
  initialCAC: number;
  minCAC: number;
  monthlyGrowth: number;
  churnRate: number;
  arpu: number;
  organicRatio: number;
  maxMarketingPct: number;
}

const scenarioData: Record<Scenario, ScenarioData> = {
  pesimista: {
    label: "Escenario Pesimista",
    conversionRate: 0.05,
    initialCAC: 15,
    minCAC: 5,
    monthlyGrowth: 0.08,
    churnRate: 0.25,
    arpu: 10,
    organicRatio: 0.20,
    maxMarketingPct: 0.30
  },
  intermedio: {
    label: "Escenario Intermedio",
    conversionRate: 0.10,
    initialCAC: 10,
    minCAC: 4,
    monthlyGrowth: 0.15,
    churnRate: 0.15,
    arpu: 10,
    organicRatio: 0.40,
    maxMarketingPct: 0.25
  },
  optimista: {
    label: "Escenario Optimista",
    conversionRate: 0.20,
    initialCAC: 8,
    minCAC: 3,
    monthlyGrowth: 0.25,
    churnRate: 0.08,
    arpu: 10,
    organicRatio: 0.60,
    maxMarketingPct: 0.20
  }
};

// Costos fijos reales
const fixedMonthly = 30 + 12 + 8 + 11; // Grok, Premiere, Midjourney, ElevenLabs
const fixedAnnual = 10 + 15; // Hosting correo, dominio
const fixedPerYear = fixedMonthly * 12 + fixedAnnual; // $732 / año

// Infraestructura hasta 10M usuarios (mensual)
const infraCosts = [
  { users: 10, cost: 0 },
  { users: 100, cost: 20 },
  { users: 1000, cost: 75 },
  { users: 10000, cost: 350 },
  { users: 100000, cost: 3500 },
  { users: 1000000, cost: 110000 },
  { users: 5000000, cost: 500000 },
  { users: 10000000, cost: 950000 }
];

const getInfraCost = (users: number): number => {
  const sorted = [...infraCosts].sort((a, b) => a.users - b.users);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (users >= sorted[i].users && users <= sorted[i + 1].users) {
      const ratio = (users - sorted[i].users) / (sorted[i + 1].users - sorted[i].users);
      return sorted[i].cost + ratio * (sorted[i + 1].cost - sorted[i].cost);
    }
  }
  return users > 10000000 ? 950000 + (users - 10000000) * 0.09 : sorted[sorted.length - 1].cost;
};

const projectYear = (d: ScenarioData, year: number, prevUsers: number = 0, prevPremium: number = 0) => {
  const annualGrowth = Math.pow(1 + d.monthlyGrowth, 12) - 1;
  const total = year === 1 ? 100 * (1 + annualGrowth) : prevUsers * (1 + annualGrowth);

  const newUsers = total - prevUsers;
  const paidUsers = newUsers * (1 - d.organicRatio);

  const newPremium = total * d.conversionRate;
  const retainedPremium = year > 1 ? prevPremium * (1 - d.churnRate) : 0;
  const premium = newPremium + retainedPremium;

  const cac = Math.max(d.minCAC, d.initialCAC * (1 / (1 + total / 10000)));

  const projectedRevenue = premium * d.arpu * 12;
  const marketingBudget = projectedRevenue * d.maxMarketingPct;
  const marketing = Math.min(paidUsers * cac, marketingBudget);

  const infra = getInfraCost(total) * 12; // MENSUAL → ANUAL
  const founderSalary = 1000 * 12; // 12,000 USD/año
  const team = (
    total < 1000 ? 500 :
    total < 10000 ? 2000 :
    total < 100000 ? 8000 :
    Math.min(25000, 8000 + Math.log(total / 100000) * 5000)
  ) + founderSalary;
  const fixed = fixedPerYear;
  const cost = infra + team + marketing + fixed;

  const revenue = premium * d.arpu * 12;
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    year: `Año ${year}`,
    totalUsers: Math.round(total),
    premiumUsers: Math.round(premium),
    revenue: Math.round(revenue),
    cost: Math.round(cost),
    profit: Math.round(profit),
    margin: Math.round(margin),
  };
};

export default function ProyeccionAnual() {
  const [scenario, setScenario] = useState<Scenario>('intermedio');
  const d = scenarioData[scenario];

  const proj = [];
  let prevUsers = 0;
  let prevPremium = 0;
  for (let y = 1; y <= 5; y++) {
    const row = projectYear(d, y, prevUsers, prevPremium);
    proj.push(row);
    prevUsers = row.totalUsers;
    prevPremium = row.premiumUsers;
  }

  const chart = proj.map(p => ({
    name: p.year,
    ingresos: p.revenue,
    costos: p.cost,
  }));
  const final = proj[4];

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 p-4">
      {/* Caja de Texto Explicativa */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-7 rounded-2xl border border-indigo-200 mb-8">
        <h4 className="text-2xl font-bold text-indigo-900 mb-4 text-center">
          ¿Qué muestra esta gráfica?
        </h4>
        <div className='flex justify-center text-center text-lg'>
          <p className=" text-indigo-800 leading-relaxed mb-5 max-w-3xl ">
            Proyección de <strong>ingresos vs costos</strong> en 5 años según el escenario seleccionado. Esto se basa en ARPU de $10 y benchmarks reales de startups LATAM 2025. Ajusta el escenario para ver cómo cambian las proyecciones.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-base">
          <div className="bg-white/60 p-4 rounded-xl border border-indigo-100 shadow-sm">
            <h5 className="font-semibold text-yellow-600 mb-1 text-lg text-center">Break-even</h5>
            <p className="text-indigo-700 text-md text-center">
              Año en que los ingresos superan los costos.
            </p>
          </div>

          <div className="bg-white/60 p-4 rounded-xl border border-indigo-100 shadow-sm">
            <h5 className="font-semibold text-yellow-600 mb-1 text-lg text-center">Margen Año 5</h5>
            <p className="text-indigo-700 text-md text-center">
              Rentabilidad proyectada en el quinto año.
            </p>
          </div>

          <div className="bg-white/60 p-4 rounded-xl border border-indigo-100 shadow-sm">
            <h5 className="font-semibold text-yellow-600 mb-1 text-lg text-center">Crecimiento de usuarios</h5>
            <p className="text-indigo-700 text-md text-center">
              Escala estimada del negocio según el escenario.
            </p>
          </div>
        </div>

        <span className="block mt-5 text-lg text-gray-700 font-extrabold italic text-center">
          Basado en benchmarks reales LATAM 2025. Escala realista y conservadora.
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-indigo-600" />
            Proyección 5 Años
          </h3>
          <p className="text-slate-600 mt-1">
            Ingresos y costos con <strong>{d.label}</strong>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Break-even</p>
          <p className="text-2xl font-bold text-green-600">
            {proj.find(p => p.profit > 0)?.year || 'Año 5+'}
          </p>
        </div>
      </div>

      {/* Botones de escenario */}
      <div className="flex flex-wrap gap-4 justify-center mb-2">
        {Object.entries(scenarioData).map(([key, s]) => {
          const isActive = scenario === key;
          return (
            <button
              key={key}
              onClick={() => setScenario(key as Scenario)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-xl scale-105 ring-2 ring-slate-300'
                  : 'bg-white text-slate-700 shadow hover:shadow-md hover:scale-105 border border-slate-200'
              }`}
            >
              {s.label}
              {isActive && <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">Activo</span>}
            </button>
          );
        })}
      </div>

      {/* Gráfico */}
      <div className="h-64 md:h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
            <YAxis tick={{ fill: '#64748b' }} />
            <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="ingresos" fill="#10b981" radius={[8, 8, 0, 0]} name="Ingresos" />
            <Bar dataKey="costos" fill="#ef4444" radius={[8, 8, 0, 0]} name="Costos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* KPIs Año 5 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
          <p className="text-sm text-green-700 font-medium">Ingresos Año 5</p>
          <p className="text-3xl font-bold text-green-900">${final.revenue.toLocaleString()}</p>
        </div>
        <div className="text-center p-5 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200">
          <p className="text-sm text-purple-700 font-medium">Margen Año 5</p>
          <p className="text-3xl font-bold text-purple-900">{final.margin}%</p>
        </div>
        <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <p className="text-sm text-blue-700 font-medium">Usuarios Totales</p>
          <p className="text-3xl font-bold text-blue-900">{final.totalUsers.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}