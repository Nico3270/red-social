// components/pitch/MonetizacionMyckeo.tsx
'use client';

import { motion } from 'framer-motion';
import { titleFont } from '@/config/fonts';
import { DollarSign, TrendingUp,  Clock, CheckCircle,  Shield, Star, LockOpen, Target } from 'lucide-react';
import { useState } from 'react';

export default function MonetizacionMyckeo() {
    const [activeModel, setActiveModel] = useState<'value-first' | 'commission'>('value-first');

    return (
        <section
            id="monetizacion"
            className="w-full bg-gradient-to-br from-amber-50 via-white to-emerald-50/30 px-6 pt-12 md:pt-16 pb-16"
        >
            <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8">
                {/* Título principal */}



                {/* Título principal */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-12"
                >
                    <h2 className={`text-3xl md:text-6xl font-bold text-slate-900 tracking-tight ${titleFont.className} mb-2`}>
                        Monetización: Valor Antes que Pago
                    </h2>
                    <p className="text-xl md:text-2xl font-medium text-slate-700 max-w-4xl mx-auto">
                        El usuario prueba, vende, gana — y luego paga. Así garantizamos recurrencia.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="max-w-3xl mx-auto mb-8 p-6 rounded-2xl bg-white/70 backdrop-blur-xl shadow-lg ring-1 ring-slate-200"
                >
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-2 text-center">
                        Formas posibles y actualmente planteadas de monetización
                    </h3>
                    <p className="text-lg md:text-xl text-slate-700">
                        Se han definido dos opciones posibles para generar ingresos:
                        <span className="font-semibold"> un modelo basado en valor antes de pagar y un modelo de</span>    
                        <span className="font-semibold"> comisión por pedido</span>.
                        Ambas estrategias están planteadas y permiten escalar con baja fricción y alta adopción.
                    </p>
                </motion.div>



                {/* Tabs: Modelo 1 vs Modelo 2 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="flex justify-center mb-10"
                >
                    <div className="inline-flex rounded-full bg-white/80 backdrop-blur-xl p-1 shadow-lg ring-1 ring-slate-200">
                        <button
                            onClick={() => setActiveModel('value-first')}
                            className={`px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 ${activeModel === 'value-first'
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                                : 'text-slate-700 hover:text-slate-900'
                                }`}
                        >
                            <Target className="w-5 h-5" />
                            Valor Primero
                        </button>

                        <button
                            onClick={() => setActiveModel('commission')}
                            className={`px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 ${activeModel === 'commission'
                                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                                : 'text-slate-700 hover:text-slate-900'
                                }`}
                        >
                            <DollarSign className="w-5 h-5" />
                            Comisión por Pedido
                        </button>
                    </div>
                </motion.div>

                {/* Modelo 1: Valor Primero (Gratis hasta límite → Suscripción) */}
                {activeModel === 'value-first' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-12"
                    >
                        {/* Flujo de valor primero */}
                        <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 p-8 ">
                            <h3 className="text-2xl md:text-3xl font-bold text-center text-slate-900 mb-10">
                                Gratis hasta que generes valor → $5-10/mes
                            </h3>
                            <div className="grid md:grid-cols-4 gap-6">
                                {[
                                    {
                                        step: "1",
                                        title: "Prueba gratis",
                                        desc: "Perfil, catálogo, pedidos, reseñas — todo ilimitado",
                                        icon: LockOpen,
                                        color: "from-emerald-400 to-teal-500",
                                    },
                                    {
                                        step: "2",
                                        title: "Genera ventas",
                                        desc: "+10 pedidos, +5 reservas, +20 reseñas",
                                        icon: TrendingUp,
                                        color: "from-blue-400 to-indigo-500",
                                    },
                                    {
                                        step: "3",
                                        title: "Se demuestra valor",
                                        desc: "El negocio crece. El usuario ve ROI claro",
                                        icon: Star,
                                        color: "from-amber-400 to-orange-500",
                                    },
                                    {
                                        step: "4",
                                        title: "Suscribe $5-10/mes",
                                        desc: "Sin límites + analíticas. Recurrencia >90%",
                                        icon: DollarSign,
                                        color: "from-purple-400 to-pink-500",
                                    },
                                ].map((phase, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="text-center"
                                    >
                                        <div className={`w-20 h-20 mx-auto mb-4 bg-gradient-to-br ${phase.color} rounded-full flex items-center justify-center shadow-lg`}>
                                            <phase.icon className="w-10 h-10 text-white" />
                                        </div>
                                        <p className="font-bold text-slate-900 text-lg">{phase.step}</p>
                                        <p className="text-xl font-semibold text-red-800 mt-2">{phase.title}</p>
                                        <p className="text-md text-gray-800 font-bold mt-1">{phase.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Por qué la recurrencia es alta */}
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-8 shadow-xl ring-1 ring-emerald-200">
                            <h3 className="text-2xl font-bold text-center text-slate-900 mb-4">
                                ¿Cómo impulsamos la recurrencia de los negocios?
                            </h3>
                            <div className="grid md:grid-cols-3 gap-6 text-center">
                                {[
                                    {
                                        title: "Inversión de tiempo",
                                        desc: "El usuario crea perfil, catálogo, reseñas. No quiere perderlo.",
                                        icon: Clock,
                                        color: "text-emerald-600",
                                    },
                                    {
                                        title: "Resultados tangibles",
                                        desc: "+$500/mes en ventas promedio. El usuario ve ROI claro.",
                                        icon: TrendingUp,
                                        color: "text-blue-600",
                                    },
                                    {
                                        title: "Costo bajo",
                                        desc: "$5-10/mes = 1 café. Justo por mantener el negocio digital.",
                                        icon: DollarSign,
                                        color: "text-amber-600",
                                    },
                                ].map((reason, idx) => (
                                    <div key={idx} className="space-y-3">
                                        <reason.icon className={`w-12 h-12 mx-auto ${reason.color}`} />
                                        <h4 className="text-xl font-semibold text-red-800 mt-2">{reason.title}</h4>
                                        <p className="text-md text-gray-800 font-bold mt">{reason.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Modelo 2: Comisión por Pedido */}
                {activeModel === 'commission' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-12"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 p-8 md:p-12">
                            <h3 className="text-2xl md:text-3xl font-bold text-center text-slate-900 mb-10">
                                Comisión por Pedido: 5% por transacción
                            </h3>
                            <div className="grid md:grid-cols-3 gap-8 text-center">
                                {[
                                    {
                                        title: "Gratis para siempre",
                                        desc: "Todo ilimitado. Solo pagas cuando vendes.",
                                        icon: Shield,
                                        color: "from-emerald-400 to-teal-500",
                                    },
                                    {
                                        title: "5% por pedido",
                                        desc: "Ej: $100 venta → $5 comisión. Myckeo recibe $5.",
                                        icon: DollarSign,
                                        color: "from-amber-400 to-orange-500",
                                    },
                                    {
                                        title: "Sin riesgo",
                                        desc: "No vendes → no pagas. Ideal para probar.",
                                        icon: CheckCircle,
                                        color: "from-blue-400 to-indigo-500",
                                    },
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="space-y-4"
                                    >
                                        <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center shadow-lg`}>
                                            <item.icon className="w-10 h-10 text-white" />
                                        </div>
                                        <h4 className="text-2xl font-bold text-slate-900">{item.title}</h4>
                                        <p className="text-slate-600 text-lg">{item.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Fuentes de Ingresos */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 p-8"
                >
                    <h3 className="text-2xl font-bold text-center text-slate-900 mb-8">Fuentes de Ingresos</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { value: "70%", label: "Suscripciones", desc: "Recurrente y predecible", color: "from-emerald-500 to-teal-600" },
                            { value: "20%", label: "Publicidad interna", desc: "Negocios pagan por destacar", color: "from-blue-500 to-indigo-600" },
                            { value: "10%", label: "Marketplace", desc: "Comisión por ventas cruzadas", color: "from-purple-500 to-pink-600" },
                        ].map((income, idx) => (
                            <div
                                key={idx}
                                className={`bg-gradient-to-br ${income.color} rounded-2xl p-6 text-white text-center shadow-lg`}
                            >
                                <p className="text-4xl font-black mb-2">{income.value}</p>
                                <p className="text-xl font-bold">{income.label}</p>
                                <p className="text-lg opacity-90 mt-1">{income.desc}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* CTA final */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="text-center"
                >
                    <div className="inline-flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full px-8 py-4 shadow-xl">
                        <DollarSign className="w-6 h-6" />
                        <p className="text-lg font-bold">Monetización justa: El usuario paga solo cuando gana</p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}