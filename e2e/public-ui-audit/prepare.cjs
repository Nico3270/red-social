// Extend the existing development-only fixture; application routes are not replaced.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
execFileSync(process.execPath, [path.join(root, "e2e/mobile-feed-implementation/prepare.cjs")]);
const directory = path.join(root, "src/app/(catalogo)/feed-implementation-review");
const client = path.join(directory, "ReviewClient.tsx");
let source = fs.readFileSync(client, "utf8");
source = source.replace('import { makeFixtures }', `import { DetallesProducto } from "@/ui/components/productos/DetallesProducto";
import PerfilUsuarioHeader from "@/ui/components/perfil-usuario-header/PerfilUsuarioHeader";
import { BusinessCard } from "@/feed/componentes/BusinessCard";
import DiscoveryBusinessCard from "@/feed/componentes/DiscoveryBusinessCard";
import DiscoveryServiceCard from "@/feed/componentes/DiscoveryServiceCard";
import { makeFixtures }`);
source = source.replace('  const container =', `
  if(query.get("view")==="contact-paths") return <div className="mx-auto max-w-5xl p-4 space-y-6">
    <section data-audit-contact="business"><DiscoveryBusinessCard business={data.business as any}/></section>
    <section data-audit-contact="legacy-business"><BusinessCard business={data.business as any}/></section>
    <section data-audit-contact="service"><DiscoveryServiceCard servicio={data.service as any}/></section>
    <section data-audit-contact="product"><ProductCard product={data.base as any} variant="feed"/></section>
    <section data-audit-contact="detail"><DetallesProducto product={data.base as any} telefonoNegocio={data.base.telefonoContacto}/></section>
    <section data-audit-contact="profile"><PerfilUsuarioHeader activeTabComponent="Negocio" productos={[]} resumenPerfil={{productos:0,servicios:0,publicaciones:0,reseñas:0} as any} informacionNegocio={{nombreNegocio:"Casa Origen",slugNegocio:"casa-origen",negocioId:"b1",descripcionNegocio:"Café de origen",telefonoNegocio:data.base.telefonoContacto,telefonoContacto:data.base.telefonoContacto,ciudadNegocio:"Bogotá",departamentoNegocio:"Bogotá D.C.",latitudNegocio:0,longitudNegocio:0,categoriaIds:[],seccionesIds:[],estadoNegocio:"activo",configReservation:false,configEncuestas:false}}/></section>
  </div>;
  const container =`);
fs.writeFileSync(client, source);
const fixtures = path.join(directory, "fixtures.tsx");
fs.writeFileSync(fixtures, fs.readFileSync(fixtures, "utf8").replaceAll("'3100000000'", "(params.get('phone') ?? '3100000000')"));
