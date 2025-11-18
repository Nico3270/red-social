'use client';

import { useState } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Users, Server, Megaphone } from 'lucide-react';

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

// Costos fijos reales anuales (2025)
const fixedAnnual = 30 * 12 + 12 * 12 + 8 * 12 + 11 * 12 + 10 + 15; // $757/año

// Compensación del fundador (escalable según rentabilidad)
const getFounderCompensation = (profit: number, year: number): number => {
  if (year <= 2) return 1500 * 12; // $18K/año
  if (profit <= 0) return 1800 * 12; // $21.6K/año
  if (profit < 2_000_000) return 2500 * 12; // $30K/año
  if (profit < 10_000_000) return 4000 * 12; // $48K/año
  const base = 60_000;
  const bonus = profit * 0.01; // 1% del profit como incentivo
  return Math.min(120_000, base + bonus); // Tope: $120K/año
};

// Costo del equipo operativo (sin fundador, fully loaded +30% LATAM)
const getOperationalTeamCost = (totalUsers: number): number => {
  if (totalUsers < 100_000) return totalUsers * 1.5;
  if (totalUsers < 1_000_000) return 400_000 + totalUsers * 0.8;
  if (totalUsers < 5_000_000) return 1_500_000 + totalUsers * 0.55;
  return 4_000_000 + totalUsers * 0.35;
};

// Cálculo mensual de infraestructura (devuelve total + breakdown)
const getInfraCostMonthly = (totalUsers: number, premiumUsers: number) => {
  const daus = totalUsers * 0.10; // 10% activos diarios

  // Vercel (hosting escalable)
  const vercel =
    daus < 50_000
      ? 100 + daus * 0.01
      : daus < 500_000
        ? 500 + daus * 0.003
        : 2000 + daus * 0.0015;

  // Neon (base de datos)
  const neon =
    totalUsers < 50_000
      ? 20
      : totalUsers < 500_000
        ? 150 + totalUsers * 0.001
        : 500 + (totalUsers - 500_000) * 0.001;

  // Cloudinary (imágenes y videos)
  const cloudinary = 89 + totalUsers * 0.005;

  // WhatsApp Business API (utility Colombia 2025)
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

  // Brevo (emails transaccionales)
  const brevo = totalUsers < 100_000 ? 0 : totalUsers * 0.0005;

  // OpenAI (IA en la app)
  const productsPerPremiumBizMonthly = 2;
  const productsPerFreeBizMonthly = 1;
  const premiumBiz = premiumUsers;
  const freeBiz = (totalUsers - premiumUsers) * 0.1;
  const totalProductsMonth = premiumBiz * productsPerPremiumBizMonthly + freeBiz * productsPerFreeBizMonthly;
  const costPerProduct = 0.003;
  const openai = totalProductsMonth * costPerProduct;

  const total = vercel + neon + cloudinary + whatsapp + brevo + openai;

  return {
    total: Math.round(total),
    breakdown: {
      vercel: Math.round(vercel),
      neon: Math.round(neon),
      cloudinary: Math.round(cloudinary),
      whatsapp: Math.round(whatsapp),
      brevo: Math.round(brevo),
      openai: Math.round(openai),
    }
  };
};

const getInfraCost = (totalUsers: number, premiumUsers: number): number =>
  getInfraCostMonthly(totalUsers, premiumUsers).total * 12;

// Proyección anual
const projectYear = (
  d: ScenarioData,
  year: number,
  prevUsers: number = 0,
  prevPremium: number = 0
) => {
  const annualGrowth = Math.pow(1 + d.monthlyGrowth, 12) - 1;
  const total = year === 1 ? 100 * (1 + annualGrowth) : prevUsers * (1 + annualGrowth);
  const newUsers = total - prevUsers;
  const paidUsers = newUsers * (1 - d.organicRatio);
  const newPremium = total * d.conversionRate;
  const retainedPremium = year > 1 ? prevPremium * (1 - d.churnRate) : 0;
  const premium = newPremium + retainedPremium;

  const cac = d.minCAC + (d.initialCAC - d.minCAC) * Math.exp(-total / 300_000);
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
    prevPremium: premium,
  };
};

// Rangos para tabla dinámica de infraestructura
const infraRanges = [
  { users: 1_000, label: "1K" },
  { users: 10_000, label: "10K" },
  { users: 100_000, label: "100K" },
  { users: 1_000_000, label: "1M" },
  { users: 5_000_000, label: "5M" },
  { users: 10_000_000, label: "10M" },
];

export default function TablaPL() {
  const [scenario, setScenario] = useState<Scenario>('intermedio');
  const d = scenarioData[scenario];

  // Generar proyección de 5 años
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
      {/* Caja explicativa */}
      <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 p-2 rounded-lg">
            <TrendingUp className="w-6 h-6 text-green-700" />
          </div>
          <h4 className="text-xl font-bold text-green-900">P&L Completo (Profit & Loss)</h4>
        </div>
        <p className="text-sm text-green-800 mb-4">
          Ingresos, costos y rentabilidad del <strong>escenario {d.label.toLowerCase()}</strong>.
        </p>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-900 mb-2">Conclusiones clave:</p>
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
              <span><strong>Infraestructura:</strong> calculada en tiempo real (ver tabla dinámica inferior).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 w-2 h-2 bg-green-600 rounded-full"></span>
              <span><strong>Costos fijos:</strong> ${fixedAnnual}/año (Grok, Premiere, Midjourney, ElevenLabs, dominio, correo).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 w-2 h-2 bg-green-600 rounded-full"></span>
              <span><strong>Compensación fundador:</strong> escalonada según rentabilidad (incluida en “Equipo”).</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Header + Break-even */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-green-600" />
            P&L 5 Años
          </h3>
          <p className="text-slate-600 mt-1">Detalle financiero con <strong>{d.label}</strong></p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Break-even</p>
          <p className="text-2xl font-bold text-green-600">
            {rows.find(r => r.profit > 0)?.year || 'Año 5+'}
          </p>
        </div>
      </div>

      {/* Selector de escenario */}
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

      {/* Tabla P&L Principal */}
      <div className="overflow-x-auto mb-10">
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
                <td className="px-6 py-4 text-right text-green-600 font-bold">${r.revenue.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">${r.infra.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">${r.team.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">${r.marketing.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">${r.fixed.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-red-600 font-bold">${r.cost.toLocaleString()}</td>
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

      {/* TABLA DE INFRAESTRUCTURA 100% DINÁMICA */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" />
          Costos de Infraestructura por Usuarios (Mensual) – Cálculo en Tiempo Real
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
                <th className="px-4 py-2 text-right font-bold">Total Mensual</th>
              </tr>
            </thead>
            <tbody>
              {infraRanges.map(({ users, label }) => {
                const premiumUsers = Math.round(users * d.conversionRate);
                const { total, breakdown } = getInfraCostMonthly(users, premiumUsers);

                return (
                  <tr key={label} className={label.includes('M') ? 'bg-slate-50' : 'bg-white'}>
                    <td className="px-4 py-2 font-medium">{label}</td>
                    <td className="px-4 py-2 text-right">${breakdown.vercel.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">${breakdown.neon.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">${breakdown.cloudinary.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">${breakdown.whatsapp.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">${breakdown.brevo.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">${breakdown.openai.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-bold">${total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-600 mt-3">
          Cálculo 100% dinámico usando <code>getInfraCostMonthly()</code>. 
          Premium ≈ {Math.round(d.conversionRate * 100)}% del total (escenario actual). 
          Se actualiza automáticamente al cambiar costos o escenario.
        </p>
      </div>

      <p className="text-xs text-slate-500 text-center mt-6">
        Cálculos basados en costos reales 2025 + fijos ${fixedAnnual}/año. 
        ARPU: $10/mes. Infra en P&L es anual (mensual ×12). 
        Profit neto después de compensación escalonada del fundador.
      </p>
    </div>
  );
}