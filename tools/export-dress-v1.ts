import fs from 'node:fs/promises'
import {createHash} from 'node:crypto'
import sharp from 'sharp'

// Originals stay local; only reviewed, metadata-free derivatives enter the app.
const input='private/dress-v1/sources',output='src/static/pet-house/lifehouse/dress-v1'
const ids=['dew-wreath','moon-crown','cloud-clip','cloud-scarf','rainbow-cowl','wish-bow','courage-sun','growth-sprout','dream-moon']
async function cleanPart(bytes:Buffer){
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let l=info.width,t=info.height,r=-1,b=-1
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}
 if(r<l)throw Error('Empty wearable')
 l=Math.max(0,l-3);t=Math.max(0,t-3);r=Math.min(info.width-1,r+3);b=Math.min(info.height-1,b+3)
 return sharp(bytes).extract({left:l,top:t,width:r-l+1,height:b-t+1}).png().toBuffer()
}
async function main(){
 await fs.mkdir(output,{recursive:true})
 const manifest={schemaVersion:1,designVersion:1,status:'ready',metadataClean:true,artSource:'image_gen',review:'agent-visual-review',inventory:'existing companion-level unlocks',items:[] as any[]}
 for(const id of ids){
  const source=await fs.readFile(`${input}/${id}.png`),meta=await sharp(source).metadata()
  if(!meta.hasAlpha||Math.min(meta.width!,meta.height!)<1024)throw Error('HD alpha source required: '+id)
  const collar=['cloud-scarf','rainbow-cowl','wish-bow'].includes(id),parts:Record<string,Buffer>={}
  if(collar){const half=Math.floor(meta.height!/2);parts.front=await cleanPart(await sharp(source).extract({left:0,top:0,width:meta.width!,height:half}).png().toBuffer());parts.back=await cleanPart(await sharp(source).extract({left:0,top:half,width:meta.width!,height:meta.height!-half}).png().toBuffer())}
  else parts.front=await cleanPart(source)
  const files=[]
  for(const [layer,part]of Object.entries(parts)){
   const bytes=await sharp(part).resize({width:768,withoutEnlargement:true}).png({compressionLevel:9}).toBuffer(),m=await sharp(bytes).metadata(),path=`${id}-${layer}.png`
   if(m.exif||m.xmp||m.iptc||bytes.includes(Buffer.from('caBX')))throw Error('Unexpected metadata')
   await fs.writeFile(`${output}/${path}`,bytes);files.push({layer,path,width:m.width,height:m.height,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})
  }
  // Cards derive from the wearable artwork, with their own square composition and margins.
  for(const size of [256,512]){const inset=await sharp(parts.front).resize(size-32,size-32,{fit:'inside'}).png().toBuffer();const bytes=await sharp(inset).resize(size,size,{fit:'contain',background:'#00000000'}).png().toBuffer(),path=`${id}-${size}.png`;await fs.writeFile(`${output}/${path}`,bytes);files.push({layer:'icon-'+size,path,width:size,height:size,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})}
  manifest.items.push({id:'dress-'+id+'-v1',sourceWidth:meta.width,sourceHeight:meta.height,sourceSHA256:createHash('sha256').update(source).digest('hex'),files})
 }
 await fs.writeFile(output+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
 console.log({items:manifest.items.length,files:manifest.items.reduce((n,i)=>n+i.files.length,0)})
}
main().catch(error=>{console.error(error);process.exitCode=1})
