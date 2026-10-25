import type {CoursePack} from '../../../packages/content_schema/course'
import {safeRelativePath} from '../../../packages/content_schema/course'
import {sha256,sha256Async} from './digest'
import {importScheduler,reportImport,type ImportWork} from '../course-import/ImportTask'
import {strToU8,strFromU8} from 'fflate'
import {assertContentReadable,courseIdFromPackKey,isUserDeleted} from '../../../packages/content_schema/course-lifecycle'
const urls=new Map<string,string>()
const runtimePlatform=()=>{try{return uni.getSystemInfoSync().platform}catch{return 'test'}}
let androidRuntime:unknown,androidTypes:any
function androidFileTypes(){
 if(androidRuntime!==plus.android){const types=Object.fromEntries(['java.io.File','java.io.FileInputStream','java.io.FileOutputStream','android.util.Base64InputStream','java.nio.channels.Channels'].map(name=>[name.split('.').pop(),plus.android.importClass(name)]));androidRuntime=plus.android;androidTypes=types}
 return androidTypes
}
/** FileWriter transports a string once; native streams decode bytes without a Java -> JS -> Java array round trip. */
async function writeAndroidMedia(relative:string,bytes:Uint8Array,work?:ImportWork){
 const pause=importScheduler(work);await pause()
 const encoded=uni.arrayBufferToBase64(bytes.slice().buffer),name='wordpal-media-write-'+Date.now()+'-'+Math.random().toString(16).slice(2)+'.base64'
 const staged:any=await new Promise((resolve,reject)=>{
  const fail=()=>reject(new Error('课程资源暂存失败，请检查设备空间。'))
  plus.io.resolveLocalFileSystemURL('_doc/',(root:any)=>root.getFile(name,{create:true,exclusive:true},(entry:any)=>{
   const removeAndFail=()=>entry.remove(fail,fail)
   entry.createWriter((writer:any)=>{writer.onerror=removeAndFail;writer.onwriteend=()=>entry.file((file:any)=>{if(file.size!==encoded.length){removeAndFail();return}resolve(entry)},removeAndFail);try{writer.write(encoded)}catch{removeAndFail()}},removeAndFail)
  },fail),fail)
 })
 const native=plus.android,opened:any[]=[]
 try{
  await pause();const {File,FileInputStream,FileOutputStream,Base64InputStream,Channels}=androidFileTypes()
  const file=new File(plus.io.convertLocalFileSystemURL(relative));file.getParentFile().mkdirs()
  const input=new FileInputStream(plus.io.convertLocalFileSystemURL(staged.toLocalURL()));opened.push(input)
  const decoder=new Base64InputStream(input,0);opened.push(decoder)
  const output=new FileOutputStream(file);opened.push(output)
  const target=native.invoke(output,'getChannel'),source=Channels.newChannel(decoder);let written=0
  while(written<bytes.length){await pause();const count=Number((native.invoke as any)(target,'transferFrom',source,written,Math.min(256*1024,bytes.length-written)));if(!Number.isInteger(count)||count<=0)throw new Error('课程资源未完整写入。');written+=count}
  native.invoke(output,'flush')
 }finally{for(const stream of opened.reverse())try{native.invoke(stream,'close')}catch{}await new Promise<void>((resolve,reject)=>staged.remove(resolve,()=>reject(new Error('课程暂存文件清理失败，请检查设备空间。'))))}
}
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('wordpal-course-content',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files')};request.onerror=()=>reject(new Error('课程仓库无法打开。'));request.onsuccess=()=>resolve(request.result)})}
async function idbWrite(key:string,bytes:Uint8Array,connection?:IDBDatabase){const db=connection||await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(bytes,key);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('课程资源保存失败，可能已超出浏览器配额。'))})}finally{if(!connection)db.close()}}
async function idbRead(key:string,connection?:IDBDatabase){const db=connection||await openDb();try{return await new Promise<Uint8Array>((resolve,reject)=>{const r=db.transaction('files').objectStore('files').get(key);r.onsuccess=()=>r.result?resolve(new Uint8Array(r.result)):reject(new Error('课程资源不存在，请重新导入。'));r.onerror=()=>reject(new Error('课程资源无法读取。'))})}finally{if(!connection)db.close()}}
export async function nativeWrite(relative:string,bytes:Uint8Array,work?:ImportWork){
 const pause=importScheduler(work)
 if(runtimePlatform()==='android'){
  await writeAndroidMedia(relative,bytes,work)
 }else{
  await pause(true);const encoded=uni.arrayBufferToBase64(bytes.slice().buffer)
  const NSData=plus.ios.importClass('NSData'),NSFileManager=plus.ios.importClass('NSFileManager'),destination=plus.io.convertLocalFileSystemURL(relative)
  const dir=destination.slice(0,destination.lastIndexOf('/'));NSFileManager.defaultManager().createDirectoryAtPathWithIntermediateDirectoriesAttributesError(dir,true,null,null)
  const data=NSData.alloc().initWithBase64EncodedStringOptions(encoded,0);if(!data.writeToFileAtomically(destination,true))throw new Error('课程资源无法写入。');plus.ios.deleteObject(data)
 }
}
async function nativeRead(relative:string){return await new Promise<Uint8Array>((resolve,reject)=>plus.io.resolveLocalFileSystemURL(relative,(entry:any)=>entry.file((file:any)=>{const reader=new plus.io.FileReader();reader.onloadend=(event:any)=>{try{resolve(new Uint8Array(uni.base64ToArrayBuffer(event.target.result.split(',')[1])))}catch{reject(new Error('课程媒体损坏。'))}};reader.onerror=()=>reject(new Error('课程媒体读取失败。'));reader.readAsDataURL(file)},()=>reject(new Error('课程媒体无法读取。'))),()=>reject(new Error('课程媒体不存在。'))))}
function nativeRelative(key:string,path:string){return '_doc/wordpal/packs/'+key.replace(/[^a-z0-9-]/g,'-')+'/'+path}
export async function saveManifest(key:string,pack:CoursePack,work?:ImportWork){
 const bytes=strToU8(JSON.stringify(pack)),path='manifest.json'
 if(typeof plus!=='undefined'){await nativeWrite(nativeRelative(key,path),bytes,work);if(await sha256Async(await nativeRead(nativeRelative(key,path)),work)!==await sha256Async(bytes,work))throw new Error('课程正文读回校验失败。')}
 else if(typeof indexedDB!=='undefined'){await idbWrite(key+'/'+path,bytes);if(await sha256Async(await idbRead(key+'/'+path),work)!==await sha256Async(bytes,work))throw new Error('课程正文读回校验失败。')}
 else{const api=(globalThis as any).wx;if(api?.getFileSystemManager){const fs=api.getFileSystemManager(),dir=api.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-');try{fs.mkdirSync(dir,true)}catch{}fs.writeFileSync(dir+'/'+path,bytes.slice().buffer);if(sha256(new Uint8Array(fs.readFileSync(dir+'/'+path)))!==sha256(bytes))throw new Error('课程正文读回校验失败。')}}
}
export async function readManifest(key:string){const id=courseIdFromPackKey(key);if(id)assertContentReadable(id);if(typeof plus!=='undefined')return JSON.parse(strFromU8(await nativeRead(nativeRelative(key,'manifest.json')))) as CoursePack;if(typeof indexedDB!=='undefined')return JSON.parse(strFromU8(await idbRead(key+'/manifest.json'))) as CoursePack;const api=(globalThis as any).wx;if(api?.getFileSystemManager)return JSON.parse(strFromU8(new Uint8Array(api.getFileSystemManager().readFileSync(api.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-')+'/manifest.json')))) as CoursePack;return null}
export async function saveMedia(key:string,pack:CoursePack,files:Record<string,Uint8Array>,progress?:(completed:number,total:number)=>void,work?:ImportWork){
 let completed=0;const pause=importScheduler(work),connection=typeof plus==='undefined'&&typeof indexedDB!=='undefined'?await openDb():undefined
 reportImport(work,'saving',0,pack.assets.length);await pause(true)
 try{for(const asset of pack.assets){const bytes=files[asset.path];await pause();if(!safeRelativePath(asset.path)||!bytes||bytes.length!==asset.bytes||await sha256Async(bytes,work)!==asset.sha256)throw new Error('资源摘要与清单不一致。')
  if(typeof plus!=='undefined')await nativeWrite(nativeRelative(key,asset.path),bytes,work)
  else if(connection)await idbWrite(key+'/'+asset.path,bytes,connection)
  else{const api=(globalThis as any).wx;if(!api?.getFileSystemManager)throw new Error('当前环境不能持久保存媒体课程，可导入无媒体词表。');const fs=api.getFileSystemManager(),root=api.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-'),file=root+'/'+asset.path;try{fs.mkdirSync(file.slice(0,file.lastIndexOf('/')),true)}catch{}fs.writeFileSync(file,bytes.slice().buffer)}
  completed++;progress?.(completed,pack.assets.length);reportImport(work,'saving',completed,pack.assets.length)
 }}finally{connection?.close()}
}
export async function readMedia(key:string,pack:CoursePack,explicitInstallation=false,work?:ImportWork&{retainFiles?:boolean}){if(!explicitInstallation)assertContentReadable(pack.courseId);const files:Record<string,Uint8Array>={},pause=importScheduler(work),connection=typeof plus==='undefined'&&typeof indexedDB!=='undefined'?await openDb():undefined;let completed=0
 if(work)reportImport(work,'verifying',0,pack.assets.length)
 try{for(const asset of pack.assets){await pause()
 const bytes=typeof plus!=='undefined'?await nativeRead(nativeRelative(key,asset.path)):connection?await idbRead(key+'/'+asset.path,connection):new Uint8Array((globalThis as any).wx.getFileSystemManager().readFileSync((globalThis as any).wx.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-')+'/'+asset.path))
 if(bytes.length!==asset.bytes||await sha256Async(bytes,work)!==asset.sha256)throw new Error('媒体完整性检查未通过，请重新导入。');if(work?.retainFiles!==false)files[asset.path]=bytes
 if(typeof plus==='undefined'&&typeof indexedDB!=='undefined'){const urlKey=key+':'+asset.id;if(!urls.has(urlKey))urls.set(urlKey,URL.createObjectURL(new Blob([bytes.slice().buffer],{type:asset.mediaType})))}
 if(work)reportImport(work,'verifying',++completed,pack.assets.length)
 }return files}finally{connection?.close()}}
/** Bundled courses have asset handles but no imported-media catalog entry. */
export async function readBundledMedia(pack:CoursePack,resolve:(id:string)=>string){
 const files:Record<string,Uint8Array>={}
 for(const asset of pack.assets){
  const url=resolve(asset.id)
  if(!url.startsWith('/static/')||!safeRelativePath(url.slice(1)))throw new Error('课程媒体尚未就绪，请重新打开课程后再导出。')
  let bytes:Uint8Array
  if(typeof plus!=='undefined')bytes=await nativeRead('_www'+url)
  else if(typeof document!=='undefined'){
   const response=await fetch(new URL(url.slice(1),document.baseURI).href)
   if(!response.ok)throw new Error('课程媒体读取失败，请重新导入课程。')
   bytes=new Uint8Array(await response.arrayBuffer())
  }else{
   const fs=(globalThis as any).wx?.getFileSystemManager?.()
   if(!fs)throw new Error('当前环境无法读取课程媒体。')
   bytes=new Uint8Array(fs.readFileSync(url))
  }
  if(bytes.length!==asset.bytes||sha256(bytes)!==asset.sha256)throw new Error('媒体完整性检查未通过，请重新导入。')
  files[asset.path]=bytes
 }
 return files
}
export function mediaUrl(key:string,assetId:string,pack:CoursePack){if(isUserDeleted(pack.courseId))return '';const asset=pack.assets.find(a=>a.id===assetId);if(!asset)return '';if(typeof plus!=='undefined')return nativeRelative(key,asset.path);if(typeof indexedDB!=='undefined')return urls.get(key+':'+assetId)||'';const api=(globalThis as any).wx;return api?api.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-')+'/'+asset.path:''}
/** Enumerate only exact, validated version folders; similarly prefixed course IDs are separate owners. */
export async function storedMediaVersions(courseId:string):Promise<string[]>{
 if(!/^[a-z][a-z0-9-]*$/.test(courseId))throw new Error('教材标识不合法。')
 if(typeof plus!=='undefined')return new Promise((resolve,reject)=>plus.io.resolveLocalFileSystemURL('_doc/wordpal/packs/',(entry:any)=>{
  // HTML5+ returns the complete listing on every readEntries call.
  entry.createReader().readEntries((entries:any[])=>resolve(entries.filter(item=>new RegExp('^wordpal-content-pack-'+courseId+'-[a-f0-9]{16}$').test(item.name)).map(item=>'wordpal.content.pack.'+courseId+'.'+item.name.slice(-16))),()=>reject(new Error('教材资源目录读取失败。')))
 },()=>resolve([])))
 if(typeof indexedDB!=='undefined'){const db=await openDb();try{return await new Promise<string[]>((resolve,reject)=>{const request=db.transaction('files').objectStore('files').getAllKeys();request.onerror=()=>reject(new Error('教材资源目录读取失败。'));request.onsuccess=()=>resolve([...new Set(request.result.map(String).map(key=>key.split('/')[0]).filter(key=>courseIdFromPackKey(key)===courseId))])})}finally{db.close()}}
 const api=(globalThis as any).wx
 if(api?.getFileSystemManager){const fs=api.getFileSystemManager();let names:string[];try{names=fs.readdirSync(api.env.USER_DATA_PATH+'/wordpal')}catch{return []}return names.filter(name=>new RegExp('^wordpal-content-pack-'+courseId+'-[a-f0-9]{16}$').test(name)).map(name=>'wordpal.content.pack.'+courseId+'.'+name.slice(-16))}
 return []
}
export async function removeContentVersion(key:string,pack:Pick<CoursePack,'assets'>){
 if(!/^wordpal\.content\.pack\.[a-z][a-z0-9-]*\.[a-f0-9]{16}$/.test(key))throw new Error('课程清理标识不合法。')
 if(typeof plus!=='undefined')await new Promise<void>((resolve,reject)=>plus.io.resolveLocalFileSystemURL(nativeRelative(key,''),(entry:any)=>entry.removeRecursively(resolve,()=>reject(new Error('课程资源无法删除。'))),()=>resolve()))
 else if(typeof indexedDB!=='undefined'){const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite'),request=tx.objectStore('files').openCursor(IDBKeyRange.bound(key+'/',key+'/\uffff'));request.onsuccess=()=>{const cursor=request.result;if(cursor){cursor.delete();cursor.continue()}};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('课程资源无法删除。'))})}finally{db.close()}}
 else{const api=(globalThis as any).wx;if(api?.getFileSystemManager){const fs=api.getFileSystemManager(),dir=api.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-');try{fs.accessSync(dir)}catch{return}fs.rmdirSync(dir,true)}}
 for(const [id,handle] of urls)if(id.startsWith(key+':')){URL.revokeObjectURL(handle);urls.delete(id)}
 uni.removeStorageSync(key)
}
