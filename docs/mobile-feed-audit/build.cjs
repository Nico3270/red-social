// Offline audit harness. Reads production components; writes only this directory.
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const out = path.join(__dirname, 'preview');
fs.mkdirSync(out, { recursive: true });
const artDir=path.join(out,'audit-art'); fs.mkdirSync(artDir,{recursive:true});
const svg=(w,h,bg,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</svg>`;
const coffee=svg(640,640,'#e9dfd1','<ellipse cx="330" cy="540" rx="180" ry="24" fill="#c8b9a5"/><path d="M217 112h200l28 419H194z" fill="#88634c"/><path d="M217 112h200l-18 32H232z" fill="#634632"/><rect x="231" y="229" width="172" height="188" rx="3" fill="#faf5e9"/><text x="317" y="278" text-anchor="middle" font-family="Georgia" font-size="25" fill="#504b3f">ORIGEN</text><circle cx="317" cy="324" r="21" fill="#748472"/><path d="M317 302q-17 20 0 43q17-23 0-43" fill="#485e47"/><text x="317" y="376" text-anchor="middle" font-family="sans-serif" font-size="12" letter-spacing="3" fill="#595141">CAFÉ · 250 G</text>');
const bag=svg(640,640,'#e5e9e6','<ellipse cx="323" cy="549" rx="176" ry="22" fill="#c5cec6"/><path d="M231 259q-9-165 88-165q99 0 87 165" fill="none" stroke="#96714f" stroke-width="25"/><path d="M159 235h320l-26 300H184z" fill="#bd996e"/><path d="M168 277h303M171 304h298M173 331h294M175 358h290M178 385h285M180 412h280M182 439h276M185 466h270M188 493h263" stroke="#a78055" stroke-width="7"/><path d="M210 239l13 293m48-293l6 293m44-293v293m49-293l-6 293m55-293l-13 293" stroke="#dbc29e" stroke-width="7"/>');
const plant=svg(640,640,'#e9e4db','<ellipse cx="320" cy="548" rx="152" ry="20" fill="#ccc1b0"/><path d="M239 374h162l-23 158H262z" fill="#b57557"/><path d="M320 405V161" stroke="#526b49" stroke-width="13"/><path d="M319 245q-141-6-127-113q120-9 127 113m3 61q124-4 133-119q-128 5-133 119m-4 60q-134-4-140-106q126-11 140 106" fill="#627c55"/><path d="M321 198q83-54 63-131q-94 29-63 131" fill="#718d60"/><rect x="230" y="369" width="180" height="30" rx="8" fill="#c58a69"/>');
const morning=svg(960,600,'#ddcbb7','<rect x="0" y="0" width="960" height="350" fill="#96a79c"/><path d="M0 350h960v250H0z" fill="#aa7d5c"/><path d="M70 0h20v350H70zm250 0h20v350h-20zm250 0h20v350h-20zm250 0h20v350h-20z" fill="#3d5148"/><rect x="54" y="48" width="240" height="240" rx="4" fill="#c6d1be" opacity=".5"/><ellipse cx="560" cy="475" rx="201" ry="52" fill="#8b6549"/><ellipse cx="555" cy="452" rx="168" ry="40" fill="#f4eee4"/><path d="M452 326h198v103q-12 58-99 58q-90 0-99-58z" fill="#eee8db"/><ellipse cx="551" cy="326" rx="99" ry="28" fill="#68442c"/><ellipse cx="551" cy="324" rx="73" ry="20" fill="#cfa97a"/><path d="M650 347q91-22 69 53q-9 37-70 19" fill="none" stroke="#eee8db" stroke-width="22"/><path d="M250 371q-44-87 3-139q48 51-3 139" fill="#475f45"/><path d="M245 380q-87-23-91-91q87 7 91 91" fill="#647c50"/><path d="M210 377h88l-13 93h-63z" fill="#c98d6b"/>');
for(const [name,data] of Object.entries({'coffee.svg':coffee,'bag.svg':bag,'plant.svg':plant,'morning.svg':morning,'portrait.svg':morning.replace('width="960" height="600" viewBox="0 0 960 600"','width="480" height="600" viewBox="240 0 480 600"'),'avatar.svg':svg(80,80,'#e5ebe4','<circle cx="40" cy="40" r="27" fill="#485e47"/><text x="40" y="49" text-anchor="middle" font-family="Georgia" font-size="28" fill="#fff">O</text>')})) fs.writeFileSync(path.join(artDir,name),data);
const virtual = {
  'next/link': `import React from 'react'; export default function Link({href,children,prefetch,...p}){return <a href={href} {...p}>{children}</a>}`,
  'next/image': `import React from 'react'; export default function Image({fill,quality,priority,unoptimized,src,style,...p}){return <img src={src} style={{...(fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:{}),...style}} {...p}/>}`,
  'next/navigation': `export const usePathname=()=>'/'; export const useRouter=()=>({push:()=>{},replace:()=>{}});`,
  'next-auth/react': `export const useSession=()=>{const role=new URLSearchParams(location.search).get('role');return {data:role?{user:{id:'synthetic-user',role}}:null,status:role?'authenticated':'unauthenticated'}};`,
  '@/config/fonts': `export const inter={className:'audit-inter',style:{fontFamily:'Inter'}},titleFont={className:'audit-title'},tituloCard={className:'audit-card-title'},textosFont={className:'audit-text'},titulosPrincipales={className:'audit-domine'};`,
  '@/store/carro/carro-store': `const state={getTotalItems:()=>0,addProductToCart:()=>{}}; export const useCartCatalogoStore=(selector)=>selector?selector(state):state;`,
  '@/store/favoritos/favoritos-store': `const state={favorites:[],getTotalItems:()=>0,addProductFavorites:()=>{},removeProductFavorites:()=>{}};export const useFavoritesCatalogoStore=(selector)=>selector?selector(state):state;`,
  '@/store/preferences/preferences-store': `export const usePreferencesStore=()=>({ciudad:'Bogotá',departamento:'Bogotá D.C.',userLat:null,userLong:null,setUbicacion:()=>{},setGeo:()=>{}});`,
  '@/analytics/events': `export const trackAnalyticsEvent=()=>{};`,
  '@/lib/media/productImageDiagnostics': `export const logProductImageDiagnostics=()=>{};`,
  '@/lib/observability/operationalLogger': `export const reportOperationalWarning=()=>{};`,
  '@/preferences/actions/updateUserPreferences': `export const updateUserPreferences=async()=>({ok:true});`,
};
const nullModule = `export default ()=>null; export const SideBar=()=>null,CrearModal=()=>null;`;
(async () => {
  const bundle=await esbuild.build({
    absWorkingDir: root, entryPoints: [path.join(__dirname, 'prototype.tsx.txt')],loader:{'.txt':'tsx'},
    outfile: path.join(out, 'app.js'), bundle:true, minify:true, jsx:'automatic',
    define:{'process.env.NODE_ENV':'"production"'},metafile:true,
    plugins:[{name:'audit-boundaries',setup(build){
      build.onResolve({filter:/.*/},args=>{
        if (virtual[args.path]) return {path:args.path,namespace:'audit'};
        if (/toggleFollow$/.test(args.path)) return {path:'follow-actions',namespace:'audit'};
        if (/PublicationModal$|side-bar\/SideBar$|topMenu\/Crear$|^\.\/Crear$/.test(args.path)) return {path:'closed-modals',namespace:'audit'};
        if(args.path.startsWith('@/')) {const base=path.join(root,'src',args.path.slice(2));return {path:[base,base+'.tsx',base+'.ts',base+'.json'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile())||base};}
      });
      build.onLoad({filter:/.*/,namespace:'audit'},args=>({contents:virtual[args.path] || (args.path==='follow-actions'?'export const checkIsFollowing=async()=>false,toggleFollow=async()=>({});':nullModule),loader:'jsx',resolveDir:root}));
    }}],logLevel:'warning'
  });
  const sources=Object.keys(bundle.metafile.inputs).filter(p=>p.startsWith('src/')).concat(['src/app/globals.css','tailwind.config.ts']).sort();
  fs.writeFileSync(path.join(__dirname,'source-manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),renderedProductionSources:Object.fromEntries(sources.map(p=>[p,require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')])),adapters:Object.keys(virtual),closedModalAdapters:['PublicationModal','SideBar','CrearModal'],followActionAdapter:true},null,2));
  execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli'),'-i',path.join(root,'src/app/globals.css'),'-o',path.join(out,'tailwind.css'),'--minify'],{cwd:root,stdio:'inherit'});
  fs.copyFileSync(path.join(__dirname,'prototype.css'),path.join(out,'prototype.css'));
  fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Myckeo · auditoría local</title><link rel="stylesheet" href="tailwind.css"><link rel="stylesheet" href="app.css"><link rel="stylesheet" href="prototype.css"></head><body><div id="root"></div><div id="modal-root"></div><script src="app.js"></script></body></html>');
  console.log('Audit preview built:',out);
})();
