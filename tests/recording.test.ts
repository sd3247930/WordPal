import {test} from 'node:test'
import assert from 'node:assert/strict'
import {bindNativeRecorder} from '../src/services/recording'

test('原生录音只注册一次监听，切页后丢弃旧结果并等待结束再开启',()=>{
 const callbacks:{start?:()=>void;stop?:(result:{tempFilePath:string})=>void;error?:()=>void}={}
 let registrations=0,stops=0,firstResults=0,secondResults=0
 const original=(globalThis as unknown as {uni:unknown}).uni
 ;(globalThis as unknown as {uni:unknown}).uni={getRecorderManager:()=>({
  onStart(fn:()=>void){callbacks.start=fn;registrations++},
  onStop(fn:(result:{tempFilePath:string})=>void){callbacks.stop=fn;registrations++},
  onError(fn:()=>void){callbacks.error=fn;registrations++},
  start(){callbacks.start?.()},stop(){stops++}
 })}
 try{
  const first=bindNativeRecorder({start(){},stop(){firstResults++},error(){}})
  const second=bindNativeRecorder({start(){},stop(){secondResults++},error(){}})
  assert.equal(registrations,3)
  assert.equal(first.start({duration:15000}),true)
  first.release();assert.equal(stops,1)
  assert.equal(second.start({duration:15000}),false)
  callbacks.stop?.({tempFilePath:'temporary-audio'});assert.equal(firstResults,0);assert.equal(secondResults,0)
  assert.equal(second.start({duration:15000}),true)
  callbacks.stop?.({tempFilePath:'temporary-audio'});assert.equal(secondResults,1)
  assert.equal(registrations,3)
 }finally{(globalThis as unknown as {uni:unknown}).uni=original}
})
