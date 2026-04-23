type SessionBusinessLike = {
  role?: string | null;
  hasManagedBusiness?: boolean;
  businessOperational?: boolean;
  businessRestrictionReason?: string | null;
};

export function isBusinessSessionRestricted(user?: SessionBusinessLike | null) {
  return Boolean(
    user?.role === "negocio" &&
      user?.hasManagedBusiness &&
      user?.businessOperational === false
  );
}

export function getBusinessRestrictionLabel(reason?: string | null) {
  switch (reason) {
    case "archived":
      return "archivado";
    case "inactive":
      return "inactivo";
    case "test_data":
      return "marcado como test";
    default:
      return "no disponible";
  }
}

export function isAllowedRestrictedDashboardPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/editar-usuario")
  );
}
