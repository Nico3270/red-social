const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),crypto=require('node:crypto');
const out=path.resolve(__dirname,'../../docs/mobile-feed-avatar-follow-overlay'),shots=path.join(out,'screenshots');
const read=n=>JSON.parse(fs.readFileSync(path.join(out,n),'utf8'));
async function pair(a,b,name,leftLabel,rightLabel){
 const x=await sharp(a).metadata(),y=await sharp(b).metadata(),width=x.width+y.width+48;
 const labels=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="44"><g font-family="Arial,sans-serif" font-size="14" fill="#374151"><text x="16" y="28">${leftLabel}</text><text x="${x.width+32}" y="28">${rightLabel}</text></g></svg>`);
 await sharp({create:{width,height:Math.max(x.height,y.height)+60,channels:4,background:'#f3f4f6'}}).composite([{input:labels,top:0,left:0},{input:a,top:44,left:16},{input:b,top:44,left:x.width+32}]).png().toFile(path.join(shots,name));
}
(async()=>{
 for(const w of [390,430,769,1024])await pair(path.join(shots,`before-${w}.png`),path.join(shots,`after-${w}.png`),`comparison-${w}.png`,'Antes · indicador contiguo','Después · superpuesto');
 await pair(path.join(shots,'avatar-plus-enlarged.png'),path.join(shots,'avatar-check-enlarged.png'),'states-enlarged.png','Sin seguir · +','Siguiendo · ✓');
 const summary=[];
 for(const width of [320,360,390,430,768,769,1024]){
  const before=read(`before-${width}.json`),after=read(`after-${width}.json`),photoPixels=[];
  for(let i=0;i<after.cards.length;i++){
   const c=after.cards[i],old=before.cards[i];
   const commerce=x=>x.controls.filter(b=>!b.follow&&!b.avatar&&!b.name);
   if(JSON.stringify(commerce(c))!==JSON.stringify(commerce(old)))throw Error(`Other controls changed at ${width}/${c.id}`);
   const p=c.photo,meta=await sharp(path.join(shots,`after-${width}.png`)).metadata();
   if(p.y>=0&&p.bottom<=meta.height-80){
    const crop={left:Math.ceil(p.x),top:Math.ceil(p.y),width:Math.floor(p.right)-Math.ceil(p.x),height:Math.floor(p.bottom)-Math.ceil(p.y)};
    const a=await sharp(path.join(shots,`before-${width}.png`)).extract(crop).raw().toBuffer(),b=await sharp(path.join(shots,`after-${width}.png`)).extract(crop).raw().toBuffer();
    let pixels=0;for(let j=0;j<a.length;j+=3)if(!a.subarray(j,j+3).equals(b.subarray(j,j+3)))pixels++;
    if(pixels)throw Error(`Product photo pixels changed at ${width}/${c.id}`);
    photoPixels.push({id:c.id,differentPixels:pixels});
   }
  }
  summary.push({width,desktopPixels:after.desktopPixels,otherControlsIdentical:true,photoPixels,cards:after.cards.map((c,i)=>({id:c.id,beforeNameWidth:before.cards[i].name.width,afterNameWidth:c.name.width,recovered:c.name.width-before.cards[i].name.width,fontBefore:before.cards[i].name.font,fontAfter:c.name.font,headerHeight:c.header.height,collisions:c.collisions,follow:c.controls.find(b=>b.follow)?.box,overlay:c.overlay}))});
 }
 const before=read('source-state-before.json'),changed=[],missing=[];
 for(const [file,hash] of Object.entries(before)){if(!fs.existsSync(file)){missing.push(file);continue;}if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)changed.push(file);}
 const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]);
 const added=files('src').filter(file=>!before[file]);
 if(changed.length!==4||missing.length||added.length)throw Error('Unexpected source changes');
 const oldFollow=fs.readFileSync(path.join(out,'sources/FollowButton.tsx.before.txt'),'utf8'),newFollow=fs.readFileSync('src/feed/componentes/FollowButton.tsx','utf8');
 const logic=s=>s.slice(s.indexOf('  // Query para'),s.indexOf('  const legacyIcon'));
 const oldCard=fs.readFileSync(path.join(out,'sources/ProductCard.tsx.before.txt'),'utf8'),newCard=fs.readFileSync('src/ui/components/productos/ProductCard.tsx','utf8');
 const checks={followLogicVerbatim:logic(oldFollow)===logic(newFollow),productLogicAndRootVerbatim:oldCard.slice(0,oldCard.indexOf('      {!isBusinessProfileVariant && ('))===newCard.slice(0,newCard.indexOf('      {!isBusinessProfileVariant && (')),productPhotoAndCommerceAndModalVerbatim:oldCard.slice(oldCard.indexOf('      <div className="relative">'))===newCard.slice(newCard.indexOf('      <div className="relative">'))};
 if(!Object.values(checks).every(Boolean))throw Error('Unexpected logic change');
 fs.writeFileSync(path.join(out,'source-integrity.json'),JSON.stringify({compared:Object.keys(before).length,changed,missing,added,checks},null,2));
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
 for(const file of changed)fs.copyFileSync(file,path.join(out,'sources',path.basename(file)+'.after.txt'));
 fs.writeFileSync(path.join(out,'comparison.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Myckeo · Seguir superpuesto</title><style>body{max-width:1500px;margin:24px auto;padding:0 16px;background:#f3f4f6;color:#263042;font:16px/1.5 system-ui}img{max-width:100%;height:auto;display:block;margin-bottom:24px}a{color:#a83c4b}.row{display:flex;gap:20px;flex-wrap:wrap;align-items:start}.row img{max-width:240px}</style><h1>Myckeo · Seguir superpuesto en avatar</h1><p>Avatar completo como un solo botón de Seguir de 44 × 44 px. Nombre como enlace independiente al perfil. Distintivo de 20 px: 53,5 % dentro del avatar circular y 46,5 % fuera. Recupera 24 px para el nombre.</p><h2>Capturas nativas ampliadas 4×</h2><img src="screenshots/states-enlarged.png" alt="Avatar con más Ruby y check teal"><p>Capturas de navegador a deviceScaleFactor 4; cada PNG individual contiene el objetivo de 44 px renderizado en 176 × 176 píxeles, sin recreación de la interfaz.</p>${[390,430,769,1024].map(w=>`<h2>${w} px</h2><a href="screenshots/comparison-${w}.png"><img src="screenshots/comparison-${w}.png" alt="Antes y después a ${w} px"></a>`).join('')}<h2>Estados y casos</h2><div class="row">${['avatar-plus','avatar-check','avatar-pending','avatar-fallback','long-business-390','long-business-430'].map(n=>`<img src="screenshots/${n}.png" alt="${n}">`).join('')}</div><p>Componente productivo de Next.js, ruta /, con datos, sesiones y respuestas sintéticos. Misma escala y scroll de 100 px en las comparativas de viewport.</p><p><a href="summary.json">Medidas</a> · <a href="source-integrity.json">Integridad de fuentes</a> · <a href="after-results.json">Pruebas</a></p></html>`);
 console.log(JSON.stringify({sourceChanges:changed,checks,summary:summary.map(s=>({width:s.width,recovered:s.cards[0].recovered,nameWidth:s.cards[0].afterNameWidth,overlapPercent:s.cards[0].overlay?.overlapFraction*100,desktopPixels:s.desktopPixels,otherControlsIdentical:s.otherControlsIdentical,photoPixels:s.photoPixels}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
