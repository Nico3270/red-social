// components/pitch/MomentoMyckeo.tsx
'use client';

import { motion } from 'framer-motion';
import { titleFont } from '@/config/fonts';
import { TrendingUp,  Users, Zap,  Brain,  ArrowUp, ArrowDown, TrendingDown, Network } from 'lucide-react';

export default function MomentoMyckeo() {
    return (
        <section
            id="momento"
            className="w-full bg-white px-6 pt-12 md:pt-16 pb-16"
        >
            <div className="w-full max-w-7xl mx-auto space-y-12 md:space-y-16">
                {/* Título principal */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center"
                >
                    <h2 className={`text-4xl md:text-6xl font-bold text-slate-900 tracking-tight ${titleFont.className} mb-6`}>
                        El Momento Perfecto para Myckeo
                    </h2>
                    <p className="text-xl md:text-2xl font-medium text-slate-700 max-w-4xl mx-auto">
                        Post-pandemia, IA y mobile: el pico de adopción digital para PYMEs
                    </p>
                </motion.div>

                {/* Línea temporal interactiva con hitos clave */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="relative"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.2,
                                delayChildren: 0.3,
                            },
                        },
                    }}
                >
                    <div className="relative flex items-center justify-center mb-2">
                        {/* Línea de tiempo horizontal */}
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full" />
                        </div>

                        {/* Hitos en línea */}
                        <div className="relative z-10 flex justify-between w-full max-w-6xl mx-auto">
                            {[
                                {
                                    year: "2020",
                                    title: "Explosión Post-Pandemia",
                                    desc: "E-commerce LATAM +36% (Statista 2023). 80% busca local online (Google).",
                                    icon: TrendingUp,
                                    color: "text-red-600",
                                    stat: "+36%",
                                },
                                {
                                    year: "2024",
                                    title: "Boom No-Code",
                                    desc: "Mercado de $4B en herramientas simples (Gartner). WhatsApp Business: 500M usuarios.",
                                    icon: Zap,
                                    color: "text-amber-600",
                                    stat: "$4B",
                                },
                                {
                                    year: "2025",
                                    title: "60% PYMEs Invierten",
                                    desc: "IDC: 60% de PYMEs LATAM en plataformas digitales. Myckeo lidera el nicho local.",
                                    icon: Users,
                                    color: "text-emerald-600",
                                    stat: "60%",
                                },
                                {
                                    year: "2026+",
                                    title: "Era IA: Contenido Social Sobrevive",
                                    desc: "IA reduce visibilidad web 90% (Nina Schick). Sobreviven comunidades interactivas como Myckeo.",
                                    icon: Brain,
                                    color: "text-purple-600",
                                    stat: "90%",
                                },
                            ].map((hito, idx) => (
                                <motion.div
                                    key={idx}
                                    variants={{
                                        hidden: { opacity: 0, y: 50 },
                                        visible: { opacity: 1, y: 0 },
                                    }}
                                    className="flex flex-col items-center relative"
                                    style={{ zIndex: 10 }}
                                >
                                    {/* Punto en la línea */}
                                    <div className={`w-12 h-12 ${hito.color} bg-gradient-to-br rounded-full shadow-lg relative -mt-3`}>
                                        <hito.icon className="w-10 h-10 text-red absolute inset-0 m-auto" />
                                    </div>
                                    {/* Tarjeta de hito */}
                                    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl ring-1 ring-slate-200 w-64 text-center mt-6 hover:scale-105 transition-all">
                                        <div className={`text-2xl font-black ${hito.color} mb-2`}>{hito.stat}</div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{hito.year}</h3>
                                        <h4 className="text-base font-semibold text-slate-700 mb-3">{hito.title}</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">{hito.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Impacto de IA en visibilidad — Más grande y claro */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="w-full px-4"
                >
                    <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-200 max-w-6xl mx-auto">
                        <div className="flex flex-col items-center gap-2 mb-4">

                            <h3 className="text-4xl md:text-5xl font-bold text-slate-900 text-center tracking-tight">
                                IA: ¿Amenaza o Oportunidad?
                            </h3>
                            <p className="text-slate-600 text-center text-lg max-w-2xl">
                                El panorama digital está cambiando más rápido que nunca. Así se ve el impacto.
                            </p>
                        </div>


                        <div className="grid md:grid-cols-2 gap-10 md:gap-8 mt-6">
                            {/* IA Impacto */}
                            <div className="bg-red-50 border border-red-200 rounded-3xl p-8 shadow-inner">
                                <h4 className="text-2xl font-bold text-red-600 flex items-center gap-3 mb-6">
                                    <TrendingDown className="w-8 h-8" /> IA Impacto
                                </h4>
                                <div className="space-y-4 text-lg text-slate-700">
                                    <div className="flex items-center gap-3">
                                        <ArrowDown className="w-6 h-6 text-red-500" />
                                        <p><span className="font-bold text-red-600">-90%</span> tráfico web</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <ArrowDown className="w-6 h-6 text-red-500" />
                                        <p><span className="font-bold text-red-600">Menos lectura</span> de blogs</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <ArrowDown className="w-6 h-6 text-red-500" />
                                        <p><span className="font-bold text-red-600">SEO tradicional</span> pierde relevancia</p>
                                    </div>
                                </div>
                            </div>


                            {/* Myckeo Solución */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 shadow-inner">
                                <h4 className="text-2xl font-bold text-emerald-600 flex items-center gap-3 mb-6">
                                    <TrendingUp className="w-8 h-8" /> Myckeo Solución
                                </h4>
                                <div className="space-y-4 text-lg text-slate-700">
                                    <div className="flex items-center gap-3">
                                        <ArrowUp className="w-6 h-6 text-emerald-500" />
                                        <p><span className="font-bold text-emerald-600">+ Interacciones</span> reales</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Network className="w-6 h-6 text-emerald-500" />
                                        <p><span className="font-bold text-emerald-600">Contenido vivo</span> todos los días</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <ArrowUp className="w-6 h-6 text-emerald-500" />
                                        <p><span className="font-bold text-emerald-600">Comunidad</span> que se impulsa entre sí</p>
                                    </div>
                                </div>
                            </div>
                        </div>


                        <p className="text-sm text-slate-500 mt-10 text-center">Nina Schick, AI Expert — 2025</p>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}