import React from "react";

declare global {
  interface Window {
    productTest: {
      submissions: Record<string, FormDataEntryValue[]>[];
      navigations: string[];
      slowSave?: boolean;
      rejectSave?: boolean;
      rejectAI?: boolean;
      aiCalls: number;
      aiRequests?: {
        nombre: string;
        caracteristicas: string;
        componentes: string[];
      }[];
      releaseSave?: () => void;
    };
  }
}
export const inter = {
  className: "fixture-inter",
  style: { fontFamily: "Inter" },
};
export const titleFont = { className: "fixture-title" };
export function usePathname() {
  return "/dashboard/productos/nuevo_producto";
}
export function useRouter() {
  return { push: (url: string) => window.productTest.navigations.push(url) };
}
export async function createProduct(data: FormData) {
  const payload: Record<string, FormDataEntryValue[]> = {};
  data.forEach((_, key) => {
    payload[key] = data.getAll(key);
  });
  window.productTest.submissions.push(payload);
  if (window.productTest.slowSave)
    await new Promise<void>((resolve) => {
      window.productTest.releaseSave = resolve;
    });
  if (window.productTest.rejectSave)
    return { ok: false, message: "No se pudo guardar. Intenta nuevamente." };
  return {
    ok: true,
    message: "Producto creado exitosamente.",
    product: {
      id: "fixture-product",
      nombre: String(data.get("nombre")),
      precio: Number(data.get("precio")),
      slug: "cafe-de-prueba-abcd",
    },
  };
}
export async function generateDescriptionFromText(
  nombre: string,
  caracteristicas: string,
  componentes: string[],
) {
  (window.productTest.aiRequests ??= []).push({
    nombre,
    caracteristicas,
    componentes: [...componentes],
  });
  window.productTest.aiCalls++;
  if (window.productTest.rejectAI)
    return { ok: false, message: "No fue posible generar la propuesta." };
  return {
    ok: true,
    description:
      "Café cultivado en Colombia con notas de chocolate y un aroma suave.",
    shortDescription: "Café de origen colombiano.",
    tags: ["café", "colombia"],
  };
}
export default function Boundary({
  src,
  alt,
  fill,
  sizes: _sizes,
  priority: _priority,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <img
      {...props}
      src={src}
      alt={alt}
      style={
        fill
          ? {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              ...props.style,
            }
          : props.style
      }
    />
  );
}
export function Link({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
