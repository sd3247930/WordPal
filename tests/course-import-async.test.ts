import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {zipSync,strToU8} from 'fflate'
import {sha256,sha256Async} from '../src/services/content/digest'
import {prepareImportAsync,previewImport,defaultImportMetadata} from '../src/services/course-import/ImportWizard'
import {readZipAsync,makeZip} from '../src/services/course-import/ZipImporter'
import {ImportCancelled,type ImportProgress} from '../src/services/course-import/ImportTask'
import {installMediaCourse,CATALOG_KEY} from '../src/services/content/StorageRepository'
import {courseRegistry,loadCourseRegistry} from '../src/services/content/ContentRegistry'
import type {Word} from '../packages/core_learning'
import type {CoursePack} from '../packages/content_schema/course'

function fixture(count=240){
 const files:Record<string,Uint8Array>={},pack:CoursePack={schemaVersion:2,courseId:'async-import-probe',contentVersion:'1.0.0',title:'合成异步验证课',route:'theme',abilityLevels:['L1'],sources:[{id:'synthetic',type:'author-created',rightsStatus:'private-use-declared',attribution:'自动测试合成数据'}],vocabulary:[],units:[{id:'u01',title:'合成单元',lessons:[{id:'l01',title:'合成课节',wordIds:[]}]}],assets:[]}
 for(let i=0;i<count;i++){const bytes=new Uint8Array(24*1024);bytes.set([137,80,78,71]);bytes[10]=i%256;const path='images/item-'+i+'.png',id='probe-'+i;files[path]=bytes;pack.assets.push({id,path,mediaType:'image/png',bytes:bytes.length,sha256:sha256(bytes),sourceId:'synthetic',license:'合成测试数据'});pack.vocabulary.push({id,language:'en',lemma:'item'+i,meaning:'合成条目'+i,pos:'n.',sourceId:'synthetic',assetRefs:{image:id}});pack.units[0].lessons[0].wordIds.push(id)}
 return {pack,files}
}
test('异步 SHA256 分片与标准摘要一致，期间定时器和取消可执行',async()=>{
 const bytes=new Uint8Array(5*1024*1024).fill(93);let ticks=0
 const timer=setInterval(()=>ticks++,1)
 try{assert.equal(await sha256Async(bytes),createHash('sha256').update(bytes).digest('hex'));assert.ok(ticks>0);let cancelled=false;setTimeout(()=>cancelled=true,0);await assert.rejects(sha256Async(bytes,{cancelled:()=>cancelled}),ImportCancelled)}finally{clearInterval(timer)}
})
test('2000 词匹配只读取一次已有词库，同义复用、ID 冲突及 CSV 引号保持一致',async()=>{
 let reads=0;const existing:Record<string,Word>={}
 for(let i=0;i<12000;i++){const word={id:'old-'+i,word:'item'+i,meaning:'条目'+i,pos:'n.'} as Word;Object.defineProperty(existing,word.id,{enumerable:true,get(){reads++;return word}})}
 const text='word,meaning,pos\n'+Array.from({length:2000},(_,i)=>'item'+i+',条目'+i+',n.').join('\n')
 const phases=new Set<string>();let ticks=0;const timer=setInterval(()=>ticks++,1)
 try{const result=await prepareImportAsync(text,'csv',true,existing,'合成词表.csv',{}, {onProgress:p=>phases.add(p.phase)});assert.equal(result.preview.newCount,0);assert.equal(Object.keys(result.preview.reuse).length,2000);assert.ok(reads<=14000,'不得为每条导入词重建 Object.values');assert.ok(ticks>0);assert.ok(phases.has('indexing'));assert.ok(phases.has('ready'))}finally{clearInterval(timer)}
 const sample='word,meaning,pos\n"quartz, crystal","石英\n晶体",n.'
 const asyncResult=await prepareImportAsync(sample,'csv',false,{},'')
 const sync=previewImport(sample,'csv',asyncResult.meta,{})
 assert.deepEqual(asyncResult.preview,sync)
 const conflict='word_id,word,meaning,pos\nold-1,item1,另一词义,n.'
 assert.ok((await prepareImportAsync(conflict,'csv',false,existing)).preview.issues.some(i=>i.field==='id'))
})
test('流式 ZIP 处理数百资源时可响应定时器，保留路径、清单、格式、摘要与大小限制',async()=>{
 const {pack,files}=fixture(),zip=makeZip(pack,files),events:ImportProgress[]=[];let ticks=0;const timer=setInterval(()=>ticks++,1)
 try{const result=await readZipAsync(zip,{onProgress:p=>events.push(p)});assert.deepEqual(result.pack,pack);assert.equal(Object.keys(result.files).length,240);assert.ok(ticks>0);assert.ok(events.filter(p=>p.phase==='unpacking').length>1);assert.equal(events.at(-1)?.completed,240*24*1024)}finally{clearInterval(timer)}
 for(const name of ['../escape.png','extra.js','extra.png'])await assert.rejects(readZipAsync(zipSync({'manifest.json':strToU8(JSON.stringify(pack)),[name]:new Uint8Array([1])})))
 const broken={...files,[pack.assets[0].path]:files[pack.assets[0].path].slice()};broken[pack.assets[0].path][100]^=1;await assert.rejects(readZipAsync(makeZip(pack,broken)),/SHA256/)
 const badSignature={...files,[pack.assets[0].path]:new Uint8Array(files[pack.assets[0].path].length)};const badPack=structuredClone(pack);badPack.assets[0].sha256=sha256(badSignature[pack.assets[0].path]);await assert.rejects(readZipAsync(makeZip(badPack,badSignature)),/格式/)
 let cancelled=false;await assert.rejects(readZipAsync(zip,{cancelled:()=>cancelled,onProgress:p=>{if(p.phase==='unpacking'&&p.completed>0)cancelled=true}}),ImportCancelled)
})
test('保存/读回/提交均有真实进度，取消或读回失败不会激活课程，候选资源被清理',async()=>{
 const storage=new Map<string,string>(),disk=new Map<string,ArrayBuffer>();let corrupt=false
 ;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>storage.set(key,value),removeStorageSync:(key:string)=>storage.delete(key)}
 ;(globalThis as any).wx={env:{USER_DATA_PATH:'test-data'},getFileSystemManager:()=>({mkdirSync(){},writeFileSync:(path:string,data:ArrayBuffer)=>disk.set(path,data.slice(0)),readFileSync:(path:string)=>{const data=disk.get(path);if(!data)throw new Error('missing');const bytes=data.slice(0);if(corrupt&&path.endsWith('.png'))new Uint8Array(bytes)[12]^=1;return bytes},accessSync:(path:string)=>{if(![...disk.keys()].some(key=>key.startsWith(path+'/')))throw new Error('missing')},rmdirSync:(path:string)=>{for(const key of disk.keys())if(key.startsWith(path+'/'))disk.delete(key)}})}
 loadCourseRegistry();const {pack,files}=fixture(40)
 try{
  for(const phase of ['saving','verifying','committing']){let cancelled=false;await assert.rejects(installMediaCourse(pack,files,{},undefined,{cancelled:()=>cancelled,onProgress:p=>{if(p.phase===phase)cancelled=true}}),ImportCancelled);assert.equal(storage.has(CATALOG_KEY),false);assert.equal(courseRegistry[pack.courseId],undefined);assert.equal(disk.size,0)}
  corrupt=true;await assert.rejects(installMediaCourse(pack,files),/完整性/);assert.equal(storage.has(CATALOG_KEY),false);assert.equal(disk.size,0)
  corrupt=false;const events:ImportProgress[]=[];await installMediaCourse(pack,files,{},undefined,{onProgress:p=>events.push(p)});assert.ok(events.some(p=>p.phase==='saving'&&p.completed===40));assert.ok(events.some(p=>p.phase==='verifying'&&p.completed===40));assert.equal(events.at(-1)?.phase,'done');assert.equal(JSON.parse(storage.get(CATALOG_KEY)!).length,1)
 }finally{delete (globalThis as any).wx}
})
