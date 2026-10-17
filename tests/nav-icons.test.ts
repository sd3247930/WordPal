import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import sharp from 'sharp'
import {navIconSvg,type NavIconName} from '../src/services/nav-icons'
import {themePacks} from '../src/styles/themes'
import {friendlyNavIconSvg,friendlyNavPalette,friendlyNavNames,friendlyNavIconSource,friendlyNavFallbackSource} from '../src/services/friendly-nav-icons'
test('导航 SVG 统一24坐标、currentColor、圆角描边，发布素材与源一致',()=>{
 const names:NavIconName[]=['home','learn','pet','review','settings'];assert.equal(new Set(names.map(name=>navIconSvg(name))).size,5)
 for(const name of names)for(const active of [false,true]){const svg=navIconSvg(name,active);assert.match(svg,/viewBox="0 0 24 24"/);assert.match(svg,/stroke="currentColor"/);assert.match(svg,/stroke-width="2"/);assert.match(svg,/stroke-linecap="round" stroke-linejoin="round"/);assert.doesNotMatch(svg,/#[0-9a-f]{3,8}|gradient|filter|image/i);assert.equal(readFileSync(`src/static/icons/nav/${name}${active?'-active':''}.svg`,'utf8'),svg)}
})
test('小程序描边PNG覆盖瑞士主题明暗和高对比，不携带私有图片元数据',()=>{
 for(const theme of Object.keys(themePacks))for(const mode of ['light','dark'])for(const state of ['default','active','contrast'])for(const name of ['home','learn','pet','review','settings']){
  const bytes=readFileSync(`src/static/icons/nav/${theme}-${mode}-${state}-${name}.png`);assert.equal(bytes.readUInt32BE(16),72);assert.equal(bytes.readUInt32BE(20),72);let offset=8
  while(offset<bytes.length){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert.ok(!['caBX','eXIf','iTXt','tEXt','zTXt'].includes(type));offset+=length+12}
 }
})

test('友好底栏矢量使用独立语义与本地图形，不引用私有图片、网络或脚本',()=>{
 const names:NavIconName[]=['home','learn','pet','review','settings']
 assert.equal(new Set(names.map(name=>friendlyNavIconSvg(name))).size,5)
 for(const name of names)for(const active of [false,true]){
  const svg=friendlyNavIconSvg(name,{active})
  assert.match(svg,/viewBox="0 0 48 48"/);assert.match(svg,/linearGradient/)
  assert.doesNotMatch(svg,/<(?:script|image|foreignObject)|(?:href|onload|onclick)=|data:|file:/i)
  assert.equal(readFileSync(`src/static/icons/nav/friendly-${name}${active?'-active':''}.svg`,'utf8'),svg)
  assert.doesNotMatch(friendlyNavIconSvg(name,{highContrast:true}),/linearGradient/)
 }
 assert.notEqual(friendlyNavPalette('home').paper,friendlyNavPalette('home',{dark:true}).paper)
})

test('友好导航PNG覆盖明暗回退与256像素高对比且无元数据',()=>{
 for(const mode of ['light','dark'])for(const state of ['default','active','contrast'])for(const name of ['home','learn','pet','review','settings']){
  const bytes=readFileSync(`src/static/icons/nav/friendly-${mode}-${state}-${name}.png`)
  assert.equal(bytes.readUInt32BE(16),state==='contrast'?256:96);assert.equal(bytes.readUInt32BE(20),bytes.readUInt32BE(16))
  for(let offset=8;offset<bytes.length;){const size=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert.ok(!['caBX','eXIf','iTXt','tEXt','zTXt'].includes(type));offset+=size+12}
 }
})

test('五枚导航图标均为1024像素透明高清资源，独立语义且主题回退正确',async()=>{
 const images=[]
 for(const name of friendlyNavNames){
  const source=friendlyNavIconSource(name),bytes=readFileSync('src'+source),m=await sharp(bytes).metadata()
  assert.equal(m.width,1024);assert.equal(m.height,1024);assert.equal(m.hasAlpha,true);assert.ok(!m.exif&&!m.xmp&&!m.icc)
  for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert.ok(!['caBX','eXIf','iTXt','tEXt','zTXt'].includes(type));offset+=length+12}
  images.push(bytes.toString('base64'));assert.equal(friendlyNavIconSource(name,{dark:true,active:true}),source)
  assert.equal(friendlyNavIconSource(name,{dark:true,highContrast:true}),friendlyNavFallbackSource(name,{dark:true,highContrast:true}))
  assert.match(friendlyNavFallbackSource(name,{dark:true,active:true}),/friendly-dark-active-/)
 }
 assert.equal(new Set(images).size,5)
})
