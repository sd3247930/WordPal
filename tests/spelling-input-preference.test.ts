import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {spellingInputPreferenceKey,useSpellingInputStore} from '../src/stores/spelling-input'

const storage=new Map<string,string>()
let rejectWrite=false
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(rejectWrite)throw Error('quota');storage.set(key,value)}}
function reload(){setActivePinia(createPinia());return useSpellingInputStore()}

test('未选择时遵循原有默认；选择后冷启动和不同入口默认均遵循最近偏好',()=>{
 storage.clear();const first=reload();assert.equal(first.preferred(false),'keyboard');assert.equal(first.preferred(true),'tiles');assert.equal(storage.has(spellingInputPreferenceKey),false)
 first.select('tiles');const second=reload();assert.equal(second.preferred(false),'tiles');second.select('keyboard');const third=reload();assert.equal(third.preferred(true),'keyboard')
})
test('损坏或未知偏好不会阻止练习，新的选择可以覆盖无效值',()=>{
 for(const raw of ['broken','null','{}','"unknown"']){storage.set(spellingInputPreferenceKey,raw);const preferences=reload();assert.equal(preferences.mode,null);assert.equal(preferences.preferred(false),'keyboard');preferences.select('tiles');assert.equal(reload().preferred(false),'tiles')}
})
test('存储写入失败不阻止本次沿用，恢复空间后可保存且不改学习档案',()=>{
 storage.clear();storage.set('wordpal.database.v2','{"gems":5,"history":[]}');const preferences=reload();rejectWrite=true
 try{preferences.select('tiles');assert.equal(preferences.preferred(false),'tiles');assert(preferences.storageError)}finally{rejectWrite=false}
 preferences.select('tiles');assert.equal(preferences.storageError,'');assert.equal(reload().preferred(false),'tiles');assert.equal(storage.get('wordpal.database.v2'),'{"gems":5,"history":[]}')
})
