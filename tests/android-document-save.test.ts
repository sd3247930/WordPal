import test from 'node:test'
import assert from 'node:assert/strict'
import {saveAndroidDocument} from '../src/services/course-import/FilePicker'

function runtime(options:{launchFail?:boolean;writeFail?:boolean;corrupt?:boolean;stageFail?:boolean;stageShort?:boolean}={}){
 let staged=Buffer.alloc(0),stagedRemoved=false,temporary:any,closed=0,forwarded=0,launch:any
 const previous=(_request?:number,_result?:number,_data?:any)=>{forwarded++}
 const activity={onActivityResult:previous,getContentResolver:()=>resolver,getCacheDir:()=>null,startActivityForResult:(intent:any,code:number)=>{if(options.launchFail)throw Error('Unavailable');launch={intent,code}}}
 class Intent {static ACTION_CREATE_DOCUMENT='create';static CATEGORY_OPENABLE='open';static EXTRA_TITLE='title';static FLAG_GRANT_READ_URI_PERMISSION=1;static FLAG_GRANT_WRITE_URI_PERMISSION=2;type='';name='';constructor(public action:string){}addCategory(){}setType(v:string){this.type=v}putExtra(_key:string,v:string){this.name=v}addFlags(){}}
 class Stream {close(){closed++}}
 class File {data=Buffer.alloc(0);deleted=false;static createTempFile(){return temporary=new File()}delete(){this.deleted=true}}
 const exported=new File()
 class Output extends Stream {constructor(public file:File){super()}flush(){}getChannel(){return {transferFrom:(source:any,offset:number,count:number)=>{if(this.file===exported&&options.writeFail)throw Error('Disk full');const chunk=source.data.subarray(source.offset,source.offset+count);this.file.data=Buffer.concat([this.file.data,chunk]);source.offset+=chunk.length;return chunk.length}}}}
 class Input extends Stream {data:Buffer;constructor(public file:File|string){super();this.data=typeof file==='string'?staged:file.data}getChannel(){return {transferTo:(offset:number,count:number,target:any)=>{const chunk=this.data.subarray(offset,offset+count);target.write(chunk);return chunk.length}}}}
 class Decoder extends Stream {data:Buffer;offset=0;constructor(input:Input){super();this.data=Buffer.from(input.data.toString('ascii'),'base64')}}
 class Bytes extends Stream {chunks:Buffer[]=[];write(b:Buffer){this.chunks.push(b)}toString(){return Buffer.concat(this.chunks).toString('ascii')}}
 class Encoder extends Stream {chunks:Buffer[]=[];constructor(public output:Bytes){super()}write(b:Buffer){this.chunks.push(b)}close(){this.output.chunks=[Buffer.from(Buffer.concat(this.chunks).toString('base64'))];super.close()}}
 const resolver={openFileDescriptor:()=>({getFileDescriptor:()=>exported,close(){closed++}}),openInputStream:()=>({data:options.corrupt?Buffer.from([1]):exported.data,offset:0,close(){closed++}})}
 const types:Record<string,any>={'android.content.Intent':Intent,'java.io.File':File,'java.io.FileInputStream':Input,'java.io.FileOutputStream':Output,'java.io.ByteArrayOutputStream':Bytes,'android.util.Base64OutputStream':Encoder,'android.util.Base64InputStream':Decoder,'java.nio.channels.Channels':{newChannel:(v:any)=>v}}
 const entry={toLocalURL:()=> 'synthetic-stage.base64',createWriter(callback:any){const writer={onerror:()=>{},onwriteend:()=>{},write(text:string){if(options.stageFail){writer.onerror();return}staged=Buffer.from(text,'ascii');writer.onwriteend()}};callback(writer)},file(callback:any){callback({size:options.stageShort?0:staged.length})},remove(callback:any){stagedRemoved=true;callback()}}
 ;(globalThis as any).plus={android:{runtimeMainActivity:()=>activity,importClass:(name:string)=>types[name],invoke:(object:any,method:string,...args:any[])=>object[method](...args)},io:{convertLocalFileSystemURL:(p:string)=>p,resolveLocalFileSystemURL:(_p:string,callback:any)=>callback({getFile:(_name:string,_options:any,ready:any)=>ready(entry)})}}
 ;(globalThis as any).uni={arrayBufferToBase64:(v:ArrayBuffer)=>Buffer.from(v).toString('base64'),base64ToArrayBuffer:(v:string)=>{const b=Buffer.from(v,'base64');return b.buffer.slice(b.byteOffset,b.byteOffset+b.length)}}
 return {activity,previous,get launch(){return launch},get closed(){return closed},get forwarded(){return forwarded},get temporary(){return temporary},get stagedRemoved(){return stagedRemoved},result:(result:number=-1)=>activity.onActivityResult(7315,result,{getData:()=> 'content:synthetic'})}
}

// 保存完成必须写入、关闭流并读回校验，之后才能向界面报成功。
test('Android 保存课程包使用系统文档窗口，写入及读回 5 MiB 字节无损',async()=>{
 const r=runtime(),bytes=new Uint8Array(5*1024*1024+19).fill(173),promise=saveAndroidDocument('synthetic-course.zip',bytes)
 await Promise.resolve()
 assert.equal(r.launch.intent.action,'create');assert.equal(r.launch.intent.type,'application/zip');assert.equal(r.launch.intent.name,'synthetic-course.zip')
 r.result();assert.equal(await promise,true);assert.equal(r.activity.onActivityResult,r.previous);assert.ok(r.closed>0);assert.equal(r.temporary.deleted,true);assert.equal(r.stagedRemoved,true)
})

test('Android 保存取消与无关回调不会误报成功，恢复原 Activity 回调后可重试',async()=>{
 const r=runtime(),promise=saveAndroidDocument('synthetic.zip',new Uint8Array([1,2,3]))
 await Promise.resolve()
 r.activity.onActivityResult(99,0,null);assert.equal(r.forwarded,1)
 r.result(0);assert.equal(await promise,false);assert.equal(r.activity.onActivityResult,r.previous)
 const retry=saveAndroidDocument('synthetic.zip',new Uint8Array([1,2,3]));await Promise.resolve();r.result();assert.equal(await retry,true)
})

test('Android 保存窗口、磁盘写入或读回异常均向调用方报告失败',async()=>{
 for(const options of [{launchFail:true},{writeFail:true},{corrupt:true}]){
  const r=runtime(options),promise=saveAndroidDocument('synthetic.zip',new Uint8Array([7,8,9]))
  await Promise.resolve()
  if(!options.launchFail)r.result()
  await assert.rejects(promise)
  assert.equal(r.activity.onActivityResult,r.previous)
  if(options.writeFail)assert.ok(r.closed>0)
  assert.equal(r.stagedRemoved,true)
 }
})

test('Android 暂存失败或长度不符时不打开保存窗口，清理本次暂存文件',async()=>{
 for(const options of [{stageFail:true},{stageShort:true}]){
  const r=runtime(options)
  await assert.rejects(saveAndroidDocument('synthetic.zip',new Uint8Array([1,2,3])),/准备课程文件/)
  assert.equal(r.launch,undefined);assert.equal(r.stagedRemoved,true);assert.equal(r.activity.onActivityResult,r.previous)
 }
})
