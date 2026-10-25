import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
const directory=process.argv[2]
if(!directory)throw Error('Provide the supplied local artwork directory.')
const source=await fs.readFile('src/services/course-tools-artwork.ts','utf8'),sections=[...source.matchAll(/(\w+):'([^']+\.png)'/g)].map(m=>({name:m[1],file:path.join(directory,m[2]),output:'src/static/icons/course-tools'}))
if(sections.length!==6)throw Error('Unexpected section manifest.')
const covers=path.join(directory,'WordPal_课程封面_50枚独立高清透明PNG_1024px'),manifest=JSON.parse(await fs.readFile(path.join(covers,'icon-manifest.json'),'utf8'))
if(manifest.icons.length!==50)throw Error('Unexpected cover manifest.')
const entries=[...sections,...manifest.icons.map(icon=>({name:icon.id,file:path.join(covers,icon.filename),output:'src/static/icons/course-covers'}))]
function cleanPng(data){const chunks=[data.subarray(0,8)];for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),end=offset+length+12,kind=data.toString('ascii',offset+4,offset+8);if(end>data.length)throw Error('Invalid PNG');if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(kind))chunks.push(data.subarray(offset,end));offset=end}return Buffer.concat(chunks)}
for(const entry of entries){
 const original=await fs.readFile(entry.file),{data,info}=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});let left=info.width,top=info.height,right=0,bottom=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1)}
 if(right<=left||bottom<=top)throw Error('Empty artwork')
 const width=entry.name==='heading'?512:256,height=entry.name==='heading'?320:256,margin=8
 const png=await sharp(original).extract({left,top,width:right-left,height:bottom-top}).resize(width-2*margin,height-2*margin,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({left:margin,right:margin,top:margin,bottom:margin,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer()
 await fs.mkdir(entry.output,{recursive:true});await fs.writeFile(path.join(entry.output,entry.name+'.png'),cleanPng(png))
}
console.log('Exported 6 section assets and 50 stable course covers; auxiliary metadata removed.')
