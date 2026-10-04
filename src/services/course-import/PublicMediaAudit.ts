import type {CoursePack} from '../../../packages/content_schema/course'
import {strFromU8} from 'fflate'
export function assertPublicMedia(pack:CoursePack,files:Record<string,Uint8Array>){
 for(const asset of pack.assets){const bytes=files[asset.path];if(!bytes)throw new Error('公开导出缺少完整资源。')
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let metadata=false
  if(asset.mediaType==='image/png')for(let offset=8;offset+12<=bytes.length;){const size=view.getUint32(offset),kind=strFromU8(bytes.subarray(offset+4,offset+8));if(offset+12+size>bytes.length)throw new Error('图片资源损坏。');if(['caBX','eXIf','iTXt','tEXt','zTXt'].includes(kind))metadata=true;offset+=12+size}
  else if(asset.mediaType==='image/jpeg'){let offset=2;while(offset+4<=bytes.length&&bytes[offset]===255){while(bytes[offset]===255)offset++;const marker=bytes[offset++];if(marker===218||marker===217)break;if(marker===1||marker>=208&&marker<=215)continue;const size=view.getUint16(offset);if(size<2||offset+size>bytes.length)throw new Error('图片资源损坏。');if([225,235,237].includes(marker))metadata=true;offset+=size}}
  else if(asset.mediaType==='audio/wav')for(let offset=12;offset+8<=bytes.length;){const kind=strFromU8(bytes.subarray(offset,offset+4)),size=view.getUint32(offset+4,true);if(['LIST','bext','iXML','axml','ID3 '].includes(kind))metadata=true;offset+=8+size+(size%2)}
  else if(asset.mediaType==='audio/mpeg')metadata=strFromU8(bytes.subarray(0,3))==='ID3'||strFromU8(bytes.subarray(Math.max(0,bytes.length-128),Math.max(0,bytes.length-125)))==='TAG'
  if(metadata)throw new Error('媒体带有未经审核的元数据，请重新导出干净资源后再公开导出课程。')
 }
}
