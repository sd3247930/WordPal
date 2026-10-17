import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {petFoodIconSvg,type PetFoodIconName} from '../src/services/pet-food-icons'
const names:PetFoodIconName[]=['water','pearl','leaf','feather']

test('四种柔和渐变喂食图标独立、离线，深浅与高对比导出源一致',()=>{
 assert.equal(new Set(names.map(name=>petFoodIconSvg(name))).size,4)
 for(const name of names){
  const svg=petFoodIconSvg(name)
  assert.match(svg,/viewBox="0 0 64 64"/);assert.match(svg,/Gradient/)
  assert.doesNotMatch(svg,/<(?:script|image|text|foreignObject)|(?:href|onload|onclick)=|data:|file:/i)
  assert.equal(readFileSync(`src/static/icons/pet-foods/${name}.svg`,'utf8'),svg)
  assert.notEqual(svg,petFoodIconSvg(name,{dark:true}))
  assert.doesNotMatch(petFoodIconSvg(name,{highContrast:true}),/Gradient|opacity=/)
 }
})

test('喂食图标192像素回退覆盖深浅与高对比，PNG无私有元数据',()=>{
 for(const name of names)for(const mode of ['light','dark'])for(const state of ['normal','contrast']){
  const bytes=readFileSync(`src/static/icons/pet-foods/${mode}-${state}-${name}.png`)
  assert.equal(bytes.readUInt32BE(16),192);assert.equal(bytes.readUInt32BE(20),192)
  for(let offset=8;offset<bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);assert.ok(!['caBX','eXIf','iTXt','tEXt','zTXt'].includes(type));offset+=length+12}
 }
})
