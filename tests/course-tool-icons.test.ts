import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import sharp from 'sharp'
import {courseToolIconSvg,courseToolIconNames,courseToolIconSource,courseToolFallbackSource,type CourseToolIconName} from '../src/services/course-tool-icons'
const names:CourseToolIconName[]=['return','installed','search','uninstall']

test('教材功能图标独立、离线，导出源与运行时一致，高对比模式保留清晰轮廓',()=>{
 assert.equal(new Set(names.map(name=>courseToolIconSvg(name))).size,4)
 for(const name of names){
  const svg=courseToolIconSvg(name)
  assert.match(svg,/viewBox="0 0 64 64"/);assert.match(svg,/linearGradient/)
  assert.doesNotMatch(svg,/<(?:script|image|text|foreignObject)|(?:href|onload|onclick)=|data:|file:/i)
  assert.equal(readFileSync(`src/static/icons/course-tools/${name}.svg`,'utf8'),svg)
  assert.notEqual(svg,courseToolIconSvg(name,{dark:true}))
  assert.doesNotMatch(courseToolIconSvg(name,{highContrast:true}),/linearGradient|opacity=/)
 }
})

test('教材图标168像素回退与256像素高对比完整，导出文件无私有元数据',()=>{
 for(const name of names)for(const mode of ['light','dark'])for(const state of ['normal','contrast']){
  const bytes=readFileSync(`src/static/icons/course-tools/${mode}-${state}-${name}.png`)
  assert.equal(bytes.readUInt32BE(16),state==='contrast'?256:168);assert.equal(bytes.readUInt32BE(20),bytes.readUInt32BE(16))
  for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert.ok(!['caBX','eXIf','iTXt','tEXt','zTXt'].includes(type));offset+=length+12}
 }
})

test('四枚教材功能图标均为1024像素透明资源、互不混用，深浅与高对比加载正确',async()=>{
 const images=[]
 for(const name of courseToolIconNames){
  const source=courseToolIconSource(name),bytes=readFileSync('src'+source),m=await sharp(bytes).metadata();assert.equal(m.width,1024);assert.equal(m.height,1024);assert.equal(m.hasAlpha,true);assert.ok(!m.exif&&!m.xmp&&!m.icc)
  for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert.ok(!['caBX','eXIf','iTXt','tEXt','zTXt'].includes(type));offset+=length+12}
  images.push(bytes.toString('base64'));assert.equal(courseToolIconSource(name,{dark:true}),source);assert.equal(courseToolIconSource(name,{dark:true,highContrast:true}),courseToolFallbackSource(name,{dark:true,highContrast:true}));assert.match(courseToolFallbackSource(name,{dark:true}),/dark-normal-/)
 }
 assert.equal(new Set(images).size,4)
})
