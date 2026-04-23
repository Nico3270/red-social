"use client";

import LayoutDashboardComponent from "@/ui/components/dashboard/perfil/LayoutDashboardComponent";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

const ALLOWED_ROLES = ["admin", "super_admin"] as const;

export default function DashboardtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user) {
      router.push("/");
      return;
    }

    if (!ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
      router.push("/not_authorized");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <span className="text-lg text-gray-600 animate-pulse">Cargando...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <LayoutDashboardComponent>{children}</LayoutDashboardComponent>
    </main>
  );
}