"use client"
import ClientWrapper from "@/components/ui/ClientWrapper";
import { TopMenu, TopMenuMobile } from "@/ui";
import LoadingScreen from "@/ui/components/Loading-screen/Loading-Screen";
import React, { useState, useEffect, lazy, Suspense } from "react";


const LazyFooter = lazy(() => import("@/secondary/componentes/Footer"));

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [productosCargados, setProductosCargados] = useState(false);
  const [showFooter, setShowFooter] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollY + windowHeight >= documentHeight - 200) {
        setShowFooter(true);
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="bg-white min-h-screen flex flex-col relative">
      <ClientWrapper onProductsLoaded={() => setProductosCargados(true)} />

      {/* 🔥 Usamos el componente reutilizable */}
      <LoadingScreen isLoading={!productosCargados} />

      {productosCargados && (
        <>
          {isMobile ? <TopMenuMobile /> : <TopMenu />}
          <div className="flex-grow mt-0">{children}</div>
        </>
      )}

      {showFooter && (
        <Suspense fallback={<div className="text-center text-gray-500 py-4">Cargando footer...</div>}>
          <LazyFooter />
        </Suspense>
      )}
    </main>
  );
}
