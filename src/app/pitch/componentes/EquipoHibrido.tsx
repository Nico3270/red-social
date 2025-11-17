// components/pitch/equipo/EquipoHibrido.tsx
'use client';

import { useState } from 'react';
import { 
  Brain, 
  Zap, 
  Users, 
  Bot, 
  Palette, 
  Mic, 
  Workflow,
  MessageSquare,
  Bell,
  Sparkles,
  ArrowRight,
  User,
  BarChart,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

const founder = {
  name: "Nicolás Rodríguez",
  role: "Visionario & CEO",
  description: "Emprendedor digital con expertise en plataformas sociales. Lidera estrategia, desarrollo y crecimiento.",
  icon: <User className="w-8 h-8" />,
  color: "from-indigo-500 to-purple-600"
};

const aiTeam = [
  {
    name: "Grok",
    role: "Análisis, Innovación y Desarrollo de Código",
    description: "Asiste en la generación de código, optimización de componentes y mejora de procesos internos de desarrollo.",
    icon: <Brain className="w-6 h-6" />,
    color: "from-blue-500 to-cyan-600"
  },
  {
    name: "OpenAI/ChatGPT",
    role: "Asistente de Contenido y SEO",
    description: "Redacta descripciones precisas y detalladas de productos, mejorando la visibilidad y el SEO de la plataforma.",
    icon: <Bot className="w-6 h-6" />,
    color: "from-green-500 to-emerald-600"
  },
  {
    name: "Midjourney",
    role: "Diseño y Creatividad Visual",
    description: "Genera assets gráficos, logotipos y materiales visuales para publicaciones, videos y redes sociales.",
    icon: <Palette className="w-6 h-6" />,
    color: "from-pink-500 to-rose-600"
  },
  {
    name: "Eleven Labs",
    role: "Voz y Narración",
    description: "Produce voces naturales para tutoriales, videos y notificaciones, con futuro uso en agentes de atención al cliente.",
    icon: <Mic className="w-6 h-6" />,
    color: "from-orange-500 to-amber-600"
  },
  {
    name: "n8n",
    role: "Automatización y Orquestación de Flujos",
    description: "Gestiona flujos de trabajo automáticos: correos, notificaciones y procesos de onboarding mediante agentes de IA.",
    icon: <Workflow className="w-6 h-6" />,
    color: "from-purple-500 to-violet-600"
  }
];


const automationFeatures = [
  {
    title: "Notificaciones Inteligentes",
    description: "Envía mensajes automáticos vía WhatsApp y Brevo, personalizados y contextuales gracias a IA avanzada.",
    icon: <Bell className="w-5 h-5" />
  },
  {
    title: "Soporte 24/7 con Agentes IA",
    description: "Ofrece respuestas instantáneas, resuelve dudas de usuarios y sugiere productos o servicios relevantes de manera automática.",
    icon: <MessageSquare className="w-5 h-5" />
  },
  {
    title: "Próximamente: Reportes y métricas automatizadas",
    description: "Generación automática de reportes de desempeño, actividad de usuarios y campañas, listos para análisis.",
    icon: <BarChart className="w-5 h-5" />
  },
  {
    title: "Próximamente: Gestión de citas y reservas",
    description: "Automatiza confirmaciones, reprogramaciones y recordatorios de reuniones o servicios directamente con los usuarios.",
    icon: <Calendar className="w-5 h-5" />
  }
];


export default function EquipoHibrido() {
  const [activeMember, setActiveMember] = useState<number | null>(null);

  return (
    /* --------------------------------------------------------------
       Se quita <section> y min‑h‑screen → el page.tsx ya los controla
       -------------------------------------------------------------- */
    <div id="equipo" className="bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Título Principal */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 flex items-center justify-center gap-3">
            <Users className="w-10 h-10 text-indigo-600" />
            Un Equipo Híbrido Humano‑IA
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            <strong className="text-indigo-700">Aceleramos iteraciones 5x</strong> combinando creatividad humana con eficiencia IA. 
            En fase inicial: <strong>automatización total de procesos</strong> para minimizar costos.
          </p>
        </motion.div>

        {/* Fundador */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className={`bg-gradient-to-br ${founder.color} p-1 rounded-3xl max-w-md mx-auto`}>
            <div className="bg-white rounded-3xl p-6 text-center">
              {/* <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                {founder.icon}
              </div> */}
              <h3 className="text-2xl font-bold text-slate-900">{founder.name}</h3>
              <p className="text-indigo-600 font-semibold">{founder.role}</p>
              <p className="text-md text-slate-600 mt-2">{founder.description}</p>
            </div>
          </div>
        </motion.div>

        {/* Equipo IA */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8 flex items-center justify-center gap-2">
            <Bot className="w-7 h-7 text-indigo-600" />
            Nuestro Equipo IA (Automatización Total)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {aiTeam.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                onMouseEnter={() => setActiveMember(index)}
                onMouseLeave={() => setActiveMember(null)}
                className="relative group cursor-pointer"
              >
                <div className={`bg-gradient-to-br ${member.color} p-1 rounded-2xl transition-all duration-300 ${activeMember === index ? 'scale-105 shadow-2xl' : ''}`}>
                  <div className="bg-white rounded-2xl p-5 text-center h-full flex flex-col justify-between">
                    <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full flex items-center justify-center">
                      {member.icon}
                    </div>
                    <h4 className="font-bold text-slate-900">{member.name}</h4>
                    <p className="text-md text-slate-600">{member.role}</p>
                    {activeMember === index && (
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-md text-slate-500 mt-2"
                      >
                        {member.description}
                      </motion.p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Fortalezas */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 mb-12 border border-indigo-200"
        >
          <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center flex items-center justify-center gap-2">
            <Zap className="w-7 h-7 text-indigo-600" />
            Fortalezas del Modelo Híbrido
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Iteraciones 5x más rápidas</h4>
                <p className="text-md text-slate-600">IA genera código, diseño y contenido en minutos vs. días.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Costos operativos mínimos</h4>
                <p className="text-md text-slate-600">Automatización total de notificaciones, correos y soporte.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Automatizaciones Clave */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8 flex items-center justify-center gap-2">
            <Workflow className="w-7 h-7 text-green-600" />
            Automatizaciones Fase Inicial (Costo Cero)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {automationFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{feature.title}</h4>
                    <p className="text-md text-slate-600">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        
        {/* <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-3xl p-8 text-white"
        >
          <h3 className="text-2xl font-bold mb-6 text-center">Timeline de Colaboración Humano‑IA</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Brain className="w-8 h-8" />
              </div>
              <p className="font-semibold">Día 1</p>
              <p className="text-sm text-gray-300">Estrategia + IA genera MVP</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="w-8 h-8" />
              </div>
              <p className="font-semibold">Semana 1</p>
              <p className="text-sm text-gray-300">Diseño + Código + Automatizaciones</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <ArrowUpRight className="w-8 h-8" />
              </div>
              <p className="font-semibold">Mes 1</p>
              <p className="text-sm text-gray-300">Lanzamiento + Soporte IA 24/7</p>
            </div>
          </div>
        </motion.div> */}

        <p className="text-center text-lg text-green-500 mt-4">
          Modelo híbrido: <strong>humano dirige, IA ejecuta</strong>. Costos iniciales menor a $1K/mes.
        </p>
      </div>
    </div>
  );
}