// components/pitch/finanzas/DashboardFinanciero.tsx
'use client';

import { useState } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  DollarSign, 
  Target,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  DollarSignIcon,
  Percent
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

type Scenario = 'pesimista' | 'intermedio' | 'optimista';

interface ScenarioData {
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
  conversionRate: number;
  initialCAC: number;
  minCAC: number;
  monthlyGrowth: number;
  churnRate: number;
  arpu: number;
  organicRatio: number;
  maxMarketingPct: number;
  ltv: number;
}

const scenarioData: Record<Scenario, ScenarioData> = {
  pesimista: {
    label: "Escenario Pesimista",
    shortLabel: "Pesimista",
    description: "Crecimiento lento, alta competencia y adopción cautelosa.",
    icon: <ArrowDownRight className="w-5 h-5" />,
    conversionRate: 0.05,
    initialCAC: 15,
    minCAC: 5,
    monthlyGrowth: 0.08,
    churnRate: 0.25,
    arpu: 10,
    organicRatio: 0.20,
    maxMarketingPct: 0.30,
    ltv: 10 * 12 / 0.25 // $480
  },
  intermedio: {
    label: "Escenario Intermedio",
    shortLabel: "Intermedio",
    description: "Crecimiento moderado, adopción orgánica y competencia media.",
    icon: <TrendingUp className="w-5 h-5" />,
    conversionRate: 0.10,
    initialCAC: 10,
    minCAC: 4,
    monthlyGrowth: 0.15,
    churnRate: 0.15,
    arpu: 10,
    organicRatio: 0.40,
    maxMarketingPct: 0.25,
    ltv: 10 * 12 / 0.15 // $800
  },
  optimista: {
    label: "Escenario Optimista",
    shortLabel: "Optimista",
    description: "Crecimiento viral, alta retención y liderazgo de mercado.",
    icon: <ArrowUpRight className="w-5 h-5" />,
    conversionRate: 0.20,
    initialCAC: 8,
    minCAC: 3,
    monthlyGrowth: 0.25,
    churnRate: 0.08,
    arpu: 10,
    organicRatio: 0.60,
    maxMarketingPct: 0.20,
    ltv: 10 * 12 / 0.08 // $1,500
  }
};

// Costos fijos reales
const fixedMonthly = 30 + 12 + 8 + 11;
const fixedAnnual = 10 + 15;
const fixedPerYear = fixedMonthly * 12 + fixedAnnual;

// Infraestructura (mensual)
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
  const cost = infra + team + marketing + fixed;

  const revenue = premium * d.arpu * 12;
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    year: `Año ${year}`,
    users: Math.round(total),
    newUsers: Math.round(newUsers),
    paidUsers: Math.round(paidUsers),
    premium: Math.round(premium),
    revenue: Math.round(revenue),
    infra: Math.round(infra),
    team: Math.round(team),
    marketing: Math.round(marketing),
    fixed: Math.round(fixed),
    cost: Math.round(cost),
    profit: Math.round(profit),
    margin: Math.round(margin),
    prevUsers: total,
    prevPremium: premium
  };
};

export default function DashboardFinanciero() {
  const [scenario, setScenario] = useState<Scenario>('intermedio');
  const d = scenarioData[scenario];

  const projections = [];
  let prevUsers = 0;
  let prevPremium = 0;
  for (let y = 1; y <= 5; y++) {
    const row = projectYear(d, y, prevUsers, prevPremium);
    projections.push(row);
    prevUsers = row.prevUsers;
    prevPremium = row.prevPremium;
  }

  const final = projections[4];
  const ltvCacRatio = (d.ltv / d.initialCAC).toFixed(1);

  // Datos para gráficos
  const lineData = projections.map(p => ({
    name: p.year,
    ingresos: p.revenue,
    costos: p.cost,
    profit: p.profit
  }));

  const pieData = [
    { name: 'Infraestructura', value: final.infra, color: '#10b981' },
    { name: 'Equipo', value: final.team, color: '#3b82f6' },
    { name: 'Marketing', value: final.marketing, color: '#f59e0b' },
    { name: 'Fijos', value: final.fixed, color: '#8b5cf6' }
  ];

  const barData = projections.map(p => ({
    name: p.year,
    usuarios: p.users,
    premium: p.premium
  }));

  return (
    <div className="bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 flex items-center justify-center gap-3">
            <BarChart3 className="w-10 h-10 text-indigo-600" />
            Dashboard Financiero Interactivo
          </h1>
          <p className="text-lg text-slate-600">
            Proyecciones dinámicas basadas en benchmarks reales LATAM 2025
          </p>
        </div>

        {/* Escenarios */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <div className="flex flex-wrap gap-4 justify-center">
            {Object.entries(scenarioData).map(([key, s]) => {
              const isActive = scenario === key;
              return (
                <button
                  key={key}
                  onClick={() => setScenario(key as Scenario)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    isActive 
                      ? 'bg-indigo-900 text-white shadow-xl scale-105 ring-2 ring-indigo-300'
                      : 'bg-white text-slate-700 shadow hover:shadow-md hover:scale-105 border border-slate-200'
                  }`}
                >
                  {isActive && s.icon}
                  {s.shortLabel}
                  {isActive && <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">Activo</span>}
                </button>
              );
            })}
          </div>
          <p className="text-center text-lg font-bold text-slate-600 italic mt-4">
            {d.description}
          </p>
          <p className="text-center text-sm text-slate-500 mt-2">
            Crecimiento mensual combinado: <strong>{Math.round(d.organicRatio * 100)}% orgánico</strong> / <strong>{Math.round((1 - d.organicRatio) * 100)}% pagado</strong>
          </p>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-700" />
              <span className="text-3xl font-bold text-green-900">${final.revenue.toLocaleString()}</span>
            </div>
            <p className="text-sm text-green-700 font-medium">Ingresos Año 5</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-2xl border border-purple-200 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-purple-700" />
              <span className="text-3xl font-bold text-purple-900">{final.margin.toFixed(0)}%</span>
            </div>
            <p className="text-sm text-purple-700 font-medium">Margen Año 5</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-700" />
              <span className="text-3xl font-bold text-blue-900">{final.users.toLocaleString()}</span>
            </div>
            <p className="text-sm text-blue-700 font-medium">Usuarios Año 5</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-2xl border border-orange-200 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-orange-700" />
              <span className="text-3xl font-bold text-orange-900">{projections.find(r => r.profit > 0)?.year || 'Año 5+'}</span>
            </div>
            <p className="text-sm text-orange-700 font-medium">Break-even</p>
          </div>
        </div>

        {/* Métricas Clave */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-200">
            <div className="flex items-center gap-3 mb-2">
              <DollarSignIcon className="w-8 h-8 text-indigo-700" />
              <div>
                <p className="text-sm text-indigo-700 font-medium">CAC Actual</p>
                <p className="text-2xl font-bold text-indigo-900">
                  ${Math.max(d.minCAC, d.initialCAC * (1 / (1 + final.users / 10000))).toFixed(1)}
                </p>
              </div>
            </div>
            <p className="text-xs text-indigo-600">CAC decreciente con escala</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <Percent className="w-8 h-8 text-green-700" />
              <div>
                <p className="text-sm text-green-700 font-medium">LTV/CAC Ratio</p>
                <p className="text-2xl font-bold text-green-900">
                  {ltvCacRatio}x
                </p>
              </div>
            </div>
            <p className="text-xs text-green-600">Relación saludable mayor a 3x</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-2xl border border-orange-200">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-8 h-8 text-orange-700" />
              <div>
                <p className="text-sm text-orange-700 font-medium">Crecimiento Orgánico</p>
                <p className="text-2xl font-bold text-orange-900">
                  {Math.round(d.organicRatio * 100)}%
                </p>
              </div>
            </div>
            <p className="text-xs text-orange-600">De nuevos usuarios</p>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ingresos vs Costos */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              Ingresos vs Costos
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                <YAxis tick={{ fill: '#64748b' }} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={3} name="Ingresos" />
                <Line type="monotone" dataKey="costos" stroke="#ef4444" strokeWidth={3} name="Costos" />
                <Line type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={3} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Desglose Año 5 */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <PieChart className="w-6 h-6 text-purple-600" />
              Desglose Costos Año 5
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Crecimiento Usuarios */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Crecimiento de Usuarios
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
              <YAxis tick={{ fill: '#64748b' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="usuarios" fill="#3b82f6" name="Usuarios Totales" />
              <Bar dataKey="premium" fill="#10b981" name="Premium" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}