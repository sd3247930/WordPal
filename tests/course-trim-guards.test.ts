import test from 'node:test'
import assert from 'node:assert/strict'
import {trimCourseSource} from '../src/services/course/CourseSourceTrimmer'
import {useBundledFixture} from './support/bundled-fixture'

const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)??'',setStorageSync:(key:string,data:string)=>void storage.set(key,data)}

test('未卸载拒绝裁剪：starter 与仍在注册表的随包课程',async()=>{
 storage.clear()
 const starter=await trimCourseSource('starter')
 assert.equal(starter.ok,false)
 assert.match(starter.message,/先逐册卸载/)
 const bundled=await trimCourseSource(useBundledFixture('bundled-trim-guard').courseId)
 assert.equal(bundled.ok,false)
 assert.match(bundled.message,/先逐册卸载/)
})

test('仍在安装目录中的册拒绝裁剪，且不改动安装目录',async()=>{
 storage.clear()
 storage.set('wordpal.content.catalog.v2',JSON.stringify([{courseId:'imported-demo',key:'k'}]))
 const result=await trimCourseSource('imported-demo')
 assert.equal(result.ok,false)
 assert.match(result.message,/先逐册卸载/)
 assert.equal(JSON.parse(storage.get('wordpal.content.catalog.v2')!).length,1)
})
