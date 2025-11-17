// components/pitch/CompetenciaSinergiaRedes.tsx
'use client';

import { motion } from 'framer-motion';
import { HeartHandshake, Link as LinkIcon, Users, Star } from 'lucide-react';
import { titleFont } from '@/config/fonts';
import Image from 'next/image';

export default function CompetenciaSinergiaRedes() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="
        bg-white 
        rounded-3xl 
        shadow-2xl 
        p-6
        border 
        border-slate-100 
        max-w-6xl 
        mx-auto 
        space-y-10
      "
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-4">
        <HeartHandshake className="w-12 h-12 text-rose-500 drop-shadow-sm" />
        <h3
          className={`text-3xl md:text-4xl font-extrabold tracking-tight text-indigo-600 ${titleFont.className}`}
        >
          Myckeo + Redes Sociales = Sinergia Perfecta
        </h3>
      </div>

      <p className="text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed font-medium text-center">
        Conectamos tus perfiles, impulsamos tráfico cruzado y fortalecemos tu presencia digital
        con comunidad real, activa y verificable.
      </p>

      {/* Redes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card
          icon="/imgs/competidores/instagram.webp"
          title="Instagram"
          items={['Enlaces directos', 'Tráfico a catálogos', 'Visual + engagement']}
          accent="rose"
        />
        <Card
          icon="/imgs/competidores/facebook.png"
          title="Facebook"
          items={['Marketplace → Vitrina', 'Búsquedas + feed', 'Reseñas = confianza']}
          accent="blue"
        />
        <Card
          icon="/imgs/competidores/Linkedin.jpg"
          title="LinkedIn"
          items={['Networking B2B', 'Testimonios → credenciales', 'Agenda desde posts']}
          accent="emerald"
        />
      </div>
    </motion.div>
  );
}

interface CardProps {
  icon: string;
  title: string;
  items: string[];
  accent: 'rose' | 'blue' | 'emerald';
}

const Card = ({ icon, title, items, accent }: CardProps) => {
  const accents: Record<'rose' | 'blue' | 'emerald', { bg: string; icon: string; ring: string }> = {
    rose: {
      bg: 'from-rose-50 to-rose-100/70',
      icon: 'text-rose-500',
      ring: 'ring-rose-100',
    },
    blue: {
      bg: 'from-blue-50 to-blue-100/70',
      icon: 'text-blue-500',
      ring: 'ring-blue-100',
    },
    emerald: {
      bg: 'from-emerald-50 to-emerald-100/70',
      icon: 'text-emerald-500',
      ring: 'ring-emerald-100',
    },
  };

  return (
    <div
      className={`
        rounded-3xl 
        p-8 
        shadow-xl 
        ring-1 
        ${accents[accent].ring}
        bg-gradient-to-br 
        ${accents[accent].bg}
        hover:shadow-2xl 
        transition-all
      `}
    >
      <Image
        src={icon}
        alt={title}
        width={64}
        height={64}
        className="mx-auto mb-4 drop-shadow-md"
      />

      <h4 className="text-xl font-bold text-slate-900 mb-4 text-center">
        {title}
      </h4>

      <ul className="text-left text-slate-700 space-y-3 text-base">
        {items.map((item: string, i: number) => {
          const Icon = i === 0 ? LinkIcon : i === 1 ? Users : Star;
          return (
            <li key={i} className="flex items-center">
              <Icon className={`w-5 h-5 mr-2 ${accents[accent].icon}`} />
              <span>{item}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};