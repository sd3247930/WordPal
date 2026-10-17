import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import sharp from 'sharp'
import {createPet,growPet,feedPet,applyLearningReward,elements} from '../packages/pet_engine'
import type {Answer} from '../packages/core_learning'
import {petStatusMetrics,safePetPercent,petStatusNames} from '../src/services/pet-status'
import {petStatusIconSource} from '../src/services/pet-status-icons'

test('状态百分比保留未知与零的区别，处理边界、小数和异常分母',()=>{
 for(const [value,max,want] of [[0,100,0],[1,100,1],[50,100,50],[99,100,99],[100,100,100],[-1,100,0],[150,100,100],[1,8,12.5],[null,100,null],[undefined,100,null],[NaN,100,null],[Infinity,100,null],[20,0,null],[20,-1,null],[20,Infinity,null],[20,NaN,null]] as const)assert.equal(safePetPercent(value,max),want)
})
test('四项状态只读映射当前精灵；没有数字情绪时不编造、不重复映射 mood',()=>{
 for(const element of elements)for(const mood of ['calm','happy','excited','curious'] as const){
  const pet={...createPet(element),exp:398,level:4,affection:73,mood},before=JSON.stringify(pet),metrics=petStatusMetrics(pet)
  assert.deepEqual(metrics.map(m=>m.id),petStatusNames);assert.deepEqual(metrics.map(m=>m.value),[null,null,98,73]);assert.equal(metrics[0].display,mood==='excited'?'兴奋中':'暂无数值');assert.equal(metrics[1].display,mood==='happy'?'开心中':'暂无数值');assert.match(metrics[2].note,/2 经验/);assert.match(metrics[2].explanation,/398/);assert.equal(JSON.stringify(pet),before)
  assert.ok(petStatusMetrics(pet,true).every(m=>m.value===null))
 }
 const invalid=petStatusMetrics({...createPet('water'),exp:NaN,affection:101});assert.ok(invalid.every(m=>m.value===null))
})
test('现有成长、喂食和奖励防重更新后投影准确，不修改算法和历史档案',()=>{
 const pet={...createPet('water'),exp:99,level:1,affection:99},grown=growPet(pet,{source:'new_word',exp:12,affection:2},1),m=petStatusMetrics(grown)
 assert.equal(grown.level,2);assert.equal(m[2].value,11);assert.equal(m[3].value,100);assert.equal(m[0].display,'兴奋中');assert.equal(pet.exp,99)
 const fed=feedPet(pet,10,'2026-10-17');assert.equal(petStatusMetrics(fed.pet)[1].display,'开心中');assert.equal(petStatusMetrics(fed.pet)[2].value,99);assert.equal(petStatusMetrics(fed.pet)[3].value,100);assert.equal(feedPet(fed.pet,fed.gems,'2026-10-17').success,false)
 const answer:Answer={id:'status-reward',wordId:'cat',rating:3,correct:true,at:'2026-10-17T08:00:00Z',source:'new_word',mode:'flash',input:''},db={pets:{water:pet},companion:'water',rewardIds:[] as string[],gems:0,history:[answer]};applyLearningReward(db,answer);const after=JSON.stringify(db);petStatusMetrics(db.pets.water);applyLearningReward(db,answer);assert.equal(JSON.stringify(db),after)
})
test('状态图标为独立高清透明资源，高对比版本与公开PNG均不含源图元数据',async()=>{
 const seen=new Set<string>()
 for(const name of petStatusNames)for(const contrast of [false,true])for(const dark of contrast?[false,true]:[false]){
  const source=petStatusIconSource(name,contrast,dark);assert.ok(!seen.has(source));seen.add(source)
  const data=await readFile('src'+source),meta=await sharp(data).metadata();assert.equal(meta.width,contrast?256:1024);assert.equal(meta.height,meta.width);assert.equal(meta.hasAlpha,true);assert.ok(!meta.exif&&!meta.icc&&!meta.xmp)
  for(let offset=8;offset<data.length;){const size=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);assert.ok(!['caBX','eXIf','iTXt','tEXt','zTXt'].includes(type));offset+=size+12}
 }
})
