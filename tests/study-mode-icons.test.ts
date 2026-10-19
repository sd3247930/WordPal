import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import {studyModeIcons} from '../src/services/study-mode-icons'

test('五模式独立透明图标具有高清母版、轻量显示图和干净元数据',async()=>{
 const sources=Object.values(studyModeIcons).map(icon=>icon.src)
 assert.equal(new Set(sources).size,5)
 assert.match(studyModeIcons.connect.src,/study_match_/)
 for(const src of sources)for(const size of [1024,256]){
  const data=await fs.readFile('src'+src.replace('_256.png',`_${size}.png`)),meta=await sharp(data).metadata()
  assert.equal(meta.width,size);assert.equal(meta.height,size);assert.equal(meta.channels,4);assert(meta.hasAlpha)
  const {data:raw,info}=await sharp(data).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  for(const [x,y]of [[0,0],[size-1,0],[0,size-1],[size-1,size-1]])assert.equal(raw[(y*size+x)*info.channels+3],0)
  for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);assert(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type),'Unexpected image metadata chunk: '+type);offset+=length+12}
 }
})
