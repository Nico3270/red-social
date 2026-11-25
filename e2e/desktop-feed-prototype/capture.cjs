const {chromium}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
const phase=process.argv[2]||'after';const dir='docs/audits/desktop-feed-evidence';
const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROMIUM_PATH||'/home/nico/.cache/ms-playwright/chromium-1193/chrome-linux/chrome'});

const metrics=[];
for(const width of [1440,1920,390]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 await context.addCookies([{name:'myckeo-consent',value:'true',domain:'127.0.0.1',path:'/'}]);
 await context.addInitScript(()=>{localStorage.setItem('preferences-storage',JSON.stringify({state:{ciudad:'Tunja',departamento:'Boyacá',preferencias:[],secciones:[],seenIds:[],userLat:null,userLong:null},version:0}));});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!=='http://127.0.0.1:3400')return route.abort();if(u.pathname==='/api/auth/session')return route.fulfill({json:null});if(u.pathname.startsWith('/api/'))return route.fulfill({json:{}});if(route.request().method()==='POST')return route.abort();return route.continue();});
 const page=await context.newPage(); await page.goto('http://127.0.0.1:3400/?scenario=balanced'+(phase==='before'?'&compare=before':''),{timeout:120000});
 await page.locator('[data-feed-item-key]').first().waitFor({timeout:120000});
 await page.evaluate(()=>Promise.race([Promise.all(Array.from(document.images).filter(i=>i.getBoundingClientRect().top<innerHeight).map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r}))),new Promise(r=>setTimeout(r,4000))]));
 await page.waitForTimeout(1400);
 await page.screenshot({path:dir+'/'+phase+'-'+width+'-top.png'});
 metrics.push(await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,headerHeight:document.querySelector('header')?.getBoundingClientRect().height,keys:Array.from(document.querySelectorAll('[data-feed-item-key]')).map(e=>e.dataset.feedItemKey)})));
 await page.evaluate(()=>scrollTo(0,950));await page.waitForTimeout(500);
 await page.screenshot({path:dir+'/'+phase+'-'+width+'-scroll.png'});
 metrics[metrics.length-1].scroll=await page.evaluate(()=>({y:scrollY,headerTop:document.querySelector('header')?.getBoundingClientRect().top,headerBottom:document.querySelector('header')?.getBoundingClientRect().bottom}));
 await context.close();
}
fs.writeFileSync(dir+'/'+phase+'-metrics.json',JSON.stringify(metrics,null,2));await browser.close();console.log(phase+' captures saved');
})().catch(e=>{console.error(e);process.exit(1)});
