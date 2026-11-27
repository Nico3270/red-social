"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import colombia from "@/config/colombia.json";
import {
  createAssistedBusinessAction,
  generateAssistedActivationAction,
  generateBusinessDemoAction,
  revokeBusinessDemosAction,
  setAssistedPublicationAction,
} from "@/actions/myckeoAdmin/assistedOnboarding";

type Business = {
  id: string;
  nombre: string;
  slug: string;
  ciudad: string;
  estado: string;
  activated: boolean;
  hasDemo: boolean;
  products: {
    id: string;
    nombre: string;
    precio: number;
    status: string;
    imageCount: number;
  }[];
};
const inputClass = "w-full rounded-lg border border-slate-300 bg-white p-3";
const buttonClass =
  "rounded-lg bg-slate-900 px-4 py-3 text-white disabled:opacity-50";

export default function AssistedOnboardingClient({
  businesses,
  categories,
  sections,
}: {
  businesses: Business[];
  categories: { id: string; nombre: string }[];
  sections: { id: string; nombre: string; categoryId: string | null }[];
}) {
  const router = useRouter();
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [activationUrl, setActivationUrl] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [identity, setIdentity] = useState(false);
  const [duplicates, setDuplicates] = useState<
    { id: string; nombre: string; ciudad: string; slug: string }[]
  >([]);
  const [duplicatesReviewed, setDuplicatesReviewed] = useState(false);
  const business = businesses.find((b) => b.id === selected);
  async function run(
    operation: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const result = await operation();
      setMessage(
        result.ok
          ? "Operación completada."
          : result.error || "No se pudo completar.",
      );
      if (result.ok) router.refresh();
    } catch {
      setMessage(
        "No se pudo completar. Comprueba el estado antes de reintentar.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-8">
      <form
        className="grid gap-4 rounded-2xl border bg-slate-50 p-5 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          await run(async () => {
            let operationId = localStorage.getItem(
              "myckeo-assisted-operation-v1",
            );
            if (!operationId) {
              operationId = crypto.randomUUID();
              localStorage.setItem("myckeo-assisted-operation-v1", operationId);
            }
            const result = await createAssistedBusinessAction({
              operationId,
              nombre: form.get("nombre"),
              descripcion: form.get("descripcion") || "",
              ciudad: form.get("ciudad"),
              departamento: department,
              telefonoContacto: form.get("telefono") || "",
              categoriaIds: [category],
              seccionIds: [String(form.get("seccion"))],
              reviewedDuplicateIds: duplicatesReviewed
                ? duplicates.map((d) => d.id)
                : [],
            });
            if (!result.ok && "duplicates" in result && result.duplicates) {
              setDuplicates(result.duplicates);
              setDuplicatesReviewed(false);
            }
            if (result.ok) {
              setSelected(result.business.id);
              setProductIds([]);
              setDuplicates([]);
            }
            return result;
          });
        }}
      >
        <h2 className="text-xl font-semibold sm:col-span-2">
          Crear perfil provisional
        </h2>
        <label>
          Nombre comercial
          <input
            className={inputClass}
            name="nombre"
            required
            minLength={2}
            maxLength={160}
          />
        </label>
        <label>
          Teléfono comercial autorizado
          <input
            className={inputClass}
            name="telefono"
            placeholder="+57 y 10 dígitos"
            pattern="\+57[0-9]{10}"
          />
        </label>
        <label>
          Departamento
          <select
            className={inputClass}
            required
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Selecciona</option>
            {colombia.map((d) => (
              <option key={d.departamento}>{d.departamento}</option>
            ))}
          </select>
        </label>
        <label>
          Ciudad
          <select
            key={department}
            className={inputClass}
            name="ciudad"
            required
            defaultValue=""
          >
            <option value="">Selecciona</option>
            {colombia
              .find((d) => d.departamento === department)
              ?.ciudades.map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </label>
        <label>
          Categoría
          <select
            className={inputClass}
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Selecciona</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sección
          <select
            key={category}
            className={inputClass}
            name="seccion"
            required
            defaultValue=""
          >
            <option value="">Selecciona</option>
            {sections
              .filter((s) => s.categoryId === category || !s.categoryId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          Descripción autorizada
          <textarea
            name="descripcion"
            className={inputClass}
            maxLength={3000}
          />
        </label>
        {duplicates.length > 0 ? (
          <div className="rounded-lg border border-amber-400 p-3 sm:col-span-2">
            <p>
              Posibles duplicados: abre la coincidencia para continuar con ella
              o confirma que es otro negocio.
            </p>
            {duplicates.map((d) => (
              <p key={d.id}>
                <Link
                  prefetch={false}
                  className="underline"
                  href={`/myckeoAdmin/editar/${d.slug}`}
                >
                  {d.nombre} · {d.ciudad}
                </Link>
              </p>
            ))}
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={duplicatesReviewed}
                onChange={(e) => setDuplicatesReviewed(e.target.checked)}
              />
              Revisé las coincidencias; son negocios distintos.
            </label>
          </div>
        ) : null}
        <button className={buttonClass} disabled={busy}>
          Crear negocio suspendido
        </button>
        <button
          className="rounded-lg border p-3"
          type="reset"
          disabled={busy}
          onClick={() => {
            localStorage.removeItem("myckeo-assisted-operation-v1");
            setDuplicates([]);
            setDepartment("");
            setCategory("");
          }}
        >
          Preparar otro negocio
        </button>
      </form>
      {message ? (
        <p role="status" className="rounded-lg border p-3">
          {message}
        </p>
      ) : null}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Negocios en incorporación</h2>
        <p className="text-sm text-slate-600">
          Últimos 100 perfiles aprovisionados. Cuenta activada y publicación son
          pasos independientes.
        </p>
        {businesses.map((b) => (
          <article
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          >
            <div>
              <h3 className="font-semibold">{b.nombre}</h3>
              <p>
                {b.ciudad} ·{" "}
                {b.activated ? "Cuenta activada" : "Pendiente de activación"} ·{" "}
                {b.estado === "activo" ? "Publicado" : "Oculto"} ·{" "}
                {b.products.length} productos
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                prefetch={false}
                className="underline"
                href={`/myckeoAdmin/editar/${b.slug}`}
              >
                Editar perfil
              </Link>
              <Link
                prefetch={false}
                className="underline"
                href={`/myckeoAdmin/crearProductos?businessId=${b.id}`}
              >
                Agregar productos
              </Link>
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setSelected(b.id);
                  setProductIds([]);
                  setAuthorized(false);
                  setIdentity(false);
                  setDemoUrl("");
                  setActivationUrl("");
                }}
              >
                Demo y activación
              </button>
            </div>
          </article>
        ))}
      </section>
      {business ? (
        <section className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <h2 className="text-xl font-semibold">Gestionar {business.nombre}</h2>
          <Link
            prefetch={false}
            className="underline"
            href={`/myckeoAdmin/productos/${business.slug}`}
          >
            Revisar catálogo administrativo
          </Link>
          <fieldset className="space-y-2">
            <legend className="font-semibold">
              Selecciona los productos autorizados
            </legend>
            {business.products.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 rounded-lg bg-white p-3"
              >
                <input
                  type="checkbox"
                  checked={productIds.includes(p.id)}
                  onChange={(e) =>
                    setProductIds((ids) =>
                      e.target.checked
                        ? [...ids, p.id]
                        : ids.filter((id) => id !== p.id),
                    )
                  }
                />
                {p.nombre}{" "}
                <Link
                  prefetch={false}
                  className="underline"
                  href={`/myckeoAdmin/crearProductos?businessId=${business.id}&productId=${p.id}`}
                >
                  Editar borrador
                </Link>{" "}
                ·{" "}
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                }).format(p.precio)}{" "}
                · {p.imageCount} fotos · {p.status}
              </label>
            ))}
          </fieldset>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
            />
            Tengo autorización del responsable para mostrar o publicar el perfil
            y los productos seleccionados.
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              className={buttonClass}
              disabled={busy || !authorized || !productIds.length}
              onClick={() =>
                run(async () => {
                  const result = await generateBusinessDemoAction({
                    businessId: business.id,
                    productIds,
                    authorizationConfirmed: authorized,
                  });
                  if (result.ok) setDemoUrl(result.url);
                  return result;
                })
              }
            >
              Generar demo privada · 7 días
            </button>
            <button
              className="rounded-lg border bg-white p-3"
              disabled={busy || !business.hasDemo}
              onClick={() => run(() => revokeBusinessDemosAction(business.id))}
            >
              Revocar demos
            </button>
          </div>
          {demoUrl ? (
            <div className="space-y-2">
              <label>
                Enlace de demo
                <input className={inputClass} readOnly value={demoUrl} />
              </label>
              <a
                className="inline-block underline"
                href={demoUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir demo privada
              </a>
              <p className="text-sm">
                Solo contiene la selección aprobada al generar el enlace. Puede
                reenviarse; regenerar revoca el enlace anterior.
              </p>
            </div>
          ) : null}
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={identity}
              onChange={(e) => setIdentity(e.target.checked)}
            />
            Verifiqué manualmente identidad y autorización del responsable. No
            tiene otra cuenta que necesite asociarse.
          </label>
          <button
            className={buttonClass}
            disabled={busy || !identity || business.activated}
            onClick={() =>
              run(async () => {
                const result = await generateAssistedActivationAction(
                  business.id,
                  identity,
                );
                if (result.ok) setActivationUrl(result.url);
                return result;
              })
            }
          >
            Generar activación segura
          </button>
          {activationUrl ? (
            <label className="block">
              Enlace de activación · 1 hora
              <input className={inputClass} readOnly value={activationUrl} />
              <span className="text-sm">
                Entrégalo únicamente al responsable verificado. Regenerar
                invalida el anterior. No lo guardes en notas o capturas.
              </span>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              className={buttonClass}
              disabled={
                busy || !authorized || !business.activated || !productIds.length
              }
              onClick={() =>
                run(() =>
                  setAssistedPublicationAction({
                    businessId: business.id,
                    approved: true,
                    productIds,
                    authorizationConfirmed: authorized,
                  }),
                )
              }
            >
              Aprobar y publicar selección
            </button>
            <button
              className="rounded-lg border bg-white p-3"
              disabled={busy || !authorized}
              onClick={() =>
                run(() =>
                  setAssistedPublicationAction({
                    businessId: business.id,
                    approved: false,
                    productIds: [],
                    authorizationConfirmed: authorized,
                  }),
                )
              }
            >
              Suspender negocio
            </button>
            <button className="underline" onClick={() => router.refresh()}>
              Actualizar estado
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
