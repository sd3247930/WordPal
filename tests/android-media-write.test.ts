import test from 'node:test'
import assert from 'node:assert/strict'
import {nativeWrite} from '../src/services/content/MediaRepository'
import {ImportCancelled} from '../src/services/course-import/ImportTask'

function runtime(fail=false){
 let staged=Buffer.alloc(0),removed=false,written=0;const opened:any[]=[],disk=new Map<string,Buffer>()
 class Stream {closed=false;constructor(){opened.push(this)}close(){this.closed=true}}
 class File {constructor(public path:string){}getParentFile(){return {mkdirs(){}}}}
 class Input extends Stream {data:Buffer;constructor(_path:string){super();this.data=staged}}
 class Decoder extends Stream {data:Buffer;offset=0;constructor(input:Input){super();this.data=Buffer.from(input.data.toString('ascii'),'base64')}}
 class Output extends Stream {constructor(public file:File){super();disk.set(file.path,Buffer.alloc(0))}flush(){}getChannel(){return {transferFrom:(source:Decoder,_offset:number,count:number)=>{if(fail)throw Error('Disk full');const chunk=source.data.subarray(source.offset,source.offset+Math.min(count,64*1024));disk.set(this.file.path,Buffer.concat([disk.get(this.file.path)!,chunk]));source.offset+=chunk.length;written+=chunk.length;return chunk.length}}}}
 const types:Record<string,any>={'java.io.File':File,'java.io.FileInputStream':Input,'java.io.FileOutputStream':Output,'android.util.Base64InputStream':Decoder,'java.nio.channels.Channels':{newChannel:(value:any)=>value}}
 const entry={toLocalURL:()=> 'synthetic-stage.base64',createWriter(callback:any){const writer={onerror:()=>{},onwriteend:()=>{},write(text:string){staged=Buffer.from(text,'ascii');writer.onwriteend()}};callback(writer)},file(callback:any){callback({size:staged.length})},remove(callback:any){removed=true;callback()}}
 ;(globalThis as any).plus={android:{importClass:(name:string)=>{assert.notEqual(name,'android.util.Base64','不得将解码后的 Java 字节数组返回 JS');return types[name]},invoke:(object:any,method:string,...args:any[])=>object[method](...args)},io:{convertLocalFileSystemURL:(path:string)=>path,resolveLocalFileSystemURL:(_path:string,callback:any)=>callback({getFile:(_name:string,_options:any,ready:any)=>ready(entry)})}}
 ;(globalThis as any).uni={getSystemInfoSync:()=>({platform:'android'}),arrayBufferToBase64:(value:ArrayBuffer)=>Buffer.from(value).toString('base64')}
 return {disk,get written(){return written},assertClean(){assert.equal(removed,true);assert.ok(opened.every(stream=>stream.closed))}}
}
test('Android 媒体通过原生流无损保存 5 MiB，跨桥不传二进制数组，暂存文件和流被释放',async()=>{
 const r=runtime(),bytes=new Uint8Array(5*1024*1024+19).fill(187);await nativeWrite('synthetic-pack/image.png',bytes);assert.deepEqual(r.disk.get('synthetic-pack/image.png'),Buffer.from(bytes));r.assertClean()
})
test('Android 原生资源写入中断或磁盘失败仍清理暂存并关闭流',async()=>{
 const bytes=new Uint8Array(2*1024*1024).fill(23),cancelled=runtime()
 await assert.rejects(nativeWrite('synthetic-pack/image.png',bytes,{cancelled:()=>cancelled.written>0}),ImportCancelled);cancelled.assertClean()
 const failed=runtime(true);await assert.rejects(nativeWrite('synthetic-pack/image.png',bytes),/Disk full/);failed.assertClean()
})
