import {test,expect,type Page} from "@playwright/test";
import {writeFileSync} from "node:fs";
import {setup,settled} from "./browser-support.cjs";
import {initialData} from "../../src/seed/seed";
import comparison from "../../docs/audits/centered-feed-evidence/comparison-sample.json";
import snapshot from "../../docs/audits/centered-feed-evidence/public-sample.json";
const folder="docs/audits/centered-desktop-final-evidence";
const ids=(page:Page)=>page.locator('[data-feed-item-key]').evaluateAll(es=>es.map(e=>e.getAttribute('data-feed-item-key')!));

test('composition, unique navigation, all inventories and fixed central width',async({page})=>{
 const errors=await setup(page);const measurements=[];
 for(const width of [1440,1920]) for(const scenario of ['balanced','sparse','commerce','social']){
  await page.setViewportSize({width,height:900});await page.goto('/?scenario='+scenario);await expect(page.locator('[data-centered-discovery]')).toBeVisible();await settled(page);
  const keys=await ids(page),input=snapshot.items.filter(i=>scenario==='commerce'?i.type!=='publication':scenario==='social'?i.type==='publication':true);
  const expected=scenario==='sparse'?[snapshot.items.find(i=>i.type==='publication')!,snapshot.items.find(i=>i.type==='product')!]:input;
  expect([...keys].sort()).toEqual(expected.map(i=>`${i.type}-${i.id}`).sort());expect(new Set(keys).size).toBe(keys.length);
  const box=await page.locator('[data-desktop-tier]').first().locator('[class*="main"]').first().boundingBox();
  expect(box!.width).toBe(680);expect(Math.abs(box!.x+box!.width/2-width/2)).toBeLessThan(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('button',{name:'Cambiar a pestaña Para ti',exact:true})).toHaveCount(1);
  await expect(page.locator('[class*="prototypeCategories"]')).toHaveCount(0);
  const nav=page.getByRole('navigation',{name:'Categorías',exact:true});await expect(nav).toBeVisible();
  const firstBefore=(await page.locator('[data-feed-item-key]').first().boundingBox())!;
  await nav.locator('summary').click();
  const firstAfter=(await page.locator('[data-feed-item-key]').first().boundingBox())!;
  expect(Math.abs(firstAfter.y-firstBefore.y)).toBeLessThan(1);
  const destinations=await nav.locator('a').evaluateAll(es=>es.map(e=>e.getAttribute('href')!).sort());
  expect(destinations).toEqual(initialData.categorias.filter(c=>c.isActive).map(c=>'/category/'+c.slug).sort());
  expect(new Set(destinations).size).toBe(destinations.length);
  measurements.push({width,scenario,count:keys.length,center:box!.x+box!.width/2,mainWidth:box!.width,categoryDestinations:destinations});
  if(width===1440){await nav.locator('summary').click();await page.screenshot({path:`${folder}/case-${scenario}-1440.png`});}
 }
 expect(errors).toEqual([]);writeFileSync(`${folder}/inventory-navigation.json`,JSON.stringify(measurements,null,2));
});

test('boundary, mobile, category navigation and preserved card action on append',async({page})=>{
 const errors=await setup(page);await page.setViewportSize({width:1439,height:900});await page.goto('/?scenario=balanced&append=1');await expect(page.locator('[data-feed-item-key]').first()).toBeVisible();
 await expect(page.locator('[data-centered-discovery]')).toHaveCount(0);await expect(page.locator('[class*="prototypeCategories"]')).toHaveCount(1);
 for(const width of [1440,1439,1440]){await page.setViewportSize({width,height:900});await settled(page);await expect(page.locator('[data-centered-discovery]')).toHaveCount(width>=1440?1:0);}
 const lanes=()=>page.locator('[data-feed-item-key]').evaluateAll(es=>es.map(e=>({key:e.getAttribute('data-feed-item-key'),side:!!e.closest('aside')})));
 const before=await lanes();const product=page.locator('[data-feed-product-id]').filter({has:page.locator('button:not([disabled])')}).first();
 const cart=product.getByRole('button',{name:/Agregar .* al carrito|Elegir opciones|Ver opciones/}).filter({visible:true});await cart.click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.evaluate(()=>(window as unknown as {__centeredAppend:()=>void}).__centeredAppend());await expect(page.locator('[data-feed-item-key]')).toHaveCount(snapshot.items.length);await expect(page.getByRole('dialog')).toBeVisible();
 const after=await lanes();expect(after.filter(e=>before.some(b=>b.key===e.key))).toEqual(before);await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
 await page.getByRole('button',{name:'Cambiar a pestaña Publicaciones',exact:true}).click();await expect(page.locator('[data-centered-discovery]')).toHaveCount(0);await expect(page.locator('[class*="prototypeCategories"]')).toHaveCount(1);
 await page.getByRole('button',{name:'Cambiar a pestaña Para ti',exact:true}).click();await expect(page.locator('[data-centered-discovery]')).toBeVisible();
 await page.getByRole('navigation',{name:'Categorías',exact:true}).getByRole('link',{name:'Comida',exact:true}).click();await expect(page).toHaveURL(/\/category\/comida/);await expect(page.locator('[data-centered-discovery]')).toHaveCount(0);
 await page.setViewportSize({width:390,height:900});await page.goto('/?scenario=balanced');await expect(page.locator('[data-feed-product-id]').first()).toBeVisible();await settled(page);
 await expect(page.locator('[data-centered-discovery]')).toHaveCount(0);
 const card=page.locator('[data-feed-product-id]').filter({has:page.locator('a[href^="https://wa.me/"]')}).first();
 const mobile=await card.evaluate(el=>{const r=(s:string)=>el.querySelector(s)!.getBoundingClientRect(),w=[...el.querySelectorAll('a[href^="https://wa.me/"]')].find(e=>e.getBoundingClientRect().width>0)!.getBoundingClientRect(),c=[...el.querySelectorAll('button')].find(e=>/Agregar .* al carrito|Elegir opciones|Ver opciones/.test(e.getAttribute('aria-label')||'')&&e.getBoundingClientRect().width>0)!.getBoundingClientRect(),p=r('[class*="priceBlock"]'),a=r('[class*="avatarPhoto"]'),b=r('[class*="avatarIcon"]');return {row:Math.abs(w.top-c.top)<12&&p.top<w.bottom&&p.bottom>w.top,badge:a.right>b.left&&b.right>a.left&&a.bottom>b.top&&b.bottom>a.top,overflow:document.documentElement.scrollWidth>innerWidth};});
 expect(mobile.row).toBe(true);expect(mobile.badge).toBe(true);expect(mobile.overflow).toBe(false);expect(errors).toEqual([]);
 writeFileSync(`${folder}/boundary-append-mobile.json`,JSON.stringify({before,after,mobile,errors},null,2));
});

test('real coordinator: continuation, geographic groups and new city with the navigation rail',async({page})=>{
 const errors=await setup(page);await page.setViewportSize({width:1440,height:900});await page.goto('/?view=live');await expect(page.locator('[data-feed-item-key]').first()).toBeVisible();
 async function drain(){for(let i=0;i<60;i++){if(await page.locator('[data-feed-complete]').count())return;await page.locator('[data-feed-sentinel]').scrollIntoViewIfNeeded();await page.waitForTimeout(350);}throw Error('Traversal did not finish');}
 async function tiers(){const groups=await page.locator('[data-desktop-tier]').evaluateAll(es=>es.map(e=>({tier:Number(e.getAttribute('data-desktop-tier')),top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,ids:[...e.querySelectorAll('[data-feed-item-key]')].map(e=>e.getAttribute('data-feed-item-key')!)})));for(let i=1;i<groups.length;i++)expect(groups[i].top).toBeGreaterThanOrEqual(groups[i-1].bottom);return groups;}
 await drain();const tunja=await ids(page);expect(tunja).toHaveLength(69);expect(new Set(tunja).size).toBe(69);const before=await tiers();
 await page.getByRole('button',{name:/Cambiar ubicación/}).click();let s=page.getByRole('combobox').filter({visible:true});await s.nth((await s.count())-2).click();await page.getByRole('option',{name:'Cundinamarca',exact:true}).click();s=page.getByRole('combobox').filter({visible:true});await s.nth((await s.count())-1).click();await page.getByRole('option',{name:'Bogotá',exact:true}).click();await page.getByRole('button',{name:'Actualizar Ubicación',exact:true}).click();await expect(page.getByRole('button',{name:/Cambiar ubicación: Bogotá/})).toBeVisible();await expect(page.locator('[data-desktop-tier="0"]')).toContainText('Bogotá');
 await drain();await settled(page);const bogota=await ids(page);expect(bogota).toHaveLength(69);expect(new Set(bogota).size).toBe(69);const after=await tiers();expect(after[0].ids.every(id=>id.includes('-national-'))).toBe(true);expect(errors).toEqual([]);
 writeFileSync(`${folder}/continuation-city.json`,JSON.stringify({tunja,bogota,before,after,errors},null,2));
});

test('actual review relationships and a controlled arrival-order characterization',async({page})=>{
 const errors=await setup(page);await page.setViewportSize({width:1440,height:900});
 const fixture=comparison;
 await page.goto('/?scenario=reviews');await expect(page.locator('[data-feed-item-key]')).toHaveCount(fixture.reviews.length);
 for(const item of fixture.reviews){const card=page.locator(`[data-feed-item-key="publication-${item.id}"]`);const product=item.data.producto!;await expect(card.getByRole('link',{name:product.nombre,exact:true})).toHaveAttribute('href','/producto/'+product.slug);if(typeof item.data.calificacion==='number')await expect(card.getByText(item.data.calificacion.toFixed(1),{exact:true})).toBeVisible();}
 const result=[];
 for(const phase of ['before','after']){
  await page.goto('/?scenario=balanced&append=products-first'+(phase==='before'?'&compare=before':''));
  const first=()=>page.locator('[data-desktop-tier] [class*="main"] [data-feed-item-key]').first();
  // Baseline has the same main/side renderer and identical stable-allocation helper.
  await expect(first()).toBeVisible();const initial=await first().getAttribute('data-feed-item-key');expect(initial).toMatch(/^product-/);
  await page.evaluate(()=>(window as unknown as {__centeredAppend:()=>void}).__centeredAppend());await expect(page.locator('[data-feed-item-key]')).toHaveCount(snapshot.items.length);
  const appended=await first().getAttribute('data-feed-item-key');expect(appended).toBe(initial);
  await page.getByRole('button',{name:'Cambiar a pestaña Publicaciones',exact:true}).click();await page.waitForTimeout(150);
  await page.getByRole('button',{name:'Cambiar a pestaña Para ti',exact:true}).click();await expect(first()).toHaveAttribute('data-feed-item-key',/^publication-/);
  result.push({phase,initial,appended,afterTabReturn:await first().getAttribute('data-feed-item-key')});
 }
 expect(errors).toEqual([]);writeFileSync(`${folder}/reviews-and-arrival.json`,JSON.stringify({realRelations:fixture.reviews.map(i=>({publication:i.id,product:i.data.producto})),arrival:result,errors},null,2));
});
