import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import {createPinia,setActivePinia} from 'pinia'
import {useFeedbackStore} from '../src/stores/feedback'
import {settingsArtwork,settingsArtworkSrc,settingsHeaderArtwork,settingsThemePreviews} from '../src/services/settings-artwork'

test('十二枚设置图标为透明高清 PNG，无内容凭证、EXIF、文本等源元数据',async()=>{
 assert.equal(Object.keys(settingsArtwork).length,12)
 for(const name of Object.keys(settingsArtwork) as (keyof typeof settingsArtwork)[]){
  const data=await fs.readFile('src'+settingsArtworkSrc(name)),meta=await sharp(data).metadata()
  assert.equal(meta.width,256);assert.equal(meta.height,256);assert.equal(meta.hasAlpha,true)
  for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),kind=data.toString('ascii',offset+4,offset+8);assert(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(kind),name+':'+kind);offset+=length+12}
 }
 for(const [source,width,height,alpha]of [[settingsHeaderArtwork,768,464,true],[settingsThemePreviews.swiss!,768,512,false],[settingsThemePreviews.clay!,768,512,false]] as const){
  const data=await fs.readFile('src'+source),meta=await sharp(data).metadata()
  assert.equal(meta.width,width);assert.equal(meta.height,height);assert.equal(meta.hasAlpha,alpha)
  for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),kind=data.toString('ascii',offset+4,offset+8);assert(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(kind),source+':'+kind);offset+=length+12}
 }
})
test('声音触感保存失败有反馈，不污染其他存储，恢复写入后清除错误',()=>{
 const previous=(globalThis as any).uni,storage=new Map([['wordpal.feedback.v1',JSON.stringify({sound:true,haptics:false})],['wordpal.database.v2','unchanged-learning'],['wordpal.appearance.v1','unchanged-appearance']]);let fail=true
 ;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(fail)throw Error('Synthetic storage full');storage.set(key,value)}}
 try{
  setActivePinia(createPinia());const feedback=useFeedbackStore()
  assert.deepEqual(feedback.settings,{sound:true,haptics:false});assert.doesNotThrow(()=>feedback.settings.sound=false);assert.match(feedback.storageError,/暂时无法保存/)
  assert.deepEqual(JSON.parse(storage.get('wordpal.feedback.v1')!),{sound:true,haptics:false})
  fail=false;feedback.settings.sound=true;feedback.settings.sound=false;assert.equal(feedback.storageError,'');assert.deepEqual(JSON.parse(storage.get('wordpal.feedback.v1')!),{sound:false,haptics:false})
  assert.equal(storage.get('wordpal.database.v2'),'unchanged-learning');assert.equal(storage.get('wordpal.appearance.v1'),'unchanged-appearance')
 }finally{(globalThis as any).uni=previous}
})
test('真实应用 manifest 版本与项目发布版本一致',async()=>{
 const manifest=JSON.parse(await fs.readFile('src/manifest.json','utf8')),pkg=JSON.parse(await fs.readFile('package.json','utf8'))
 assert.equal(manifest.versionName,pkg.version);assert.match(manifest.versionName,/^\d+\.\d+\.\d+$/)
})
