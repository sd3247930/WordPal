import {readFileSync} from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'

export const spiritStoneArtwork=[...[128,192].map(size=>({file:`static/brand/spirit-stone-${size}.png`,size})),...[128,192,256].map(size=>({file:`static/brand/blue-diamond-${size}.png`,size}))]
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')

// Public exports contain pixel data only, with no C2PA, EXIF or text chunks.
export function verifySpiritStoneArtwork(read,referenceRoot='src'){
 for(const {file,size} of spiritStoneArtwork){
  const bytes=Buffer.from(read(file))
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error(`Invalid spirit-stone PNG: ${file}`)
  const chunks=[];let offset=8
  while(offset<bytes.length){
   if(offset+12>bytes.length)throw Error(`Truncated spirit-stone PNG: ${file}`)
   const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8)
   if(offset+12+length>bytes.length||!['IHDR','IDAT','IEND'].includes(type))throw Error(`Unexpected spirit-stone PNG chunk: ${file}`)
   chunks.push(type);offset+=12+length
  }
  if(chunks[0]!=='IHDR'||chunks.at(-1)!=='IEND'||!chunks.includes('IDAT')||bytes.readUInt32BE(8)!==13||bytes.readUInt32BE(16)!==size||bytes.readUInt32BE(20)!==size||bytes[25]!==6)throw Error(`Invalid spirit-stone dimensions or transparency: ${file}`)
  if(digest(bytes)!==digest(readFileSync(path.join(referenceRoot,file))))throw Error(`Packaged spirit-stone artwork differs from reviewed source: ${file}`)
 }
}
