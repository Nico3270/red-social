const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),crypto=require('node:crypto'),ts=require('typescript');
const out=path.resolve(__dirname,'../../docs/mobile-feed-avatar-follow'),shots=path.join(out,'screenshots');
const read=n=>JSON.parse(fs.readFileSync(path.join(out,n),'utf8'));
async function pair(a,b,name,leftLabel,rightLabel){
 const am=await sharp(a).metadata(),bm=await sharp(b).metadata();
 const width=am.width+bm.width+48;
 const labels=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="44"><g font-family="Arial,sans-serif" font-size="14" fill="#374151"><text x="16" y="28">${leftLabel}</text><text x="${am.width+32}" y="28">${rightLabel}</text></g></svg>`);
 await sharp({create:{width,height:Math.max(am.height,bm.height)+60,channels:4,background:'#f3f4f6'}}).composite([{input:labels,top:0,left:0},{input:a,top:44,left:16},{input:b,top:44,left:am.width+32}]).png().toFile(path.join(shots,name));
}
function normal(node){const children=[];ts.forEachChild(node,n=>{children.push(normal(n));});return{kind:node.kind,text:ts.isIdentifier(node)||ts.isStringLiteral(node)||ts.isNumericLiteral(node)?node.text:undefined,children};}
function declarations(source){const result={};const walk=n=>{if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name))result[n.name.text]=normal(n);ts.forEachChild(n,walk);};walk(ts.createSourceFile('component.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX));return result;}
(async()=>{
 for(const width of [390,430,769,1024])await pair(path.join(shots,`before-${width}.png`),path.join(shots,`after-${width}.png`),`comparison-${width}.png`,'Antes · B aprobada','Después · avatar + seguir');
 await pair(path.join(shots,'avatar-plus.png'),path.join(shots,'avatar-check.png'),'states.png','Sin seguir · +','Siguiendo · ✓');
 const before=read('source-state-before.json'),changed=[],missing=[],added=[];
 for(const [file,hash]of Object.entries(before)){if(!fs.existsSync(file)){missing.push(file);continue;}if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)changed.push(file);}
 function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]);}
 for(const file of files('src'))if(!before[file])added.push(file);
 const old=declarations(fs.readFileSync(path.join(out,'sources/FollowButton.tsx.before.txt'),'utf8')),now=declarations(fs.readFileSync('src/feed/componentes/FollowButton.tsx','utf8'));
 const unchangedFollowLogic=Object.fromEntries(['isFollowing','mutation','handleClick','handleTouchStart','handleTouchEnd'].map(name=>[name,JSON.stringify(old[name])===JSON.stringify(now[name])]));
 // isFollowing is a destructuring declaration; compare the full query block separately.
 const oldText=fs.readFileSync(path.join(out,'sources/FollowButton.tsx.before.txt'),'utf8'),newText=fs.readFileSync('src/feed/componentes/FollowButton.tsx','utf8');
 unchangedFollowLogic.queryAndMutationAndHandlersVerbatim=oldText.slice(oldText.indexOf('  // Query para'),oldText.indexOf('  return ('))===newText.slice(newText.indexOf('  // Query para'),newText.indexOf('  const legacyIcon'));
 delete unchangedFollowLogic.isFollowing;
 if(!Object.values(unchangedFollowLogic).every(Boolean)||missing.length||changed.length!==3||added.length!==1)throw Error('Unexpected source or follow logic change');
 fs.writeFileSync(path.join(out,'source-integrity.json'),JSON.stringify({compared:Object.keys(before).length,changed,added,missing,unchangedFollowLogic},null,2));
 const summary=[320,360,390,430,768,769,1024].map(width=>{const a=read(`before-${width}.json`),b=read(`after-${width}.json`);return{width,desktopPixels:b.desktopPixels,cards:b.cards.map((c,i)=>({id:c.id,name:c.name.text,beforeNameWidth:a.cards[i].name.width,afterNameWidth:c.name.width,nameDelta:c.name.width-a.cards[i].name.width,headerHeight:c.header.height,avatar:c.avatar,follow:c.controls.find(x=>x.follow)?.box,collisions:c.collisions}))}});
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
 for(const file of changed)fs.copyFileSync(file,path.join(out,'sources',path.basename(file)+'.after.txt'));
 fs.copyFileSync(added[0],path.join(out,'sources',path.basename(added[0])+'.after.txt'));
 fs.writeFileSync(path.join(out,'comparison.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Myckeo · Seguir en avatar</title><style>body{max-width:1400px;margin:24px auto;padding:0 16px;background:#f3f4f6;color:#263042;font:16px/1.5 system-ui}img{max-width:100%;height:auto;display:block;margin-bottom:24px}a{color:#a83c4b}.row{display:flex;flex-wrap:wrap;gap:20px;align-items:start}.row img{max-width:240px}</style><h1>Myckeo · Seguir junto al avatar</h1><p>Alternativa compacta accesible: avatar enlazado de 24 × 24 px, Seguir independiente de 44 × 44 px e indicador visible de 16 px con halo blanco. Header de 44 px. Se ceden 24 px de ancho al nombre frente a B para preservar ambos destinos.</p><h2>Estados</h2><img src="screenshots/states.png" alt="Indicador más y check"><div class="row"><img src="screenshots/avatar-pending.png" alt="Carga"><img src="screenshots/avatar-fallback.png" alt="Avatar faltante"><img src="screenshots/long-business-390.png" alt="Negocio largo a 390"><img src="screenshots/long-business-430.png" alt="Negocio largo a 430"></div>${[390,430,769,1024].map(w=>`<h2>${w} px</h2><a href="screenshots/comparison-${w}.png"><img src="screenshots/comparison-${w}.png" alt="Antes y después a ${w} px"></a>`).join('')}<p>Capturas del componente real de Next.js con sesiones, red y datos sintéticos controlados por Playwright. Las composiciones conservan su escala original.</p><p><a href="summary.json">Medidas</a> · <a href="source-integrity.json">Integridad de fuentes y lógica</a> · <a href="after-results.json">Resultados</a></p></html>`);
 console.log(JSON.stringify({sourceChanges:changed,added,unchangedFollowLogic,nameWidths:summary.map(s=>({width:s.width,desktopPixels:s.desktopPixels,name:s.cards[0]}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
