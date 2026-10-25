import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const directory=process.argv[2]
if(!directory)throw Error('Provide the local directory containing the supplied course deletion PNG icons.')
const sources=[['01-2词条.png','words'],['01-3媒体.png','media'],['01-4共享.png','retained']]
const output='src/static/icons/course-delete'
function cleanPng(data){
 const chunks=[data.subarray(0,8)]
 for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),end=offset+length+12,type=data.toString('ascii',offset+4,offset+8);if(end>data.length)throw Error('Invalid PNG chunk length.');if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type))chunks.push(data.subarray(offset,end));offset=end}
 return Buffer.concat(chunks)
}
await fs.mkdir(output,{recursive:true})
for(const [file,name]of sources){
 const original=await fs.readFile(path.join(directory,file)),{data,info}=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let left=info.width,top=info.height,right=0,bottom=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1)}
 if(right<=left||bottom<=top)throw Error('Empty icon: '+name)
 const png=await sharp(original).extract({left,top,width:right-left,height:bottom-top}).resize(240,240,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({left:8,right:8,top:8,bottom:8,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer()
 await fs.writeFile(path.join(output,name+'.png'),cleanPng(png))
 console.log(JSON.stringify({icon:name,width:256,height:256,transparent:true}))
}
