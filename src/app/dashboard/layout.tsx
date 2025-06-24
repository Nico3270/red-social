"use client";

import { TopMenu, TopMenuMobile } from "@/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";

export default function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

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
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
    } else if (session && session.user.role !== "admin") {
      router.push("/not_authorized");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <p className="text-center mt-10">Cargando...</p>;
  }

  return (
    <main className="bg-white min-h-screen">
      {isMobile ? <TopMenuMobile /> : <TopMenu />}
      <div className="mt-0">{children}</div>
    </main>
  );
}
