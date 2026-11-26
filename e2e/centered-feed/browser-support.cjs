const fs=require('node:fs'),path=require('node:path');const {key}=require('./cache-photos.cjs');
async function setup(page){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.context().addCookies([{name:'myckeo-consent',value:'true',domain:'127.0.0.1',path:'/'}]);
 await page.addInitScript(()=>{if(!localStorage.getItem('preferences-storage'))localStorage.setItem('preferences-storage',JSON.stringify({state:{ciudad:'Tunja',departamento:'Boyacá',preferencias:[],secciones:[],seenIds:[],userLat:null,userLong:null},version:0}));});
 const photos=JSON.parse(fs.readFileSync(path.join(__dirname,'photo-manifest.json')));
 await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());
 if(url.origin!=='http://127.0.0.1:3400'){const entry=photos[key(req.url())];return entry?route.fulfill({body:fs.readFileSync(path.join(__dirname,'photos',entry.file)),contentType:entry.mime}):route.abort();}
 if(url.pathname==='/api/auth/session')return route.fulfill({json:null});
 if(req.method()==='POST'){let args;try{args=JSON.parse(req.postData()||'null')}catch{}if(!req.headers()['next-action']||!['products','publications','services','businesses'].includes(args?.[0]))return route.abort();}
 if(url.pathname.startsWith('/api/'))return route.fulfill({json:{}});return route.continue();});return errors;
}
async function settled(page){await page.waitForTimeout(1000);await page.evaluate(()=>Promise.race([Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top>=0&&i.getBoundingClientRect().top<innerHeight).map(i=>i.complete?Promise.resolve():i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,3000))]));}
module.exports={setup,settled};
