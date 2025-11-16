// components/pitch/finanzas/ProyeccionAnual.tsx
'use client';

import { useFinanzas } from './EscenariosFinancieros';
import { 
  TrendingUp, 
  ArrowUpRight
} from 'lucide-react';
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

// === DATOS DE INFRA (de tus cálculos reales) ===
const infraCosts = [
  { users: 10, cost: 0 },
  { users: 100, cost: 20 },
  { users: 1000, cost: 75 },
  { users: 10000, cost: 350 },
  { users: 100000, cost: 3500 },
  { users: 1000000, cost: 110000 }
];

// === INTERPOLACIÓN DE COSTOS DE INFRA ===
const getInfraCost = (users: number): number => {
  const sorted = [...infraCosts].sort((a, b) => a.users - b.users);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (users >= sorted[i].users && users <= sorted[i + 1].users) {
      const ratio = (users - sorted[i].users) / (sorted[i + 1].users - sorted[i].users);
      return sorted[i].cost + ratio * (sorted[i + 1].cost - sorted[i].cost);
    }
  }
  return users > 1000000 ? 110000 + (users - 1000000) * 0.1 : sorted[sorted.length - 1].cost;
};

// === PROYECCIÓN DE 3 AÑOS ===
const projectYears = (data: any) => {
  let totalUsers = 100;
  let premiumUsers = 0;
  const years = [];

  for (let year = 1; year <= 3; year++) {
    for (let m = 0; m < 12; m++) {
      totalUsers = totalUsers * (1 + data.monthlyGrowth);
    }

    const newPremium = totalUsers * data.conversionRate;
    const retainedPremium = year > 1 ? premiumUsers * (1 - data.churnRate) : 0;
    premiumUsers = newPremium + retainedPremium;

    const infra = getInfraCost(totalUsers);
    const team = totalUsers < 1000 ? 500 : totalUsers < 10000 ? 2000 : totalUsers < 100000 ? 8000 : 25000;
    const marketing = totalUsers * data.cac * 0.3;
    const fixed = 280;
    const totalCost = infra + team + marketing + fixed;

    const revenue = premiumUsers * data.arpu * 12;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    years.push({
      year: `Año ${year}`,
      totalUsers: Math.round(totalUsers),
      premiumUsers: Math.round(premiumUsers),
      revenue: Math.round(revenue),
      cost: Math.round(totalCost),
      profit: Math.round(profit),
      margin: Math.round(margin),
      breakEven: profit > 0 ? 'Sí' : 'No'
    });
  }

  return years;
};

export default function ProyeccionAnual() {
  const { data } = useFinanzas();
  const projections = projectYears(data);

  const chartData = projections.map(p => ({
    name: p.year,
    ingresos: p.revenue,
    costos: p.cost,
    profit: p.profit
  }));

  const current = projections[0];
  const final = projections[2];

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-indigo-600" />
            Proyección 3 Años
          </h3>
          <p className="text-slate-600 mt-1">
            Ingresos, costos y break-even con <strong>{data.label}</strong>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Break-even</p>
          <p className="text-2xl font-bold text-green-600">
            {projections.find(p => p.profit > 0)?.year || 'Año 3+'}
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-64 md:h-80 mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
            <YAxis tick={{ fill: '#64748b' }} />
            <Tooltip 
              formatter={(value: number) => `$${value.toLocaleString()}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
            <Legend />
            <Bar dataKey="ingresos" fill="#10b981" radius={[8, 8, 0, 0]} name="Ingresos" />
            <Bar dataKey="costos" fill="#ef4444" radius={[8, 8, 0, 0]} name="Costos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* KPIs Finales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
          <p className="text-sm text-green-700 font-medium">Ingresos Año 3</p>
          <p className="text-3xl font-bold text-green-900">
            ${final.revenue.toLocaleString()}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {final.premiumUsers.toLocaleString()} premium
          </p>
        </div>

        <div className="text-center p-5 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200">
          <p className="text-sm text-purple-700 font-medium">Margen Año 3</p>
          <p className="text-3xl font-bold text-purple-900">
            {final.margin}%
          </p>
          <p className="text-xs text-purple-600 mt-1">
            {final.profit > 0 ? 
              <span className="flex items-center justify-center gap-1">
                <ArrowUpRight className="w-4 h-4" /> Rentable
              </span> : 
              'En camino'
            }
          </p>
        </div>

        <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <p className="text-sm text-blue-700 font-medium">Usuarios Totales</p>
          <p className="text-3xl font-bold text-blue-900">
            {final.totalUsers.toLocaleString()}
          </p>
          <p className="text-xs text-blue-600 mt-1">
  Crecimiento: {(
    ((final.totalUsers / 100) ** (1 / 3) - 1) * 100
  ).toFixed(0)}% anual
</p>
        </div>
      </div>

      {/* Nota */}
      <p className="text-xs text-slate-500 text-center mt-6">
        Cálculos basados en costos reales (Vercel, Neon, Cloudinary, WhatsApp, OpenAI) + fijos $280/mes.
      </p>
    </div>
  );
}