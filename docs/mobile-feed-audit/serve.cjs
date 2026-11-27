const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),preview=path.join(__dirname,'preview');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'); let pathname;
  try{pathname=decodeURIComponent(url.pathname)}catch{res.writeHead(400).end();return}
  const base=pathname.startsWith('/audit-font/')?path.join(root,'src/assets/fonts'):pathname.startsWith('/imgs/')?path.join(root,'public'):preview;
  const name=pathname.startsWith('/audit-font/')?pathname.slice('/audit-font/'.length):pathname==='/'?'index.html':pathname.slice(1);
  const file=path.resolve(base,name);
  if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
server.listen(Number(process.env.AUDIT_PORT||4399),'127.0.0.1',()=>console.log('Local audit: http://127.0.0.1:'+server.address().port+'/?mode=current'));
module.exports=server;
