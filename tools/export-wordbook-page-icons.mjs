import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const directory=process.argv[2]
if(!directory)throw Error('Provide the local directory containing the ten supplied wordbook icons.')
const sources=[
 ['01我的单词本.png','wordbook-page/heading',[256]],
 ['02当前教材.png','wordbook-scopes/wordpal_scope_current_textbook',[1024,256]],
 ['03全部单词.png','wordbook-scopes/wordpal_scope_installed_textbooks',[1024,256]],
 ['04外研三起点.png','wordbook-page/course',[256]],
 ['05复习当前教材.png','wordbook-page/due',[256]],
 ['06学习情况统计.png','wordbook-page/overview',[256]],
 ['07到期复习.png','wordbook-categories/wordpal_wordbook_due_review',[1024,256]],
 ['08重点复习.png','wordbook-categories/wordpal_wordbook_key_review',[1024,256]],
 ['09错词本.png','wordbook-categories/wordpal_wordbook_wrong_words',[1024,256]],
 ['10所有单词.png','wordbook-categories/wordpal_wordbook_all_words',[1024,256]]
]
function cleanPng(data){
 const chunks=[data.subarray(0,8)]
 for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),end=offset+length+12,type=data.toString('ascii',offset+4,offset+8);if(end>data.length)throw Error('Invalid PNG chunk length.');if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type))chunks.push(data.subarray(offset,end));offset=end}
 return Buffer.concat(chunks)
}
for(const [file,target,sizes]of sources){
 const source=await fs.readFile(path.join(directory,file)),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let left=info.width,top=info.height,right=0,bottom=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1)}
 if(right<=left||bottom<=top)throw Error('The supplied icon is empty: '+target)
 for(const size of sizes){
  const output='src/static/icons/'+target+(sizes.length>1?'_'+size:'')+'.png',backup='.tmp/wordbook-icons-before/'+path.basename(output)
  await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(path.dirname(backup),{recursive:true})
  try{await fs.copyFile(output,backup,fs.constants.COPYFILE_EXCL)}catch(error){if(!['ENOENT','EEXIST'].includes(error.code))throw error}
  const margin=Math.round(size*12/256),contentSize=size-margin*2
  const png=await sharp(source).extract({left,top,width:right-left,height:bottom-top}).resize(contentSize,contentSize,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({top:margin,bottom:margin,left:margin,right:margin,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer()
  await fs.writeFile(output,cleanPng(png))
  console.log(JSON.stringify({icon:target,size,transparent:true}))
 }
}
