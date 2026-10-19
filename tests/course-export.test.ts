import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPinia,setActivePinia} from 'pinia'
import {loadCourseRegistry,configureLocalCourses,courseRegistry} from '../src/services/content/ContentRegistry'
import {installTextCourse,exportCourse} from '../src/services/content/StorageRepository'
import {readBundledMedia} from '../src/services/content/MediaRepository'
import {sha256} from '../src/services/content/digest'
import {makeZip,readZip} from '../src/services/course-import/ZipImporter'
import {lifecyclePack} from './helpers/lifecycle-fixture'

const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(k:string)=>storage.get(k)||'',setStorageSync:(k:string,v:string)=>storage.set(k,v),removeStorageSync:(k:string)=>storage.delete(k)}
function reset(){storage.clear();configureLocalCourses([]);setActivePinia(createPinia());loadCourseRegistry()}
function privatePack(){const p=lifecyclePack('export-local');p.sources[0].rightsStatus='private-use-declared';return p}

// 本机导出允许课程备份，来源授权不升级，也不把学习档案混进课程包。
test('本地课程导出可重新导入，保留本机声明且不读取或更改个人记录',async()=>{
 reset();const p=privatePack();await installTextCourse(p)
 storage.set('wordpal.synthetic-profile',JSON.stringify({cards:{shared:{reps:3}},history:['private'],gems:17}))
 const before=JSON.stringify([...storage]),{pack,files}=await exportCourse(p.courseId,{purpose:'local-backup'})
 const parsed=readZip(makeZip(pack,files))
 assert.equal(parsed.pack.sources[0].rightsStatus,'private-use-declared')
 assert.deepEqual(parsed.pack.vocabulary,p.vocabulary)
 assert.equal('cards' in parsed.pack,false);assert.equal('history' in parsed.pack,false)
 assert.equal(JSON.stringify([...storage]),before)
 pack.title='仅更改返回副本';assert.notEqual(courseRegistry[p.courseId].title,pack.title)
})

test('本地备份授权不会绕过公开课程导出的来源许可检查',async()=>{
 reset();const p=privatePack();await installTextCourse(p)
 await assert.rejects(exportCourse(p.courseId),/本机.*公开/)
 await assert.rejects(exportCourse(p.courseId,{purpose:'public'}),/本机.*公开/)
 assert.equal(courseRegistry[p.courseId].sources[0].rightsStatus,'private-use-declared')
})

test('随包课程无导入目录条目时，仍按资源句柄导出完整音频并保持摘要',async()=>{
 reset();const p=privatePack(),bytes=new Uint8Array(readFileSync('src/static/audio/cat.wav'))
 p.assets=[{id:'fixture-audio',path:'audio/fixture.wav',mediaType:'audio/wav',bytes:bytes.length,sha256:sha256(bytes),sourceId:p.sources[0].id,license:'合成课程本机测试'}]
 p.vocabulary[0].assetRefs={audio:'fixture-audio'}
 configureLocalCourses([p]);loadCourseRegistry()
 const previousDocument=(globalThis as any).document,previousFetch=globalThis.fetch
 ;(globalThis as any).document={baseURI:'https://example.test/WordPal/'}
 let requested=''
 globalThis.fetch=(async(input:any)=>{requested=String(input);return new Response(bytes.slice().buffer)}) as typeof fetch
 try{
  const {pack,files}=await exportCourse(p.courseId,{purpose:'local-backup'})
  assert.equal(requested,'https://example.test/WordPal/static/local-master-audio/fixture.wav')
  assert.equal(sha256(files['audio/fixture.wav']),sha256(bytes))
  assert.equal(readZip(makeZip(pack,files)).pack.assets.length,1)
 }finally{globalThis.fetch=previousFetch;if(previousDocument===undefined)delete (globalThis as any).document;else (globalThis as any).document=previousDocument;configureLocalCourses([])}
})

test('随包媒体导出拒绝外部地址、缺失资源与摘要不符，不生成不完整课程包',async()=>{
 reset();const p=privatePack(),bytes=new Uint8Array([1,2,3])
 p.assets=[{id:'fixture-audio',path:'audio/fixture.mp3',mediaType:'audio/mpeg',bytes:3,sha256:sha256(bytes),sourceId:p.sources[0].id,license:'合成测试'}]
 await assert.rejects(readBundledMedia(p,()=>''),/尚未就绪/)
 await assert.rejects(readBundledMedia(p,()=> 'https://example.test/audio.mp3'),/尚未就绪/)
 const previousDocument=(globalThis as any).document,previousFetch=globalThis.fetch
 ;(globalThis as any).document={baseURI:'https://example.test/'}
 try{
  globalThis.fetch=(async()=>new Response(null,{status:404})) as typeof fetch
  await assert.rejects(readBundledMedia(p,()=>'/static/missing.mp3'),/读取失败/)
  globalThis.fetch=(async()=>new Response(new Uint8Array([9,2,3]))) as typeof fetch
  await assert.rejects(readBundledMedia(p,()=>'/static/fixture.mp3'),/完整性/)
 }finally{globalThis.fetch=previousFetch;if(previousDocument===undefined)delete (globalThis as any).document;else (globalThis as any).document=previousDocument}
})
