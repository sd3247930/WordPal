import fs from 'node:fs/promises'
import sharp from 'sharp'

const [swiss,clay,header]=process.argv.slice(2)
if(!swiss||!clay||!header)throw Error('Provide the supplied Swiss preview, clay preview and transparent header PNG paths.')
function cleanPng(data){
 const chunks=[data.subarray(0,8)]
 for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),end=offset+length+12,type=data.toString('ascii',offset+4,offset+8);if(end>data.length)throw Error('Invalid PNG chunk length.');if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type))chunks.push(data.subarray(offset,end));offset=end}
 return Buffer.concat(chunks)
}
const output='src/static/icons/settings/'
await fs.mkdir(output,{recursive:true})
for(const [file,name]of [[swiss,'preview-swiss'],[clay,'preview-clay']]){
 const png=await sharp(file).flatten({background:'#ffffff'}).resize(768,512,{fit:'contain',background:'#ffffff'}).png({compressionLevel:9}).toBuffer()
 await fs.writeFile(output+name+'.png',cleanPng(png))
}
const png=await sharp(header).trim({background:'#00000000',threshold:12}).resize(768,464,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer()
await fs.writeFile(output+'header-books.png',cleanPng(png))
console.log('Exported two matching 768x512 previews and a proportional 768x464 transparent header; auxiliary PNG metadata removed.')
