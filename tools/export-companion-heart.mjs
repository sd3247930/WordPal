import fs from 'node:fs/promises'
import sharp from 'sharp'

const input=process.argv[2]||'private/assets/companion-heart-cutout.png'
const reference='src/static/icons/companion/clay-smile.png'
const output='src/static/icons/companion/clay-heart.png'

async function measure(input){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let left=info.width,top=info.height,right=0,bottom=0,mass=0,mx=0,my=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const alpha=data[(y*info.width+x)*4+3]
  if(alpha<=32)continue
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1)
  mass+=alpha;mx+=(x+.5)*alpha;my+=(y+.5)*alpha
 }
 if(!mass)throw Error('The icon has no visible artwork.')
 return {width:info.width,height:info.height,bounds:{left,top,width:right-left,height:bottom-top},center:{x:mx/mass,y:my/mass}}
}

const meta=await sharp(input).metadata(),ref=await measure(reference),source=await measure(input)
if(!meta.hasAlpha||ref.width!==256||ref.height!==256)throw Error('Use a transparent heart and the existing 256px smile reference.')
const left=Math.max(0,source.bounds.left-2),top=Math.max(0,source.bounds.top-2)
const crop={left,top,width:Math.min(source.width,source.bounds.left+source.bounds.width+2)-left,height:Math.min(source.height,source.bounds.top+source.bounds.height+2)-top}
const visibleSpan=Math.max(ref.bounds.width,ref.bounds.height),scale=visibleSpan/Math.max(source.bounds.width,source.bounds.height)
const pixels=await sharp(input).extract(crop).resize(Math.round(crop.width*scale),Math.round(crop.height*scale),{fit:'inside'}).png().toBuffer()
const fitted=await measure(pixels),x=Math.round(ref.center.x-fitted.center.x),y=Math.round(ref.center.y-fitted.center.y)
if(x<0||y<0||x+fitted.width>256||y+fitted.height>256)throw Error('The normalized heart would be clipped.')
const png=await sharp({create:{width:256,height:256,channels:4,background:'#00000000'}}).composite([{input:pixels,left:x,top:y}]).png({compressionLevel:9}).toBuffer()
const chunks=[png.subarray(0,8)]
for(let offset=8;offset<png.length;){
 const size=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8)
 if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type))chunks.push(png.subarray(offset,offset+size+12))
 offset+=size+12
}
const clean=Buffer.concat(chunks),actual=await measure(clean)
const centerDelta={x:Math.abs(actual.center.x-ref.center.x),y:Math.abs(actual.center.y-ref.center.y)}
if(centerDelta.x>.75||centerDelta.y>.75||Math.abs(Math.max(actual.bounds.width,actual.bounds.height)-visibleSpan)>1)throw Error('Visible size or optical center differs from the smile reference.')
await fs.writeFile(output,clean)
console.log(JSON.stringify({output,width:256,height:256,transparent:true,visibleSpan,centerDelta,reference:ref,heart:actual,metadataRemoved:true}))
