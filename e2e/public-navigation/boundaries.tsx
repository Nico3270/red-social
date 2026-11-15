import React from "react";

declare global {
  interface Window {
    navigationTest: {
      role: string | null;
      path: string;
      cartCount: number;
      navigations: string[];
      preferenceWrites: number;
    };
  }
}
export const titleFont = { className: "fixture-title" };
export const inter = {
  className: "fixture-inter",
  style: { fontFamily: "Inter" },
};
export function usePathname() {
  return window.navigationTest.path;
}
export function useRouter() {
  return {
    push: (url: string) => window.navigationTest.navigations.push(url),
    replace: (url: string) => window.navigationTest.navigations.push(url),
  };
}
export function useSession() {
  const role = window.navigationTest.role;
  return {
    status: role ? "authenticated" : "unauthenticated",
    data: role
      ? {
          user: {
            id: "fixture-owner",
            name: "Negocio de prueba",
            role,
            isPlaceholder: false,
            perfilCompleto: true,
            negocioNombre: "Café de prueba",
            negocioSlug: "cafe-de-prueba",
          },
        }
      : null,
  };
}
export async function signIn() {}
export async function signOut() {}
export async function updateUserPreferences() {
  window.navigationTest.preferenceWrites++;
  return { ok: true, message: "Simulado" };
}
export function Link({
  href,
  onClick,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          event.preventDefault();
          window.navigationTest.navigations.push(String(href));
        }
      }}
    >
      {children}
    </a>
  );
}
export default function Image({
  src,
  alt,
  fill: _fill,
  priority: _priority,
  unoptimized: _unoptimized,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
}) {
  return <img src={src} alt={alt} {...props} />;
}
