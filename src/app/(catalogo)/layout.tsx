"use client";

import { TopMenu, TopMenuMobile } from "@/ui";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import CookieConsent from "react-cookie-consent";
import Link from "next/link";
import React, { useState, useEffect } from "react";

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname(); // ← Importante para evitar bucles

  // Redirección solo si es placeholder y NO está ya en la página de edición
  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.isPlaceholder === true &&
      pathname !== "/dashboard/editar-perfil"
    ) {
      router.replace("/dashboard/editar-perfil");
    }
  }, [session, status, pathname, router]);

  // Detectar si es móvil
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll infinito (opcional, puedes activarlo después)
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollY + windowHeight >= documentHeight - 200) {
        // Aquí puedes cargar más contenido si quieres
        // console.log("Cargar más...");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-white min-h-screen flex flex-col relative">
      {isMobile ? <TopMenuMobile /> : <TopMenu />}
      <main className="flex-grow mt-0">{children}</main>

      {/* Banner de Consentimiento */}
      <CookieConsent
        location="bottom"
        buttonText="Aceptar"
        declineButtonText="Rechazar"
        enableDeclineButton
        cookieName="myckeo-consent"
        style={{
          background: "#1F2937",
          color: "#F3F4F6",
          padding: "1rem",
          fontSize: "14px",
          zIndex: 9999,
        }}
        buttonStyle={{
          background: "#3B82F6",
          color: "white",
          fontSize: "14px",
          padding: "8px 16px",
          borderRadius: "4px",
        }}
        declineButtonStyle={{
          background: "#EF4444",
          color: "white",
          fontSize: "14px",
          padding: "8px 16px",
          borderRadius: "4px",
        }}
        expires={150}
      >
        Usamos almacenamiento local y cookies para mejorar tu experiencia. Lee nuestra{" "}
        <Link href="/politica-cookies" className="text-blue-400 underline">
          Política de Cookies
        </Link>.
      </CookieConsent>

      {/* Footer con enlaces legales */}
      <footer className="bg-gray-900 text-gray-300 py-6 px-4 text-center border-t border-gray-700">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <Link href="/politica-privacidad" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
            Política de Privacidad
          </Link>
          <Link href="/politica-cookies" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
            Política de Cookies
          </Link>
          <Link href="/terminos-servicio" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
            Términos de Servicio
          </Link>
          <Link href="/politica-publicidad" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
            Política de Publicidad
          </Link>
          <Link href="/contacto" className="text-blue-400 hover:text-blue-300 transition-colors duration-200">
            Contacto
          </Link>
        </div>

        <div className="text-sm space-y-1">
          <p>
            &copy; {new Date().getFullYear()} <span className="font-semibold text-white">Myckeo</span> by{" "}
            <span className="font-semibold text-white">CÓDEX SOLUTIONS S.A.S.</span>
          </p>
          <p>Empresa registrada en la Cámara de Comercio de Bogotá, NIT 901.912.004-1.</p>
          <p>Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
