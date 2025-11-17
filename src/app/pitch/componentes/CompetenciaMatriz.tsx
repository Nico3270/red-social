// components/pitch/CompetenciaMatriz.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { titleFont } from '@/config/fonts';
import { X, MousePointerClick, Users,  } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

interface Competitor {
    id: string;
    name: string;
    logo: string;
    ease: number;
    social: number;
    price: string;
    pros: string[];
    cons: string[];
    diff: string;
}

const competitors: Competitor[] = [
    {
        id: 'myckeo',
        name: 'Myckeo',
        logo: '/imgs/Logo Final.png',
        ease: 10,
        social: 10,
        price: 'Freemium (básico gratis, premium $5–10/mes)',
        pros: [
            'No-code intuitivo para PYMEs',
            'Social + catálogo integrado',
            'QR y menús digitales',
            'Reseñas multimedia verificadas',
            'Landing dinámica con secciones vivas',
        ],
        cons: [
            'En fase inicial de expansión',
            'Enfoque actual en PYMEs de LATAM',
        ],
        diff: 'Myckeo fusiona red social, catálogo y comunidad en una sola plataforma interactiva diseñada para negocios reales.',
    },

    {
        id: 'tiendanube',
        name: 'Tiendanube',
        logo: '/imgs/competidores/tiendaNube.png',
        ease: 8,
        social: 4,
        price: '$24.900 COP/mes (~$6 USD, Colombia 2025)',
        pros: [
            'Fuerte presencia en PYMEs LATAM',
            'Integraciones locales (envíos y pagos)',
            '170K+ tiendas activas',
        ],
        cons: [
            'Sin engagement social nativo',
            'Enfoque en e-commerce puro',
            'Sin QR o menús digitales',
        ],
        diff: 'Tiendanube vende productos; Myckeo crea comunidad, lealtad y visibilidad para negocios locales.',
    },

    {
        id: 'shopify',
        name: 'Shopify',
        logo: '/imgs/competidores/shopify.png',
        ease: 6,
        social: 3,
        price: '$32 USD/mes básico (anual: $24 USD)',
        pros: [
            'Escalable para grandes volúmenes',
            'Ecosistema de apps robusto (1.000+)',
            '10.33% de cuota de mercado LATAM',
        ],
        cons: [
            'Costo elevado para pequeños negocios',
            'Curva técnica alta',
            'Integración social limitada',
        ],
        diff: 'Shopify es enterprise; Myckeo democratiza la presencia digital con un enfoque local y social.',
    },

    {
        id: 'wix',
        name: 'Wix',
        logo: '/imgs/competidores/wix.png',
        ease: 9,
        social: 2,
        price: '$29 USD/mes Core (eCommerce)',
        pros: [
            'Editor drag-and-drop muy intuitivo',
            'Plantillas visuales de alta calidad',
            'Popular entre nuevos emprendedores',
        ],
        cons: [
            'E-commerce limitado',
            'Sin comunidad o reseñas sociales',
            'SEO requiere optimizaciones extras',
        ],
        diff: 'Wix crea sitios; Myckeo crea una vitrina viva con interacción social real.',
    },

    {
        id: 'facebook-marketplace',
        name: 'Facebook Marketplace',
        logo: '/imgs/competidores/facebook.png',
        ease: 7,
        social: 9,
        price: 'Gratis (10% de comisión en envíos)',
        pros: [
            '500M+ usuarios globales',
            'Alto engagement orgánico',
            'Publicación sin costo',
        ],
        cons: [
            'Generalista, no especializado en PYMEs',
            'Catálogo poco estructurado',
            'Comisiones poco visibles en envíos',
        ],
        diff: 'Marketplace es masivo y caótico; Myckeo es profesional, ordenado y diseñado para negocios locales.',
    },

    {
        id: 'instagram-shops',
        name: 'Instagram Shops',
        logo: '/imgs/competidores/instagram.webp',
        ease: 8,
        social: 10,
        price: 'Gratis (Meta Business)',
        pros: [
            'Plataforma visual con alto engagement',
            'Ecosistema Meta integrado',
            'Tag de productos en posts',
        ],
        cons: [
            'Catálogo superficial (basado en tags)',
            'Dependencia del perfil personal',
            'Sin vitrina independiente o QR',
        ],
        diff: 'Shops vende fotos; Myckeo combina visual social con catálogo profundo y vitrina profesional.',
    },

    {
        id: 'linkedin',
        name: 'LinkedIn',
        logo: '/imgs/competidores/Linkedin.jpg',
        ease: 5,
        social: 7,
        price: '$59.99 USD/mes (Premium Business)',
        pros: [
            'Red profesional global B2B',
            'Endorsements y testimonios',
            'Insights de leads y networking',
        ],
        cons: [
            'Sin ventas integradas',
            'No cuenta con catálogo',
            'Muy enfocado en corporativos',
        ],
        diff: 'LinkedIn es networking; Myckeo impulsa ventas directas y presencia local.',
    },

    {
        id: 'mercado-libre',
        name: 'Mercado Libre',
        logo: '/imgs/competidores/mercado-libre.png',
        ease: 7,
        social: 5,
        price: '10–20% de comisión por venta',
        pros: [
            'Líder LATAM con logística propia',
            'Millones de usuarios diarios',
            'Envíos gratuitos por umbral',
        ],
        cons: [
            'Comisiones altas',
            'Sin comunidad o interacción social',
            'Competencia masiva interna',
        ],
        diff: 'Mercado Libre es un marketplace anónimo; Myckeo potencia tu marca y fideliza clientes.',
    },

    {
        id: 'rappi',
        name: 'Rappi',
        logo: '/imgs/competidores/rappi.png',
        ease: 6,
        social: 4,
        price: '20–25% de comisión (delivery)',
        pros: [
            'Delivery rápido en LATAM',
            'Super-app muy conocida',
            'Visibilidad inmediata',
        ],
        cons: [
            'Solo delivery, no catálogo permanente',
            'Comisiones elevadas',
            'Dependencia de logística externa',
        ],
        diff: 'Rappi es on-demand; Myckeo es tu vitrina 24/7 con comunidad.',
    },

    {
        id: 'google',
        name: 'Google My Business',
        logo: '/imgs/competidores/google.png',
        ease: 3,
        social: 1,
        price: 'Gratis (SEO orgánico)',
        pros: [
            'Máxima visibilidad en búsquedas',
            'Integración Maps + Reviews',
            'Sin costo de instalación',
        ],
        cons: [
            'No es plataforma e-commerce',
            'SEO lento para nuevos negocios',
            'No tiene comunidad activa',
        ],
        diff: 'Google ayuda a ser encontrado; Myckeo genera interacción constante y visitas recurrentes.',
    },

    {
        id: 'linio',
        name: 'Linio Marketplace',
        logo: '/imgs/competidores/linio.jpg',
        ease: 7,
        social: 3,
        price: '12–18% de comisión',
        pros: [
            'Marketplace LATAM con logística',
            'Acceso a millones de usuarios',
            'Amplia variedad de categorías',
        ],
        cons: [
            'Comisiones variables',
            'Competencia interna intensa',
            'Sin capacidad social nativa',
        ],
        diff: 'Linio es anónimo; Myckeo te da una tienda propia con presencia y comunidad.',
    },
];


export default function CompetenciaMatriz() {
    const [openCompetitor, setOpenCompetitor] = useState<string | null>(null);
    const competitor = competitors.find((c) => c.id === openCompetitor);

    // FILTROS CORREGIDOS
    const topLeft = competitors.filter((c) => c.social >= 7 && c.ease < 7 && c.id !== 'myckeo');     // Q1: Alta Social + Baja Facilidad
    const topRight = competitors.filter((c) => c.social >= 7 && c.ease >= 7 && c.id !== 'myckeo');   // Q2: Alta Social + Alta Facilidad
    const bottomLeft = competitors.filter((c) => c.social < 7 && c.ease < 7 && c.id !== 'myckeo');   // Q3: Baja Social + Baja Facilidad
    const bottomRight = competitors.filter((c) => c.social < 7 && c.ease >= 7 && c.id !== 'myckeo'); // Q4: Baja Social + Alta Facilidad

    return (
        <section className="w-full py-16 bg-gradient-to-b from-white to-slate-50">
            {/* Título Principal */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-center mb-8"
            >
                <h2 className={`text-4xl md:text-6xl font-bold text-slate-900 tracking-tight ${titleFont.className} mb-6`}>
                    Diferenciándonos en un Mercado Competitivo
                </h2>
                <p className="text-xl md:text-2xl font-medium text-slate-700 max-w-5xl mx-auto">
                    Myckeo es único: fusión social + comercial local. Mercado <span className="font-bold text-indigo-600">$52B en Colombia (2025)</span>.
                </p>
                <p className="text-xl md:text-2xl font-semibold text-indigo-700 max-w-5xl mx-auto mt-6 flex items-center justify-center gap-2">
  Toca un ícono en la matriz para ver más información <span className="animate-pulse">✨</span>
</p>
            </motion.div>

            {/* Eje Y — Arriba */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-blue-50 px-8 py-4 rounded-full shadow-xl text-xl font-bold text-blue-700 border-2 border-blue-200">
                    <Users className="w-6 h-6" />
                    Alta Integración Social ↑
                </div>
            </div>

            {/* Matriz con líneas divisorias */}
            <div className="max-w-7xl mx-auto px-4">
                <div className="relative w-full h-full">
                    {/* LÍNEA VERTICAL */}
                    <div className="absolute inset-y-0 left-1/2 w-px bg-gray-300 pointer-events-none z-20"></div>

                    {/* LÍNEA HORIZONTAL */}
                    <div className="absolute inset-x-0 top-1/2 h-px bg-gray-300 pointer-events-none z-20"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-slate-300 rounded-3xl overflow-hidden shadow-2xl bg-white">
                        {/* Q1: Top Left — Alta Social + Baja Facilidad */}
                        <div className="relative flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-100 to-blue-50">
                            <div className="absolute top-3 left-3 bg-white px-4 py-2 rounded-full text-lg font-bold text-blue-600 border border-blue-200 shadow-xl z-10">
                                🔥 Alta Social + Baja Facilidad
                            </div>
                            <div className="grid grid-cols-2 gap-4 max-w-xs mt-12">
                                {topLeft.map((comp, idx) => (
                                    <CompetitorItem key={comp.id} comp={comp} onClick={() => setOpenCompetitor(comp.id)} delay={idx * 0.1} />
                                ))}
                            </div>
                        </div>

                        {/* Q2: Top Right — Alta Social + Alta Facilidad (Myckeo) */}
                        <div className="relative flex flex-col items-center justify-center p-8 bg-gradient-to-bl from-emerald-100 to-emerald-50">
                            <div className="absolute top-3 right-3 bg-white px-4 py-2 rounded-full text-lg font-bold text-emerald-600 border border-emerald-200 shadow-xl z-10">
                                🏆 Alta Social + Alta Facilidad
                            </div>
                            <div className="flex flex-col items-center mt-12">
                                <motion.div
                                    whileHover={{ scale: 1.08 }}
                                    className="flex flex-col items-center cursor-pointer group relative"
                                    onClick={() => setOpenCompetitor(openCompetitor === 'myckeo' ? null : 'myckeo')}
                                    role="button"
                                    tabIndex={0}
                                    aria-label="Explora Myckeo"
                                >
                                    <div className="relative w-24 h-24 bg-white rounded-full shadow-2xl ring-4 ring-white/50 flex items-center justify-center overflow-hidden border-2 border-slate-200">
                                        <Image
                                            src="/imgs/Logo Final.png"
                                            alt="Logo Myckeo"
                                            fill
                                            className="object-contain rounded-full"
                                            priority
                                        />
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                                        <MousePointerClick className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform" />
                                        <span className="hidden md:inline">Explora detalles</span>
                                    </div>
                                </motion.div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 max-w-xs mt-8">
                                {topRight.map((comp, idx) => (
                                    <CompetitorItem key={comp.id} comp={comp} onClick={() => setOpenCompetitor(comp.id)} delay={idx * 0.1} />
                                ))}
                            </div>
                        </div>

                        {/* Q3: Bottom Left — Baja Social + Baja Facilidad */}
                        <div className="relative flex flex-col items-center justify-center p-8 bg-gradient-to-tr from-red-100 to-red-50
">
                            <div className="absolute top-3 left-3 bg-white px-4 py-2 rounded-full text-lg font-bold text-red-600 border border-red-200 shadow-xl z-10">
                                ⛓️ Baja Social + Baja Facilidad
                            </div>
                            <div className="grid grid-cols-2 gap-4 max-w-xs mt-12">
                                {bottomLeft.map((comp, idx) => (
                                    <CompetitorItem key={comp.id} comp={comp} onClick={() => setOpenCompetitor(comp.id)} delay={idx * 0.1 + 0.2} />
                                ))}
                            </div>
                        </div>

                        {/* Q4: Bottom Right — Baja Social + Alta Facilidad */}
                        <div className="relative flex flex-col items-center justify-center p-8 bg-gradient-to-tl from-amber-100 to-amber-50">
                            <div className="absolute top-3 right-3 bg-white px-4 py-2 rounded-full text-lg font-bold text-orange-600 border border-orange-200 shadow-xl z-10">
                                ⚡ Baja Social + Alta Facilidad
                            </div>
                            <div className="grid grid-cols-2 gap-6 max-w-sm mt-12">
                                {bottomRight.map((comp, idx) => (
                                    <CompetitorItem key={comp.id} comp={comp} onClick={() => setOpenCompetitor(comp.id)} delay={idx * 0.1 + 0.4} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Eje Y — Abajo */}
            <div className="text-center mt-8">
                <div className="inline-flex items-center gap-2 bg-red-50 px-8 py-4 rounded-full shadow-xl text-xl font-bold text-red-700 border-2 border-red-200">
                    <Users className="w-6 h-6" />
                    Baja Integración Social ↓
                </div>


            </div>

            {/* Eje X — Abajo */}
            <div className="flex justify-center items-center mt-10 space-x-16">
                <div className="bg-white px-8 py-4 rounded-full shadow-2xl text-xl font-bold text-slate-900">
                    Baja Facilidad
                </div>
                <div className="font-bold text-indigo-700 text-3xl">
                    Facilidad de Uso →
                </div>
                <div className="bg-white px-8 py-4 rounded-full shadow-2xl text-xl font-bold text-slate-900">
                    Alta Facilidad
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {openCompetitor && competitor && (
                    <CompetitorModal competitor={competitor} onClose={() => setOpenCompetitor(null)} />
                )}
            </AnimatePresence>
        </section>
    );
}

// Ítem de Competidor — Fondo blanco, imagen fill, texto fuera
const CompetitorItem = ({ comp, onClick, delay = 0 }: { comp: Competitor; onClick: () => void; delay?: number }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay, duration: 0.6 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        className="flex flex-col items-center cursor-pointer group relative"
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`Explora ${comp.name}`}
    >
        <div className="relative w-24 h-24 bg-white rounded-full shadow-lg ring-2 ring-white/50 flex items-center justify-center overflow-hidden border-2 border-slate-200">
            <Image
                src={comp.logo}
                alt={`Logo ${comp.name}`}
                fill
                className="object-contain rounded-full"
            />
        </div>
        <MousePointerClick className="w-6 h-6 mt-2 text-indigo-600 animate-bounce group-hover:text-emerald-500 transition-colors" />
    </motion.div>
);

// Modal
const CompetitorModal = ({ competitor, onClose }: { competitor: Competitor; onClose: () => void }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4"
        onClick={onClose}
    >
        <motion.div
            initial={{ scale: 0.85, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 50 }}
            transition={{ type: 'spring', damping: 30 }}
            className="bg-white rounded-3xl shadow-3xl ring-4 ring-indigo-100 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                    <h3 className="text-4xl font-bold text-slate-900 pr-6">{competitor.name}</h3>
                    <button
                        onClick={onClose}
                        className="p-4 rounded-full hover:bg-slate-100 transition-all"
                        aria-label="Cerrar"
                    >
                        <X className="w-7 h-7 text-slate-500" />
                    </button>
                </div>
                <Image
                    src={competitor.logo}
                    alt={competitor.name}
                    width={160}
                    height={160}
                    className="mx-auto rounded-full ring-8 ring-slate-100 shadow-2xl mb-8"
                />
                <div className="space-y-8 text-slate-700">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-l-4 border-indigo-500">
                        <h4 className="font-bold text-indigo-900 text-xl mb-2">💰 Precio (2025)</h4>
                        <p className="text-2xl font-bold text-indigo-700">{competitor.price}</p>
                    </div>

                    {competitor.pros?.length > 0 && (
                        <div>
                            <h4 className="font-bold text-emerald-700 text-xl mb-4">✅ Ventajas</h4>
                            <ul className="space-y-3">
                                {competitor.pros.map((pro, i) => (
                                    <li key={i} className="flex items-start text-lg">
                                        <span className="text-emerald-500 mr-3 text-xl">✓</span>
                                        <span>{pro}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {competitor.cons?.length > 0 && (
                        <div>
                            <h4 className="font-bold text-red-700 text-xl mb-4">❌ Limitaciones</h4>
                            <ul className="space-y-3">
                                {competitor.cons.map((con, i) => (
                                    <li key={i} className="flex items-start text-lg">
                                        <span className="text-red-500 mr-3 text-xl">✗</span>
                                        <span>{con}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-8 border-2 border-emerald-200">
                        <h4 className="font-bold text-emerald-800 text-2xl mb-4">🎯 Myckeo Gana Porque...</h4>
                        <p className="text-xl leading-relaxed text-slate-800">{competitor.diff}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    </motion.div>
);