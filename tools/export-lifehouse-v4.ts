import fs from 'node:fs/promises'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {elements} from '../packages/pet_engine'

const input='private/lifehouse-v4',output='src/static/pet-house/lifehouse/v3'
const concept='private/软件ICON图标设计/5界面UI优化设计/22「精灵生活屋·星象篇」页面重构/Q版融合增强_V4_设计审核_20261028/concepts'
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('base64')
async function bounds(bytes:Buffer){
 const{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=info.width,t=info.height,r=-1,b=-1
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>24){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y)}
 if(r<l)throw Error('Empty source');return{left:l,top:t,width:r-l+1,height:b-t+1}
}
async function main(){
 await fs.mkdir(output,{recursive:true});await fs.mkdir(input+'/checks',{recursive:true})
 const existing=await fs.readFile(output+'/manifest.json','utf8').then(JSON.parse).catch(()=>undefined)
 if(process.argv.includes('--check')){
  if(existing?.status!=='ready'||existing.actors.length!==16||existing.wearableFits.length!==144)throw Error('Incomplete scene pack')
  for(const file of existing.files){const bytes=await fs.readFile(output+'/'+file.path),m=await sharp(bytes).metadata();if(sha(bytes)!==file.sha256Base64||m.width!==file.width||m.height!==file.height||m.exif||m.xmp||m.iptc||bytes.includes(Buffer.from('caBX')))throw Error('Invalid output: '+file.id)}
  console.log(JSON.stringify({status:'verified',files:existing.files.length,actors:existing.actors.length,fits:existing.wearableFits.length,metadataClean:true}));return
 }
 if(existing?.status==='ready')throw Error('Finalized scene packs are immutable. Use a new asset version for further changes.')
 if(!process.argv.includes('--export'))throw Error('Use --check or --export explicitly.')
 const manifest:any={schemaVersion:1,assetVersion:3,status:'pending',metadataClean:true,actors:[],files:[],wearableFits:[],sources:[]}
 // Human review stays local and is bound to the exact source bytes; export never grants approval.
 const reviews=JSON.parse(await fs.readFile(input+'/source-reviews.json','utf8'))
 async function exportOne(id:string,source:string,actor=false){
  const raw=await fs.readFile(source),meta=await sharp(raw).metadata(),stats=await sharp(raw).stats()
  const review=reviews.sources?.[id]
  if(!review?.passed||!review.privacyCleared||review.sha256Base64!==sha(raw))throw Error('Source review required: '+id)
  if(!meta.width||!meta.height||Math.min(meta.width,meta.height)<1024||!meta.hasAlpha||stats.isOpaque)throw Error('HD transparent PNG required: '+id)
  const box=await bounds(raw)
  let image=sharp(raw)
  if(actor){if(Math.abs(meta.width/meta.height-.75)>.015)throw Error('Actor plane must be 3:4');image=image.resize(768,1024)}
  else image=image.extract(box).resize({width:id.startsWith('scene-')?1280:768,withoutEnlargement:true})
  const bytes=await image.png({compressionLevel:9}).toBuffer(),m=await sharp(bytes).metadata()
  if(m.exif||m.xmp||m.iptc||bytes.includes(Buffer.from('caBX')))throw Error('Metadata present')
  const path=id+'.png';await fs.writeFile(output+'/'+path,bytes)
  manifest.files.push({id,path,width:m.width,height:m.height,bytes:bytes.length,sha256Base64:sha(bytes)})
  manifest.sources.push({id,sha256Base64:sha(raw)})
  return{sourceSHA256:sha(raw),support:{x:(box.left+box.width*.5)/meta.width,y:(box.top+box.height*.96)/meta.height},bounds:{left:box.left/meta.width,top:box.top/meta.height,right:(box.left+box.width)/meta.width,bottom:(box.top+box.height)/meta.height}}
 }
 for(const e of elements)for(const f of [1,2,3,4]){
  const id=`actor-${e}-f${f}`,source=f===2?`${concept}/${e}-f2-chibi-clay-v${e==='wind'?3:2}.png`:`${input}/sources/${id}.png`
  const data=await exportOne(id,source,true);manifest.actors.push({id:`chibi-${e}-f${f}-r1`,element:e,form:f,fileId:id,...data})
 }
 for(const file of (await fs.readdir(input+'/sources')).filter(f=>/^(scene-|fixture-).*\.png$/.test(f)))await exportOne(file.slice(0,-4),input+'/sources/'+file)
 await exportOne('fixture-curtain',concept+'/water-curtain-foreground-concept.png')
 // Keep a pending manifest until the separate wearable-fit review is complete.
 await fs.writeFile(output+'/manifest.json',JSON.stringify(manifest,(_key,value)=>typeof value==='number'&&!Number.isInteger(value)?Math.round(value*1e6)/1e6:value,2)+'\n')
 await fs.writeFile(input+'/source-reviews.json',JSON.stringify(reviews,null,2)+'\n')
 console.log(JSON.stringify({exported:manifest.files.length,actors:manifest.actors.length,metadataClean:true,status:manifest.status}))
}
void main()
