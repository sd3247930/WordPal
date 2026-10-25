import {unzipSync,Unzip,UnzipInflate,strFromU8,zipSync,strToU8} from 'fflate'
import {safeRelativePath,validateCourse,type CoursePack} from '../../../packages/content_schema/course'
import {sha256,sha256Async} from '../content/digest'
import {importScheduler,reportImport,type ImportWork} from './ImportTask'
/** Incremental inflate bounds each turn; all limits are checked before starting decompression. */
export async function readZipAsync(bytes:Uint8Array,work?:ImportWork){
 const pause=importScheduler(work);reportImport(work,'unpacking',0,bytes.length,'bytes');await pause(true)
 if(bytes.length>50*1024*1024||bytes[0]!==80||bytes[1]!==75)throw new Error('课程 ZIP 不合法或超过 50 MiB。')
 let expanded=0,count=0
 const expected=new Map<string,number>()
 unzipSync(bytes,{filter:file=>{
  if(file.name.endsWith('/')&&safeRelativePath(file.name.slice(0,-1))&&file.originalSize===0)return false
  if(++count>2100||expected.has(file.name)||!safeRelativePath(file.name)||file.originalSize>5*1024*1024||(expanded+=file.originalSize)>100*1024*1024||!/^manifest\.json$|\.(?:png|jpe?g|webp|wav|mp3)$/i.test(file.name))throw new Error('ZIP 含危险路径、重复文件、未知文件或过大解压内容。')
  if(file.name==='manifest.json'&&file.originalSize>2*1024*1024)throw new Error('课程文本超过 2 MiB。')
  expected.set(file.name,file.originalSize);return false
 }})
 const files:Record<string,Uint8Array>=Object.create(null),started=new Set<string>()
 const unzip=new Unzip(file=>{
  if(file.name.endsWith('/'))return
  const length=expected.get(file.name)
  if(length===undefined||started.has(file.name))throw new Error('ZIP 文件目录不一致。')
  started.add(file.name)
  const output=new Uint8Array(length);let offset=0
  file.ondata=(error,data,final)=>{
   if(error)throw error
   if(offset+data.length>length)throw new Error('ZIP 解压大小与目录不一致。')
   output.set(data,offset);offset+=data.length
   if(final){if(offset!==length)throw new Error('ZIP 内容不完整。');files[file.name]=output}
  }
  file.start()
 });unzip.register(UnzipInflate)
 for(let offset=0;offset<bytes.length;offset+=8192){const end=Math.min(offset+8192,bytes.length);unzip.push(bytes.subarray(offset,end),end===bytes.length);reportImport(work,'unpacking',end,bytes.length,'bytes');await pause()}
 if(Object.keys(files).length!==expected.size||!files['manifest.json'])throw new Error('ZIP 缺少 manifest.json 或内容不完整。')
 const text=strFromU8(files['manifest.json']),pack=JSON.parse(text) as CoursePack
 reportImport(work,'checking',0,0);await pause(true)
 const issue=validateCourse(pack).find(i=>i.severity==='error');if(issue)throw new Error(issue.message)
 const allowed=new Set(['manifest.json',...pack.assets.map(a=>a.path)])
 if(Object.keys(files).some(name=>!allowed.has(name)))throw new Error('ZIP 含不在资源清单中的文件。')
 const total=pack.assets.reduce((sum,a)=>sum+a.bytes,0);let checked=0
 for(const asset of pack.assets){const file=files[asset.path]
  if(!file||file.length!==asset.bytes||await sha256Async(file,work)!==asset.sha256)throw new Error('媒体缺失或 SHA256 不一致。')
  if(!validSignature(file,asset.mediaType))throw new Error('媒体内容与声明格式不一致。')
  checked+=file.length;reportImport(work,'checking',checked,total,'bytes');await pause()
 }
 delete files['manifest.json']
 return {pack,files,text}
}
function validSignature(file:Uint8Array,type:CoursePack['assets'][number]['mediaType']){return type==='image/png'?file[0]===137&&file[1]===80:type==='image/jpeg'?file[0]===255&&file[1]===216:type==='image/webp'?validWebp(file):type==='audio/wav'?strFromU8(file.subarray(0,4))==='RIFF'&&strFromU8(file.subarray(8,12))==='WAVE':strFromU8(file.subarray(0,3))==='ID3'||file[0]===255&&(file[1]&224)===224}
export function readZip(bytes:Uint8Array){
 if(bytes.length>50*1024*1024||bytes[0]!==80||bytes[1]!==75)throw new Error('课程 ZIP 不合法或超过 50 MiB。')
 let total=0,count=0
 const files=unzipSync(bytes,{filter:file=>{if(file.name.endsWith('/')&&safeRelativePath(file.name.slice(0,-1))&&file.originalSize===0)return false;if(++count>2100||!safeRelativePath(file.name)||file.originalSize>5*1024*1024||(total+=file.originalSize)>100*1024*1024||!/^manifest\.json$|\.(?:png|jpe?g|webp|wav|mp3)$/i.test(file.name))throw new Error('ZIP 含危险路径、未知文件或过大解压内容。');return true}})
 if(!files['manifest.json'])throw new Error('ZIP 缺少 manifest.json。')
 const pack=JSON.parse(strFromU8(files['manifest.json'])) as CoursePack,issues=validateCourse(pack);if(issues.some(i=>i.severity==='error'))throw new Error(issues.find(i=>i.severity==='error')!.message)
 const allowed=new Set(['manifest.json',...pack.assets.map(a=>a.path)]);if(Object.keys(files).some(name=>!allowed.has(name)))throw new Error('ZIP 含不在资源清单中的文件。')
 let mediaBytes=0
 for(const a of pack.assets){const file=files[a.path];if(!file||file.length!==a.bytes||sha256(file)!==a.sha256)throw new Error('媒体缺失或 SHA256 不一致。');mediaBytes+=file.length;if(mediaBytes>50*1024*1024)throw new Error('媒体合计超过 50 MiB。');const signature=a.mediaType==='image/png'?file[0]===137&&file[1]===80:a.mediaType==='image/jpeg'?file[0]===255&&file[1]===216:a.mediaType==='image/webp'?validWebp(file):a.mediaType==='audio/wav'?strFromU8(file.subarray(0,4))==='RIFF'&&strFromU8(file.subarray(8,12))==='WAVE':strFromU8(file.subarray(0,3))==='ID3'||file[0]===255&&(file[1]&224)===224;if(!signature)throw new Error('媒体内容与声明格式不一致。')}
 return {pack,files}
}
function validWebp(file:Uint8Array){return file.length>=20&&strFromU8(file.subarray(0,4))==='RIFF'&&strFromU8(file.subarray(8,12))==='WEBP'&&['VP8 ','VP8L','VP8X'].includes(strFromU8(file.subarray(12,16)))&&new DataView(file.buffer,file.byteOffset,file.byteLength).getUint32(4,true)===file.length-8}
export function makeZip(pack:CoursePack,files:Record<string,Uint8Array>={}){const entries:Record<string,Uint8Array>={'manifest.json':strToU8(JSON.stringify(pack,null,2))};for(const asset of pack.assets){if(!files[asset.path])throw new Error('课程媒体尚未就绪。');entries[asset.path]=files[asset.path]}return zipSync(entries,{level:6})}
