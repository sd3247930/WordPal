import test from 'node:test'
import assert from 'node:assert/strict'
import {themePacks,contrast} from '../src/styles/themes'
import {classifyWindow,businessLayout} from '../src/services/window'
test('四主题两种明暗的正文、辅助文字和动作满足 AA',()=>{
 for(const pack of Object.values(themePacks))for(const build of [pack.buildLight,pack.buildDark]){
  const t=build().tokens
  for(const [a,b] of [['foreground','background'],['surface-foreground','surface'],['muted-foreground','surface'],['muted-foreground','muted'],['on-primary','primary'],['on-danger','danger']])assert.ok(contrast(t[a],t[b])>=4.5,`${pack.id}: ${a}/${b} ${contrast(t[a],t[b])}`)
 }
})
test('五档窗口边界映射且保持 Medium rail',()=>{
 assert.deepEqual([599,600,839,840,1199,1200,1599,1600].map(classifyWindow),['compact','medium','medium','expanded','expanded','large','large','extraLarge'])
 assert.equal(businessLayout(600),'tablet');assert.equal(businessLayout(1600),'widePlus')
})
test('四套视觉人格具有独立圆角、阴影、背景和宠物变体',()=>{
 const packs=Object.values(themePacks),tokens=packs.map(p=>p.buildLight().tokens)
 assert.equal(new Set(tokens.map(t=>t.radius)).size,4)
 assert.equal(new Set(tokens.map(t=>t.background)).size,4)
 assert.equal(themePacks.swiss.petRenderer,'avatar');assert.equal(tokens[1].elevation,'none')
 assert.equal(tokens[2]['card-border'],'0px');assert.notEqual(tokens[0].elevation,tokens[2].elevation)
 for(const t of tokens){assert.equal(t['surface-tonal'],t['surface-soft']);assert.equal(t['primary-foreground'],t['on-primary'])}
})
