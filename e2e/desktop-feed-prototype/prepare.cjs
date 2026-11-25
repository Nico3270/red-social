const fs = require('node:fs');
const path = require('node:path');
require('../mobile-feed-implementation/prepare.cjs');
const {execFileSync}=require('node:child_process');
const baseline=execFileSync('git',['show','058d13329ba6a81414e140a33d08cb50475d009b:src/publicaciones/componentes/FeedRederer.tsx'],{encoding:'utf8'}).replace('./feedProductModules.module.css','@/publicaciones/componentes/feedProductModules.module.css');
fs.writeFileSync(path.resolve(__dirname,'../../src/app/(catalogo)/feed-implementation-review/BaselineRenderer.tsx'),baseline);
const route = path.resolve(__dirname,'../../src/app/(catalogo)/feed-implementation-review/ReviewClient.tsx');
fs.writeFileSync(route, `"use client";
import {useEffect,useMemo,useState} from "react";
import {useSearchParams} from "next/navigation";
import FeedRenderer from "@/publicaciones/componentes/FeedRederer";
import BaselineRenderer from "./BaselineRenderer";
import FeedComponent from "@/feed/componentes/FeedComponent";
import {usePreferencesStore} from "@/store/preferences/preferences-store";
import {makeFixtures} from "./fixtures";
export default function ReviewClient(){
 const query=useSearchParams(); const [tab,setTab]=useState<any>("Para ti");const [extra,setExtra]=useState(0);
 useEffect(()=>{Object.assign(window,{__desktopAppend:()=>setExtra(4)});return()=>{delete (window as unknown as Record<string,unknown>).__desktopAppend;};},[]);
 const fixture=useMemo(()=>{const d=makeFixtures(new URLSearchParams());
 const scenario=query.get("scenario")||"balanced";
 const counts=scenario==="commerce"?[1,24]:scenario==="social"?[8,0]:scenario==="only-commerce"?[0,17]:scenario==="sparse"?[1,1]:[5,12];
 const items:any[]=[];
 for(let tier=0;tier<3;tier++){
 const city=["Tunja","Duitama","Bogotá"][tier];const department=tier===2?"Bogotá D.C.":"Boyacá";
 const businessId='b-'+tier;const slug=tier===0?'casa-origen':'casa-origen-'+tier;
 const pubs=tier===0?counts[0]+extra:1; const products=tier===0?counts[1]:3;
 for(let i=0;i<pubs;i++){const review=i%3===1;const pub={...d.publication,negocio:{...d.publication.negocio,id:businessId,slug},id:'pub-'+tier+'-'+i,titulo:review?'Un café para volver':'Detrás de cada taza',tipo:review?'TESTIMONIO':'CARRUSEL_IMAGENES',calificacion:review?4.7:null,producto:review?{id:'p-'+tier+'-0',nombre:d.base.nombre,slug:d.base.slug+'-'+tier+'-0'}:undefined,descripcion:review?'Buena preparación y un lugar tranquilo para compartir.':'Conoce el proceso, las personas y las historias de nuestro café de origen.',multimedia:review?[]:[{...d.publication.multimedia[0],url:i%2?'/__feed-implementation-art/portrait.svg':'/__feed-implementation-art/morning.svg'}]};items.push({...d.item('publication',pub),locationTier:tier});}
 for(let i=0;i<products;i++){const p={...d.products[i%d.products.length],id:'p-'+tier+'-'+i,slug:d.products[i%d.products.length].slug+'-'+tier+'-'+i,negocioId:businessId,slugNegocio:slug};items.push({...d.item('product',p),locationTier:tier});}
 if(scenario!=="social"&&scenario!=="sparse")items.push({...d.item('business',{...d.business,id:businessId,negocioId:businessId,slug,ciudad:city,departamento:department}),locationTier:tier},{...d.item('service',{...d.service,id:'s-'+tier,negocioSlug:slug}),locationTier:tier});
 }
 return {items};},[query,extra]);
 useEffect(()=>{if(query.get('view')!=="live")usePreferencesStore.getState().setUbicacion("Tunja","Boyacá");},[query]);
 const Renderer=query.get("compare")==="before"?BaselineRenderer:FeedRenderer;
 return <div><div id="modal-root"/>{query.get('view')==="live"?<FeedComponent discoveryContext="home"/>:<Renderer items={fixture.items} hasMore={false} isLoadingNext={false} sentinelRef={()=>{}} activeTab={tab} onTabChange={setTab} discoveryContext="home" ciudad="Tunja" departamento="Boyacá"/>}</div>;
}`);
