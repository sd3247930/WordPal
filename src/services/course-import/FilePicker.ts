import {strToU8} from 'fflate'
import {nativeWrite} from '../content/MediaRepository'
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
export async function downloadLocalFile(name:string,data:Uint8Array|string){
 const safeName=name.replace(/[^a-zA-Z0-9_.-]/g,'-')
 // #ifndef H5
 if(typeof plus!=='undefined'){await nativeWrite('_doc/wordpal/exports/'+safeName,typeof data==='string'?strToU8(data):data);return true}
 const api=(globalThis as any).wx;if(api?.getFileSystemManager){api.getFileSystemManager().writeFileSync(api.env.USER_DATA_PATH+'/'+safeName,typeof data==='string'?data:data.slice().buffer,typeof data==='string'?'utf8':undefined);return true}
 // #endif
 // #ifdef H5
 if(typeof document!=='undefined'){const url=URL.createObjectURL(new Blob([typeof data==='string'?data:data.slice().buffer],{type:typeof data==='string'?'application/json':'application/zip'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true}
 // #endif
 return false
}
