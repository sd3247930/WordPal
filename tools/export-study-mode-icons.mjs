import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const source=process.argv[2]
if(!source)throw new Error('Provide the directory containing the five approved learning mode PNGs.')
const icons=[['01闪现.png','flash'],['02连接.png','match'],['03听音.png','listen'],['04拼写.png','spell'],['05听写.png','dictation']]
const destination='src/static/icons/study-modes'
function cleanPng(data){
 const chunks=[data.subarray(0,8)]
 for(let offset=8;offset<data.length;){
  const length=data.readUInt32BE(offset),end=offset+length+12,type=data.toString('ascii',offset+4,offset+8)
  if(end>data.length)throw new Error('Invalid PNG chunk length.')
  if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type))chunks.push(data.subarray(offset,end))
  offset=end
 }
 return Buffer.concat(chunks)
}
const sources=await Promise.all(icons.map(async([name])=>{
 const data=await fs.readFile(path.join(source,name)),meta=await sharp(data).metadata()
 if(meta.format!=='png'||!meta.hasAlpha||meta.width!==1024||meta.height!==1024)throw new Error('Learning mode assets must be transparent 1024px square PNGs.')
 return data
}))
await fs.mkdir(destination,{recursive:true})
for(const [index,[,name]]of icons.entries())for(const size of [1024,256]){
 // Keep the approved artwork unchanged; export only essential PNG chunks, no source metadata.
 const output=cleanPng(size===1024?sources[index]:await sharp(sources[index]).resize(size,size,{fit:'contain'}).png({compressionLevel:9}).toBuffer())
 await fs.writeFile(path.join(destination,`wordpal_study_${name}_${size}.png`),output)
}
console.log('Exported five clean learning mode icons: 1024px masters and 256px display assets.')
