import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import sharp from 'sharp'
import {petActionIconSvg,petActionIconNames,petActionIconSource,type PetActionIconName} from '../src/services/pet-action-icons'
test('五种宠物屋粘土图标语义独立，源文件一致且不依赖网络、字体或私有图片',()=>{
 const names:PetActionIconName[]=['home','feed','growth','dress','album']
 assert.equal(new Set(names.map(name=>petActionIconSvg(name))).size,5)
 for(const name of names){
  const svg=petActionIconSvg(name)
  assert.match(svg,/viewBox="0 0 64 64"/);assert.match(svg,/linearGradient/)
  assert.doesNotMatch(svg,/<(?:script|image|text|foreignObject)|(?:href|onload|onclick)=|data:|file:/i)
  assert.equal(readFileSync(`src/static/icons/pet-actions/${name}.svg`,'utf8'),svg)
  assert.doesNotMatch(petActionIconSvg(name,{highContrast:true}),/linearGradient|opacity=/)
 }
})
test('宠物屋图标保留本地回退与256像素高对比，不含私有图片元数据',()=>{
 for(const name of ['home','feed','growth','dress','album'])for(const mode of ['light','dark'])for(const state of ['normal','contrast']){
  const bytes=readFileSync(`src/static/icons/pet-actions/${mode}-${state}-${name}.png`)
  assert.equal(bytes.readUInt32BE(16),state==='contrast'?256:144);assert.equal(bytes.readUInt32BE(20),bytes.readUInt32BE(16))
  for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert.ok(!['caBX','eXIf','iTXt','tEXt','zTXt'].includes(type));offset+=length+12}
 }
})
test('五枚立体导航图标为1024像素正方形透明素材，无来源元数据且各不相同',async()=>{
 const images=[]
 for(const name of petActionIconNames){const source=petActionIconSource(name),bytes=readFileSync('src'+source),m=await sharp(bytes).metadata();assert.equal(m.width,1024);assert.equal(m.height,1024);assert.equal(m.hasAlpha,true);assert.ok(!m.exif&&!m.xmp&&!m.icc);for(const marker of ['caBX','ChatGPT','OpenAI Media Service'])assert.equal(bytes.includes(Buffer.from(marker)),false);images.push(bytes.toString('base64'));assert.equal(petActionIconSource(name,{dark:true}),source);assert.match(petActionIconSource(name,{highContrast:true,dark:true}),/dark-contrast-/)}
 assert.equal(new Set(images).size,5)
})
