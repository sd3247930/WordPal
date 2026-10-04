import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {themePacks,contrast} from '../src/styles/themes'
test('四象正式资源与头像离线可用，不携带源凭证或隐私元数据',()=>{
 for(const element of ['water','fire','earth','wind'])for(const folder of ['', 'avatars/']){
  const data=fs.readFileSync('src/static/pets/'+folder+element+'.png')
  assert.equal(data.subarray(1,4).toString(),'PNG')
  const chunks:string[]=[];for(let offset=8;offset<data.length;){const size=data.readUInt32BE(offset);chunks.push(data.toString('ascii',offset+4,offset+8));offset+=12+size}
  for(const chunk of ['caBX','eXIf','tEXt','iTXt','zTXt'])assert.ok(!chunks.includes(chunk),element+': '+chunk)
  assert.ok(data.length<400000,element+' stays within the offline image budget')
 }
})
test('四象标签可读且夜读两种明暗都保留低眩光背景',()=>{
 for(const pack of Object.values(themePacks))for(const build of [pack.buildLight,pack.buildDark]){
  const t=build().tokens
  for(const element of ['water','fire','earth','wind'])assert.ok(contrast(t['element-'+element],t[element+'-soft'])>=4.5,pack.id+': '+element)
 }
 for(const build of [themePacks.oled.buildLight,themePacks.oled.buildDark]){
  const t=build().tokens;assert.ok(contrast(t.background,'#ffffff')>10);assert.ok(contrast(t.surface,'#ffffff')>10)
 }
})
