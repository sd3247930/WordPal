import fs from 'node:fs/promises'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
const root='src/static/pet-house/lifehouse/v5',elements=['water','fire','earth','wind']
const digest=b=>createHash('sha256').update(b).digest('base64')
await fs.mkdir(root,{recursive:true})
if(process.argv.includes('--optimize-transparent')){
 const m=JSON.parse(await fs.readFile(root+'/manifest.json','utf8'));let before=0,after=0
 for(const f of m.files){const previous=await fs.readFile(root+'/'+f.path),{data,info}=await sharp(previous).ensureAlpha().raw().toBuffer({resolveWithObject:true});before+=previous.length;for(let i=0;i<data.length;i+=4)if(data[i+3]===0)data[i]=data[i+1]=data[i+2]=0;const output=await sharp(data,{raw:info}).png({compressionLevel:9}).toBuffer();await fs.writeFile(root+'/'+f.path,output);f.sha256Base64=digest(output);after+=output.length}
 await fs.writeFile(root+'/manifest.json',JSON.stringify(m,null,2)+'\n');console.log({beforeBytes:before,afterBytes:after,visiblePixelsUnchanged:true})
}else if(process.argv.includes('--check')){
 const m=JSON.parse(await fs.readFile(root+'/manifest.json','utf8'));if(m.files.length!==24)throw Error('Expected 24 foregrounds')
 for(const f of m.files){const b=await fs.readFile(root+'/'+f.path),meta=await sharp(b).metadata();if(digest(b)!==f.sha256Base64||meta.width!==1536||meta.height!==1024||!meta.hasAlpha||meta.exif||meta.xmp||b.includes(Buffer.from('caBX')))throw Error('Invalid foreground: '+f.id)}console.log('24 HD foregrounds verified, metadata clean')
}else{
 if(await fs.stat(root+'/manifest.json').catch(()=>false))throw Error('Published V5 assets are immutable; use --check')
 const files=[]
 for(const e of elements)for(let level=0;level<=5;level++){
  const source='src/static/pet-house/lifehouse/v2/rooms/'+e+'/l'+level+'.jpg',bytes=await fs.readFile(source),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  // Extract only reviewed near-edge material from the existing clean HD scene.
  // Keep the full coordinate plane: no background stretching or reference-sheet crops.
  const inset={water:.055,fire:.045,earth:.065,wind:.075}[e],edge=level>=4?.955:.975
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const u=x/info.width,v=y/info.height,side=v>.78&&(u<inset*(v-.78)/.22||u>1-inset*(v-.78)/.22),front=v>edge+.008*Math.sin(u*Math.PI);if(!side&&!front){const at=(y*info.width+x)*4;data[at]=data[at+1]=data[at+2]=data[at+3]=0}}
  const output=await sharp(data,{raw:info}).png({compressionLevel:9}).toBuffer(),id=`fixed-${e}-l${level}-front`,file={id,path:id+'.png',width:info.width,height:info.height,sourceKey:`room-${e}-l${level}:stage`,sourceSHA256Base64:digest(bytes),sha256Base64:digest(output)}
  await fs.writeFile(root+'/'+file.path,output);files.push(file)
 }
 await fs.writeFile(root+'/manifest.json',JSON.stringify({schemaVersion:1,assetVersion:5,metadataClean:true,files},null,2)+'\n');console.log({foregrounds:files.length,source:'existing published clean room assets'})
}
