import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const directory=process.argv[2]
if(!directory)throw Error('Provide the local directory containing the supplied settings icons.')
const sources=[['01设置.png','heading'],['02外观.png','appearance'],['05减少动效.png','motion'],['06大字体.png','text'],['07屏幕阅读器.png','reader'],['08学习.png','learning'],['09学习等级.png','level'],['10声音与触感.png','feedback'],['11学习发音.png','sound'],['12正确答案轻震动.png','haptics'],['13_数据与隐私_绿色盾牌对勾.png','privacy'],['14_关于WordPal_金色星星.png','about']]
function cleanPng(data){
 const chunks=[data.subarray(0,8)]
 for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),end=offset+length+12,type=data.toString('ascii',offset+4,offset+8);if(end>data.length)throw Error('Invalid PNG chunk length.');if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type))chunks.push(data.subarray(offset,end));offset=end}
 return Buffer.concat(chunks)
}
await fs.mkdir('src/static/icons/settings',{recursive:true})
for(const [file,name]of sources){
 const source=await fs.readFile(path.join(directory,file)),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let left=info.width,top=info.height,right=0,bottom=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1)}
 if(right<=left||bottom<=top)throw Error('Empty icon: '+name)
 const png=await sharp(source).extract({left,top,width:right-left,height:bottom-top}).resize(232,232,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({top:12,bottom:12,left:12,right:12,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer()
 await fs.writeFile('src/static/icons/settings/'+name+'.png',cleanPng(png));console.log(JSON.stringify({icon:name,width:256,height:256,transparent:true}))
}
