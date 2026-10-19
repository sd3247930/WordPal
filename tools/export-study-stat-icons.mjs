import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const source=process.argv[2]
if(!source)throw new Error('Provide the directory containing the three approved study statistic PNGs.')
const icons=[['01今日已学新词.png','today_new'],['02待复习.png','due_review'],['03本轮进度.png','round_progress']]
const destination='src/static/icons/study-stats'
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
 if(meta.format!=='png'||!meta.hasAlpha||meta.width!==1024||meta.height!==1024)throw new Error('Study statistic assets must be transparent 1024px square PNGs.')
 return data
}))
await fs.mkdir(destination,{recursive:true})
for(const [index,[,name]] of icons.entries())for(const size of [1024,256]){
 // Preserve master image data losslessly; allow only essential PNG chunks, no source metadata.
 const output=size===1024?cleanPng(sources[index]):await sharp(sources[index]).resize(size,size,{fit:'contain'}).png({compressionLevel:9}).toBuffer()
 await fs.writeFile(path.join(destination,`wordpal_study_${name}_${size}.png`),output)
}
console.log('Exported three clean study statistic icons, with 1024px masters and 256px display assets.')
