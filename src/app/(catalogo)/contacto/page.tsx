import type { Metadata } from "next";
import { InfoEmpresa } from "@/config/config";

export const metadata: Metadata = {
  title: "Contacto | Myckeo",
  description: "Contacta al equipo de Myckeo.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Contacto</h1>
      <p className="mt-3 text-slate-600">
        Para preguntas o ayuda con Myckeo, escríbenos a:
      </p>
      <a
        href={`mailto:${InfoEmpresa.email}`}
        className="mt-3 inline-flex min-h-11 items-center text-blue-600 underline [overflow-wrap:anywhere]"
      >
        {InfoEmpresa.email}
      </a>
    </section>
  );
}
