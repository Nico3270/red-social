// app/pitch/page.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import PresentacionMyckeo from './componentes/PresentacionMyckeo';
import { titleFont } from '@/config/fonts';
import ProblemaMyckeo from './componentes/ProblemaMyckeo';
import PropuestaValorMyckeo from './componentes/PropuestaValorMyckeo';
import SolucionMyckeo from './componentes/SolucionMyckeo';
import MomentoMyckeo from './componentes/MomentoMyckeo';
import MercadoMyckeo from './componentes/MercadoMyckeo';
import MonetizacionMyckeo from './componentes/MonetizacionMyckeo';
import TraccionMyckeo from './componentes/TraccionMyckeo';
import CompetenciaMyckeo from './componentes/CompetenciaMyckeo';
import FinanzasMyckeo from './componentes/FinanzasMyckeo.tsx';


// --------------------------------------------------------------------------
// 1. ARRAY DE SECCIONES
// --------------------------------------------------------------------------
type Section = {
  id: string;
  label: string;
  component: React.FC;
};

const SECTIONS: Section[] = [
  { id: 'presentacion', label: 'Presentación', component: () => <PresentacionMyckeo /> },
  { id: 'problema', label: 'El Problema', component: () => <ProblemaMyckeo /> },
  { id: 'propuesta', label: 'Propuesta de valor', component: () => <PropuestaValorMyckeo /> },
  { id: 'solucion', label: 'Solución: Myckeo', component: () => <SolucionMyckeo /> },
  { id: 'momento', label: '¿Por Qué Ahora?', component: () => <MomentoMyckeo /> },
  { id: 'mercado', label: 'Tamaño del Mercado', component: () => <MercadoMyckeo /> },
  { id: 'monetizacion', label: 'Modelo de Negocio', component: () => <MonetizacionMyckeo /> },
  { id: 'traccion', label: 'Tracción', component: () => <TraccionMyckeo /> },
  { id: 'competencia', label: 'Competencia', component: () => <CompetenciaMyckeo /> },
  { id: 'finanzas', label: 'Finanzas', component: () => <FinanzasMyckeo /> },
];

// --------------------------------------------------------------------------
// 2. NAVBAR PREMIUM: Logo 1/6, menú 5/6, mobile sin desborde
// --------------------------------------------------------------------------
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('presentacion');

  // Detectar sección activa al hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;

      for (const section of SECTIONS) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200">
      <nav className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Fila única: Logo 1/6 + Menú 5/6 */}
        <div className="flex items-center py-3">
          {/* Logo + Nombre (1/6 del ancho) */}
          <Link href="/" className="flex items-center gap-3 w-1/6 min-w-0">
            <Image
              src="/imgs/Logo Final (1).png"
              alt="Logo Myckeo"
              width={64}
              height={64}
              className="rounded-full shadow-md flex-shrink-0"
              priority
            />
            <span className={`text-3xl font-bold text-slate-900 tracking-tight ${titleFont.className} truncate`}>
              Myckeo
            </span>
          </Link>

          {/* Desktop Menu - Flexible, ocupa 5/6 */}
          <ul className="hidden lg:flex items-center gap-3 flex-wrap flex-1 justify-center">
            {SECTIONS.map((sec) => (
              <li key={sec.id}>
                <button
                  onClick={() => scrollTo(sec.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeSection === sec.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                      : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-50'
                  }`}
                >
                  {activeSection === sec.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  {sec.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors ml-auto"
            aria-label="Menú"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu - Sin desborde, centrado */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white">
          <ul className="px-6 py-3 space-y-1 max-w-full">
            {SECTIONS.map((sec) => (
              <li key={sec.id} className="w-full">
                <button
                  onClick={() => scrollTo(sec.id)}
                  className={`flex w-full items-center gap-3 py-2.5 px-3 rounded-lg transition-all text-sm font-medium ${
                    activeSection === sec.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {activeSection === sec.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  {sec.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}

// --------------------------------------------------------------------------
// 3. PAGE PRINCIPAL
// --------------------------------------------------------------------------
export default function PitchPage() {
  return (
    <>
      <Navbar />
      <main>
        {SECTIONS.map((sec) => (
          <section key={sec.id} id={sec.id}>
            <sec.component />
          </section>
        ))}
      </main>
    </>
  );
}