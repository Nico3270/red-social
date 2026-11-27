const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const root=__dirname,shots=path.join(root,'preview/screenshots');fs.mkdirSync(shots,{recursive:true});
const base=process.env.AUDIT_URL||'http://127.0.0.1:4399';
const errors=[],external=[],results=[];
async function measure(page){return page.evaluate(()=>{
 const round=n=>Math.round(n*10)/10;
 const box=e=>e?Object.fromEntries(['x','y','width','height','top','bottom'].map(k=>[k,round(e.getBoundingClientRect()[k])])):null;
 const height=e=>e?round(e.getBoundingClientRect().height):0;
 const current=document.body.dataset.mode==='current';
 if(current){document.querySelectorAll('[class~="h-[480px]"]').forEach((e,i)=>{e.dataset.kind='product';e.dataset.id='p'+(i+1)});document.querySelectorAll('article').forEach(e=>{const t=e.textContent;e.dataset.kind=t.includes('Ver publicación')?'publication':t.includes('Servicio')?'service':'business';e.dataset.id=e.dataset.kind==='publication'?'pub1':e.dataset.kind==='service'?'s1':'b1';});}
 const header=document.querySelector('header');const nav=document.querySelector('nav[aria-label="Navegación principal"]');
 const hb=header?.getBoundingClientRect(),nb=nav?.getBoundingClientRect();
 const cb=document.querySelector('.CookieConsent')?.getBoundingClientRect();
 const lower=Math.min(nb&&nb.top>innerHeight/2?nb.top:innerHeight,cb?.height?cb.top:innerHeight);
 const upper=hb?Math.max(0,hb.bottom):0;const usable=lower-upper;
 const cards=[...document.querySelectorAll('[data-kind]')];
 const rows=cards.map((e,i)=>{
   const kind=e.dataset.kind,r=e.getBoundingClientRect();let head,media,text,actions;
   if(!current){head=e.querySelector('.card-head');media=e.querySelector('.hero')||e.querySelector('.service-body>img');text=e.querySelector('.card-text');actions=e.querySelector('.card-actions');}
   else if(kind==='product'){head=e.children[0];media=e.querySelector('[class~="h-64"]');text=e.children[2]?.firstElementChild;actions=e.querySelector('[class~="m-1"]');}
   else {head=e.children[0];media=[...e.querySelectorAll('[class*="aspect-"]')][0];text=e.querySelector(':scope>p')||e.lastElementChild;actions=kind==='publication'?e.lastElementChild?.lastElementChild:e.lastElementChild;}
   const description=kind==='product'?text?.querySelector('p'):kind==='publication'?e.lastElementChild?.querySelector('p'):e.querySelector(':scope>p')||e.querySelector('.card-text p');
   const title=e.querySelector('h3');const ab=actions?.getBoundingClientRect();
   const visible=Math.max(0,Math.min(r.bottom,lower)-Math.max(r.top,upper));
   const buttons=[...e.querySelectorAll('button,a')].filter(b=>{const q=b.getBoundingClientRect();return q.width&&q.height});
   return {id:e.dataset.id,kind,card:box(e),header:box(head),media:box(media),title:box(title),description:box(description),actions:box(actions),textHeight:height(text),visiblePixels:round(visible),fullyVisible:r.top>=upper-.5&&r.bottom<=lower+.5,viewportPercent:round(100*r.height/innerHeight),usablePercent:round(100*r.height/usable),actionBottomBeyondCard:ab?round(Math.max(0,ab.bottom-r.bottom)):0,titleLines:title?round(title.getBoundingClientRect().height/parseFloat(getComputedStyle(title).lineHeight)):0,gapToNext:cards[i+1]?round(cards[i+1].getBoundingClientRect().top-r.bottom):null,smallTargets:buttons.filter(b=>{const q=b.getBoundingClientRect();return q.width<44||q.height<44}).map(b=>({label:b.getAttribute('aria-label')||b.textContent.trim().slice(0,45),box:box(b)}))};
 });
 const broken=[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute('src'));
 const overlays=[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).position==='fixed'&&e.getBoundingClientRect().width>0).map(e=>({tag:e.tagName,label:e.getAttribute('aria-label')||e.className,box:box(e)}));
 return {viewport:{width:innerWidth,height:innerHeight},header:box(header),bottomNavigation:box(nav),cookieBanner:box(document.querySelector('.CookieConsent')),usableHeight:round(usable),firstCardDocumentTop:rows[0]?round(rows[0].card.top+scrollY):null,fullCards:rows.filter(r=>r.fullyVisible).length,partialCards:rows.filter(r=>r.visiblePixels>0&&!r.fullyVisible).length,meaningfulCards:rows.filter(r=>r.visiblePixels>=48).length,totalVisibleCardEquivalents:round(rows.reduce((s,r)=>s+r.visiblePixels/r.card.height,0)),horizontalOverflow:document.documentElement.scrollWidth>innerWidth,brokenImages:broken,overlays,cards:rows};
 });}
(async()=>{
 let localServer;
 try{await fetch(base)}catch(e){if(process.env.AUDIT_URL)throw e;localServer=require('./serve.cjs');if(!localServer.listening)await new Promise(resolve=>localServer.once('listening',resolve));}
 const browser=await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROMIUM||'/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome'});
 const context=await browser.newContext({reducedMotion:'reduce',deviceScaleFactor:1,locale:'es-CO',colorScheme:'light'});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==base){external.push(url.origin);return route.abort();}return route.continue()});
 async function run(mode,width,height=844,extra='',capture=true){
  const p=await context.newPage({viewport:{width,height}});await p.setViewportSize({width,height});p.on('pageerror',e=>{errors.push({mode,width,message:e.message});console.log('PAGE ERROR',mode,width,e.message)});
  await p.goto(`${base}/?mode=${mode}${extra}`,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(900);
  const initial=await measure(p);const tag=`${mode}-${width}${extra.replace(/[^a-z0-9]/gi,'-')}`;
  if(!initial.cards.length)throw new Error('No cards rendered: '+mode+' '+width+' '+JSON.stringify(errors));
  if(capture&&(width===390||width===430)){await p.screenshot({path:path.join(shots,tag+'-initial.png')});await p.screenshot({path:path.join(shots,tag+'-full.png'),fullPage:true});}
  await p.evaluate(()=>{const e=document.querySelector('[data-kind="product"]');if(e)window.scrollTo(0,e.getBoundingClientRect().top+scrollY-document.querySelector('header').getBoundingClientRect().height-8)});await p.waitForTimeout(120);
  const aligned=await measure(p);
  if(capture&&(width===390||width===430))await p.screenshot({path:path.join(shots,tag+'-aligned.png')});
  results.push({mode,width,height,extra,initial,aligned});await p.close();console.log('Measured',mode,width,height,extra||'baseline');
 }
 for(const mode of ['current','A','B','C'])for(const width of [320,360,390,430,768,1024,1440])await run(mode,width);
 console.log('28 baseline cases measured');
 for(const mode of ['current','A','B','C'])await run(mode,320,568,'&stress=1',false);
 for(const media of ['portrait','square','video','none'])await run('current',390,844,'&media='+media,false);
 for(const role of ['user','negocio'])await run('current',320,568,'&role='+role,false);
 await run('current',390,844,'&cookies=1');
 const p=await context.newPage();await p.setViewportSize({width:430,height:932});
 await p.goto(base+'/?mode=B');await p.waitForTimeout(500);await p.locator('[aria-label="Guardar producto"]').first().click();const save=await p.locator('[aria-label="Quitar de guardados"]').first().getAttribute('aria-pressed');await p.locator('button.primary').first().click();const dialog=await p.getByRole('dialog').count();await p.getByRole('button',{name:'Cerrar ficha'}).click();const closed=await p.getByRole('dialog').count();await p.close();
 for(const width of [390,430]){
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><style>body{font-family:Arial;background:#e9ebef;margin:0;padding:20px}h1{font-size:22px}main{display:flex;gap:16px}section{width:${width}px;flex:none}h2{font-size:17px;margin:0 0 8px}img{display:block;width:${width}px}p{color:#555;font-size:13px}</style></head><body><h1>Myckeo · ${width} × 844 · mismo contenido sintético</h1><p>DOM aislado actual frente a prototipos A, B y C. Primera tarjeta alineada debajo del encabezado.</p><main>${['current','A','B','C'].map((m,i)=>`<section><h2>${['Actual · aislado','A · Conservador','B · Compacto premium','C · Híbrido'][i]}</h2><img src="screenshots/${m}-${width}-aligned.png" alt="${m}"></section>`).join('')}</main></body></html>`;
  fs.writeFileSync(path.join(root,'preview',`comparison-${width}.html`),html);
  const c=await context.newPage({viewport:{width:4*width+88,height:970}});await c.setViewportSize({width:4*width+88,height:970});await c.goto(base+`/comparison-${width}.html`);await c.screenshot({path:path.join(shots,`comparison-${width}.png`),fullPage:true});await c.close();
 }
 const report={capturedAt:new Date().toISOString(),browser:browser.version(),method:'Isolated real production JSX with adapters; synthetic data; proposals separate components; 844px fixed baseline height; no external network',errors,blockedExternalOrigins:[...new Set(external)],interactionChecks:{savePressed:save,illustrativeDialogOpened:dialog===1,illustrativeDialogClosed:closed===0},results};
 fs.writeFileSync(path.join(root,'measurements.json'),JSON.stringify(report,null,2));
 for(const r of results)console.log(JSON.stringify({mode:r.mode,width:r.width,height:r.height,extra:r.extra,header:r.initial.header?.height,nav:r.initial.bottomNavigation?.height,first:r.initial.firstCardDocumentTop,full:r.initial.fullCards,partial:r.initial.partialCards,alignedFull:r.aligned.fullCards,alignedPartial:r.aligned.partialCards,cards:r.initial.cards.map(c=>({kind:c.kind,h:c.card.height,media:c.media?.height,clip:c.actionBottomBeyondCard})),overflow:r.initial.horizontalOverflow}));
 console.log(JSON.stringify({errors,external,checks:report.interactionChecks}));await browser.close();if(localServer)await new Promise(resolve=>localServer.close(resolve));if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
