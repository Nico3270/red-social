// components/pitch/PresentacionMyckeo.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { titleFont } from '@/config/fonts';

export default function PresentacionMyckeo() {
  return (
    <section
      id="presentacion"
      className="w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 pt-4 md:pt-6 pb-8"
    >
      {/* Contenedor más ancho para maximizar el layout */}
      <div className="w-full max-w-[1600px] mx-auto space-y-2 md:space-y-2">

        {/* ---------- 1. LOGO + TITULO + SLOGAN ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <Link href="/" className="inline-flex items-center gap-3 mb-2">
            <div className="relative">
              <Image
                src="/imgs/Logo Final (1).png"
                alt="Logo Myckeo"
                width={80}
                height={80}
                className="rounded-full shadow-lg ring-2 ring-white/80"
                priority
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 blur-md -z-10" />
            </div>

            <h1 className={`text-5xl md:text-6xl font-bold text-slate-900 tracking-tight ${titleFont.className}`}>
              Myckeo
            </h1>
          </Link>

          <p className="text-xl md:text-2xl font-medium text-slate-700 max-w-3xl text-center leading-tight mt-1">
            La plataforma donde tu negocio{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
              conecta
            </span>
            ,{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
              vende
            </span>{' '}
            y{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
              crece
            </span>
            .
          </p>
        </motion.div>

        {/* ---------- 2. VIDEO 60% + CAJITAS CENTRADAS VERTICALMENTE ---------- */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 lg:grid-cols-[1fr_3fr_1fr] gap-6 md:gap-8 items-center"
        >
          {/* ---------- CAJITAS IZQUIERDA (centradas con el video) ---------- */}
          <div className="flex flex-col justify-center h-full space-y-6">
            {[
              { img: '/imgs/iconos/whatsapp.png', title: 'Pedidos', desc: 'WhatsApp directo' },
              { img: '/imgs/iconos/catalogo.webp', title: 'Catálogos', desc: 'Por sección' },
              { img: '/imgs/iconos/crear-reserva.png', title: 'Reservas', desc: 'Tiempo real' }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg ring-1 ring-slate-200 
                           flex items-center gap-5 hover:shadow-xl transition-all"
              >
                <Image src={item.img} alt="" width={70} height={70} className="opacity-95 flex-shrink-0" />
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{item.title}</h4>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ---------- VIDEO 60% ANCHO (protagonista) ---------- */}
          <div className="flex justify-center relative">
            {/* Glow morado */}
            <div className="absolute -inset-8 bg-gradient-to-br from-purple-400/30 via-indigo-400/20 to-purple-500/30 
                            blur-3xl rounded-[40px] pointer-events-none" />

            <div className="relative aspect-video w-full max-w-none rounded-[32px] overflow-hidden 
                            shadow-2xl ring-1 ring-slate-200 bg-black group">
              <iframe
                src="https://www.youtube.com/embed/uyb_H_Y9eCw?rel=0"
                title="Myckeo - Presentación"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />

              {/* Overlay visual */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                <PlayCircle className="w-24 h-24 text-white drop-shadow-2xl" />
              </div>

              <div className="absolute top-4 left-4 flex items-center gap-2 text-white pointer-events-none">
                <PlayCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Demo en vivo</span>
              </div>
            </div>
          </div>

          {/* ---------- CAJITAS DERECHA (centradas con el video) ---------- */}
          <div className="flex flex-col justify-center h-full space-y-6">
            {[
              { img: '/imgs/iconos/crear-publicacion.png', title: 'Publicaciones', desc: 'Multimedia' },
              { img: '/imgs/iconos/qrCode.png', title: 'QR Único', desc: 'Menú digital' },
              { img: '/imgs/iconos/review.png', title: 'Reseñas', desc: 'Con video' }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-lg ring-1 ring-slate-200 
                           flex items-center gap-5 hover:shadow-xl transition-all"
              >
                <Image src={item.img} alt="" width={70} height={70} className="opacity-95 flex-shrink-0" />
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{item.title}</h4>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ---------- 3. PRESENTADO POR (premium, centrado) ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex justify-center mt-10"
        >
          <div className="px-8 py-3.5 rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-slate-200 text-center">
            <p className="text-base md:text-lg font-semibold text-slate-700 whitespace-nowrap">
              Presentado por{' '}
              <span className="font-bold text-slate-900">Nicolás Rodríguez</span>,  
              Fundador y CEO de Myckeo
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}