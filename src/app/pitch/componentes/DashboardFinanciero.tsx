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

// === EXACTAMENTE IGUAL QUE EN TablaPL.tsx (versión definitiva) ===
const fixedAnnual = 30 * 12 + 12 * 12 + 8 * 12 + 11 * 12 + 10 + 15; // $757/año

// Compensación del fundador (100% igual)
const getFounderCompensation = (profit: number, year: number): number => {
  if (year <= 2) return 1500 * 12;        // $18K/año
  if (profit <= 0) return 1800 * 12;      // $21.6K/año
  if (profit < 2_000_000) return 2500 * 12; // $30K/año
  if (profit < 10_000_000) return 4000 * 12; // $48K/año
  const base = 60000;
  const bonus = profit * 0.01;
  return Math.min(120000, base + bonus);   // tope $120K/año
};

// Equipo operativo (100% igual)
const getOperationalTeamCost = (totalUsers: number): number => {
  if (totalUsers < 100000) return totalUsers * 1.5;
  else if (totalUsers < 1000000) return 400000 + totalUsers * 0.8;
  else if (totalUsers < 5000000) return 1500000 + totalUsers * 0.55;
  else return 4000000 + totalUsers * 0.35;
};

// Infraestructura mensual (100% igual que en TablaPL definitiva)
const getInfraCostMonthly = (totalUsers: number, premiumUsers: number): number => {
  const daus = totalUsers * 0.10;

  const vercel =
    daus < 50_000
      ? 100 + daus * 0.01
      : daus < 500_000
        ? 500 + daus * 0.003
        : 2000 + daus * 0.0015;

  const neon = totalUsers < 50000 ? 20 : totalUsers < 500000 ? 150 + totalUsers * 0.001 : 500 + (totalUsers - 500000) * 0.001;
  const cloudinary = 89 + totalUsers * 0.005;

  const salesPerPremium = 15;
  const salesPerFreeBiz = 5;
  const msgsPerTrans = 2.5;
  const paidMsgRatio = 1.0;
  const whatsappCostPerMsg = 0.0008;

  const freeUsers = totalUsers - premiumUsers;
  const totalTransactions = premiumUsers * salesPerPremium + freeUsers * salesPerFreeBiz * 0.1;
  const totalMsgs = totalTransactions * msgsPerTrans;
  const paidMsgs = totalMsgs * paidMsgRatio;
  const whatsapp = paidMsgs * whatsappCostPerMsg;

  const brevo = totalUsers < 100000 ? 0 : totalUsers * 0.0005;

  const productsPerPremiumBizMonthly = 2;
  const productsPerFreeBizMonthly = 1;
  const premiumBiz = premiumUsers;
  const freeBiz = (totalUsers - premiumUsers) * 0.1;
  const totalProductsMonth = premiumBiz * productsPerPremiumBizMonthly + freeBiz * productsPerFreeBizMonthly;
  const costPerProduct = 0.003;
  const openai = totalProductsMonth * costPerProduct;

  return Math.round(vercel + neon + cloudinary + whatsapp + brevo + openai);
};

const getInfraCost = (totalUsers: number, premiumUsers: number) => getInfraCostMonthly(totalUsers, premiumUsers) * 12;

// Escenarios
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
    ltv: 10 * 12 / 0.25
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
    ltv: 10 * 12 / 0.15
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
    ltv: 10 * 12 / 0.08
  }
};

// Proyección 100% igual que en TablaPL
const projectYear = (d: ScenarioData, year: number, prevUsers = 0, prevPremium = 0) => {
  const annualGrowth = Math.pow(1 + d.monthlyGrowth, 12) - 1;
  const total = year === 1 ? 100 * (1 + annualGrowth) : prevUsers * (1 + annualGrowth);

  const newUsers = total - prevUsers;
  const paidUsers = newUsers * (1 - d.organicRatio);
  const newPremium = total * d.conversionRate;
  const retainedPremium = year > 1 ? prevPremium * (1 - d.churnRate) : 0;
  const premium = newPremium + retainedPremium;

  const cac = d.minCAC + (d.initialCAC - d.minCAC) * Math.exp(-total / 300000);
  const revenue = premium * d.arpu * 12;
  const marketingBudget = revenue * d.maxMarketingPct;
  const marketing = Math.min(paidUsers * cac, marketingBudget);

  const infra = getInfraCost(total, premium);
  const operationalTeam = getOperationalTeamCost(total);
  const fixed = fixedAnnual;

  const costTemp = infra + operationalTeam + marketing + fixed;
  const profitTemp = revenue - costTemp;
  const founderComp = getFounderCompensation(profitTemp, year);
  const team = operationalTeam + founderComp;

  const cost = costTemp + founderComp;
  const profit = revenue - cost;
  const margin = revenue > 0 ? profit / revenue * 100 : 0;

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
  const currentCAC = d.minCAC + (d.initialCAC - d.minCAC) * Math.exp(-final.users / 300000);
  const ltvCacRatio = (d.ltv / currentCAC).toFixed(1);

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
            Proyecciones 100% alineadas con el P&L oficial (cálculo realista 2025)
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
              <span className="text-3xl font-bold text-orange-900">
                {projections.find(r => r.profit > 0)?.year || 'Año 5+'}
              </span>
            </div>
            <p className="text-sm text-orange-700 font-medium">Break-even</p>
          </div>
        </div>

        {/* Métricas Clave */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-200">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-8 h-8 text-indigo-700" />
              <div>
                <p className="text-sm text-indigo-700 font-medium">CAC Actual (Año 5)</p>
                <p className="text-2xl font-bold text-indigo-900">${currentCAC.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <Percent className="w-8 h-8 text-green-700" />
              <div>
                <p className="text-sm text-green-700 font-medium">LTV/CAC Ratio</p>
                <p className="text-2xl font-bold text-green-900">{ltvCacRatio}x</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-2xl border border-orange-200">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-8 h-8 text-orange-700" />
              <div>
                <p className="text-sm text-orange-700 font-medium">Crecimiento Orgánico</p>
                <p className="text-2xl font-bold text-orange-900">{Math.round(d.organicRatio * 100)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              Ingresos vs Costos vs Profit
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
              <Bar dataKey="premium" fill="#10b981" name="Usuarios Premium" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}