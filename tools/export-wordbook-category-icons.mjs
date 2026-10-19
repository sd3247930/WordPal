import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const source=process.argv[2]
if(!source)throw new Error('Provide the directory containing the four approved wordbook category PNGs.')
const icons=[['01到期复习.png','due_review'],['02重点复习.png','key_review'],['03错词本.png','wrong_words'],['04所有单词.png','all_words']]
function cleanPng(data){
 const chunks=[data.subarray(0,8)]
 for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),end=offset+length+12,type=data.toString('ascii',offset+4,offset+8);if(end>data.length)throw new Error('Invalid PNG chunk length.');if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type))chunks.push(data.subarray(offset,end));offset=end}
 return Buffer.concat(chunks)
}
const destination='src/static/icons/wordbook-categories'
await fs.mkdir(destination,{recursive:true})
for(const [file,name]of icons){
 const data=await fs.readFile(path.join(source,file)),meta=await sharp(data).metadata()
 if(meta.format!=='png'||!meta.hasAlpha||meta.width!==meta.height)throw new Error('Category assets must be square transparent PNGs.')
 // Preserve the complete illustration and normalize its transparent safety margin.
 const master=cleanPng(await sharp(data).resize(880,880,{fit:'contain'}).extend({top:72,bottom:72,left:72,right:72,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer())
 for(const size of [1024,256])await fs.writeFile(path.join(destination,`wordpal_wordbook_${name}_${size}.png`),size===1024?master:cleanPng(await sharp(master).resize(size,size).png({compressionLevel:9}).toBuffer()))
}
console.log('Exported four metadata-free wordbook category icons in 1024px and 256px sizes.')
