import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import sharp from 'sharp'

// Original artwork stays local. Only reviewed, metadata-free runtime exports are emitted.
const root=process.cwd(),input=path.join(root,'private/lifehouse-implementation/assets'),output=path.join(root,'src/static/pet-house/lifehouse')
const elements=['water','fire','earth','wind'],furniture=[...elements.flatMap(e=>['bed','shelf','rug','lamp'].map(k=>e+'-'+k)),'common-plant','common-garden','common-table','common-chime','starter-bed','starter-shelf','starter-window']
const ui=['ui-home','ui-feed','ui-growth','ui-dress','ui-album','food-water','food-pearl','food-leaf','food-feather','dress-ribbon','dress-scarf','dress-star','metric-experience','metric-affection','metric-book']
const entries=[...Array.from({length:6},(_,i)=>({id:'room-'+i,kind:'room'})),...furniture.map(id=>({id,kind:'furniture'})),...ui.map(id=>({id,kind:'ui'})),...elements.map(id=>({id:id+'-motif',kind:'decor'}))]
const digest=b=>createHash('sha256').update(b).digest('base64'),manifest={assetVersion:1,style:'Original high resolution 3D cream clay artwork',palette:['cream','mint','sky blue','peach pink'],metadata:'Re-encoded without source metadata or content credentials',sources:[],files:[]}
async function bounds(bytes){const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}if(x0>x1)throw Error('Empty transparent artwork');const pad=Math.ceil(Math.max(x1-x0,y1-y0)*.025);x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(info.width-1,x1+pad);y1=Math.min(info.height-1,y1+pad);return{left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}}
async function emit(relative,bytes){const target=path.join(output,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);const meta=await sharp(bytes).metadata();if(meta.exif||meta.iptc||meta.xmp||bytes.includes(Buffer.from('caBX')))throw Error('Unexpected source metadata in '+relative);manifest.files.push({path:relative,width:meta.width,height:meta.height,bytes:bytes.length,sha256Base64:digest(bytes)})}
// Validate every input before touching runtime files, so an incomplete batch cannot partially export.
const originals=await Promise.all(entries.map(async entry=>{const bytes=await fs.readFile(path.join(input,entry.id+'.png')),meta=await sharp(bytes).metadata();if(Math.min(meta.width,meta.height)<1024)throw Error('Artwork is below native HD: '+entry.id);if(entry.kind!=='room'&&!meta.hasAlpha)throw Error('Transparent artwork required: '+entry.id);return{...entry,bytes,meta}}))
for(const entry of originals){const {id,kind,bytes,meta}=entry;manifest.sources.push({id,width:meta.width,height:meta.height,sha256Base64:digest(bytes)});if(kind==='room'){await emit('rooms/'+id+'.jpg',await sharp(bytes).flatten({background:'#FFFAF0'}).resize({width:1536,withoutEnlargement:true}).jpeg({quality:90,mozjpeg:true}).toBuffer());await emit('rooms/'+id+'-256.jpg',await sharp(bytes).flatten({background:'#FFFAF0'}).resize({width:256}).jpeg({quality:88,mozjpeg:true}).toBuffer())}else{const crop=await bounds(bytes);for(const size of kind==='furniture'?[256,512]:kind==='decor'?[512]:[256]){const relative=kind+'/'+id+(kind==='decor'?'':'-'+size)+'.png';await emit(relative,await sharp(bytes).extract(crop).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9,effort:10}).toBuffer())}}}
// Small selectors retain the original spirit pixels and aspect ratio without decoding four full sprites.
manifest.companionSources=[]
for(const element of elements)for(const [index,form]of ['juvenile','growing','evolved','unknown'].entries()){
 const bytes=await fs.readFile(path.join(root,'src/static/pet-house/growth',element+'-'+form+'.png')),meta=await sharp(bytes).metadata()
 manifest.companionSources.push({element,form:index+1,width:meta.width,height:meta.height,sha256Base64:digest(bytes)})
 await emit(`companions/${element}-${index+1}-256.png`,await sharp(bytes).resize(192,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9,effort:10}).toBuffer())
}
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({sources:manifest.sources.length,exports:manifest.files.length,totalBytes:manifest.files.reduce((n,f)=>n+f.bytes,0),metadata:'clean'}))
