import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const source=process.argv[2]
if(!source)throw new Error('Provide the directory containing the six approved familiarity PNGs.')
const icons=[['01未学.png','unlearned'],['02初识.png','beginner'],['03练习中.png','practicing'],['04较熟悉.png','familiar'],['05熟练掌握.png','mastered'],['06待评估.png','pending']]
const destination='src/static/icons/familiarity'
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
const masters=await Promise.all(icons.map(async([name])=>{
 const data=await fs.readFile(path.join(source,name)),meta=await sharp(data).metadata()
 if(meta.format!=='png'||!meta.hasAlpha||meta.width!==meta.height)throw new Error('Familiarity assets must be square transparent PNGs.')
 // Preserve the complete artwork: an 880px image centered inside a 1024px transparent master.
 return cleanPng(await sharp(data).resize(880,880,{fit:'contain',kernel:'lanczos3'}).extend({top:72,bottom:72,left:72,right:72,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer())
}))
await fs.mkdir(destination,{recursive:true})
for(const [index,[,name]]of icons.entries())for(const size of [1024,256]){
 const output=size===1024?masters[index]:cleanPng(await sharp(masters[index]).resize(size,size,{fit:'contain'}).png({compressionLevel:9}).toBuffer())
 await fs.writeFile(path.join(destination,`wordpal_status_${name}_${size}.png`),output)
}
console.log('Exported six clean familiarity icons: 1024px masters and 256px display assets.')
