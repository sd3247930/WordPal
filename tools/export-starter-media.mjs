import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {unzipSync} from 'fflate'
import sharp from 'sharp'

// Input stays local. Only reviewed illustrations are exported; dictionary recordings stay private.
const input=process.argv[2]
if(!input)throw new Error('请提供本机原创启蒙课程 ZIP 的相对路径。')
const files=unzipSync(await fs.readFile(input)),manifest=JSON.parse(new TextDecoder().decode(files['manifest.json']))
const legacy=JSON.parse(await fs.readFile('src/content/starter.json','utf8'))
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
for(const asset of manifest.assets){const bytes=files[asset.path];if(!bytes||bytes.length!==asset.bytes||hash(bytes)!==asset.sha256)throw new Error('课程 ZIP 资源校验失败：'+asset.id)}
const sourceId='wordpal-starter-illustrations'
const license='项目用户提供并授权随 WordPal 应用及公开仓库发布；不另行授予素材独立使用权。'
const assets=[],vocabulary=[],output='src/static/starter-media/images'
await fs.mkdir(output,{recursive:true})
for(const word of legacy.words){
 const matches=manifest.vocabulary.filter(entry=>entry.lemma===word.word)
 if(matches.length!==1)throw new Error('课程 ZIP 词条不唯一或缺失：'+word.id)
 const image=manifest.assets.find(asset=>asset.id===matches[0].assetRefs?.image)
 if(!image||image.mediaType!=='image/webp')throw new Error('课程 ZIP 配图不完整：'+word.id)
 const original=Buffer.from(files[image.path]),metadata=await sharp(original).metadata()
 if(metadata.width!==512||metadata.height!==512||metadata.exif||metadata.xmp||metadata.icc)throw new Error('请先审核配图规格与元数据：'+word.id)
 // Restrict WebP to image chunks so C2PA / EXIF / XMP cannot cross the private boundary.
 for(let offset=12;offset+8<=original.length;){const kind=original.toString('ascii',offset,offset+4),size=original.readUInt32LE(offset+4);if(!['VP8 ','VP8L','VP8X','ALPH'].includes(kind)||offset+8+size>original.length)throw new Error('配图包含未审核的 WebP 块：'+word.id);offset+=8+size+(size%2)}
 const imagePath='starter-media/images/'+word.id+'.webp'
 await fs.writeFile(path.join('src/static',imagePath),original)
 const audioPath=word.audio.replace(/^\/static\//,''),audio=await fs.readFile(path.join('src/static',audioPath))
 assets.push({id:'audio-'+word.id,path:audioPath,mediaType:'audio/wav',bytes:audio.length,sha256:hash(audio),sourceId:'wordpal-original',license:legacy.license},{id:'image-'+word.id,path:imagePath,mediaType:'image/webp',bytes:original.length,sha256:hash(original),sourceId,license})
 vocabulary.push({id:word.id,assetRefs:{audio:'audio-'+word.id,image:'image-'+word.id}})
}
await fs.writeFile('src/content/starter-media.json',JSON.stringify({contentVersion:'1.2.0',sources:[{id:sourceId,type:'user-provided',rightsStatus:'redistribution-approved',attribution:'项目用户提供的原创启蒙课程 20 张插画，逐图核验无个人信息；已清除来源与附加元数据。',textLicense:'仅媒体来源记录，课程文字沿用 WordPal 原创示例。',imageLicense:license,revision:'starter-illustrations-1',declaredAt:'2026-10-25'}],vocabulary,assets},null,2)+'\n')
console.log('已核验 ZIP 并导出 20 张配图；保留既有内置音频与全部学习身份。')
