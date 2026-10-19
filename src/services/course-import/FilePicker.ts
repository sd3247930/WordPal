import {strToU8} from 'fflate'
import {nativeWrite} from '../content/MediaRepository'
import {sha256} from '../content/digest'
export interface PickedCourseFile {name:string;bytes:Uint8Array}
export function canPickCourseFile(){
 // #ifdef H5
 return typeof document!=='undefined'
 // #endif
 // #ifndef H5
 if(typeof plus!=='undefined')return uni.getSystemInfoSync().platform==='android'
 return !!(globalThis as any).wx?.chooseMessageFile
 // #endif
}
export async function pickCourseFile():Promise<PickedCourseFile|null>{
 // #ifdef H5
 if(typeof document!=='undefined')return new Promise((resolve,reject)=>{const input=document.createElement('input');input.type='file';input.accept='.json,.csv,.md,.zip';input.style.display='none';document.body.appendChild(input);const clean=()=>input.remove();input.oncancel=()=>{clean();resolve(null)};input.onchange=async()=>{try{const file=input.files?.[0];if(!file){resolve(null);return}if(file.size>50*1024*1024)throw new Error('文件超过 50 MiB。');resolve({name:file.name,bytes:new Uint8Array(await file.arrayBuffer())})}catch(error){reject(error)}finally{clean()}};input.click()})
 // #endif
 // #ifndef H5
 if(typeof plus!=='undefined'){
  if(uni.getSystemInfoSync().platform!=='android')throw new Error('此平台文件选择尚待真机验证，请粘贴 JSON 或 CSV。')
  return new Promise((resolve,reject)=>{
   const activity=plus.android.runtimeMainActivity() as any,Intent=plus.android.importClass('android.content.Intent') as any,requestCode=7314,previous=(activity as any).onActivityResult
   const restore=()=>{(activity as any).onActivityResult=previous}
   ;(activity as any).onActivityResult=(request:number,result:number,data:any)=>{
    if(request!==requestCode){previous?.(request,result,data);return}restore();if(result!==-1||!data){resolve(null);return}
    try{const uri=plus.android.invoke(data,'getData'),resolver=plus.android.invoke(activity,'getContentResolver')
     const bytes=readAndroidDocument(activity,resolver,uri)
     let name='course.json';const cursor=(plus.android.invoke as any)(resolver,'query',uri,null,null,null,null);if(cursor){try{if(plus.android.invoke(cursor,'moveToFirst')){const column=plus.android.invoke(cursor,'getColumnIndex','_display_name');if(column>=0)name=plus.android.invoke(cursor,'getString',column)}}finally{plus.android.invoke(cursor,'close')}}
     resolve({name,bytes})
    }catch{reject(new Error('文件无法读取，请重新选择或粘贴词表。'))}
   }
   try{const intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType('*/*');intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);(plus.android.invoke as any)(activity,'startActivityForResult',intent,requestCode)}catch{restore();reject(new Error('系统文件选择器无法打开，请使用粘贴入口。'))}
  })
 }
 const api=(globalThis as any).wx;if(api?.chooseMessageFile)return new Promise((resolve,reject)=>api.chooseMessageFile({count:1,type:'file',extension:['json','csv','md','zip'],success:(result:any)=>{const f=result.tempFiles[0];if(f.size>50*1024*1024){reject(new Error('文件过大。'));return}api.getFileSystemManager().readFile({filePath:f.path,success:(r:any)=>resolve({name:f.name,bytes:new Uint8Array(r.data)}),fail:()=>reject(new Error('文件无法读取。'))})},fail:(error:any)=>/cancel/i.test(error.errMsg)?resolve(null):reject(new Error('文件选择失败。'))}))
 // #endif
 throw new Error('当前平台请使用粘贴词表入口。')
}
/** Keep bulk byte copies in Java; crossing the bridge for every byte array stalls large ZIPs. */
export function readAndroidDocument(activity:any,resolver:any,uri:any):Uint8Array{
 const native=plus.android,File=native.importClass('java.io.File') as any,Input=native.importClass('java.io.FileInputStream') as any,Output=native.importClass('java.io.FileOutputStream') as any
 const Bytes=native.importClass('java.io.ByteArrayOutputStream') as any,Base64Stream=native.importClass('android.util.Base64OutputStream') as any,Channels=native.importClass('java.nio.channels.Channels') as any
 const limit=50*1024*1024,opened:any[]=[]
 let temporary:any
 try{
  temporary=File.createTempFile('wordpal-course-','.bin',native.invoke(activity,'getCacheDir'))
  const source=native.invoke(resolver,'openInputStream',uri);opened.push(source)
  const destination=new Output(temporary);opened.push(destination)
  const destinationChannel=native.invoke(destination,'getChannel'),sourceChannel=Channels.newChannel(source)
  let total=0
  while(total<=limit){const count=Number((native.invoke as any)(destinationChannel,'transferFrom',sourceChannel,total,limit+1-total));if(!Number.isInteger(count)||count<0)throw new Error('文件读取未完成。');if(!count)break;total+=count}
  if(total>limit)throw new Error('课程文件超过 50 MiB。')
  if(!total)throw new Error('课程文件为空。')
  native.invoke(destination,'close')
  const input=new Input(temporary);opened.push(input)
  const output=new Bytes();opened.push(output)
  const encoder=new Base64Stream(output,2);opened.push(encoder)
  const channel=native.invoke(input,'getChannel'),target=Channels.newChannel(encoder)
  let encodedBytes=0
  while(encodedBytes<total){const count=Number((native.invoke as any)(channel,'transferTo',encodedBytes,total-encodedBytes,target));if(!Number.isInteger(count)||count<=0)throw new Error('文件编码未完成。');encodedBytes+=count}
  native.invoke(encoder,'close')
  const encoded=native.invoke(output,'toString','US-ASCII')
  const bytes=new Uint8Array(uni.base64ToArrayBuffer(encoded))
  if(bytes.length!==total)throw new Error('文件读回长度不一致。')
  return bytes
 }finally{
  for(const stream of opened.reverse())try{native.invoke(stream,'close')}catch{}
  if(temporary)try{native.invoke(temporary,'delete')}catch{}
 }
}
/** Stage text once so Java can decode/copy large files without returning byte arrays through the bridge. */
function stageAndroidExport(bytes:Uint8Array):Promise<any>{
 const encoded=uni.arrayBufferToBase64(bytes.slice().buffer)
 const name='wordpal-course-export-'+Date.now()+'-'+Math.random().toString(16).slice(2)+'.base64'
 return new Promise((resolve,reject)=>{
  const fail=()=>reject(new Error('无法准备课程文件，请检查可用空间。'))
  plus.io.resolveLocalFileSystemURL('_doc/',(root:any)=>root.getFile(name,{create:true,exclusive:true},(entry:any)=>{
   const removeAndFail=()=>entry.remove(fail,fail)
   entry.createWriter((writer:any)=>{
    writer.onerror=removeAndFail
    writer.onwriteend=()=>entry.file((file:any)=>{if(file.size!==encoded.length){removeAndFail();return}resolve(entry)},removeAndFail)
    writer.write(encoded)
   },removeAndFail)
  },fail),fail)
 })
}
/** Use native channels in bulk; no large byte[] crosses Native.js on the write path. */
function writeAndroidDocument(activity:any,resolver:any,uri:any,staged:any,total:number){
 const native=plus.android,Input=native.importClass('java.io.FileInputStream') as any,Output=native.importClass('java.io.FileOutputStream') as any
 const Decoder=native.importClass('android.util.Base64InputStream') as any,Channels=native.importClass('java.nio.channels.Channels') as any
 const opened:any[]=[]
 try{
  const input=new Input(plus.io.convertLocalFileSystemURL(staged.toLocalURL()));opened.push(input)
  const decoder=new Decoder(input,0);opened.push(decoder)
  const descriptor=(native.invoke as any)(resolver,'openFileDescriptor',uri,'w');if(!descriptor)throw new Error('无法打开保存位置。');opened.push(descriptor)
  const output=new Output(native.invoke(descriptor,'getFileDescriptor'));opened.push(output)
  const destination=native.invoke(output,'getChannel'),source=Channels.newChannel(decoder)
  let written=0
  while(written<total){const count=Number((native.invoke as any)(destination,'transferFrom',source,written,total-written));if(!Number.isInteger(count)||count<=0)throw new Error('课程文件写入未完成。');written+=count}
  native.invoke(output,'flush');native.invoke(output,'close')
  const readback=readAndroidDocument(activity,resolver,uri)
  return readback
 }finally{for(const stream of opened.reverse())try{native.invoke(stream,'close')}catch{}}
}
/** Save to a selected Android document, without broad storage permissions. */
export async function saveAndroidDocument(name:string,bytes:Uint8Array):Promise<boolean>{
 const staged=await stageAndroidExport(bytes)
 try{
  const native=plus.android,activity=native.runtimeMainActivity() as any,Intent=native.importClass('android.content.Intent') as any
  const requestCode=7315,previous=activity.onActivityResult
  return await new Promise<boolean>((resolve,reject)=>{
   const restore=()=>{activity.onActivityResult=previous}
   activity.onActivityResult=(request:number,result:number,data:any)=>{
    if(request!==requestCode){previous?.(request,result,data);return}
    restore()
    if(result!==-1||!data){resolve(false);return}
    try{
     const uri=native.invoke(data,'getData'),resolver=native.invoke(activity,'getContentResolver')
     if(!uri)throw new Error('未选择保存位置。')
     const readback=writeAndroidDocument(activity,resolver,uri,staged,bytes.length)
     if(readback.length!==bytes.length||sha256(readback)!==sha256(bytes))throw new Error('导出文件读回校验失败，请重新保存。')
     resolve(true)
    }catch(error){reject(error instanceof Error?error:new Error('课程文件无法保存，请检查可用空间并重新选择位置。'))}
   }
   try{
    const intent=new Intent(Intent.ACTION_CREATE_DOCUMENT)
    intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType('application/zip')
    intent.putExtra(Intent.EXTRA_TITLE,name)
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
    ;(native.invoke as any)(activity,'startActivityForResult',intent,requestCode)
   }catch{restore();reject(new Error('系统保存窗口无法打开，请稍后重试。'))}
  })
 }finally{try{staged.remove(()=>{},()=>{})}catch{}}
}
export async function downloadLocalFile(name:string,data:Uint8Array|string,options:{chooseDestination?:boolean}={}){
 const safeName=name.replace(/[^a-zA-Z0-9_.-]/g,'-')
 // #ifndef H5
 if(typeof plus!=='undefined'){
  const bytes=typeof data==='string'?strToU8(data):data
  if(options.chooseDestination&&uni.getSystemInfoSync().platform==='android')return saveAndroidDocument(safeName,bytes)
  await nativeWrite('_doc/wordpal/exports/'+safeName,bytes);return true
 }
 const api=(globalThis as any).wx;if(api?.getFileSystemManager){api.getFileSystemManager().writeFileSync(api.env.USER_DATA_PATH+'/'+safeName,typeof data==='string'?data:data.slice().buffer,typeof data==='string'?'utf8':undefined);return true}
 // #endif
 // #ifdef H5
 if(typeof document!=='undefined'){const url=URL.createObjectURL(new Blob([typeof data==='string'?data:data.slice().buffer],{type:typeof data==='string'?'application/json':'application/zip'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true}
 // #endif
 return false
}
