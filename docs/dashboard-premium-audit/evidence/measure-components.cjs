// Read-only component audit. Does not import auth, Prisma, actions, or fixture data.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const req = createRequire(path.join(root, 'package.json'));
const esbuild = req('esbuild');
const ts = req('typescript');
const { chromium } = req('playwright');
const out = path.join(root, 'docs/dashboard-premium-audit/evidence');
fs.mkdirSync(out, {recursive:true});
const source = fs.readFileSync(path.join(root, 'src/app/dashboard/page.tsx'), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const constants = ast.statements.filter(s => ts.isVariableStatement(s) && s.declarationList.declarations.some(d => ['dashboardSections','superAdminSections'].includes(d.name.getText(ast)))).map(s => s.getText(ast)).join('\n');
const iconImports = ast.statements.filter(s => ts.isImportDeclaration(s) && s.moduleSpecifier.text.startsWith('react-icons/')).map(s => s.getText(ast)).join('\n');
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import {Box} from '@mui/material';import DashboardSections from './src/dashboard/componentes/DashboardSections';${iconImports}\n${constants}\nconst root=createRoot(document.getElementById('root'));window.renderAudit=(width,admin=false)=>root.render(<Box data-audit-geometry-host sx={{display:'flex',minHeight:'100vh',overflowX:'hidden'}}><Box sx={{flex:1,ml:width<=768?0:'200px',overflowX:'hidden'}}><Box component="main" sx={{mt:'4rem',minHeight:'calc(100vh - 4rem)',bgcolor:'grey.100',p:{xs:2,sm:3,md:4},overflowX:'hidden'}}><main className="max-w-7xl mx-auto p-0 sm:p-2"><DashboardSections sections={admin?superAdminSections:dashboardSections}/></main></Box></Box></Box>);window.renderAudit(innerWidth);`;
(async()=>{
 const built = await esbuild.build({absWorkingDir:root,stdin:{contents:entry,loader:'tsx',resolveDir:root},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',minify:true,metafile:true,define:{'process.env.NODE_ENV':'"production"'},logLevel:'error'});
 const cssPath='/tmp/myckeo-dashboard-audit.css';
 execFileSync(process.execPath,[req.resolve('tailwindcss/lib/cli'),'-i','src/app/globals.css','-o',cssPath,'--minify'],{cwd:root,stdio:'pipe'});
 const css=fs.readFileSync(cssPath,'utf8'),js=built.outputFiles[0].text;
 const browser=await chromium.launch({headless:true,executablePath:process.env.DASHBOARD_AUDIT_BROWSER || '/home/nico/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell'});
 try {
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Browser page error:',e.message)});page.on('console',m=>{if(m.type()==='error') console.error('Browser console error:',m.text())});
 await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname!=='dashboard-audit.local') return route.abort();
   if(url.pathname==='/bundle.js') return route.fulfill({contentType:'text/javascript',body:js});
   if(url.pathname==='/style.css') return route.fulfill({contentType:'text/css',body:css});
   return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script>window.process={env:{NODE_ENV:"production"}}</script><script src="/bundle.js"></script></body></html>'});
 });
 await page.goto('http://dashboard-audit.local');
 await page.waitForSelector('.MuiCard-root');
 const results=[];
 for(const width of [320,360,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:844});await page.evaluate(w=>window.renderAudit(w),width);await page.waitForTimeout(400);
   results.push(await page.evaluate(()=>{
     const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
     const cards=[...document.querySelectorAll('.MuiCard-root')].map(card=>{
       const info=card.querySelector('button'),icon=card.querySelector('.MuiBadge-root svg'),title=card.querySelector('.MuiTypography-subtitle2'),content=card.querySelector('.MuiCardContent-root');
       const a=rect(info),b=rect(icon);const overlap=Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
       return {title:title.textContent,card:rect(card),info:a,icon:b,iconInfoIntersectionArea:overlap,titleBox:rect(title),titleScrollWidth:title.scrollWidth,titleClientWidth:title.clientWidth,fontFamily:getComputedStyle(title).fontFamily,fontSize:getComputedStyle(title).fontSize,lineHeight:getComputedStyle(title).lineHeight,contentPadding:getComputedStyle(content).padding};
     });const grid=document.querySelector('.grid');return {width:innerWidth,height:innerHeight,documentScrollWidth:document.documentElement.scrollWidth,documentScrollHeight:document.documentElement.scrollHeight,grid:rect(grid),columns:getComputedStyle(grid).gridTemplateColumns,gap:getComputedStyle(grid).gap,links:[...grid.querySelectorAll('a')].map(a=>a.getAttribute('href')),cards};
   }));
   await page.screenshot({path:path.join(out,`grid-isolated-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.renderAudit(390));await page.waitForTimeout(350);
 await page.getByRole('button',{name:'Información sobre Gestión de Productos',exact:true}).click();await page.waitForTimeout(350);
 const modal=await page.evaluate(()=>{const close=[...document.querySelectorAll('button')].find(b=>b.textContent==='✕');return {dialogRoleCount:document.querySelectorAll('[role="dialog"]').length,ariaModalCount:document.querySelectorAll('[aria-modal="true"]').length,closeName:close.getAttribute('aria-label'),closeWidth:close.getBoundingClientRect().width,closeHeight:close.getBoundingClientRect().height,activeElementLabel:document.activeElement.getAttribute('aria-label'),bodyOverflow:getComputedStyle(document.body).overflow,nestedInteractive:document.querySelectorAll('a button').length,hasDescription:document.body.textContent.includes('Administra y organiza los productos de tu catálogo.')}});
 await page.screenshot({path:path.join(out,'info-modal-isolated-390.png'),fullPage:true});
 await page.keyboard.press('Escape');modal.stillOpenAfterEscape=await page.getByText('Ir a la sección',{exact:true}).isVisible();
 await page.keyboard.press('Tab');modal.nextTabLabel=await page.evaluate(()=>document.activeElement.getAttribute('aria-label')||document.activeElement.textContent);
 await page.getByRole('button',{name:'✕',exact:true}).click();
 await page.evaluate(()=>window.renderAudit(390,true));await page.waitForTimeout(350);
 const superAdminLinks=await page.locator('.grid a').evaluateAll(as=>as.map(a=>({text:a.textContent,href:a.getAttribute('href')})));
 const files=[...Object.keys(built.metafile.inputs).filter(p=>p.startsWith('src/')),'src/app/dashboard/page.tsx','src/ui/components/dashboard/perfil/LayoutDashboardComponent.tsx','src/app/globals.css','tailwind.config.ts'];
 const manifest=Object.fromEntries([...new Set(files)].sort().map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
 const result={createdAt:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'Actual unmodified DashboardSections and actual static section definitions, isolated; geometry host reproduces shell padding/margin only. No authenticated route, sidebar, topbar, database, session, role mocks, API, mutations or navigation tested. Next Link left unmodified; all requests intercepted locally.',viewportHeight:844,results,modal,superAdminLinks,errors,sourceHashes:manifest};
 fs.writeFileSync(path.join(out,'component-measurements.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({results:results.map(r=>({width:r.width,columns:r.columns,gridHeight:r.grid.height,cardWidth:r.cards[0].card.width,cardHeights:[...new Set(r.cards.map(c=>c.card.height))],overlappingIcons:r.cards.filter(c=>c.iconInfoIntersectionArea>0).map(c=>c.title),clippedTitles:r.cards.filter(c=>c.titleScrollWidth>c.titleClientWidth).map(c=>c.title),scrollWidth:r.documentScrollWidth,scrollHeight:r.documentScrollHeight})),modal,superAdminLinks,errors},null,2));
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
