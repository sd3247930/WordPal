import type {CoursePack} from '../../../packages/content_schema/course'
import {safeRelativePath} from '../../../packages/content_schema/course'
import {sha256} from './digest'
import {strToU8,strFromU8} from 'fflate'
import {assertContentReadable,courseIdFromPackKey,isUserDeleted} from '../../../packages/content_schema/course-lifecycle'
const urls=new Map<string,string>()
const runtimePlatform=()=>{try{return uni.getSystemInfoSync().platform}catch{return 'test'}}
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('wordpal-course-content',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files')};request.onerror=()=>reject(new Error('课程仓库无法打开。'));request.onsuccess=()=>resolve(request.result)})}
async function idbWrite(key:string,bytes:Uint8Array){const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(bytes,key);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('课程资源保存失败，可能已超出浏览器配额。'))})}finally{db.close()}}
async function idbRead(key:string){const db=await openDb();try{return await new Promise<Uint8Array>((resolve,reject)=>{const r=db.transaction('files').objectStore('files').get(key);r.onsuccess=()=>r.result?resolve(new Uint8Array(r.result)):reject(new Error('课程资源不存在，请重新导入。'));r.onerror=()=>reject(new Error('课程资源无法读取。'))})}finally{db.close()}}
export async function nativeWrite(relative:string,bytes:Uint8Array){
 const encoded=uni.arrayBufferToBase64(bytes.slice().buffer)
 if(runtimePlatform()==='android'){
  const File=plus.android.importClass('java.io.File') as any,Output=plus.android.importClass('java.io.FileOutputStream') as any,Base64=plus.android.importClass('android.util.Base64') as any
  const file=new File(plus.io.convertLocalFileSystemURL(relative));file.getParentFile().mkdirs();const stream=new Output(file)
  try{stream.write(Base64.decode(encoded,0));stream.flush()}finally{stream.close()}
 }else{
  const NSData=plus.ios.importClass('NSData'),NSFileManager=plus.ios.importClass('NSFileManager'),destination=plus.io.convertLocalFileSystemURL(relative)
  const dir=destination.slice(0,destination.lastIndexOf('/'));NSFileManager.defaultManager().createDirectoryAtPathWithIntermediateDirectoriesAttributesError(dir,true,null,null)
  const data=NSData.alloc().initWithBase64EncodedStringOptions(encoded,0);if(!data.writeToFileAtomically(destination,true))throw new Error('课程资源无法写入。');plus.ios.deleteObject(data)
 }
}
async function nativeRead(relative:string){return await new Promise<Uint8Array>((resolve,reject)=>plus.io.resolveLocalFileSystemURL(relative,(entry:any)=>entry.file((file:any)=>{const reader=new plus.io.FileReader();reader.onloadend=(event:any)=>{try{resolve(new Uint8Array(uni.base64ToArrayBuffer(event.target.result.split(',')[1])))}catch{reject(new Error('课程媒体损坏。'))}};reader.onerror=()=>reject(new Error('课程媒体读取失败。'));reader.readAsDataURL(file)},()=>reject(new Error('课程媒体无法读取。'))),()=>reject(new Error('课程媒体不存在。'))))}
function nativeRelative(key:string,path:string){return '_doc/wordpal/packs/'+key.replace(/[^a-z0-9-]/g,'-')+'/'+path}
export async function saveManifest(key:string,pack:CoursePack){
 const bytes=strToU8(JSON.stringify(pack)),path='manifest.json'
 if(typeof plus!=='undefined'){await nativeWrite(nativeRelative(key,path),bytes);if(sha256(await nativeRead(nativeRelative(key,path)))!==sha256(bytes))throw new Error('课程正文读回校验失败。')}
 else if(typeof indexedDB!=='undefined'){await idbWrite(key+'/'+path,bytes);if(sha256(await idbRead(key+'/'+path))!==sha256(bytes))throw new Error('课程正文读回校验失败。')}
 else{const api=(globalThis as any).wx;if(api?.getFileSystemManager){const fs=api.getFileSystemManager(),dir=api.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-');try{fs.mkdirSync(dir,true)}catch{}fs.writeFileSync(dir+'/'+path,bytes.slice().buffer);if(sha256(new Uint8Array(fs.readFileSync(dir+'/'+path)))!==sha256(bytes))throw new Error('课程正文读回校验失败。')}}
}
export async function readManifest(key:string){const id=courseIdFromPackKey(key);if(id)assertContentReadable(id);if(typeof plus!=='undefined')return JSON.parse(strFromU8(await nativeRead(nativeRelative(key,'manifest.json')))) as CoursePack;if(typeof indexedDB!=='undefined')return JSON.parse(strFromU8(await idbRead(key+'/manifest.json'))) as CoursePack;const api=(globalThis as any).wx;if(api?.getFileSystemManager)return JSON.parse(strFromU8(new Uint8Array(api.getFileSystemManager().readFileSync(api.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-')+'/manifest.json')))) as CoursePack;return null}
export async function saveMedia(key:string,pack:CoursePack,files:Record<string,Uint8Array>,progress?:(completed:number,total:number)=>void){
 let completed=0
 for(const asset of pack.assets){const bytes=files[asset.path];if(!safeRelativePath(asset.path)||!bytes||bytes.length!==asset.bytes||sha256(bytes)!==asset.sha256)throw new Error('资源摘要与清单不一致。')
  if(typeof plus!=='undefined')await nativeWrite(nativeRelative(key,asset.path),bytes)
  else if(typeof indexedDB!=='undefined')await idbWrite(key+'/'+asset.path,bytes)
  else{const api=(globalThis as any).wx;if(!api?.getFileSystemManager)throw new Error('当前环境不能持久保存媒体课程，可导入无媒体词表。');const fs=api.getFileSystemManager(),root=api.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-'),file=root+'/'+asset.path;try{fs.mkdirSync(file.slice(0,file.lastIndexOf('/')),true)}catch{}fs.writeFileSync(file,bytes.slice().buffer)}
  progress?.(++completed,pack.assets.length)
 }
}
export async function readMedia(key:string,pack:CoursePack,explicitInstallation=false){if(!explicitInstallation)assertContentReadable(pack.courseId);const files:Record<string,Uint8Array>={};for(const asset of pack.assets){
 const bytes=typeof plus!=='undefined'?await nativeRead(nativeRelative(key,asset.path)):typeof indexedDB!=='undefined'?await idbRead(key+'/'+asset.path):new Uint8Array((globalThis as any).wx.getFileSystemManager().readFileSync((globalThis as any).wx.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-')+'/'+asset.path))
 if(bytes.length!==asset.bytes||sha256(bytes)!==asset.sha256)throw new Error('媒体完整性检查未通过，请重新导入。');files[asset.path]=bytes
 if(typeof plus==='undefined'&&typeof indexedDB!=='undefined'){const urlKey=key+':'+asset.id;if(!urls.has(urlKey))urls.set(urlKey,URL.createObjectURL(new Blob([bytes.slice().buffer],{type:asset.mediaType})))}
 }return files}
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
