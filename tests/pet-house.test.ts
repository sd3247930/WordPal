import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {readFile} from 'node:fs/promises'
import {petHouseStyle,stageUnlocked} from '../src/styles/pet-house'
import {validPetScene} from '../src/stores/pet-house'
import {contrast} from '../src/styles/themes'
import {elements} from '../packages/pet_engine'

test('场景偏好允许四种 ID，损坏或旧数据回退不写学习数据',()=>{
 for(const id of elements)assert.equal(validPetScene(id),id)
 for(const value of [null,undefined,{},'unknown',1])assert.equal(validPetScene(value,'earth'),'earth')
})
test('相册只按真实等级解锁前三阶段，未知阶段保持锁定',()=>{
 for(const [level,expected]of [[1,[true,false,false,false]],[3,[true,false,false,false]],[4,[true,true,false,false]],[7,[true,true,false,false]],[8,[true,true,true,false]],[100,[true,true,true,false]]] as const)assert.deepEqual([0,1,2,3].map(i=>stageUnlocked({level},i)),expected)
 assert.equal(stageUnlocked({level:8},99),false)
})
test('四场景明暗与高对比文字和动作满足 AA',()=>{
 for(const id of elements)for(const dark of [false,true])for(const high of [false,true]){
  const t=petHouseStyle(id,dark,high)
  for(const [a,b]of [['pet-text','pet-bg'],['pet-text','pet-surface'],['pet-muted','pet-surface'],['pet-muted','pet-soft'],['pet-accent','pet-tonal'],['wp-on-primary','wp-primary']])assert.ok(contrast(t['--'+a],t['--'+b])>=4.5,`${id}/${dark}/${high}/${a}: ${contrast(t['--'+a],t['--'+b])}`)
 }
})
test('八个场景素材离线可用，透明通道有效且不含来源元数据',async()=>{
 for(const id of elements)for(const type of ['pet','scene']){
  const file=`src/static/pet-house/${id}-${type}.${type==='pet'?'png':'jpg'}`,buffer=await readFile(file),m=await sharp(buffer).metadata()
  assert.ok(!m.exif&&!m.xmp&&!m.iptc);assert.ok(!buffer.includes(Buffer.from('caBX')));assert.ok(!buffer.includes(Buffer.from('ChatGPT')))
  if(type==='pet'){assert.equal(m.hasAlpha,true);const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});let transparent=0,opaque=0;for(let i=3;i<data.length;i+=info.channels){if(data[i]===0)transparent++;if(data[i]>230)opaque++}assert.ok(transparent>data.length/info.channels*.15);assert.ok(opaque>data.length/info.channels*.2)}
  else{assert.equal(m.width,1024);assert.equal(m.hasAlpha,false)}
 }
})
