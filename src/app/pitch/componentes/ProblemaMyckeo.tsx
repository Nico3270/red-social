// components/pitch/ProblemaMyckeo.tsx
'use client';

import { motion } from 'framer-motion';
import { titleFont } from '@/config/fonts';
import {  Lock, DollarSign, Users, Smartphone, Search, EyeOff } from 'lucide-react';

export default function ProblemaMyckeo() {
    return (
        <section
            id="problema"
            className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 pt-12 md:pt-16 pb-16"
        >
            <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-4">
                {/* Título principal */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center"
                >
                    <h2 className={`text-4xl md:text-6xl font-bold text-white tracking-tight ${titleFont.className} mb-4`}>
                        El Desafío de la Digitalización
                    </h2>
                    <p className="text-lg md:text-xl font-medium text-slate-300 max-w-4xl mx-auto">
                        PYMEs invisibles en un mundo 100% digital
                    </p>
                </motion.div>

                {/* Tarjetas: fondo blanco, bordes oscuros, texto normal */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.12,
                                delayChildren: 0.2,
                            },
                        },
                    }}
                >
                    {[
                        {
                            icon: Smartphone,
                            title: "70% sin web",
                            desc: "PYMEs latinas sin vitrina digital. No existen online.",
                            stat: "70%",
                            color: "text-red-600",
                        },
                        {
                            icon: Lock,
                            title: "Complejidad",
                            desc: "Herramientas técnicas. El 50% abandona antes de lanzar.",
                            stat: "50%",
                            color: "text-amber-600",
                        },
                        {
                            icon: DollarSign,
                            title: "Costos altos",
                            desc: "Web promedio: $50 - $1000. Imposible para pequeños negocios.",
                            stat: "$100+",
                            color: "text-orange-600",
                        },
                        {
                            icon: EyeOff,
                            title: "Invisibles",
                            desc: "Sin SEO, sin indexación. Páginas perdidas en el vacío.",
                            stat: "0%",
                            color: "text-purple-600",
                        },
                        {
                            icon: Search,
                            title: "Competencia",
                            desc: "Sitios antiguos dominan. Nuevos no aparecen en búsquedas.",
                            stat: "Años",
                            color: "text-indigo-600",
                        },
                        {
                            icon: Users,
                            title: "Engagement nulo",
                            desc: "Redes no convierten. Clientes pasan sin interactuar.",
                            stat: "80%",
                            color: "text-cyan-600",
                        },
                    ].map((item, idx) => (
                        <motion.div
                            key={idx}
                            variants={{
                                hidden: { opacity: 0, y: 25 },
                                visible: { opacity: 1, y: 0 },
                            }}
                            className="bg-white rounded-2xl p-5 md:p-3 shadow-lg ring-1 ring-slate-700/30 backdrop-blur-sm flex flex-col items-center text-center hover:shadow-xl transition-all duration-300"
                        >
                            <item.icon className={`w-10 h-10 ${item.color} mb-3`} />
                            <h3 className="text-base md:text-2xl font-bold text-slate-900 mb-2">
                                {item.title}
                            </h3>
                            <p className="text-xs md:text-xl text-slate-600 mb-3 leading-relaxed px-1">
                                {item.desc}
                            </p>
                            <div className={`text-2xl md:text-3xl font-black ${item.color}`}>
                                {item.stat}
                            </div>
                            <div className="w-full h-1.5 bg-slate-300 rounded-full overflow-hidden mt-3">
                                <div
                                    className={`h-full rounded-full bg-gradient-to-r from-transparent via-slate-400 to-transparent ${item.color.replace('text-', 'bg-')}`}
                                    style={{ width: `${idx === 3 ? 95 : idx === 4 ? 85 : 70 + Math.random() * 20}%` }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Gráfico final con fuente */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="text-center"
                >
                    <div className='flex justify-center items-center mb-4'>
                 
                        <p className="text-base md:text-2xl text-slate-300 max-w-5xl mx-auto leading-relaxed">
                            <span className="font-bold text-red-500">70% de PYMEs sin web</span> →
                            <span className="font-bold text-indigo-500"> +$2 trillones perdidos</span> en ventas anuales.
                            <br />
                            <span className="text-xs text-white">(CEPAL, BID, Google for Startups — 2024)</span>
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}