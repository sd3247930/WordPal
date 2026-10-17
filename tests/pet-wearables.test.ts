import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {readFile} from 'node:fs/promises'
import {elements} from '../packages/pet_engine'
import {petDressIconNames} from '../src/services/pet-dress-icons'
import {petWearableFits,petWearableSource} from '../src/services/pet-wearables'

test('四象四阶段48套穿戴均有原图同尺寸的透明前后图层，无元数据和外部资源',async()=>{
 const paths=new Set<string>()
 for(const element of elements)for(const form of [1,2,3,4] as const)for(const item of petDressIconNames)for(const layer of ['back','front'] as const){
  const path=petWearableSource(element,form,item,layer);assert.ok(!paths.has(path));paths.add(path)
  const data=await readFile('src'+path),meta=await sharp(data).metadata();assert.equal(meta.width,960);assert.equal(meta.height,1280);assert.equal(meta.hasAlpha,true);assert.ok(!meta.exif&&!meta.xmp&&!meta.icc)
  for(const marker of ['caBX','ChatGPT','OpenAI Media Service'])assert.equal(data.includes(Buffer.from(marker)),false)
  if(layer==='front'){
   const trimmed=await sharp(data).trim().toBuffer({resolveWithObject:true});assert.ok(trimmed.info.width>20&&trimmed.info.width<240);assert.ok(trimmed.info.height>20&&trimmed.info.height<200)
   const fit=petWearableFits[element][form];assert.ok(fit.pin[1]>fit.neck[1]);assert.ok(Math.abs(fit.pin[0]-fit.neck[0])<20)
  }
 }
 assert.equal(paths.size,96)
 for(const invalid of [0,5,NaN,1.5])assert.equal(petWearableSource('water',invalid,'ribbon','front'),'')
})
