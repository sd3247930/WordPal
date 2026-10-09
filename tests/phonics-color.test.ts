import test from 'node:test'
import assert from 'node:assert/strict'
import {getPhonicsColor,phonicsColor,SIGNAL_COLORS} from '../src/styles/phonics'

const LEGACY=['#B74444','#29784B','#3069B4','#A34A4A','#376F4E','#466897']

test('音块配色：整词/单块为蓝，2 块红绿，3 块红绿蓝，4 块循环回红',()=>{
 assert.equal(getPhonicsColor(0,1),'blue')
 assert.equal(getPhonicsColor(0,0),'blue')
 assert.deepEqual([0,1].map(index=>getPhonicsColor(index,2)),['red','green'])
 assert.deepEqual([0,1,2].map(index=>getPhonicsColor(index,3)),['red','green','blue'])
 assert.deepEqual([0,1,2,3].map(index=>getPhonicsColor(index,4)),['red','green','blue','red'])
})

test('信号灯三色常量与色板不再使用旧深色调，ink 与 active 始终区分',()=>{
 assert.deepEqual(Object.values(SIGNAL_COLORS),['#E53935','#43A047','#1E88E5'])
 for(const theme of ['bento','swiss','soft','oled'] as const)for(const mode of ['light','dark'] as const)for(let index=0;index<3;index++){
  const tone=phonicsColor(index,theme,mode,3)
  assert.notEqual(tone.ink,tone.active)
  for(const hex of [tone.ink,tone.active])assert.ok(!LEGACY.includes(hex),theme+' '+mode+' '+hex)
 }
})

test('四主题的信号灯顺序一致：第 1 块红、第 2 块绿、第 3 块蓝',()=>{
 for(const theme of ['bento','swiss','soft','oled'] as const)for(const mode of ['light','dark'] as const){
  const tones=[0,1,2].map(index=>phonicsColor(index,theme,mode,3).ink)
  const maxChannel=tones.map(hex=>[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)).indexOf(Math.max(...[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)))))
  assert.deepEqual(maxChannel,[0,1,2],theme+' '+mode)
 }
})
