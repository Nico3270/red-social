// components/pitch/roadmap/RoadMap.tsx
'use client';

import { useState } from 'react';
import { 
  Calendar,
  Globe,
  TrendingUp,
  Brain,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Bot,
  FileText,
  Store,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Milestone {
  quarter: string;
  year: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  completed?: boolean;
  current?: boolean;
}

const roadmap: Milestone[] = [
  {
    quarter: "Q4",
    year: 2025,
    title: "Lanzamiento MVP",
    description: "Primeros clientes en Colombia con enfoque en microempresas locales.",
    icon: <Globe className="w-6 h-6" />,
    color: "from-green-500 to-emerald-600",
    current: true,
    features: [
      "Feed global + promoción básica",
      "Lanzamiento en redes sociales (IG, TikTok, WhatsApp)",
      "Sistema de suscripciones (Stripe/PayU)",
      "Bot IA básico: respuestas sobre pedidos y reservas"
    ]
  },
  {
    quarter: "Q1-Q2",
    year: 2026,
    title: "Personalización y Reportes",
    description: "Crecimiento orgánico y retención con herramientas profesionales.",
    icon: <Calendar className="w-6 h-6" />,
    color: "from-blue-500 to-indigo-600",
    features: [
      
      "Feed personalizado por usuario",
      "Publicidad interna (ads destacados)",
      "Reportes automatizados (ventas, visitas, engagement)"
    ]
  },
  {
    quarter: "Q3",
    year: 2026,
    title: "Expansión Regional & Premium",
    description: "Escalamos a Perú, Ecuador y Chile con funciones avanzadas.",
    icon: <MapPin className="w-6 h-6" />,
    color: "from-purple-500 to-pink-600",
    features: [
      "Expansión regional (CO → PE, EC, CL)",
      "Funciones premium: SEO local, analíticas avanzadas",
      "Soporte prioritario + plantillas premium",
      "Bot IA avanzado: upselling y recomendaciones"
    ]
  },
  {
    quarter: "2027+",
    year: 2027,
    title: "Marketplace & IA Avanzada",
    description: "Ecosistema completo con transacciones y automatización total.",
    icon: <Brain className="w-6 h-6" />,
    color: "from-orange-500 to-red-600",
    features: [
      "Marketplace comisionado (5-10%)",
      "App móvil híbrida (iOS/Android)",
      "Integraciones IA: generación de contenido, pricing dinámico",
      "Expansión LATAM completa"
    ]
  }
];

export default function RoadMap() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div id='roadmap' className="bg-gradient-to-br from-slate-50 via-white to-green-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Título Principal */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 flex items-center justify-center gap-3">
            <TrendingUp className="w-10 h-10 text-green-600" />
            Nuestro Camino Hacia el Éxito
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            <strong className="text-green-700">De Colombia al liderazgo LATAM</strong> con un roadmap claro, realista y enfocado en tracción temprana.
          </p>
        </motion.div>

        {/* Timeline Horizontal */}
        <div className="relative">
          {/* Línea de progreso */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 hidden md:block">
            <div className="h-full bg-gradient-to-r from-green-500 to-transparent w-1/4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {roadmap.map((milestone, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                className="relative"
              >
                {/* Card */}
                <div className={`rounded-3xl p-1 transition-all duration-300 ${hovered === index ? 'scale-105 shadow-2xl' : ''}`}>
                  <div className={`bg-gradient-to-br ${milestone.color} rounded-3xl p-6 text-white h-full`}>
                    {/* Icono + Estado */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        {milestone.icon}
                      </div>
                      <div className="flex items-center gap-2">
                        {milestone.completed && <CheckCircle2 className="w-5 h-5 text-white" />}
                        {milestone.current && <Clock className="w-5 h-5 text-yellow-300 animate-pulse" />}
                      </div>
                    </div>

                    {/* Tiempo */}
                    <div className="mb-2">
                      <p className="text-3xl font-bold">{milestone.quarter}</p>
                      <p className="text-sm opacity-90">{milestone.year}</p>
                    </div>

                    {/* Título */}
                    <h3 className="text-xl font-bold mb-2">{milestone.title}</h3>
                    
                    {/* Descripción */}
                    <p className="text-md opacity-90 mb-4">{milestone.description}</p>

                    {/* Features (hover) */}
                    {hovered === index && (
                      <motion.ul 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2 text-md"
                      >
                        {milestone.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </div>
                </div>

                {/* Conector móvil */}
                {index < roadmap.length - 1 && (
                  <div className="md:hidden flex justify-center my-4">
                    <ArrowRight className="w-6 h-6 text-slate-400" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Estrategia de Tracción Temprana */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-8 border border-green-200"
        >
          <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center flex items-center justify-center gap-2">
            <Target className="w-7 h-7 text-green-600" />
            Estrategia de Tracción Temprana (Q1 - Q2 - 2026)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Store className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Captación Local</h4>
                <p className="text-md text-slate-600">Ferias, mercados y alianzas con gremios en ciudades principales.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bot className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Automatización Inmediata</h4>
                <p className="text-md text-slate-600">Bot IA en WhatsApp para reservas, pedidos y soporte 24/7.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Reportes Automáticos</h4>
                <p className="text-md text-slate-600">Dashboard con ventas, visitas y leads generados.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-lg text-slate-500 mt-8">
          <strong>Enfoque inicial:</strong> 1.000 usuarios en Colombia 
        </p>
      </div>
    </div>
  );
}