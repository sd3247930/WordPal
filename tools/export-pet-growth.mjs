import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const sourceRoot=process.argv[2]||'private/图片/成长'
const cleanedRoot=process.argv[3]||'private/verification/pet-growth/cleaned-inputs'
const directory='src/static/pet-house/growth'
const sources={water:'水象精灵',fire:'火象精灵',earth:'土象精灵',wind:'风象精灵'}
const stages=['juvenile','growing','evolved','unknown'],only=process.argv[4]
if(only&&!stages.includes(only))throw new Error('Unknown form filter.')
fs.mkdirSync(directory,{recursive:true})
for(const [element,folder] of Object.entries(sources))for(const [index,stage] of stages.entries()){
 if(only&&stage!==only)continue
 const files=fs.readdirSync(path.join(sourceRoot,folder)),file=files.find(name=>name.startsWith('0'+(index+1)))
 if(!file)throw new Error('Missing growth source: '+element+'/'+stage)
 let source=path.join(sourceRoot,folder,file)
 if(!(await sharp(source).metadata()).hasAlpha){
  source=path.join(cleanedRoot,element+'-'+stage+'.png')
  if(!fs.existsSync(source)||!(await sharp(source).metadata()).hasAlpha)throw new Error('Provide a reviewed transparent master for '+element+'/'+stage)
 }
 // Export only reviewed visible forms. Re-encoding strips EXIF, C2PA and source identifiers.
 await sharp(source).trim({threshold:5}).resize(896,1216,{fit:'contain',background:'#00000000'}).extend({top:32,bottom:32,left:32,right:32,background:'#00000000'}).png({compressionLevel:9}).toFile(path.join(directory,element+'-'+stage+'.png'))
}
console.log(`Exported ${only?4:16} clean HD growth sprites (960 × 1280).`)
