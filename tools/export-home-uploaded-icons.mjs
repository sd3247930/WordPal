import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

// The caller supplies six local PNGs named paw, speaker, heading, due, weak and known.
// Uploaded originals stay outside public source; only normalized, metadata-free PNGs are exported.
const directory=process.argv[2]
if(!directory)throw Error('Provide the local directory containing the six named PNG files.')
const targets={
 paw:['src/static/icons/companion/clay-paw.png'],
 speaker:['src/static/icons/controls/clay-speaker-3d.png','src/static/icons/controls/clay-speaker-3d-dark.png'],
 heading:['src/static/icons/home-priority/heading.png'],
 due:['src/static/icons/home-priority/due.png'],
 weak:['src/static/icons/home-priority/weak.png'],
 known:['src/static/icons/home-priority/known.png']
}
function cleanPng(data){
 const chunks=[data.subarray(0,8)]
 for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),end=offset+length+12,type=data.toString('ascii',offset+4,offset+8);if(end>data.length)throw Error('Invalid PNG chunk length.');if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type))chunks.push(data.subarray(offset,end));offset=end}
 return Buffer.concat(chunks)
}
for(const [name,files]of Object.entries(targets)){
 const source=await fs.readFile(path.join(directory,name+'.png')),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 let left=info.width,top=info.height,right=0,bottom=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1)}
 if(right<=left||bottom<=top)throw Error('The supplied icon is empty: '+name)
 // Ignore invisible perimeter noise when measuring; retain the original pixels and soft edge.
 const margin=Math.ceil(Math.max(right-left,bottom-top)*.018),bounds={left:Math.max(0,left-margin),top:Math.max(0,top-margin),width:0,height:0}
 bounds.width=Math.min(info.width,right+margin)-bounds.left;bounds.height=Math.min(info.height,bottom+margin)-bounds.top
 const png=cleanPng(await sharp(source).extract(bounds).resize(232,232,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({top:12,bottom:12,left:12,right:12,background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer())
 for(const file of files){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,png)}
 console.log(JSON.stringify({icon:name,exported:files.length,size:256,bytes:png.length,transparent:true}))
}
