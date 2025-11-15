// components/pitch/PropuestaValorMyckeo.tsx
'use client';
import { motion } from 'framer-motion';
import { titleFont } from '@/config/fonts';
import { Store,  Users, Globe, QrCode } from 'lucide-react';

export default function PropuestaValorMyckeo() {
  return (
    <section
      id="propuesta"
      className="w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50/30 px-6 pt-12 md:pt-4 pb-16"
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
          <h2 className={`text-4xl md:text-6xl font-bold text-slate-900 tracking-tight ${titleFont.className} mb-2`}>
            Nuestra UVP: La Red Social-Comercial
          </h2>
          <p className="text-xl md:text-2xl font-medium text-slate-700 max-w-4xl py-4 mx-auto">
            Donde los negocios conectan, venden y crecen en comunidad
          </p>
        </motion.div>

        {/* Propuesta de Valor Única - Refinada con dolor real */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-xl ring-1 ring-slate-200 text-center max-w-5xl mx-auto"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
            Ayudamos a <span className="text-indigo-600">negocios y profesionales</span>
          </h3>
          <p className="text-lg md:text-2xl text-slate-600 mb-6">
            a <span className="font-bold text-red-600">salir de la invisibilidad digital</span> y <span className="font-bold text-amber-600">perder clientes por falta de interacción</span>,
          </p>
          <p className="text-2xl md:text-3xl font-bold text-indigo-600 leading-tight">
            mediante una <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">red social-comercial</span> que convierte <span className="underline decoration-purple-500">catálogos en conversaciones</span>, <span className="underline decoration-indigo-500">reseñas en confianza</span> y <span className="underline decoration-cyan-500">QR en ventas instantáneas</span>.
          </p>
        </motion.div>

        {/* Diferenciadores clave - 3 columnas con íconos */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-6"
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
              title: "Comunidad Real",
              desc: "Publicaciones, reseñas y mensajes directos entre clientes y negocios.",
              color: "text-pink-600",
              bg: "from-pink-50 to-rose-50",
            },
            {
              icon: Store,
              title: "Productos + Servicios",
              desc: "Catálogos automáticos para moda, comida, consultas, clases y más.",
              color: "text-indigo-600",
              bg: "from-indigo-50 to-blue-50",
            },
            {
              icon: QrCode,
              title: "Vitrina Digital Instantánea",
              desc: "QR + URL pública. Menú digital, catálogo o perfil profesional en segundos.",
              color: "text-emerald-600",
              bg: "from-emerald-50 to-teal-50",
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 },
              }}
              className={`bg-gradient-to-br ${item.bg} rounded-3xl p-7 md:p-8 shadow-lg ring-1 ring-white/50 flex flex-col items-center text-center hover:shadow-xl transition-all`}
            >
              <item.icon className={`w-14 h-14 ${item.color} mb-5`} />
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
                {item.title}
              </h3>
              <p className="text-base md:text-xl text-slate-700 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Nueva visualización: Línea horizontal de flujo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col items-center"
        >
          <div className="flex items-center justify-center gap-8 md:gap-12">
            {/* Paso 1 */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
                <Users className="w-16 h-16 text-white" />
              </div>
              <p className="mt-3 text-2xl font-medium text-slate-700">Comunidad</p>
            </div>

            {/* Flecha */}
            <div className="w-16 h-1 bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full" />

            {/* Paso 2 */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <Store className="w-16 h-16 text-white" />
              </div>
              <p className="mt-3 text-2xl font-medium text-slate-700">Catálogo</p>
            </div>

            {/* Flecha */}
            <div className="w-16 h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full" />

            {/* Paso 3 */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                <Globe className="w-16 h-16 text-white" />
              </div>
              <p className="mt-3 text-2xl font-medium text-slate-700">Vitrina</p>
            </div>
          </div>

          
        </motion.div>

        
      </div>
    </section>
  );
}