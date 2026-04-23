import LayoutDashboardComponent from "@/ui/components/dashboard/perfil/LayoutDashboardComponent";
import { auth } from "@/auth.config";
import { isBusinessSessionRestricted } from "@/lib/business/businessSessionState";
import { redirect } from "next/navigation";
import React from "react";

const ALLOWED_ROLES = ["admin", "super_admin", "negocio", "user"] as const;

export default async function DashboardtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const userRole = session.user.role as string;

  if (!ALLOWED_ROLES.includes(userRole as (typeof ALLOWED_ROLES)[number])) {
    redirect("/not_authorized");
  }

  const businessRestricted = isBusinessSessionRestricted(session.user);

  return (
    <main className="min-h-screen bg-white">
      <LayoutDashboardComponent
        businessRestricted={businessRestricted}
        businessName={session.user.managedBusinessName ?? session.user.negocioNombre ?? null}
        businessRestrictionReason={session.user.businessRestrictionReason ?? null}
        businessArchivedAt={session.user.businessArchivedAt ?? null}
      >
        {children}
      </LayoutDashboardComponent>
    </main>
  );
}
