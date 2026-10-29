import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
const root='src/static/pet-house/lifehouse/v6',source='private/house-v6/generated',elements=['water','fire','earth','wind']
const hash=b=>createHash('sha256').update(b).digest('base64')
const files=[],poses=[]
await fs.mkdir(root,{recursive:true})
async function output(id,name,bytes){await fs.writeFile(root+'/'+name,bytes);const meta=await sharp(bytes).metadata();if(meta.exif||meta.xmp||meta.icc||bytes.includes(Buffer.from('caBX')))throw Error('Unclean metadata '+id);files.push({id,path:name,width:meta.width,height:meta.height,bytes:bytes.length,sha256Base64:hash(bytes)})}
const has=async p=>!!await fs.stat(p).catch(()=>false)
if(process.argv.includes('--check')){
 const m=JSON.parse(await fs.readFile(root+'/manifest.json','utf8'));if(m.status!=='ready'||m.poses.length!==32||m.files.filter(f=>f.id.startsWith('v6-room-')).length!==24)throw Error('Incomplete scene pack')
 for(const f of m.files){const b=await fs.readFile(root+'/'+f.path),meta=await sharp(b).metadata();if(hash(b)!==f.sha256Base64||b.length!==f.bytes||meta.width!==f.width||meta.height!==f.height||meta.exif||meta.xmp||meta.icc||b.includes(Buffer.from('caBX')))throw Error('Invalid file '+f.id)}console.log({verified:m.files.length,poses:m.poses.length});process.exit(0)
}
for(const e of elements)for(let level=0;level<6;level++){
 const input=source+'/rooms/'+e+'-l'+level+'.png';if(!await has(input))continue
 const clean=await sharp(input).resize(1536,1024,{fit:'cover'}).jpeg({quality:88,mozjpeg:true}).toBuffer();await output('v6-room-'+e+'-l'+level,'room-'+e+'-l'+level+'.jpg',clean)
 const rgba=await sharp(clean).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 for(const layer of ['floor','architecture']){const pixels=Buffer.from(rgba.data);for(let y=0;y<rgba.info.height;y++)for(let x=0;x<rgba.info.width;x++)if((layer==='floor')!==(y>=Math.round(rgba.info.height*.56))){const i=(y*rgba.info.width+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=pixels[i+3]=0}await output('v6-'+layer+'-'+e+'-l'+level,layer+'-'+e+'-l'+level+'.webp',await sharp(pixels,{raw:rgba.info}).webp({quality:92,alphaQuality:100}).toBuffer())}
 const {data,info}=await sharp(clean).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 // Extract the near bank from this exact image; all other RGB is zero in transparent pixels.
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const u=x/info.width,v=y/info.height,keep=v>.973||v>.84&&(u<.035*(v-.84)/.16||u>1-.035*(v-.84)/.16);if(!keep){const i=(y*info.width+x)*4;data[i]=data[i+1]=data[i+2]=data[i+3]=0}}
 await output('v6-front-'+e+'-l'+level,'front-'+e+'-l'+level+'.png',await sharp(data,{raw:info}).png({compressionLevel:9}).toBuffer())
 for(let form=1;form<5;form++){
  const canvas=sharp(clean).resize(384,256),size=Math.round(384*[.34,.32,.30,.28,.26,.25][level]),body=await sharp('src/static/pet-house/lifehouse/v3/actor-'+e+'-f'+form+'.png').resize(size,Math.round(size*4/3)).png().toBuffer(),left=Math.round(192-size*.5),top=Math.round(215-size*4/3*.96)
  await output('v6-thumb-'+e+'-l'+level+'-f'+form,'thumb-'+e+'-l'+level+'-f'+form+'.jpg',await canvas.composite([{input:body,left,top}]).jpeg({quality:84,mozjpeg:true}).toBuffer())
 }
}
const relative={
 water:{sit:[[.28,.20,.18,-12],[.50,.51,.17,0],[.57,.60,.075,0]],sleep:[[.22,.20,.17,-30],[.43,.50,.16,-28],[.52,.59,.07,-28]]},
 fire:{sit:[[.29,.26,.18,-15],[.51,.57,.22,0],[.57,.65,.08,0]],sleep:[[.22,.25,.17,-22],[.42,.58,.20,-12],[.53,.66,.075,-12]]},
 earth:{sit:[[.24,.39,.17,-18],[.43,.68,.20,6],[.49,.77,.08,6]],sleep:[[.18,.40,.17,-25],[.36,.67,.18,-18],[.48,.74,.075,-18]]},
 wind:{sit:[[.29,.36,.17,-15],[.50,.67,.17,0],[.56,.75,.073,0]],sleep:[[.19,.38,.16,-25],[.39,.64,.16,-20],[.50,.73,.07,-20]]}
}
for(const e of elements)for(let form=1;form<5;form++)for(const pose of ['sit','sleep']){
 const input=source+'/poses/'+e+'-f'+form+'-'+pose+'.png';if(!await has(input))continue
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=info.width,t=info.height,r=0,b=0,clear=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4;if(data[i+3]<4){data[i]=data[i+1]=data[i+2]=data[i+3]=0;clear++}else if(data[i+3]>32){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y)}}
 if(clear<info.width*info.height*.1)throw Error('Opaque pose needs redraw: '+input)
 // Technical export: preserve the generated pose, add consistent transparent margins in a 3:4 plane.
 const width=r-l+1,height=b-t+1,scale=Math.min(528/width,704/height),w=Math.round(width*scale),h=Math.round(height*scale),left=Math.round((576-w)/2),top=730-h
 const cropped=await sharp(data,{raw:info}).extract({left:l,top:t,width,height}).resize(w,h).png().toBuffer(),out=await sharp({create:{width:576,height:768,channels:4,background:'#00000000'}}).composite([{input:cropped,left,top}]).png({compressionLevel:9,palette:true,quality:95}).toBuffer(),id='v6-pose-'+e+'-f'+form+'-'+pose
 await output(id,'pose-'+e+'-f'+form+'-'+pose+'.png',out)
 const bounds={left:left/576,top:top/768,right:(left+w)/576,bottom:(top+h)/768},a=relative[e][pose],anchors={}
 for(const [i,slot]of ['head','neck','badge'].entries()){const[x,y,width,rotation]=a[i];anchors[slot]={x:(left+x*w)/576,y:(top+y*h)/768,width:width*w/576,rotation}}
 poses.push({element:e,form,pose,fileId:id,support:{x:.5,y:730/768},bounds,anchors})
}
const previous=JSON.parse(await fs.readFile('src/static/pet-house/lifehouse/v2/manifest.json','utf8'))
for(const e of elements){const file=previous.files.find(f=>f.key===e+'-furniture-l1-v1:preview'),{data,info}=await sharp('src/static/pet-house/lifehouse/v2/'+file.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let y=0;y<info.height*.66;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4;data[i]=data[i+1]=data[i+2]=data[i+3]=0}await output('v6-bed-front-'+e,'bed-front-'+e+'.png',await sharp(data,{raw:info}).png({compressionLevel:9}).toBuffer())}
const gem=source+'/gem/blue-diamond.png'
function pixelOnlyPng(bytes){const chunks=[bytes.subarray(0,8)];for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);if(['IHDR','IDAT','IEND'].includes(type))chunks.push(bytes.subarray(offset,offset+length+12));offset+=length+12}return Buffer.concat(chunks)}
for(const name of ['watering-can','harvest-basket','windmill','windmill-base'])if(await has(source+'/props/'+name+'.png'))await output('v6-prop-'+name,'prop-'+name+'.png',await sharp(source+'/props/'+name+'.png').resize(512,512,{fit:'contain',background:'#00000000'}).png({compressionLevel:9,palette:true,quality:95}).toBuffer())
if(await has(source+'/props/windmill-rotor.png')){
 const blade=await sharp(source+'/props/windmill-rotor.png').resize(358,358).png().toBuffer()
 await output('v6-prop-windmill-rotor','prop-windmill-rotor.png',await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:blade,left:80,top:0}]).png({compressionLevel:9}).toBuffer())
}
if(await has(gem)){for(const size of [128,192,256]){const bytes=await sharp(gem).trim({threshold:4}).resize(size-16,size-16,{fit:'contain',background:'#00000000'}).extend({top:8,bottom:8,left:8,right:8,background:'#00000000'}).png({compressionLevel:9}).toBuffer();await fs.writeFile('src/static/brand/blue-diamond-'+size+'.png',pixelOnlyPng(bytes))}await output('v6-blue-diamond','blue-diamond.png',await sharp(gem).resize(512,512,{fit:'contain',background:'#00000000'}).png({compressionLevel:9}).toBuffer())}
const ready=files.filter(f=>f.id.startsWith('v6-room-')).length===24&&poses.length===32&&await has(gem)&&await has(source+'/props/windmill-base.png')&&await has(source+'/props/windmill-rotor.png')
await fs.writeFile(root+'/manifest.json',JSON.stringify({schemaVersion:1,assetVersion:6,status:ready?'ready':'draft',metadataClean:true,source:'Codex image generation; independent runtime exports',files,poses},(_key,value)=>typeof value==='number'&&!Number.isInteger(value)?Math.round(value*1e6)/1e6:value,2)+'\n')
console.log({files:files.length,rooms:files.filter(f=>f.id.startsWith('v6-room-')).length,poses:poses.length,ready,bytes:files.reduce((sum,f)=>sum+f.bytes,0)})
