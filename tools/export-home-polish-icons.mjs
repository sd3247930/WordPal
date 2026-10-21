import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
const directory=process.argv[2]
if(!directory)throw Error('Provide a directory with transparent smile.png and accuracy.png inputs.')
const targets={smile:'src/static/icons/companion/clay-smile.png',accuracy:'src/static/icons/home-learning-data/accuracy.png'}
for(const [name,target]of Object.entries(targets)){
 const source=await fs.readFile(path.join(directory,name+'.png')),meta=await sharp(source).metadata()
 if(!meta.hasAlpha)throw Error('A transparent input is required for '+name)
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let left=info.width,top=info.height,right=0,bottom=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1)}
 if(right<=left||bottom<=top)throw Error('Empty icon: '+name)
 const margin=Math.ceil(Math.max(right-left,bottom-top)*.018),bounds={left:Math.max(0,left-margin),top:Math.max(0,top-margin),width:0,height:0}
 bounds.width=Math.min(info.width,right+margin)-bounds.left;bounds.height=Math.min(info.height,bottom+margin)-bounds.top
 const png=await sharp(source).extract(bounds).resize(232,232,{fit:'contain',background:'#00000000'}).extend({top:12,bottom:12,left:12,right:12,background:'#00000000'}).png({compressionLevel:9}).toBuffer(),chunks=[png.subarray(0,8)]
 for(let offset=8;offset<png.length;){const size=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);if(['IHDR','IDAT','IEND','PLTE','tRNS'].includes(type))chunks.push(png.subarray(offset,offset+size+12));offset+=size+12}
 await fs.writeFile(target,Buffer.concat(chunks));console.log(JSON.stringify({icon:name,size:256,metadataRemoved:true}))
}
