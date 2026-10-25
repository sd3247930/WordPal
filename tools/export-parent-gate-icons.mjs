import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const directory=process.argv[2]
if(!directory)throw Error('Provide the local directory containing the supplied parent verification PNG icons.')
const sources=[['01家长验证.png','heading',512],['03请家长完成验证.png','question',256],['04输入答案.png','answer',256],['05换一题.png','refresh',256],['06防止误操作.png','guard',256]]
function cleanPng(data){
 const chunks=[data.subarray(0,8)]
 for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),end=offset+length+12,type=data.toString('ascii',offset+4,offset+8);if(end>data.length)throw Error('Invalid PNG chunk length.');if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type))chunks.push(data.subarray(offset,end));offset=end}
 return Buffer.concat(chunks)
}
await fs.mkdir('src/static/icons/parent-gate',{recursive:true})
for(const [file,name,size]of sources){
 const source=await fs.readFile(path.join(directory,file)),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let left=info.width,top=info.height,right=0,bottom=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1)}
 if(right<=left||bottom<=top)throw Error('Empty icon: '+name)
 const margin=size===512?12:10,png=await sharp(source).extract({left,top,width:right-left,height:bottom-top}).resize(size-margin*2,size-margin*2,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({top:margin,bottom:margin,left:margin,right:margin,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer()
 await fs.writeFile('src/static/icons/parent-gate/'+name+'.png',cleanPng(png))
 console.log(JSON.stringify({icon:name,width:size,height:size,transparent:true}))
}
