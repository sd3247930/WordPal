import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import {familiarityIcons} from '../src/services/familiarity-icons'
import {familiarityLevels} from '../src/services/content/FamiliaritySelector'

test('六种熟知度各用独立透明资源，含高清母版和无源元数据的显示图',async()=>{
 assert.deepEqual(Object.keys(familiarityIcons),[...familiarityLevels])
 assert.equal(new Set(Object.values(familiarityIcons).map(icon=>icon.src)).size,6)
 assert.match(familiarityIcons.unseen.src,/unlearned/);assert.match(familiarityIcons.introduced.src,/beginner/);assert.match(familiarityIcons.unrated.src,/pending/)
 for(const icon of Object.values(familiarityIcons))for(const size of [1024,256]){
  const data=await fs.readFile('src'+icon.src.replace('_256.png',`_${size}.png`)),meta=await sharp(data).metadata()
  assert.equal(meta.width,size);assert.equal(meta.height,size);assert.equal(meta.channels,4);assert(meta.hasAlpha)
  const {data:raw,info}=await sharp(data).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  for(const [x,y]of [[0,0],[size-1,0],[0,size-1],[size-1,size-1]])assert.equal(raw[(y*size+x)*info.channels+3],0)
  // The normalized master leaves the requested 72px transparent safety margin.
  if(size===1024)for(let x=0;x<size;x++){assert.equal(raw[(71*size+x)*4+3],0);assert.equal(raw[(952*size+x)*4+3],0)}
  for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);assert(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type),'Unexpected metadata chunk: '+type);offset+=length+12}
 }
})
