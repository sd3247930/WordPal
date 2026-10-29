import fs from 'node:fs/promises'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {elements} from '../packages/pet_engine'
import {sceneDefinition} from '../src/services/pet-lifehouse/SceneConfig'
import {sceneActorSource,sceneAsset} from '../src/services/pet-lifehouse/SceneVisualPack'
import {furnitureVisual} from '../src/services/pet-lifehouse/SceneVisualRegistry'
import type {HouseLevel} from '../src/services/pet-lifehouse/types'
async function main(){
const root='src/static/pet-house/lifehouse/v6',manifest=JSON.parse(await fs.readFile(root+'/manifest.json','utf8'))
if(manifest.status!=='ready')throw Error('Finish the art export before composing thumbnails')
await fs.mkdir('private/house-v6/previews',{recursive:true})
for(const e of elements)for(let level=0;level<6;level++)for(const form of [1,2,3,4] as const){
 const scene=sceneDefinition(e,level as HouseLevel,3),zone=scene.zones[0],layers:{input:Buffer;left:number;top:number;depth:number}[]=[]
 for(const node of zone.nodes){const src=sceneAsset(node.assetId);if(!src)throw Error('Missing '+node.assetId);layers.push({input:await sharp('src'+src).resize(Math.round(node.rect.width*1536),Math.round(node.rect.height*1024),{fit:'fill'}).png().toBuffer(),left:Math.round(node.rect.x*1536),top:Math.round(node.rect.y*1024),depth:node.layer==='foreground'?150:node.depth})}
 for(const [slotId,furnitureId]of level>1?[['left','starter-bed'],['right','starter-shelf'],['wall','starter-window']]:level?[['left','starter-bed']]:[]){const s=scene.slots.find(s=>s.id===slotId)!;layers.push({input:await sharp('src'+furnitureVisual(furnitureId,e,'stage',2)).resize(Math.round(s.rect.width*1536),Math.round(s.rect.height*1024),{fit:'contain',background:'#00000000'}).png().toBuffer(),left:Math.round(s.rect.x*1536),top:Math.round(s.rect.y*1024),depth:s.depth})}
 const actor=sceneActorSource(e,form),w=Math.round(scene.actorWidth!*1536),h=Math.round(w*4/3)
 layers.push({input:await sharp('src'+actor.body).resize(w,h).png().toBuffer(),left:Math.round(zone.spawn.x*1536-w*actor.support.x),top:Math.round(zone.spawn.y*1024-h*actor.support.y),depth:Math.round(zone.spawn.y*100)})
 layers.sort((a,b)=>a.depth-b.depth)
 const composed=await sharp({create:{width:1536,height:1024,channels:4,background:'#00000000'}}).composite(layers).png().toBuffer()
 const bytes=await sharp(composed).resize(384,256).jpeg({quality:84,mozjpeg:true}).toBuffer(),file=manifest.files.find((f:{id:string})=>f.id===`v6-thumb-${e}-l${level}-f${form}`)
 await fs.writeFile(root+'/'+file.path,bytes);Object.assign(file,{bytes:bytes.length,sha256Base64:createHash('sha256').update(bytes).digest('base64')})
 if(form===1)await sharp(composed).jpeg({quality:93,mozjpeg:true}).toFile(`private/house-v6/previews/${e}-l${level}.jpg`)
}
manifest.thumbnailComposition='same scene nodes, fixed geometry, gifts and current form; 384x256 runtime'
await fs.writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log({thumbnails:96,fullPreviews:24})

}
main().catch(error=>{console.error(error);process.exitCode=1})
