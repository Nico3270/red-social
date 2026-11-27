import DashboardSections from "@/dashboard/componentes/DashboardSections";
import {
  dashboardGroups,
  dashboardQuickActions,
  superAdminGroups,
} from "@/dashboard/dashboardMenu";
import { auth } from "@/auth.config";
import { isBusinessSessionRestricted } from "@/lib/business/businessSessionState";
import ArchivedBusinessDashboardState from "@/ui/components/dashboard/perfil/ArchivedBusinessDashboardState";
import CrearNegocioInfo from "@/dashboard/componentes/CrearNegocioInfo";

export default async function DashboardPage() {
  const session = await auth();
  const userType = session?.user?.role;
  const businessRestricted = isBusinessSessionRestricted(session?.user);

  if (userType === "negocio") {
    if (businessRestricted) {
      return (
        <main className="mx-auto max-w-7xl p-0 sm:p-2">
          <ArchivedBusinessDashboardState
            businessName={
              session?.user?.managedBusinessName ??
              session?.user?.negocioNombre ??
              null
            }
            reason={session?.user?.businessRestrictionReason ?? null}
            archivedAt={session?.user?.businessArchivedAt ?? null}
          />
        </main>
      );
    }

    return (
      <div className="max-w-7xl mx-auto p-0 sm:p-2">
        <DashboardSections
          groups={dashboardGroups}
          quickActions={dashboardQuickActions}
          businessName={
            session?.user?.negocioNombre ??
            session?.user?.managedBusinessName ??
            null
          }
        />
      </div>
    );
  }

  if (userType === "super_admin") {
    return (
      <div className="max-w-7xl mx-auto p-0 sm:p-2">
        <DashboardSections groups={superAdminGroups} administrative />
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-0 sm:p-2">
      <CrearNegocioInfo userId={session?.user?.id || ""} />
    </main>
  );
}
