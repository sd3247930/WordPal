import test from 'node:test'
import assert from 'node:assert/strict'
import {readFeedbackSettings} from '../src/stores/feedback'
import {playWord,stopAudio} from '../src/services/audio'
import {successHaptic} from '../src/services/feedback'
import type {Word} from '../packages/core_learning'

test('关闭声音与触感后不创建音频或触发震动，旧安装保留默认值',()=>{
 let stored='',audioCreated=0,vibrations=0
 const original=(globalThis as any).uni
 ;(globalThis as any).uni={getStorageSync:()=>stored,createInnerAudioContext:()=>{audioCreated++;throw new Error('应当静音')},vibrateShort:()=>vibrations++}
 try{
  assert.deepEqual(readFeedbackSettings(),{sound:true,haptics:true})
  stored=JSON.stringify({sound:false,haptics:false})
  let message=''
  playWord({audio:'/static/audio/cat.wav'} as Word,error=>message=error)
  successHaptic(false)
  assert.equal(audioCreated,0);assert.equal(vibrations,0);assert.match(message,/发音已关闭/)
  stored=JSON.stringify({sound:false,haptics:true})
  successHaptic(true);assert.equal(vibrations,0)
  successHaptic(false);assert.equal(vibrations,1)
 }finally{stopAudio();(globalThis as any).uni=original}
})
