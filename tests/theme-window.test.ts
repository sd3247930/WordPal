import test from 'node:test'
import assert from 'node:assert/strict'
import {themePacks,contrast} from '../src/styles/themes'
import {classifyWindow,businessLayout} from '../src/services/window'
test('瑞士主题两种明暗的正文、辅助文字和动作满足 AA',()=>{
 for(const pack of Object.values(themePacks))for(const build of [pack.buildLight,pack.buildDark]){
  const t=build().tokens
  for(const [a,b] of [['foreground','background'],['surface-foreground','surface'],['muted-foreground','surface'],['muted-foreground','muted'],['on-primary','primary'],['on-danger','danger']])assert.ok(contrast(t[a],t[b])>=4.5,`${pack.id}: ${a}/${b} ${contrast(t[a],t[b])}`)
 }
})
test('五档窗口边界映射且保持 Medium rail',()=>{
 assert.deepEqual([599,600,839,840,1199,1200,1599,1600].map(classifyWindow),['compact','medium','medium','expanded','expanded','large','large','extraLarge'])
 assert.equal(businessLayout(600),'tablet');assert.equal(businessLayout(1600),'widePlus')
})
test('仅提供瑞士与粘土双主题，瑞士仍保留清晰边界和无阴影',()=>{
 assert.deepEqual(Object.keys(themePacks),['swiss','clay'])
 assert.equal(themePacks.swiss.name,'瑞士专注主题')
 assert.equal(themePacks.swiss.petRenderer,'avatar')
 for(const build of [themePacks.swiss.buildLight,themePacks.swiss.buildDark]){
  const t=build().tokens
  assert.equal(t.radius,'10px');assert.equal(t.elevation,'none');assert.equal(t['card-border'],'1px')
  assert.equal(t['surface-tonal'],t['surface-soft']);assert.equal(t['primary-foreground'],t['on-primary'])
 }
})

test('粘土明暗都有圆润实体表面，色板与瑞士独立',()=>{
 for(const build of [themePacks.clay.buildLight,themePacks.clay.buildDark]){
  const t=build().tokens;assert.equal(t.radius,'24px');assert.equal(t['radius-sm'],'18px');assert.notEqual(t.elevation,'none');assert(t['clay-task']);assert(t['clay-pressed']);assert.equal(t['surface-tonal'],t['surface-soft'])
 }
})
