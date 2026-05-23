import Link from "next/link";
import MyckeoAdminSectionHeader from "./_componentes/MyckeoAdminSectionHeader";

type CardTone = "slate" | "sky" | "amber" | "emerald";

type HubCard = {
  title: string;
  description: string;
  href: string;
  cta: string;
  status: string;
  priority: "Alta" | "Operativa";
  tone: CardTone;
  routeLabel: string;
  helperText: string;
};

const hubCards: HubCard[] = [
  {
    title: "Negocios",
    description:
      "Administra negocios, estados, archivados, perfiles, productos y catálogo desde un solo lugar.",
    href: "/myckeoAdmin/negocios",
    cta: "Abrir negocios",
    status: "Activo",
    priority: "Alta",
    tone: "emerald",
    routeLabel: "/myckeoAdmin/negocios",
    helperText:
      "Punto de entrada operativo para seleccionar negocio y continuar con flujos contextuales.",
  },
  {
    title: "Crear productos asistidos",
    description:
      "Crea productos para negocios con flujo asistido y revisión admin.",
    href: "/myckeoAdmin/crearProductos",
    cta: "Crear productos",
    status: "Activo",
    priority: "Alta",
    tone: "sky",
    routeLabel: "/myckeoAdmin/crearProductos",
    helperText:
      "Acceso directo al flujo de creación asistida sin depender de la vista operativa de negocios.",
  },
  {
    title: "Editar perfiles de negocio",
    description:
      "Modifica información pública, imágenes, ubicación, redes y categorías de un negocio.",
    href: "/myckeoAdmin/negocios",
    cta: "Seleccionar negocio",
    status: "Requiere seleccionar negocio",
    priority: "Alta",
    tone: "amber",
    routeLabel: "/myckeoAdmin/negocios",
    helperText:
      "La edición real vive en rutas dinámicas por slug y debe iniciarse desde el listado de negocios.",
  },
  {
    title: "Organizar catálogo",
    description:
      "Gestiona grupos de catálogo, orden, productos asignados y destacados.",
    href: "/myckeoAdmin/negocios",
    cta: "Elegir negocio",
    status: "Requiere seleccionar negocio",
    priority: "Alta",
    tone: "amber",
    routeLabel: "/myckeoAdmin/negocios",
    helperText:
      "La organización de catálogo depende del negocio elegido y no debe abrirse con un slug fijo desde el hub.",
  },
  {
    title: "Productos por negocio",
    description:
      "Audita productos, cambia estados, revisa incompletos y ejecuta eliminación segura.",
    href: "/myckeoAdmin/negocios",
    cta: "Auditar productos",
    status: "Requiere seleccionar negocio",
    priority: "Alta",
    tone: "slate",
    routeLabel: "/myckeoAdmin/negocios",
    helperText:
      "Las vistas de productos son contextuales por negocio y reutilizan validaciones y previews internos.",
  },
  {
    title: "Limpieza segura",
    description:
      "Las acciones sensibles se ejecutan solo dentro de vistas con preview, validaciones y confirmaciones.",
    href: "/myckeoAdmin/negocios",
    cta: "Ir a negocios",
    status: "Contextual",
    priority: "Operativa",
    tone: "slate",
    routeLabel: "/myckeoAdmin/negocios",
    helperText:
      "No expone acciones destructivas desde esta landing; solo dirige al módulo donde existe el contexto completo.",
  },
];

const operatingRules = [
  "Las rutas con slug requieren seleccionar primero un negocio.",
  "Las acciones destructivas usan preview, blockers y confirmación fuerte.",
  "El hub no reemplaza los módulos operativos; solo centraliza accesos.",
  "Evita ejecutar cambios sensibles sin revisar el contexto del negocio.",
];

const recommendedFlow = [
  "Selecciona un negocio.",
  "Edita perfil, catálogo o productos según el objetivo.",
  "Revisa cambios y valida impacto antes de continuar.",
  "Publica o limpia datos con seguridad y confirmación contextual.",
];

function getToneClasses(tone: CardTone) {
  switch (tone) {
    case "emerald":
      return {
        panel:
          "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.92),rgba(255,255,255,0.98))]",
        status:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
        cta: "bg-emerald-600 text-white hover:bg-emerald-500",
      };
    case "sky":
      return {
        panel:
          "border-sky-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.94),rgba(255,255,255,0.98))]",
        status: "border border-sky-200 bg-sky-50 text-sky-700",
        cta: "bg-sky-600 text-white hover:bg-sky-500",
      };
    case "amber":
      return {
        panel:
          "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.94),rgba(255,255,255,0.98))]",
        status:
          "border border-amber-200 bg-amber-50 text-amber-700",
        cta: "bg-amber-500 text-slate-950 hover:bg-amber-400",
      };
    case "slate":
    default:
      return {
        panel:
          "border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))]",
        status:
          "border border-slate-200 bg-slate-100 text-slate-700",
        cta: "bg-slate-950 text-white hover:bg-slate-800",
      };
  }
}

function HubCardItem({ card }: { card: HubCard }) {
  const tone = getToneClasses(card.tone);

  return (
    <article
      className={`flex h-full flex-col rounded-[28px] border p-5 shadow-[0_20px_42px_-32px_rgba(15,23,42,0.34)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_50px_-32px_rgba(15,23,42,0.38)] ${tone.panel}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.status}`}
        >
          {card.status}
        </span>
        <span className="inline-flex items-center rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Prioridad {card.priority}
        </span>
      </div>

      <div className="mt-5">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">
          {card.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-[15px]">
          {card.description}
        </p>
      </div>

      <div className="mt-5 rounded-3xl border border-white/90 bg-white/80 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Ruta de entrada
        </p>
        <p className="mt-2 break-all rounded-2xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
          {card.routeLabel}
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {card.helperText}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
          Hub principal
        </p>
        <Link
          href={card.href}
          className={`inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${tone.cta}`}
        >
          {card.cta}
        </Link>
      </div>
    </article>
  );
}

export default function MyckeoAdminHubPage() {
  const rightContent = (
    <>
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-5 py-4 text-sm text-slate-700 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.28)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Estado del acceso
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Acceso protegido
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
            Hub read-only
          </span>
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
            Sin consultas DB
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Esta landing centraliza accesos del super-admin sin ejecutar acciones ni cargar datos operativos.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-4 py-4 text-sm text-slate-700 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.24)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Accesos directos
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            2
          </p>
          <p className="mt-1 text-xs text-slate-500">negocios y creación asistida</p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-4 py-4 text-sm text-slate-700 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.24)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Flujos contextuales
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            4
          </p>
          <p className="mt-1 text-xs text-slate-500">requieren contexto previo</p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 px-4 py-4 text-sm text-slate-700 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.24)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Herramientas visibles
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            6
          </p>
          <p className="mt-1 text-xs text-slate-500">accesos priorizados en esta fase</p>
        </div>
      </div>
    </>
  );

  const footer = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm text-slate-600">
        Algunas herramientas requieren seleccionar primero un negocio desde el módulo de negocios antes de editar perfil, catálogo o productos.
      </p>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/myckeoAdmin/negocios"
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Ir a negocios
        </Link>
        <Link
          href="/myckeoAdmin/crearProductos"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Crear productos
        </Link>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eff6ff_38%,#f8fafc_100%)]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <MyckeoAdminSectionHeader
          eyebrow="Centro operativo"
          title="Panel Super Admin"
          description="Centro de operaciones internas de Myckeo. Usa este hub para entrar rápido a los módulos clave sin duplicar la lógica operativa existente."
          rightContent={rightContent}
          footer={footer}
        />

        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.3)]">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Herramientas principales
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Accesos centrales del super-admin para operar con claridad, contexto y rutas reales ya existentes.
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              Fase 1: hub estático y responsive
            </span>
          </div>

          <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
            {hubCards.map((card) => (
              <HubCardItem key={card.title} card={card} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-950">
                Buenas prácticas admin
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Reglas operativas para mantener consistencia y reducir errores en los módulos sensibles.
              </p>
            </div>

            <ul className="grid gap-3 p-5 sm:grid-cols-2">
              {operatingRules.map((rule) => (
                <li
                  key={rule}
                  className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] px-4 py-4 text-sm leading-6 text-slate-700"
                >
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Regla
                  </span>
                  <p className="mt-3">{rule}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-950">
                Flujo recomendado
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Secuencia sugerida para entrar, operar y validar cambios con el menor riesgo posible.
              </p>
            </div>

            <ol className="space-y-3 p-5">
              {recommendedFlow.map((step, index) => (
                <li
                  key={step}
                  className="flex items-start gap-4 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 py-4"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sm font-semibold text-sky-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Paso {index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{step}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </section>
      </section>
    </main>
  );
}