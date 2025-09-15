"use client"

import { TopMenu, TopMenuMobile } from "@/ui";
import { useSession } from "next-auth/react";
import {  useRouter } from "next/navigation";


import React, { useState, useEffect } from "react";

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user && !session.user.perfilCompleto) {
      console.log(session.user.perfilCompleto);
      router.replace("/config/completePerfil"); // 👈 redirige sin dejar historial
    }
  }, [session, router]);


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
 
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="bg-white min-h-screen flex flex-col relative">
      
        <>
          {isMobile ? <TopMenuMobile /> : <TopMenu />}
          <div className="flex-grow mt-0">{children}</div>
        </>
      
    </main>
  );
}