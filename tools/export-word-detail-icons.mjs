import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const directory=process.argv[2]
if(!directory)throw Error('Provide the local directory containing the supplied detail icons.')
const sources=[
 ['01_单词详情_蓝红词典.png','heading'],['02_标准发音_橙色喇叭.png','speaker'],
 ['05_例句_橙色清单.png','example'],['08_熟知度_绿色统计柱.png','familiarity'],
 ['10_下次复习_日历时钟.png','next-review'],['11_上次学习_日历.png','last-study'],
 ['12_复习日期_绿色对勾日历.png','review-date'],['13_教材来源_翻开书本.png','sources'],
 ['14_拼读帮助_紫色耳机.png','phonics'],['15_我的重点_金色星星.png','favorite'],
 ['16_轻松练习_绿色手柄.png','practice'],['17_更多记忆信息_棕色清单.png','more'],
 ['18_状态说明_问号.png','help']
]
function cleanPng(data){
 const chunks=[data.subarray(0,8)]
 for(let offset=8;offset<data.length;){
  const length=data.readUInt32BE(offset),end=offset+length+12,type=data.toString('ascii',offset+4,offset+8)
  if(end>data.length)throw Error('Invalid PNG chunk length.')
  if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type))chunks.push(data.subarray(offset,end))
  offset=end
 }
 return Buffer.concat(chunks)
}
await fs.mkdir('src/static/icons/word-detail',{recursive:true})
for(const [file,name]of sources){
 const source=await fs.readFile(path.join(directory,file)),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let left=info.width,top=info.height,right=0,bottom=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1)}
 if(right<=left||bottom<=top)throw Error('Empty icon: '+name)
 const png=await sharp(source).extract({left,top,width:right-left,height:bottom-top}).resize(232,232,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({top:12,bottom:12,left:12,right:12,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer()
 await fs.writeFile('src/static/icons/word-detail/'+name+'.png',cleanPng(png))
 console.log(JSON.stringify({icon:name,width:256,height:256,transparent:true}))
}
