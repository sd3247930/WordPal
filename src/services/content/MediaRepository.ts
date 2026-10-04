import type {CoursePack} from '../../../packages/content_schema/course'
import {safeRelativePath} from '../../../packages/content_schema/course'
import {sha256} from './digest'
import {strToU8,strFromU8} from 'fflate'
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
export async function readManifest(key:string){if(typeof plus!=='undefined')return JSON.parse(strFromU8(await nativeRead(nativeRelative(key,'manifest.json')))) as CoursePack;if(typeof indexedDB!=='undefined')return JSON.parse(strFromU8(await idbRead(key+'/manifest.json'))) as CoursePack;const api=(globalThis as any).wx;if(api?.getFileSystemManager)return JSON.parse(strFromU8(new Uint8Array(api.getFileSystemManager().readFileSync(api.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-')+'/manifest.json')))) as CoursePack;return null}
export async function saveMedia(key:string,pack:CoursePack,files:Record<string,Uint8Array>,progress?:(completed:number,total:number)=>void){
 let completed=0
 for(const asset of pack.assets){const bytes=files[asset.path];if(!safeRelativePath(asset.path)||!bytes||bytes.length!==asset.bytes||sha256(bytes)!==asset.sha256)throw new Error('资源摘要与清单不一致。')
  if(typeof plus!=='undefined')await nativeWrite(nativeRelative(key,asset.path),bytes)
  else if(typeof indexedDB!=='undefined')await idbWrite(key+'/'+asset.path,bytes)
  else{const api=(globalThis as any).wx;if(!api?.getFileSystemManager)throw new Error('当前环境不能持久保存媒体课程，可导入无媒体词表。');const fs=api.getFileSystemManager(),root=api.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-'),file=root+'/'+asset.path;try{fs.mkdirSync(file.slice(0,file.lastIndexOf('/')),true)}catch{}fs.writeFileSync(file,bytes.slice().buffer)}
  progress?.(++completed,pack.assets.length)
 }
}
export async function readMedia(key:string,pack:CoursePack){const files:Record<string,Uint8Array>={};for(const asset of pack.assets){
 const bytes=typeof plus!=='undefined'?await nativeRead(nativeRelative(key,asset.path)):typeof indexedDB!=='undefined'?await idbRead(key+'/'+asset.path):new Uint8Array((globalThis as any).wx.getFileSystemManager().readFileSync((globalThis as any).wx.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-')+'/'+asset.path))
 if(bytes.length!==asset.bytes||sha256(bytes)!==asset.sha256)throw new Error('媒体完整性检查未通过，请重新导入。');files[asset.path]=bytes
 if(typeof plus==='undefined'&&typeof indexedDB!=='undefined'){const urlKey=key+':'+asset.id;if(!urls.has(urlKey))urls.set(urlKey,URL.createObjectURL(new Blob([bytes.slice().buffer],{type:asset.mediaType})))}
 }return files}
export function mediaUrl(key:string,assetId:string,pack:CoursePack){const asset=pack.assets.find(a=>a.id===assetId);if(!asset)return '';if(typeof plus!=='undefined')return nativeRelative(key,asset.path);if(typeof indexedDB!=='undefined')return urls.get(key+':'+assetId)||'';const api=(globalThis as any).wx;return api?api.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-')+'/'+asset.path:''}
export async function removeContentVersion(key:string,pack:CoursePack){
 if(!/^wordpal\.content\.pack\.[a-z][a-z0-9-]*\.[a-f0-9]{16}$/.test(key))throw new Error('课程清理标识不合法。')
 if(typeof plus!=='undefined')await new Promise<void>((resolve,reject)=>plus.io.resolveLocalFileSystemURL(nativeRelative(key,''),(entry:any)=>entry.removeRecursively(resolve,()=>reject(new Error('课程资源无法删除。'))),()=>resolve()))
 else if(typeof indexedDB!=='undefined'){const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');for(const path of ['manifest.json',...pack.assets.map(a=>a.path)])tx.objectStore('files').delete(key+'/'+path);tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('课程资源无法删除。'))})}finally{db.close()}}
 else{const api=(globalThis as any).wx;if(api?.getFileSystemManager){const fs=api.getFileSystemManager(),dir=api.env.USER_DATA_PATH+'/wordpal/'+key.replace(/[^a-z0-9-]/g,'-');try{fs.accessSync(dir)}catch{return}fs.rmdirSync(dir,true)}}
 for(const a of pack.assets){const handle=urls.get(key+':'+a.id);if(handle)URL.revokeObjectURL(handle);urls.delete(key+':'+a.id)}
 uni.removeStorageSync(key)
}
