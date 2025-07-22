"use client";

import LayoutDashboardComponent from "@/ui/components/dashboard/perfil/LayoutDashboardComponent";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";


export default function DashboardtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Protección de ruta
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user) {
      router.push("/"); // Redirige a la página principal
    } else if (session.user.role !== "admin" && session.user.role !== "negocio") {
  router.push("/not_authorized");
}
  }, [session, status, router]);

  // Loader
  if (status === "loading") {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <span className="text-gray-600 animate-pulse text-lg">Cargando...</span>
      </div>
    );
  }

  return (
    <main className="bg-white min-h-screen">
      <LayoutDashboardComponent>{children}</LayoutDashboardComponent>
    </main>
  );
}