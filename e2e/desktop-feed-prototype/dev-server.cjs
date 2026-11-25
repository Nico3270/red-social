const {makePrisma,browserDataset}=require('../geography-pagination/data.cjs');
const data=browserDataset();
for(const [type,rows] of Object.entries(data)) for(const row of rows){
 const business=type==='businesses'?row:row.negocio;
 business.nombre='Casa Origen · '+business.ciudad;
 business.fotoPerfil='/__feed-implementation-art/avatar.svg';
 business.fotoPortada='/__feed-implementation-art/morning.svg';
 if(type==='products') {row.nombre='Café de origen · '+row.negocio.ciudad;row.descripcionCorta='Tostado en pequeños lotes';}
 if(type==='publications'){row.titulo='Historias alrededor de una taza';row.descripcion='Conoce a quienes dan vida al café de nuestro barrio.';row.multimedia=[{id:'media-'+row.id,tipo:'IMAGEN',orden:0,url:'/__feed-implementation-art/morning.svg'}];}
}
globalThis.prisma=makePrisma(data);
require('../mobile-feed-implementation/dev-server.cjs');
