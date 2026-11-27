import type { DemoSnapshot } from "@/lib/onboarding/contracts";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
});
export default function BusinessDemoProfile({
  business,
}: {
  business: DemoSnapshot;
}) {
  return (
    <article className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="h-40 bg-gradient-to-r from-sky-100 to-emerald-100 sm:h-64">
        {business.fotoPortada ? (
          <img
            src={business.fotoPortada}
            alt={`Portada de ${business.nombre}`}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </div>
      <header className="space-y-3 p-5 sm:p-8">
        {business.fotoPerfil ? (
          <img
            src={business.fotoPerfil}
            alt={business.nombre}
            className="-mt-16 h-24 w-24 rounded-full border-4 border-white bg-white object-cover"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <h1 className="break-words text-3xl font-bold text-slate-900">
          {business.nombre}
        </h1>
        <p className="text-slate-600">
          {business.ciudad}, {business.departamento}
        </p>
        <p className="whitespace-pre-line">{business.descripcion}</p>
        {business.direccion ? <p>{business.direccion}</p> : null}
        {business.telefono ? (
          <p>Contacto comercial: {business.telefono}</p>
        ) : null}
      </header>
      <section
        aria-label="Catálogo de demostración"
        className="grid gap-5 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-3"
      >
        {business.products.map((product) => (
          <article
            key={product.id}
            className="min-w-0 overflow-hidden rounded-xl border border-slate-200"
          >
            {product.imagenes[0] ? (
              <img
                src={product.imagenes[0]}
                alt={product.nombre}
                className="aspect-square w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <div className="space-y-2 break-words p-4">
              <h2 className="text-lg font-semibold">{product.nombre}</h2>
              <p className="text-xl font-bold">{cop.format(product.precio)}</p>
              <p className="whitespace-pre-line text-sm text-slate-600">
                {product.descripcion}
              </p>
              {product.imagenes.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {product.imagenes.slice(1).map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt={`Otra fotografía de ${product.nombre}`}
                      className="h-16 w-16 rounded object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
              ) : null}
              {product.variantes.map((variant, i) => (
                <p className="text-sm" key={i}>
                  {variant.nombre}{" "}
                  {variant.opciones
                    .map((o) => `${o.nombre}: ${o.valor}`)
                    .join(" · ")}
                  {variant.precio !== null
                    ? ` · ${cop.format(variant.precio)}`
                    : ""}
                </p>
              ))}
            </div>
          </article>
        ))}
      </section>
    </article>
  );
}
