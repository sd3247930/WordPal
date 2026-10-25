import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const directory=process.argv[2]
if(!directory)throw Error('Provide the local directory containing the supplied parent settings PNGs.')
const source=await fs.readFile('src/services/parent-settings-artwork.ts','utf8'),entries=[...source.matchAll(/(\w+):'([^']+\.png)'/g)].map(m=>[m[1],m[2]])
if(entries.length!==24)throw Error('Unexpected artwork manifest.')
function cleanPng(data){const chunks=[data.subarray(0,8)];for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),end=offset+length+12,kind=data.toString('ascii',offset+4,offset+8);if(end>data.length)throw Error('Invalid PNG.');if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(kind))chunks.push(data.subarray(offset,end));offset=end}return Buffer.concat(chunks)}
await fs.mkdir('src/static/icons/parent-settings',{recursive:true})
for(const [name,file]of entries){
 const original=await fs.readFile(path.join(directory,file)),{data,info}=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let left=info.width,top=info.height,right=0,bottom=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1)}
 if(right<=left||bottom<=top)throw Error('Empty icon: '+name)
 const width=name==='heading'?512:256,height=name==='heading'?320:256,margin=name==='heading'?8:10
 const png=await sharp(original).extract({left,top,width:right-left,height:bottom-top}).resize(width-margin*2,height-margin*2,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({left:margin,right:margin,top:margin,bottom:margin,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer()
 await fs.writeFile('src/static/icons/parent-settings/'+name+'.png',cleanPng(png))
}
console.log('Exported 24 proportional transparent PNGs; auxiliary metadata removed.')
