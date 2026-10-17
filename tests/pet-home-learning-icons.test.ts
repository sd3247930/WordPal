import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import sharp from 'sharp'
import {petHomeLearningIconSource,petHomeLearningContrastSvg,type PetHomeLearningIconName} from '../src/services/pet-home-learning-icons'
const names:PetHomeLearningIconName[]=['practice','complete','spelling','together']
function cleanPng(bytes:Buffer){for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert.ok(!['caBX','eXIf','iTXt','tEXt','zTXt'].includes(type));offset+=length+12}}

test('四枚高清学习图标为512像素透明PNG，统一留白且没有源图片元数据',async()=>{
 const images:Buffer[]=[]
 for(const name of names){
  const source=petHomeLearningIconSource(name);assert.match(source,/^\/static\/icons\/pet-home-learning\/hd-[a-z-]+\.png$/);assert.equal(source,petHomeLearningIconSource(name,{dark:true}))
  const bytes=readFileSync('src'+source);cleanPng(bytes);images.push(bytes);const metadata=await sharp(bytes).metadata();assert.equal(metadata.width,512);assert.equal(metadata.height,512);assert.equal(metadata.hasAlpha,true)
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});let opaque=0,clear=0
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const alpha=data[(y*info.width+x)*4+3];if(alpha>240)opaque++;if(alpha===0)clear++
   if(x<24||y<24||x>=488||y>=488)assert.equal(alpha,0,'The icon must have transparent safe padding')
  }
  assert.ok(opaque>info.width*info.height*.15);assert.ok(clear>info.width*info.height*.15)
 }
 assert.equal(new Set(images.map(bytes=>bytes.toString('base64'))).size,4)
})

test('明暗高对比沿用清晰的独立轮廓及288像素回退，完全离线可用',()=>{
 for(const name of names){
  const svg=petHomeLearningContrastSvg(name);assert.match(svg,/viewBox="0 0 64 64"/);assert.doesNotMatch(svg,/<(?:script|image|text|foreignObject)|(?:href|onload|onclick)=|data:|file:|Gradient|opacity=/i);assert.equal(readFileSync(`src/static/icons/pet-home-learning/${name}.svg`,'utf8'),svg)
  for(const dark of [false,true]){const source=petHomeLearningIconSource(name,{dark,highContrast:true});assert.ok(source.endsWith(`${dark?'dark':'light'}-contrast-${name}.png`));const bytes=readFileSync('src'+source);assert.equal(bytes.readUInt32BE(16),288);assert.equal(bytes.readUInt32BE(20),288);cleanPng(bytes)}
 }
})
