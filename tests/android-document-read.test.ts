import test from 'node:test'
import assert from 'node:assert/strict'
import {readAndroidDocument,readAndroidDocumentAsync} from '../src/services/course-import/FilePicker'
import {ImportCancelled} from '../src/services/course-import/ImportTask'

function runtime(bytes:Buffer,virtualSize=bytes.length,fail=false){
 let temporary:any
 const opened:any[]=[]
 class Stream {closed=false;constructor(){opened.push(this)}close(){this.closed=true}}
 class File {data=Buffer.alloc(0);deleted=false;delete(){this.deleted=true}static createTempFile(){return temporary=new File()}}
 class Output extends Stream {constructor(public file:File){super()}getChannel(){return {transferFrom:(source:any,offset:number,count:number)=>{const n=Math.min(count,virtualSize-source.offset);if(n>0&&virtualSize===bytes.length)this.file.data=Buffer.concat([this.file.data,bytes.subarray(source.offset,source.offset+n)]);source.offset+=n;return n}}}}
 class Input extends Stream {constructor(public file:File){super()}getChannel(){return {transferTo:(offset:number,count:number,target:any)=>{const chunk=this.file.data.subarray(offset,offset+count);target.write(chunk);return chunk.length}}}}
 class Bytes extends Stream {chunks:Buffer[]=[];write(value:Buffer){this.chunks.push(value)}toString(encoding:BufferEncoding|'US-ASCII'){return Buffer.concat(this.chunks).toString(encoding==='US-ASCII'?'ascii':encoding)}}
 class Encoder extends Stream {chunks:Buffer[]=[];constructor(public destination:Bytes){super()}write(value:Buffer){this.chunks.push(value)}close(){if(!this.closed)this.destination.write(Buffer.from(Buffer.concat(this.chunks).toString('base64'),'ascii'));super.close()}}
 const source={offset:0,closed:false,close(){this.closed=true}}
 const types:Record<string,any>={'java.io.File':File,'java.io.FileInputStream':Input,'java.io.FileOutputStream':Output,'java.io.ByteArrayOutputStream':Bytes,'android.util.Base64OutputStream':Encoder,'java.nio.channels.Channels':{newChannel:(value:any)=>value}}
 ;(globalThis as any).plus={android:{importClass:(name:string)=>types[name],invoke:(object:any,method:string,...args:any[])=>object[method](...args)}}
 ;(globalThis as any).uni={base64ToArrayBuffer:(value:string)=>{const buffer=Buffer.from(value,'base64');return buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.length)}}
 return {activity:{getCacheDir:()=>null},resolver:{openInputStream:()=>{if(fail)throw new Error('IO error');return source}},assertClean(){assert.equal(temporary.deleted,true);for(const s of opened)assert.equal(s.closed,true);if(!fail)assert.equal(source.closed,true)}}
}

// 以本次课程包量级的数据验证字节无损，且编码完成后释放所有临时资源。
test('Android 原生文档读取可无损传递 5 MiB ZIP 量级内容',()=>{
 const input=Buffer.alloc(5*1024*1024+123,173),r=runtime(input)
 const result=readAndroidDocument(r.activity,r.resolver,'content:synthetic')
 assert.deepEqual(Buffer.from(result),input);r.assertClean()
})
test('Android 空文件和超出 50 MiB 的内容被拒绝并清理临时文件',()=>{
 for(const size of [0,50*1024*1024+1]){const r=runtime(Buffer.alloc(0),size);assert.throws(()=>readAndroidDocument(r.activity,r.resolver,'content:synthetic'),size?/超过/:/为空/);r.assertClean()}
})
test('Android 内容提供方读取异常仍会删除本次临时文件',()=>{
 const r=runtime(Buffer.alloc(1),1,true)
 assert.throws(()=>readAndroidDocument(r.activity,r.resolver,'content:synthetic'),/IO error/);r.assertClean()
})
test('Android 异步读取 5 MiB 内容保持字节完整并报告分块进度，取消会关闭流及删除暂存',async()=>{
 const input=Buffer.alloc(5*1024*1024+123,73),r=runtime(input),phases=new Set<string>();let ticks=0
 const timer=setInterval(()=>ticks++,1)
 try{assert.deepEqual(Buffer.from(await readAndroidDocumentAsync(r.activity,r.resolver,'content:synthetic',{onProgress:p=>phases.add(p.phase)})),input);assert.ok(ticks>0);assert.deepEqual([...phases],['reading','decoding']);r.assertClean()}finally{clearInterval(timer)}
 for(const phase of ['reading','decoding']){const cancelledRuntime=runtime(input);let cancelled=false;await assert.rejects(readAndroidDocumentAsync(cancelledRuntime.activity,cancelledRuntime.resolver,'content:synthetic',{cancelled:()=>cancelled,onProgress:p=>{if(p.phase===phase&&p.completed>0)cancelled=true}}),ImportCancelled);cancelledRuntime.assertClean()}
})
