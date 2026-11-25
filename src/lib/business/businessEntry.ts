/** Navigation intent only: authorization remains in auth and the server actions. */
export const BUSINESS_ENTRY_PATH = "/config/completePerfil?negocio=1";
export const BUSINESS_REGISTER_PATH = "/auth/new-account?tipo=negocio";
export const BUSINESS_LOGIN_PATH = "/auth/login?tipo=negocio";

type BusinessEntryUser = {
  id: string;
  role?: string;
  perfilCompleto?: boolean;
  isPlaceholder?: boolean;
  hasManagedBusiness?: boolean;
  negocioId?: string | null;
};

export function getBusinessEntryDestination(user?: BusinessEntryUser | null) {
  if (!user) return BUSINESS_REGISTER_PATH;
  if (user.isPlaceholder) return "/dashboard/editar-perfil";
  if (user.perfilCompleto === false)
    return "/dashboard/editar-usuario?negocio=1";
  if (
    user.hasManagedBusiness ||
    user.negocioId ||
    ["admin", "super_admin"].includes(user.role || "")
  )
    return "/dashboard";
  return `/crear_negocio/${encodeURIComponent(user.id)}`;
}

/** Auth screens accept internal destinations only; business intent has a fixed one. */
export function internalAuthCallback(value: string | null, origin?: string) {
  if (!value || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value))
    return "/";
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    if (
      origin &&
      url.origin === origin &&
      ["http:", "https:"].includes(url.protocol)
    )
      return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    /* An invalid callback falls back to the public home. */
  }
  return "/";
}
