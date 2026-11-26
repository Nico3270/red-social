const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
require('../mobile-feed-implementation/prepare.cjs');
const dir=path.resolve(__dirname,'../../src/app/(catalogo)/feed-implementation-review');
fs.writeFileSync(path.join(dir,'BaselineRenderer.tsx'),execFileSync('git',['show','8ce16bc7779f846c386483a7d145369b51d8e461:src/publicaciones/componentes/FeedRederer.tsx'],{encoding:'utf8'}).replace('./desktopDiscovery.module.css','@/publicaciones/componentes/desktopDiscovery.module.css').replace('./feedProductModules.module.css','@/publicaciones/componentes/feedProductModules.module.css'));
fs.copyFileSync('docs/audits/centered-feed-evidence/comparison-sample.json',path.join(dir,'snapshot.json'));
fs.writeFileSync(path.join(dir,'ReviewClient.tsx'), `"use client";
import {useState,useMemo,useEffect,type ComponentProps} from "react";
import {useSearchParams} from "next/navigation";
import FeedRenderer from "@/publicaciones/componentes/FeedRederer";
import BaselineRenderer from "./BaselineRenderer";
import FeedComponent from "@/feed/componentes/FeedComponent";
import type {FeedItem} from "@/feed/feed.interfaces";
import {usePreferencesStore} from "@/store/preferences/preferences-store";
import snapshot from "./snapshot.json";
export default function ReviewClient(){
 const query=useSearchParams();const [tab,setTab]=useState<ComponentProps<typeof FeedRenderer>["activeTab"]>("Para ti");const [appended,setAppended]=useState(false);
 const items=useMemo(()=>{const all=snapshot.items as unknown as FeedItem[];const scenario=query.get("scenario");let rows=scenario==="reviews"?snapshot.reviews as unknown as FeedItem[]:scenario==="commerce"?all.filter(i=>i.type!=="publication"):scenario==="social"?all.filter(i=>i.type==="publication"):scenario==="sparse"?[all.find(i=>i.type==="publication")!,all.find(i=>i.type==="product")!]:all;
 if(query.has("append")&&!appended) rows=query.get("append")==="products-first"?rows.filter(i=>i.type==="product").slice(0,8):rows.filter(i=>i.type!=="publication").slice(0,8).concat(rows.filter(i=>i.type==="publication").slice(0,2));return rows;},[query,appended]);
 useEffect(()=>{Object.assign(window,{__centeredAppend:()=>setAppended(true)});return()=>{delete(window as unknown as Record<string,unknown>).__centeredAppend;};},[]);
 useEffect(()=>{if(query.get("view")!=="live")usePreferencesStore.getState().setUbicacion("Tunja","Boyacá");},[query]);
 const Renderer=query.get("compare")==="before"?BaselineRenderer:FeedRenderer;
 return <div><div id="modal-root"/>{query.get("view")==="live"?<FeedComponent discoveryContext="home"/>:<Renderer items={items} hasMore={false} isLoadingNext={false} sentinelRef={()=>{}} activeTab={tab} onTabChange={setTab} discoveryContext="home" ciudad="Tunja" departamento="Boyacá"/>}</div>;
}`);
// Private server copy changes image optimization only in this test process.
const server=fs.readFileSync('e2e/mobile-feed-implementation/dev-server.cjs','utf8').replace('distDir: cache,','distDir: cache,\n        images: {...loaded.images, unoptimized: true},');
const generated=path.resolve(__dirname,'../../test-results/centered-feed');fs.mkdirSync(generated,{recursive:true});fs.writeFileSync(path.join(generated,'server.cjs'),server);
