// components/pitch/finanzas/TablaPL.tsx
'use client';

import { useState } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Users,  Server, Megaphone } from 'lucide-react';

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

export default function TablaPL() {
  const [scenario, setScenario] = useState<Scenario>('intermedio');
  const d = scenarioData[scenario];

  const rows = [];
  let prevUsers = 0;
  let prevPremium = 0;
  for (let y = 1; y <= 5; y++) {
    const row = projectYear(d, y, prevUsers, prevPremium);
    rows.push(row);
    prevUsers = row.prevUsers;
    prevPremium = row.prevPremium;
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 p-6 md:p-8">
      {/* Caja Explicativa */}
<div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6 mb-8">

  {/* Header */}
  <div className="flex items-center gap-3 mb-4">
    <div className="bg-green-100 p-2 rounded-lg">
      <TrendingUp className="w-6 h-6 text-green-700" />
    </div>
    <h4 className="text-xl font-bold text-green-900">
      P&L Completo (Profit & Loss)
    </h4>
  </div>

  {/* Subtítulo */}
  <p className="text-sm text-green-800 mb-4">
    Ingresos, costos y rentabilidad del <strong>escenario {d.label.toLowerCase()}</strong>.
  </p>

  {/* Sección de conclusiones */}
  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
    <p className="text-sm font-semibold text-green-900 mb-2">
      Conclusiones clave:
    </p>

    <ul className="space-y-2 text-green-800 text-sm">

      <li className="flex items-start gap-2">
        <span className="mt-1 w-2 h-2 bg-green-600 rounded-full"></span>
        <span><strong>Break-even:</strong> año donde el profit pasa a ser positivo.</span>
      </li>

      <li className="flex items-start gap-2">
        <span className="mt-1 w-2 h-2 bg-green-600 rounded-full"></span>
        <span><strong>Crecimiento orgánico:</strong> {Math.round(d.organicRatio * 100)}% nuevos usuarios sin costo.</span>
      </li>

      <li className="flex items-start gap-2">
        <span className="mt-1 w-2 h-2 bg-green-600 rounded-full"></span>
        <span><strong>CAC decreciente:</strong> de ${d.initialCAC} → ${d.minCAC} gracias a escala.</span>
      </li>

      <li className="flex items-start gap-2">
        <span className="mt-1 w-2 h-2 bg-green-600 rounded-full"></span>
        <span><strong>Marketing limitado:</strong> máx {Math.round(d.maxMarketingPct * 100)}% de ingresos.</span>
      </li>

      <li className="flex items-start gap-2">
        <span className="mt-1 w-2 h-2 bg-green-600 rounded-full"></span>
        <span><strong>Infraestructura:</strong> costos mensuales ×12. Ej: 1.597 usuarios ≈ $93/m → $1.116/año.</span>
      </li>

      {/* Costos fijos */}
      <li className="flex items-start gap-2">
        <span className="mt-1 w-2 h-2 bg-green-600 rounded-full"></span>
        <span>
          <strong>Costos fijos reales: ${fixedPerYear}/año</strong>
          <ul className="ml-4 mt-1 space-y-1 list-disc text-green-700">
            <li>Grok: $30/mes</li>
            <li>Adobe Premiere: $12/mes</li>
            <li>Midjourney: $8/mes</li>
            <li>ElevenLabs: $11/mes</li>
            <li>Correo empresarial: $10/año</li>
            <li>Dominio: $15/año</li>
          </ul>
        </span>
      </li>

      {/* Salario fundador */}
      <li className="flex items-start gap-2">
        <span className="mt-1 w-2 h-2 bg-green-600 rounded-full"></span>
        <span><strong>Salario fundador:</strong> $12.000/año (incluido en “Equipo”).</span>
      </li>
    </ul>
  </div>
</div>



      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-green-600" />
            P&L 5 Años
          </h3>
          <p className="text-slate-600 mt-1">
            Detalle financiero con <strong>{d.label}</strong>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Break-even</p>
          <p className="text-2xl font-bold text-green-600">
            {rows.find(r => r.profit > 0)?.year || 'Año 5+'}
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
                  ? 'bg-green-900 text-white shadow-xl scale-105 ring-2 ring-green-300'
                  : 'bg-white text-slate-700 shadow hover:shadow-md hover:scale-105 border border-slate-200'
              }`}
            >
              {s.label}
              {isActive && <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">Activo</span>}
            </button>
          );
        })}
      </div>




      {/* Tabla P&L */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Año</th>
              <th className="px-6 py-3 text-right">Usuarios</th>
              <th className="px-6 py-3 text-right">Nuevos</th>
              <th className="px-6 py-3 text-right">Premium</th>
              <th className="px-6 py-3 text-right text-green-600 font-bold">Ingresos</th>
              <th className="px-6 py-3 text-right"><Server className="inline w-4 h-4" /> Infra</th>
              <th className="px-6 py-3 text-right"><Users className="inline w-4 h-4" /> Equipo</th>
              <th className="px-6 py-3 text-right"><Megaphone className="inline w-4 h-4" /> Marketing</th>
              <th className="px-6 py-3 text-right">Fijos</th>
              <th className="px-6 py-3 text-right text-red-600 font-bold">Costos</th>
              <th className="px-6 py-3 text-right font-bold">Profit</th>
              <th className="px-6 py-3 text-right">Margen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, index) => (
              <tr key={r.year} className={`bg-white border-b ${index === rows.length - 1 ? '' : 'border-slate-200'}`}>
                <td className="px-6 py-4 font-medium">{r.year}</td>
                <td className="px-6 py-4 text-right">{r.users.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">{r.newUsers.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">{r.premium.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-green-600 font-bold">
                  ${r.revenue.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">${r.infra.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">${r.team.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">${r.marketing.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">${r.fixed.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-red-600 font-bold">
                  ${r.cost.toLocaleString()}
                </td>
                <td className={`px-6 py-4 text-right font-bold ${r.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {r.profit > 0 ? '+' : ''}${r.profit.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`inline-flex items-center gap-1 ${r.margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.margin > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {r.margin}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tabla de Infraestructura hasta 10M */}
      <div className="mt-8 bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" />
          Costos de Infraestructura por Usuarios (Mensual)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
              <tr>
                <th className="px-4 py-2">Usuarios</th>
                <th className="px-4 py-2 text-right">Vercel</th>
                <th className="px-4 py-2 text-right">Neon</th>
                <th className="px-4 py-2 text-right">Cloudinary</th>
                <th className="px-4 py-2 text-right">WhatsApp</th>
                <th className="px-4 py-2 text-right">Brevo</th>
                <th className="px-4 py-2 text-right">OpenAI</th>
                <th className="px-4 py-2 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="px-4 py-2">1K</td>
                <td className="px-4 py-2 text-right">$20</td>
                <td className="px-4 py-2 text-right">$19</td>
                <td className="px-4 py-2 text-right">$89</td>
                <td className="px-4 py-2 text-right">$324</td>
                <td className="px-4 py-2 text-right">$0</td>
                <td className="px-4 py-2 text-right">$19</td>
                <td className="px-4 py-2 text-right font-bold">$471</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="px-4 py-2">10K</td>
                <td className="px-4 py-2 text-right">$50</td>
                <td className="px-4 py-2 text-right">$20</td>
                <td className="px-4 py-2 text-right">$126</td>
                <td className="px-4 py-2 text-right">$2.4K</td>
                <td className="px-4 py-2 text-right">$0</td>
                <td className="px-4 py-2 text-right">$188</td>
                <td className="px-4 py-2 text-right font-bold">$2.78K</td>
              </tr>
              <tr className="bg-white">
                <td className="px-4 py-2">100K</td>
                <td className="px-4 py-2 text-right">$500</td>
                <td className="px-4 py-2 text-right">$94</td>
                <td className="px-4 py-2 text-right">$449</td>
                <td className="px-4 py-2 text-right">$24.3K</td>
                <td className="px-4 py-2 text-right">$0</td>
                <td className="px-4 py-2 text-right">$1.9K</td>
                <td className="px-4 py-2 text-right font-bold">$27.2K</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="px-4 py-2">1M</td>
                <td className="px-4 py-2 text-right">$5K</td>
                <td className="px-4 py-2 text-right">$900</td>
                <td className="px-4 py-2 text-right">$4.5K</td>
                <td className="px-4 py-2 text-right">$243K</td>
                <td className="px-4 py-2 text-right">$0</td>
                <td className="px-4 py-2 text-right">$19K</td>
                <td className="px-4 py-2 text-right font-bold">$272K</td>
              </tr>
              <tr className="bg-white">
                <td className="px-4 py-2">5M</td>
                <td className="px-4 py-2 text-right">$22K</td>
                <td className="px-4 py-2 text-right">$4K</td>
                <td className="px-4 py-2 text-right">$20K</td>
                <td className="px-4 py-2 text-right">$1.2M</td>
                <td className="px-4 py-2 text-right">$0</td>
                <td className="px-4 py-2 text-right">$95K</td>
                <td className="px-4 py-2 text-right font-bold">$1.34M</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="px-4 py-2">10M</td>
                <td className="px-4 py-2 text-right">$40K</td>
                <td className="px-4 py-2 text-right">$7.5K</td>
                <td className="px-4 py-2 text-right">$38K</td>
                <td className="px-4 py-2 text-right">$2.4M</td>
                <td className="px-4 py-2 text-right">$0</td>
                <td className="px-4 py-2 text-right">$190K</td>
                <td className="px-4 py-2 text-right font-bold">$2.68M</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-md text-slate-500 mt-2">
          Costos reales de Vercel (Alojamiento), Neon (Base de datos), Cloudinary (Almacenamiento de multimedia), WhatsApp (Notificaciónes), Brevo (Correos de información), OpenAI (IA de ayuda en al app). Escala hasta 10M usuarios.
        </p>
      </div>

      <p className="text-xs text-slate-500 text-center mt-6">
        Cálculos basados en costos reales + fijos $732/año. ARPU: $10/mes. Infra en P&L es anual (mensual × 12).
      </p>
    </div>
  );
}