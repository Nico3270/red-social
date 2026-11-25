import { test, expect, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
const evidence = "docs/audits/desktop-feed-header-evidence";
async function setup(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.context().addCookies([{name:"myckeo-consent",value:"true",domain:"127.0.0.1",path:"/"}]);
  await page.addInitScript(() => localStorage.setItem("preferences-storage", JSON.stringify({state:{ciudad:"Tunja",departamento:"Boyacá",preferencias:[],secciones:[],seenIds:[],userLat:null,userLong:null},version:0})));
  await page.route("**/*", route => {
    const req=route.request(), url=new URL(req.url());
    if(url.origin!=="http://127.0.0.1:3400") return route.abort();
    if(url.pathname==="/api/auth/session") return route.fulfill({json:null});
    if(url.pathname==="/api/search") return route.fulfill({json:[{id:"2",name:"Comida",type:"category",slug:"comida"}]});
    if(req.method()==="POST") {
      let args;
      try { args=JSON.parse(req.postData()||"null"); } catch {}
      if(!req.headers()["next-action"]||!["products","publications","services","businesses"].includes(args?.[0])) return route.abort();
    }
    if(url.pathname.startsWith("/api/")) return route.fulfill({json:{}});
    return route.continue();
  });
  return errors;
}
async function geometry(page: Page) {
  return page.evaluate(() => {
    const row=document.querySelector('[class*="prototypeMain"]')!.getBoundingClientRect();
    const categories=document.querySelector('[class*="prototypeCategories"]')!.getBoundingClientRect();
    const first=document.querySelector('[data-feed-item-key]')!.getBoundingClientRect();
    const tabs=document.querySelector('button[aria-label="Cambiar a pestaña Para ti"]')!.getBoundingClientRect();
    return {scroll:scrollY,rowTop:row.top,rowHeight:row.height,categoriesBottom:categories.bottom,tabsBottom:tabs.bottom,firstDocumentTop:first.top+scrollY,overflow:document.documentElement.scrollWidth>innerWidth};
  });
}
for (const width of [1440,1920]) test(`header ${width}: fixed row, flowing categories, overlays, focus and navigation`, async ({page}) => {
  const errors=await setup(page); await page.setViewportSize({width,height:900});
  await page.goto("/?scenario=balanced"); await expect(page.locator("[data-desktop-discovery]")).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({path:`${evidence}/local-${width}-top.png`});
  const positions=[await geometry(page)];
  for(const y of [1,200,950]) {
    await page.evaluate(y=>scrollTo(0,y),y); await page.waitForTimeout(100);
    positions.push(await geometry(page));
  }
  for(const position of positions) {
    expect(position.rowTop).toBe(0); expect(position.rowHeight).toBe(72); expect(position.overflow).toBe(false);
    expect(Math.abs(position.firstDocumentTop-positions[0].firstDocumentTop)).toBeLessThan(1);
  }
  expect(positions.at(-1)!.categoriesBottom).toBeLessThan(0); expect(positions.at(-1)!.tabsBottom).toBeLessThan(0);
  await page.screenshot({path:`${evidence}/local-${width}-scroll.png`});
  const search=page.getByRole("combobox",{name:"Buscar productos, negocios o categorías"});
  await search.fill("comida"); await expect(page.getByRole("option",{name:/Comida/})).toBeVisible();
  expect(await page.getByRole("listbox").evaluate(el=>el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(56);
  await search.press("Escape"); await search.fill(""); await search.press("Tab");
  const city=page.getByRole("button",{name:/Cambiar ubicación/}); await expect(city).toBeFocused();
  await city.click(); const title=page.getByRole("heading",{name:"Actualizar Ubicación",exact:true}); await expect(title).toBeVisible();
  expect(await title.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  let selects=page.getByRole("combobox").filter({visible:true}); await selects.nth((await selects.count())-2).click();
  await page.getByRole("option",{name:"Cundinamarca",exact:true}).click();
  selects=page.getByRole("combobox").filter({visible:true});await selects.nth((await selects.count())-1).click();
  await page.getByRole("option",{name:"Bogotá",exact:true}).click(); await page.getByRole("button",{name:"Actualizar Ubicación",exact:true}).click();
  await expect(title).not.toBeVisible(); await expect(page.getByRole("button",{name:/Cambiar ubicación: Bogotá/})).toBeVisible();
  await page.getByRole("button",{name:/Perfil/}).click(); await expect(page.getByText("Ingresar",{exact:true})).toBeVisible();
  await page.keyboard.press("Escape");
  const product=page.locator('[data-feed-product-id="p-0-0"]');
  const cart=product.getByRole("button",{name:/Agregar .* al carrito/}).filter({visible:true});
  await cart.focus(); const focused=await cart.boundingBox(); expect(focused!.y).toBeGreaterThanOrEqual(72);
  await cart.click(); await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.getByRole("dialog").evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  await page.getByRole("dialog").getByRole("button", {name:"Cancelar",exact:true}).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.locator('[data-feed-item-key="publication-pub-0-0"]').getByRole("button",{name:"Ver publicación",exact:true}).click();
  await expect(page.getByRole("button",{name:"Cerrar modal",exact:true})).toBeVisible(); await page.keyboard.press("Escape");
  await search.fill("comida"); await page.getByRole("option",{name:/Comida/}).click();
  await expect(page).toHaveURL(/\/category\/comida/); await expect(page.locator("[data-desktop-discovery]")).toHaveCount(0);
  await page.goto("/?scenario=balanced"); await expect(page.locator("[data-desktop-discovery]")).toBeVisible();
  const entry=page.getByRole("link",{name:"Tengo un negocio",exact:true}); await expect(entry).toHaveAttribute("href","/config/completePerfil?negocio=1");
  await entry.click(); await expect(page).toHaveURL(/\/auth\/new-account\?tipo=negocio/);
  await expect(page.getByRole("heading",{name:"Crear cuenta de negocio",exact:true})).toBeVisible();
  expect(errors).toEqual([]);writeFileSync(`${evidence}/header-${width}.json`,JSON.stringify({positions,errors},null,2));
});

test("header boundary 1279/1280 and mobile 390 preserve context without overflow", async ({page}) => {
  await setup(page);await page.setViewportSize({width:1279,height:900});await page.goto("/?scenario=balanced");
  await expect(page.locator("[data-feed-item-key]").first()).toBeVisible();await expect(page.locator("[data-desktop-discovery]")).toHaveCount(0);
  const measures=[];
  for(const width of [1280,1279,1280,390]) {
    await page.setViewportSize({width,height:900}); await page.waitForTimeout(300);
    if(width>=1280) await expect(page.locator("[data-desktop-discovery]")).toBeVisible(); else await expect(page.locator("[data-desktop-discovery]")).toHaveCount(0);
    const measurement=await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,position:getComputedStyle(document.querySelector('[class*="prototypeMain"]')||document.querySelector('header')!).position,rowHeight:(document.querySelector('[class*="prototypeMain"]')||document.querySelector('header'))!.getBoundingClientRect().height}));
    expect(measurement.overflow).toBe(false); if(width===1280) {expect(measurement.position).toBe("fixed");expect(measurement.rowHeight).toBe(72);}
    measures.push(measurement);
  }
  await page.screenshot({path:`${evidence}/local-390-top.png`}); await page.evaluate(()=>scrollTo(0,950));await page.screenshot({path:`${evidence}/local-390-scroll.png`});
  writeFileSync(`${evidence}/boundary-mobile.json`,JSON.stringify(measures,null,2));
});
