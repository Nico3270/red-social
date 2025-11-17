// components/pitch/finanzas/DesgloseCostos.tsx
'use client';

import { useState } from 'react';
import { 
  PieChart as PieIcon, 
  Server, 
  Users, 
  Megaphone, 
  Lock,
  DollarSign
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip
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
    conversionRate: 0.03,
    initialCAC: 120,
    minCAC: 60,
    monthlyGrowth: 0.03,
    churnRate: 0.07,
    arpu: 10,
    organicRatio: 0.30,
    maxMarketingPct: 0.35
  },
  intermedio: {
    label: "Escenario Intermedio",
    conversionRate: 0.06,
    initialCAC: 80,
    minCAC: 40,
    monthlyGrowth: 0.05,
    churnRate: 0.05,
    arpu: 10,
    organicRatio: 0.50,
    maxMarketingPct: 0.30
  },
  optimista: {
    label: "Escenario Optimista",
    conversionRate: 0.10,
    initialCAC: 60,
    minCAC: 30,
    monthlyGrowth: 0.07,
    churnRate: 0.04,
    arpu: 10,
    organicRatio: 0.70,
    maxMarketingPct: 0.25
  }
};

// Costos fijos reales (anual)
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

  const infra = getInfraCost(total) * 12;
  const founderSalary = 1000 * 12;
  const team = (
  total < 1000 ? 3000 :                // etapa inicial
  total < 10000 ? 10000 :              // semilla
  total < 100000 ? 30000 :             // crecimiento temprano
  Math.min(80000, 30000 + Math.log(total / 100000) * 25000)  // escala 100k–1M+
) + founderSalary;


  const fixed = fixedPerYear;

  return {
    infra: Math.round(infra),
    team: Math.round(team),
    marketing: Math.round(marketing),
    fixed: Math.round(fixed),
    total: Math.round(infra + team + marketing + fixed)
  };
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

export default function DesgloseCostos() {
  const [scenario, setScenario] = useState<Scenario>('intermedio');
  const d = scenarioData[scenario];

  // === CÁLCULO EXACTO DE USUARIOS AÑO 3 (igual que TablaPL) ===
  const annualGrowth = Math.pow(1 + d.monthlyGrowth, 12) - 1;

  const usersA1 = 100 * (1 + annualGrowth);
  const usersA2 = usersA1 * (1 + annualGrowth);
 
  const prevUsersA2 = usersA2;

  // === COSTOS AÑO 3 (misma función que P&L) ===
  const costs = projectYear(d, 3, prevUsersA2);

  const pieData = [
    { name: 'Infraestructura', value: costs.infra, icon: <Server className="w-5 h-5" />, color: COLORS[0] },
    { name: 'Equipo', value: costs.team, icon: <Users className="w-5 h-5" />, color: COLORS[1] },
    { name: 'Marketing', value: costs.marketing, icon: <Megaphone className="w-5 h-5" />, color: COLORS[2] },
    { name: 'Fijos', value: costs.fixed, icon: <Lock className="w-5 h-5" />, color: COLORS[3] },
  ];

  const totalCostsA3 = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 p-6 md:p-8">
      {/* Caja explicativa */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200 mb-8">
        <h4 className="text-lg font-bold text-purple-900 mb-2 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Desglose de Costos Año 3
        </h4>
        <p className="text-sm text-purple-800">
          Distribución de gastos operativos en el <strong>escenario {d.label.toLowerCase()}</strong>.
        </p>
        <p className="text-sm text-purple-800 mt-2">
          <strong>Conclusiones clave:</strong>
        </p>
        <ul className="mt-2 space-y-1 text-purple-700 list-disc list-inside">
          <li><strong>Infra</strong>: Escala con usuarios (Vercel, Neon, Cloudinary, WhatsApp, Brevo, OpenAI).</li>
          <li><strong>Equipo</strong>: Incluye salario fundador ($12K/año) + equipo técnico.</li>
          <li><strong>Marketing</strong>: Solo sobre usuarios pagados + tope % ingresos.</li>
          <li><strong>Fijos</strong>: $732/año (Grok $30/m, Premiere $12/m, Midjourney $8/m, ElevenLabs $11/m, correo $10/a, dominio $15/a).</li>
        </ul>
        <p className="mt-2 text-xs text-purple-600 italic">
          Total Año 3: ${totalCostsA3.toLocaleString()}
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <PieIcon className="w-7 h-7 text-purple-600" />
            Distribución de Costos
          </h3>
          <p className="text-slate-600 mt-1">
            Año 3 — {d.label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Total Año 3</p>
          <p className="text-2xl font-bold text-purple-600">
            ${totalCostsA3.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Botones de escenario */}
      <div className="flex flex-wrap gap-4 justify-center mb-8">
        {Object.entries(scenarioData).map(([key, s]) => {
          const isActive = scenario === key;
          return (
            <button
              key={key}
              onClick={() => setScenario(key as Scenario)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                isActive 
                  ? 'bg-purple-900 text-white shadow-xl scale-105 ring-2 ring-purple-300'
                  : 'bg-white text-slate-700 shadow hover:shadow-md hover:scale-105 border border-slate-200'
              }`}
            >
              {s.label}
              {isActive && <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">Activo</span>}
            </button>
          );
        })}
      </div>

      {/* Gráfico + Leyenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          {pieData.map((item) => (
            <div key={item.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: item.color + '20' }}>
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{item.name}</p>
                <p className="text-sm text-slate-600">${item.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center mt-8">
        Cálculos basados en costos reales (Vercel, Neon, Cloudinary, WhatsApp, Brevo, OpenAI) + fijos $732/año.
      </p>
    </div>
  );
}