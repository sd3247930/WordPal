import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {navIconSvg,type NavIconName} from '../src/services/nav-icons'
import {themePacks} from '../src/styles/themes'
test('导航 SVG 统一24坐标、currentColor、圆角描边，发布素材与源一致',()=>{
 const names:NavIconName[]=['home','learn','pet','review','settings'];assert.equal(new Set(names.map(name=>navIconSvg(name))).size,5)
 for(const name of names)for(const active of [false,true]){const svg=navIconSvg(name,active);assert.match(svg,/viewBox="0 0 24 24"/);assert.match(svg,/stroke="currentColor"/);assert.match(svg,/stroke-width="2"/);assert.match(svg,/stroke-linecap="round" stroke-linejoin="round"/);assert.doesNotMatch(svg,/#[0-9a-f]{3,8}|gradient|filter|image/i);assert.equal(readFileSync(`src/static/icons/nav/${name}${active?'-active':''}.svg`,'utf8'),svg)}
})
test('小程序同源PNG覆盖四主题明暗和高对比，不携带私有图片元数据',()=>{
 for(const theme of Object.keys(themePacks))for(const mode of ['light','dark'])for(const state of ['default','active','contrast'])for(const name of ['home','learn','pet','review','settings']){
  const bytes=readFileSync(`src/static/icons/nav/${theme}-${mode}-${state}-${name}.png`);assert.equal(bytes.readUInt32BE(16),72);assert.equal(bytes.readUInt32BE(20),72);let offset=8
  while(offset<bytes.length){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert.ok(!['caBX','eXIf','iTXt','tEXt','zTXt'].includes(type));offset+=length+12}
 }
})
