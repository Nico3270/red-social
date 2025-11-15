// components/pitch/TraccionMyckeo.tsx
'use client';

import { motion } from 'framer-motion';
import { titleFont } from '@/config/fonts';
import {  Zap, Users, Globe, Code,  Smartphone, Shield, Cloud, Database, MapPin, Lightbulb, Boxes, Megaphone, ShoppingCart } from 'lucide-react';
import { PlayCircle } from 'lucide-react';
import Image from 'next/image';

export default function TraccionMyckeo() {
  return (
    <section
      id="traccion"
      className="w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-6 pt-12 md:pt-16 pb-16"
    >
      <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-6">
        {/* Título principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className={`text-4xl md:text-6xl font-bold text-slate-900 tracking-tight ${titleFont.className} mb-4`}>
            Plataforma Funcional
          </h2>
          <p className="text-xl md:text-2xl font-medium text-slate-700 max-w-4xl mx-auto">
            Myckeo ya es real. Crea negocios, vende, conecta — todo en producción.
          </p>
        </motion.div>

        {/* Demo Video como protagonista */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 p-6 md:p-8 text-center"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            Mira Myckeo en Acción
          </h3>
          <div className="relative aspect-video max-w-6xl mx-auto rounded-2xl overflow-hidden shadow-xl group">
            <iframe
              src="https://www.youtube.com/embed/tNcxfJa2EuQ?rel=0&autoplay=0"
              title="Descubre Myckeo: Perfiles, productos, pedidos y comunidad en un solo lugar"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <PlayCircle className="w-20 h-20 text-white drop-shadow-2xl" />
            </div>
          </div>
          <p className="text-4xl text-yellow-400 font-extrabold mt-6 max-w-3xl mx-auto">
            Crea perfiles, sube productos, recibe pedidos y reseñas — todo en minutos.
          </p>
        </motion.div>

        {/* Timeline de desarrollo — Compacta y horizontal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 p-6"
        >
          <h3 className="text-2xl font-bold text-center text-slate-900 mb-6">Timeline de Desarrollo</h3>
          <div className="relative">
            {/* Línea horizontal */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transform -translate-y-1/2" />

            {/* Milestones en fila horizontal */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 relative z-10">
              {[
                { title: "Idea", desc: "Validación", icon: Lightbulb, done: true },
                { title: "Backend", desc: "Prisma + Next.js", icon: Database, done: true },
                { title: "Auth", desc: "NextAuth", icon: Shield, done: true },
                { title: "Perfiles", desc: "QR + Mapa", icon: Globe, done: true },
                { title: "Productos", desc: "Catálogo", icon: Boxes, done: true },
                { title: "Feed", desc: "Social", icon: Megaphone, done: true },
                { title: "Pedidos", desc: "Internos", icon: ShoppingCart, done: true },
                { title: "Beta", desc: "20 usuarios", icon: Users, done: true },
                { title: "MVP", desc: "Q4 2025", icon: Zap, done: false },
              ].map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col items-center text-center"
                >
                  {/* Punto en la línea */}
                  <div className={`w-4 h-4 rounded-full ${m.done ? 'bg-emerald-500' : 'bg-slate-300'} shadow-md`} />

                  {/* Ícono */}
                  <m.icon className={`w-8 h-8 mt-3 ${m.done ? 'text-emerald-600' : 'text-slate-400'}`} />

                  {/* Texto */}
                  <h4 className="text-lg font-bold text-slate-900 mt-2">{m.title}</h4>
                  <p className="text-md text-slate-600">{m.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tech Stack Premium */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 p-6 md:p-8"
        >
          <h3 className="text-2xl font-bold text-center text-slate-900 mb-6">Tecnología Premium</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Globe, title: "Next.js 14", desc: "App Router, Server Components" },
              { icon: Database, title: "Prisma ORM", desc: "Base de datos relacional" },
              { icon: Shield, title: "NextAuth", desc: "Login Google + credenciales" },
              { icon: Cloud, title: "Cloudinary", desc: "Imágenes optimizadas" },
              { icon: MapPin, title: "Google Maps", desc: "Ubicación real" },
              { icon: Smartphone, title: "PWA", desc: "Funciona como app nativa" },
              { icon: Code, title: "Tailwind CSS", desc: "Diseño moderno" },
              { icon: Zap, title: "Framer Motion", desc: "Animaciones fluidas" },
            ].map((tech, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 shadow-md ring-1 ring-white/50 flex flex-col items-center text-center hover:shadow-lg transition-all"
              >
                <tech.icon className="w-8 h-8 text-indigo-600 mb-2" />
                <h4 className="text-sm font-bold text-slate-900">{tech.title}</h4>
                <p className="text-xs text-slate-600 mt-1">{tech.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-3xl p-8 shadow-xl inline-block">
            <Image
              src="/imgs/Logo Final.png"
              alt="Myckeo Logo"
              width={80}
              height={80}
              className="mx-auto mb-4 drop-shadow-xl rounded-xl"
              priority
            />
            <p className="text-3xl font-bold mb-2">myckeo.com</p>
            <p className="text-lg opacity-90">Dominio adquirido. Listo para el mundo.</p>
          </div>
        </motion.div>



      </div>
    </section>
  );
}