import {unzipSync,strFromU8,zipSync,strToU8} from 'fflate'
import {safeRelativePath,validateCourse,type CoursePack} from '../../../packages/content_schema/course'
import {sha256} from '../content/digest'
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
