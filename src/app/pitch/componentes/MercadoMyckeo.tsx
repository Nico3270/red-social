// components/pitch/MercadoMyckeo.tsx
'use client';

import { motion } from 'framer-motion';
import { titleFont } from '@/config/fonts';
import { TrendingUp, Users, DollarSign, Globe, Smartphone,  Target,  BookOpen } from 'lucide-react';
import { useState } from 'react';

export default function MercadoMyckeo() {
    const [activeTab, setActiveTab] = useState('colombia'); // 'colombia' o 'global'
    const [showSources, setShowSources] = useState(false); // Para accordion de fuentes

    const dataColombia = {
        tam: { value: '$52B', label: 'E-commerce Colombia 2024 (PCMI)', growth: '16% CAGR hasta 2027' },
        sam: { value: '$1.28B', label: 'Social Commerce Colombia 2024 (GlobeNewswire)', growth: '31.5% anual' },
        som: { value: '$128M', label: 'Captura inicial 10% PYMEs sociales', growth: 'Proyección 2025 (estimado)' },
        pymes: { value: '1.7M', label: 'PYMEs en Colombia (BBVA Research)', adoption: '42% digitalizadas (iNNpulsa 2024)' },
    };

    const dataGlobal = {
        tam: { value: '$1.16T', label: 'Social Commerce Global 2024 (Grand View)', growth: '36.4% CAGR hasta 2033' },
        sam: { value: '$32B', label: 'Social Commerce LATAM 2024 (Grand View)', growth: '31.77% CAGR' },
        som: { value: '$5B', label: 'Nicho LATAM accesible para Myckeo', growth: '20% anual hasta 2030' },
        pymes: { value: '27M', label: 'PYMEs LATAM (CEPAL)', adoption: '60% invierten digital 2025 (IDC)' },
    };

    const currentData = activeTab === 'colombia' ? dataColombia : dataGlobal;


    return (
        <section
            id="mercado"
            className="w-full bg-gradient-to-br from-emerald-50 via-white to-blue-50/30 px-6 pt-12 md:pt-16 pb-16"
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
                        Un Mercado Enorme y en Crecimiento
                    </h2>
                    <p className="text-xl md:text-2xl font-medium text-slate-700 max-w-4xl mx-auto">
                        Colombia como puerta de entrada a LATAM — con proyecciones globales explosivas
                    </p>
                </motion.div>

                {/* Tabs para Colombia / Global */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="flex justify-center mb-8"
                >
                    <div className="inline-flex rounded-full bg-white/80 backdrop-blur-xl p-1 shadow-lg ring-1 ring-slate-200">
                        {[
                            { label: 'Colombia', value: 'colombia' },
                            { label: 'Global / LATAM', value: 'global' },
                        ].map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => setActiveTab(tab.value)}
                                className={`px-6 py-3 rounded-full font-semibold transition-all ${activeTab === tab.value
                                    ? 'bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-md'
                                    : 'text-slate-700 hover:text-slate-900'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Pirámide TAM/SAM/SOM interactiva — Más Realista */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="relative flex flex-col items-center w-full max-w-lg mx-auto"
                >
                    {/* Título */}
                    <div className="text-center mb-6">
                        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">TAM / SAM / SOM</h3>
                        <p className="text-red-600 font-extrabold text-xl mt-1">Análisis realista del mercado objetivo</p>
                    </div>

                    {/* Pirámide con formas trapezoidales más realistas */}
                    <div className="relative flex flex-col items-center gap-2 w-full">
                        {/* SOM (parte superior, pequeña) */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 w-32 py-6 rounded-t-2xl shadow-md text-center text-white border border-emerald-400"
                        >
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <Target className="w-6 h-6" />
                                <p className="text-lg font-bold">{currentData.som.value}</p>
                            </div>
                            <p className="text-sm opacity-90 font-bold text-gray-100">{currentData.som.label}</p>
                            <p className="text-xs font-bold text-gray-100">{currentData.som.growth}</p>
                        </motion.div>

                        {/* SAM (media) */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 w-48 py-7 rounded-t-2xl shadow-lg text-center text-white border border-blue-400"
                        >
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <DollarSign className="w-6 h-6" />
                                <p className="text-lg font-bold">{currentData.sam.value}</p>
                            </div>
                            <p className="text-sm opacity-90 font-bold text-gray-100">{currentData.sam.label}</p>
                            <p className="text-xs font-bold text-gray-100">{currentData.sam.growth}</p>
                        </motion.div>

                        {/* TAM (base grande) */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 w-full py-8 rounded-t-2xl shadow-xl text-center text-white border border-indigo-400"
                        >
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <Globe className="w-6 h-6" />
                                <p className="text-xl font-bold">{currentData.tam.value}</p>
                            </div>
                            <p className="text-sm opacity-90 font-bold text-gray-100">{currentData.tam.label}</p>
                            <p className="text-xs font-bold text-gray-100">{currentData.tam.growth}</p>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Estadísticas clave de Colombia */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.15,
                            },
                        },
                    }}
                >
                    {[
                        {
                            icon: Users,
                            value: "1.7M",
                            label: "PYMEs en Colombia",
                            desc: "42% digitalizadas (iNNpulsa, 2024)",
                            color: "text-emerald-600",
                            bg: "from-emerald-50 to-teal-50",
                        },
                        {
                            icon: TrendingUp,
                            value: "$52B",
                            label: "E-commerce Colombia 2024",
                            desc: "16% CAGR hasta 2027 (PCMI)",
                            color: "text-blue-600",
                            bg: "from-blue-50 to-indigo-50",
                        },
                        {
                            icon: Smartphone,
                            value: "93%",
                            label: "Penetración móvil 2025",
                            desc: "93% usuarios smartphone (Statista)",
                            color: "text-purple-600",
                            bg: "from-purple-50 to-violet-50",
                        },
                        {
                            icon: DollarSign,
                            value: "$1.28B",
                            label: "Social Commerce 2024",
                            desc: "31.5% anual (GlobeNewswire)",
                            color: "text-indigo-600",
                            bg: "from-indigo-50 to-purple-50",
                        },
                    ].map((stat, idx) => (
                        <motion.div
                            key={idx}
                            variants={{
                                hidden: { opacity: 0, y: 30 },
                                visible: { opacity: 1, y: 0 },
                            }}
                            className={`bg-gradient-to-br ${stat.bg} rounded-3xl p-6 shadow-lg ring-1 ring-white/50 flex flex-col items-center text-center hover:shadow-xl transition-all`}
                        >
                            <stat.icon className={`w-12 h-12 ${stat.color} mb-4`} />
                            <div className={`text-3xl font-black ${stat.color} mb-2`}>{stat.value}</div>
                            <h3 className="text-base font-bold text-slate-900 mb-2">{stat.label}</h3>
                            <p className="text-sm text-slate-600">{stat.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Proyección global LATAM — GRÁFICA CORREGIDA */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="text-center"
                >
                    <Globe className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
                    <p className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                        LATAM: $32B Social Commerce 2024
                    </p>
                    <p className="text-lg text-slate-600 mb-6">
                        Proyección $50B en 2025 (Grand View Research). Myckeo captura nicho local ignorado.
                    </p>

                    {/* Gráfico de barras animado y visible */}
                    <div className="flex items-end justify-center gap-4 h-48 bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg ring-1 ring-slate-200 max-w-4xl mx-auto">
                        {[
                            { year: '2024', height: 30, value: '$32B' },
                            { year: '2025', height: 50, value: '$50B' },
                            { year: '2026', height: 70, value: '$70B' },
                            { year: '2027', height: 90, value: '$95B' },
                        ].map((bar, idx) => (
                            <motion.div
                                key={bar.year}
                                initial={{ height: 0 }}
                                whileInView={{ height: `${bar.height}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: idx * 0.15 }}
                                className="flex flex-col items-center w-20"
                            >
                                <div className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-full flex items-end justify-center pb-2 text-white font-bold text-sm shadow-md">
                                    {bar.value}
                                </div>
                                <div className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-b-full flex-1" />
                                <span className="text-xs text-slate-600 mt-2">{bar.year}</span>
                            </motion.div>
                        ))}
                    </div>
                    <p className="text-sm text-slate-500 mt-4">Crecimiento Social Commerce LATAM (Grand View, 2024)</p>
                </motion.div>

                {/* Cuadro de Fuentes Colapsable */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                    className="text-center"
                >
                    <button
                        onClick={() => setShowSources(!showSources)}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all"
                    >
                        <BookOpen className="w-5 h-5" />
                        {showSources ? 'Ocultar Fuentes' : 'Ver Fuentes Confiables'}
                    </button>

                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: showSources ? 'auto' : 0, opacity: showSources ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 overflow-hidden"
                    >
                        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-md ring-1 ring-slate-200 max-w-4xl mx-auto">
                            <h4 className="text-xl font-bold text-slate-900 mb-4">Referencias y Enlaces</h4>
                            <ul className="space-y-3 text-sm text-slate-700">
                                <li><strong>PCMI:</strong> E-commerce Colombia $52B 2024 — <a href="https://paymentscmi.com/insights/colombia-e-commerce-market/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Ver Reporte</a></li>
                                <li><strong>GlobeNewswire:</strong> Social Commerce Colombia $1.28B 2024 — <a href="https://www.globenewswire.com/news-release/2024/04/09/2859732/28124/en/Colombia-s-Social-Commerce-Market-Intelligence-and-Future-Growth-Dynamics-2020-2023-and-2024-2029.html" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Ver Reporte</a></li>
                                <li><strong>BBVA Research:</strong> PYMEs Colombia 1.7M — <a href="https://www.bbvaresearch.com/en/publicaciones/colombia-a-review-to-micro-and-smes-in-colombia/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Ver Reporte</a></li>
                                <li><strong>iNNpulsa:</strong> Digitalización 42% — <a href="https://www.innpulsacolombia.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Ver Sitio</a></li>
                                <li><strong>Statista:</strong> Móvil 93% — <a href="https://www.statista.com/statistics/622690/mobile-phone-penetration-in-colombia/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Ver Estadística</a></li>
                                <li><strong>Grand View Research:</strong> Social Commerce LATAM $32B — <a href="https://www.grandviewresearch.com/industry-analysis/social-commerce-market" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Ver Reporte</a></li>
                                <li><strong>CEPAL:</strong> PYMEs LATAM 27M — <a href="https://www.cepal.org/es/publicaciones/47183-transformacion-digital-mipymes-elementos-diseno-politicas" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Ver Publicación</a></li>
                                <li><strong>IDC:</strong> Inversión digital 60% — <a href="https://www.idc.com/latam" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Ver Sitio</a></li>
                            </ul>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}