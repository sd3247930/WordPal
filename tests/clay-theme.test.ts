import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {themePacks,contrast} from '../src/styles/themes'
import {petHouseStyle} from '../src/styles/pet-house'
import {phonicsColor} from '../src/styles/phonics'
import {friendlyNavNames} from '../src/services/friendly-nav-icons'

test('四象场景只注入粘土表面，瑞士默认调用保持兼容且不改场景配置',()=>{
 for(const scene of ['water','fire','earth','wind'] as const)for(const dark of [false,true]){
  assert.deepEqual(petHouseStyle(scene,dark),petHouseStyle(scene,dark,false,'swiss'))
  const tokens=themePacks.clay[dark?'buildDark':'buildLight']().tokens,style=petHouseStyle(scene,dark,false,'clay')
  assert.equal(style['--pet-radius'],'24px');assert.equal(style['--pet-bg'],tokens.background);assert.equal(style['--wp-primary'],tokens.primary);assert.equal(style['--pet-tonal'],tokens[scene+'-soft'])
  assert.equal(petHouseStyle(scene,dark,true,'clay')['--pet-border'],tokens.foreground)
 }
})

test('粘土拼读在真实奶油与可可底色可读，并保持红绿蓝教学色',()=>{
 for(const mode of ['light','dark'] as const)for(let index=0;index<3;index++){
  const clay=phonicsColor(index,'clay',mode,3),swiss=phonicsColor(index,'swiss',mode,3)
  assert.equal(clay.ink,swiss.ink);const channels=[1,3,5].map(offset=>parseInt(clay.active.slice(offset,offset+2),16));assert.equal(channels.indexOf(Math.max(...channels)),index);assert(contrast(clay.active,clay.soft)>=4.5)
 }
})

test('每个粘土导航与音频 PNG 回退均存在且不依赖私有素材',async()=>{
 for(const mode of ['light','dark']){
  for(const name of friendlyNavNames)for(const state of ['default','active','contrast'])assert((await fs.stat(`src/static/icons/nav/clay-${mode}-${state}-${name}.png`)).size>0)
  assert((await fs.stat(`src/static/icons/controls/clay-${mode}-speaker.png`)).size>0)
 }
})
