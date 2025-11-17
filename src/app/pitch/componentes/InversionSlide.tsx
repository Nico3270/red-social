// components/pitch/inversion/InversionSlide.tsx
'use client';

import { useState } from 'react';
import { 
  Code, 
  Megaphone, 
  Server, 
  Users, 
  ArrowRight,
  Sparkles,
  Handshake,
  TrendingUp,
  PieChart as PieIcon,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const useOfFunds = [
  { name: 'Desarrollo', value: 40, color: '#10b981', icon: <Code className="w-5 h-5" /> },
  { name: 'Marketing', value: 30, color: '#3b82f6', icon: <Megaphone className="w-5 h-5" /> },
  { name: 'Operaciones', value: 20, color: '#f59e0b', icon: <Server className="w-5 h-5" /> },
  { name: 'Equipo', value: 10, color: '#8b5cf6', icon: <Users className="w-5 h-5" /> }
];

export default function InversionSlide() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white pt-6 ">
      <div className="max-w-7xl mx-auto">
        {/* Título Principal */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-3">
            <Target className="w-10 h-10 text-indigo-600" />
            Buscamos un Cofundador Estratégico
          </h1>
          <p className="text-lg text-gray-800 max-w-3xl mx-auto">
            
            Buscamos un socio con experiencia en marketing, growth y alianzas para llevar Myckeo al siguiente nivel.
          </p>
        </motion.div>

        {/* Pastel + Uso de Fondos (Hipotético) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfico Pastel */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-6 text-center flex items-center justify-center gap-2">
              <PieIcon className="w-6 h-6 text-indigo-600" />
              Uso Hipotético de Fondos Futuros
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
  data={useOfFunds}
  cx="50%"
  cy="50%"
  labelLine={false}
  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
  outerRadius={100}
  fill="#8884d8"
  dataKey="value"
>

                  {useOfFunds.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Detalle Uso */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {useOfFunds.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white`} style={{ backgroundColor: item.color }}>
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{item.name}</h4>
                      <p className="text-2xl font-bold text-slate-900">{item.value}%</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
                {hovered === index && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-sm text-slate-600"
                  >
                    {item.name === 'Desarrollo' && 'Módulos pendientes, app móvil, IA avanzada'}
                    {item.name === 'Marketing' && 'Adquisición usuarios, alianzas locales, redes sociales'}
                    {item.name === 'Operaciones' && 'Servidores escalables, legal, compliance'}
                    {item.name === 'Equipo' && 'Consultores IA, especialistas marketing, growth'}
                  </motion.p>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Perfil del Cofundador Ideal */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 my-4 border border-indigo-200"
        >
          <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center flex items-center justify-center gap-2">
            <Handshake className="w-7 h-7 text-indigo-600" />
            Perfil del Cofundador Ideal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-3 mx-auto">
                <Megaphone className="w-6 h-6 text-indigo-600" />
              </div>
              <p className="font-bold text-center">Experiencia en Marketing</p>
              <p className="text-sm text-slate-600 text-center mt-1">Lanzamientos exitosos, growth hacking, redes sociales.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3 mx-auto">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <p className="font-bold text-center">Alianzas & Ventas</p>
              <p className="text-sm text-slate-600 text-center mt-1">Contactos con gremios, retailers, fondos.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-3 mx-auto">
                <TrendingUp className="w-6 h-6 text-violet-600" />
              </div>
              <p className="font-bold text-center">Compromiso Total</p>
              <p className="text-sm text-slate-600 text-center mt-1">Equity + sudor. Juntos al siguiente nivel.</p>
            </div>
          </div>
        </motion.div>

        {/* Opción Capital (Secundaria) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-8 border border-green-200"
        >
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-green-600" />
            Socio Capitalista (Opcional)
          </h3>
          <p className="text-slate-700 mb-4">
            Si traes <strong>capital + experiencia</strong>, podemos acelerar el crecimiento con inversión estratégica.
          </p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-green-500" />
              Acelerar adquisición y expansión
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-green-500" />
              Valuación post-tracción temprana
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-green-500" />
              SAFE o equity negociable
            </li>
          </ul>
        </motion.div>

        <p className="text-center text-md text-slate-500 mt-8">
          <strong>Prioridad:</strong> Cofundador con expertise.
        </p>
      </div>
    </div>
  );
}