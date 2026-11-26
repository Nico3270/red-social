const fs=require('node:fs');const {imageUrl}=require('./cache-photos.cjs');
const folder='docs/audits/centered-feed-evidence';const sample=JSON.parse(fs.readFileSync(folder+'/public-sample.json'));const startup=JSON.parse(fs.readFileSync(folder+'/public-startup.json'));
const reviews=[...new Map(startup.states.flatMap(s=>s.items).filter(i=>i.type==='publication'&&i.data.producto).map(i=>[i.id,i])).values()];
function identity(url){try{const u=new URL(imageUrl(url));const parts=u.pathname.split('/');const v=parts.findIndex(s=>/^v\d+$/.test(s));return v>=0?u.origin+'/'+parts.slice(1,3).join('/')+'/'+parts.slice(v).join('/').replace(/\.[^.]+$/,''):u.href}catch{return null}}
const wanted=new Set();function walk(v){if(typeof v==='string'&&v.startsWith('https://res.cloudinary.com/'))wanted.add(identity(v));else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk)}reviews.forEach(walk);
const additional=startup.states.flatMap(s=>s.images||[]).filter(i=>wanted.has(identity(i.src)));
const images=[...new Map([...sample.images,...additional].map(i=>[i.src,i])).values()];
fs.writeFileSync(folder+'/comparison-sample.json',JSON.stringify({...sample,reviews,images},null,2));console.log({baseItems:sample.items.length,realLinkedReviews:reviews.length,images:images.length});
