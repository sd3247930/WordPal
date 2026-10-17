import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import sharp from 'sharp'
import {taskIconSvg,taskIconNames,taskIconSource,type TaskIconName} from '../src/services/task-icons'
test('任务矢量四种语义独立，使用本地图形且发布源与生成代码一致',()=>{
 const names:TaskIconName[]=['new','listen','spell','review']
 assert.equal(new Set(names.map(name=>taskIconSvg(name))).size,4)
 for(const name of names){
  const svg=taskIconSvg(name)
  assert.match(svg,/viewBox="0 0 64 64"/);assert.match(svg,/linearGradient/)
  assert.doesNotMatch(svg,/<(?:script|image|text|foreignObject)|(?:href|onload|onclick)=|data:|file:/i)
  assert.equal(readFileSync(`src/static/icons/tasks/${name}.svg`,'utf8'),svg)
  assert.doesNotMatch(taskIconSvg(name,{highContrast:true}),/linearGradient|opacity=/)
 }
})
test('任务图标保留本地回退与256像素高对比，无源图片元数据，离线可用',()=>{
 for(const name of ['new','listen','spell','review'])for(const mode of ['light','dark'])for(const state of ['normal','contrast']){
  const bytes=readFileSync(`src/static/icons/tasks/${mode}-${state}-${name}.png`)
  assert.equal(bytes.readUInt32BE(16),state==='contrast'?256:144);assert.equal(bytes.readUInt32BE(20),bytes.readUInt32BE(16))
  for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert.ok(!['caBX','eXIf','iTXt','tEXt','zTXt'].includes(type));offset+=length+12}
 }
})
test('四枚今日任务图标高清、透明、互不混用，深浅色均使用本地干净素材',async()=>{
 const images=[]
 for(const name of taskIconNames){const source=taskIconSource(name),bytes=readFileSync('src'+source),m=await sharp(bytes).metadata();assert.equal(m.width,1024);assert.equal(m.height,1024);assert.equal(m.hasAlpha,true);assert.ok(!m.exif&&!m.xmp&&!m.icc);for(const marker of ['caBX','ChatGPT','OpenAI Media Service'])assert.equal(bytes.includes(Buffer.from(marker)),false);images.push(bytes.toString('base64'));assert.equal(taskIconSource(name,{dark:true}),source);assert.match(taskIconSource(name,{highContrast:true,dark:true}),/dark-contrast-/)}
 assert.equal(new Set(images).size,4)
})
