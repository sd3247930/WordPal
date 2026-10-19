import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const source=process.argv[2]
if(!source)throw new Error('Provide the directory containing the three approved wordbook scope PNGs.')
const icons=[['01当前教材.png','current_textbook'],['02全部已安装.png','installed_textbooks'],['03全局已学词.png','global_learned']]
function cleanPng(data){
 const chunks=[data.subarray(0,8)]
 for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),end=offset+length+12,type=data.toString('ascii',offset+4,offset+8);if(end>data.length)throw new Error('Invalid PNG chunk length.');if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type))chunks.push(data.subarray(offset,end));offset=end}
 return Buffer.concat(chunks)
}
const destination='src/static/icons/wordbook-scopes'
await fs.mkdir(destination,{recursive:true})
for(const [file,name]of icons){
 const data=await fs.readFile(path.join(source,file)),meta=await sharp(data).metadata()
 if(meta.format!=='png'||!meta.hasAlpha||meta.width!==meta.height)throw new Error('Scope assets must be square transparent PNGs.')
 // Preserve the whole illustration and give the three originals a consistent safety margin.
 const master=cleanPng(await sharp(data).resize(880,880,{fit:'contain'}).extend({top:72,bottom:72,left:72,right:72,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer())
 for(const size of [1024,256])await fs.writeFile(path.join(destination,`wordpal_scope_${name}_${size}.png`),size===1024?master:cleanPng(await sharp(master).resize(size,size).png({compressionLevel:9}).toBuffer()))
}
console.log('Exported three metadata-free wordbook scope icons in 1024px and 256px sizes.')
