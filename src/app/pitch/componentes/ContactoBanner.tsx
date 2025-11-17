// components/pitch/contacto/ContactoBanner.tsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { 
  Youtube, 
  Instagram, 
  MessageCircle, 
  Mail, 
  Globe
} from 'lucide-react';
import { titleFont } from '@/config/fonts';

const contactInfo = [
  {
    label: 'YouTube',
    value: '@myckeo',
    icon: <Youtube className="w-6 h-6" />,
    color: 'from-red-500 to-red-600',
    link: 'https://youtube.com/@myckeo'
  },
  {
    label: 'Instagram',
    value: 'myckeo_oficial',
    icon: <Instagram className="w-6 h-6" />,
    color: 'from-pink-500 to-purple-600',
    link: 'https://instagram.com/myckeo_oficial'
  },
  {
    label: 'TikTok',
    value: '@myckeo',
    icon: <Globe className="w-6 h-6" />,
    color: 'from-black to-gray-800',
    link: 'https://tiktok.com/@myckeo'
  },
  {
    label: 'WhatsApp',
    value: '+57 318 229 3083',
    icon: <MessageCircle className="w-6 h-6" />,
    color: 'from-green-500 to-emerald-600',
    link: 'https://wa.me/573182293083'
  },
  {
    label: 'Correo',
    value: 'soporte@myckeo.com',
    icon: <Mail className="w-6 h-6" />,
    color: 'from-blue-500 to-indigo-600',
    link: 'mailto:soporte@myckeo.com'
  }
];

export default function ContactoBanner() {
  return (
    /* --------------------------------------------------------------
       SOLO <div> — NUNCA <html> o <body> dentro de un componente
       -------------------------------------------------------------- */
    <div id="contacto" className="bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-8 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Logo + Título */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center md:justify-start gap-4 mb-8"
        >
          <div className="relative w-20 h-20">
            <Image
              src="/imgs/Logo Final.png"
              alt="Myckeo Logo"
              fill
              className="rounded-full shadow-2xl object-cover"
              priority
            />
          </div>
          <div>
            <h1 className={`text-4xl md:text-5xl font-bold text-white ${titleFont.className}`}>Myckeo</h1>
            <p className="text-indigo-200 text-lg">Tu vitrina digital</p>
          </div>
        </motion.div>

        {/* Contactos Horizontales */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {contactInfo.map((item, index) => (
            <motion.a
              key={item.label}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group"
            >
              <div className={`bg-gradient-to-br ${item.color} p-1 rounded-2xl transition-all duration-300 group-hover:shadow-2xl`}>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 text-center text-white h-full flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium opacity-80">{item.label}</p>
                    <p className="text-sm font-bold">{item.value}</p>
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        {/* Footer */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-indigo-200 text-sm mt-8"
        >
          © 2025 Myckeo. Todos los derechos reservados. | Hecho con ❤️ en Colombia
        </motion.p>
      </div>
    </div>
  );
}