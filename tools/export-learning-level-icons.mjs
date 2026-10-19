import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const source=process.argv[2]
if(!source)throw new Error('Provide the directory containing the five approved level PNGs.')
const levels=[['L1初级入门.png','wordpal_level_l1_beginner.png'],['L2基础巩固.png','wordpal_level_l2_foundation.png'],['L3稳步提升.png','wordpal_level_l3_growth.png'],['L4强化训练.png','wordpal_level_l4_training.png'],['L5进阶挑战.png','wordpal_level_l5_challenge.png']]
const destination='src/static/icons/learning-levels'
const sources=await Promise.all(levels.map(async([name])=>{const data=await fs.readFile(path.join(source,name)),meta=await sharp(data).metadata();if(!meta.hasAlpha||!meta.width||meta.width!==meta.height||meta.width<1024)throw new Error('Level assets must be square HD PNGs with transparency.');return data}))
await fs.mkdir(destination,{recursive:true})
for(const [index,[,name]] of levels.entries()){
 // Decode and re-export without source C2PA/EXIF/text chunks; preserve the artwork and alpha.
 const output=await sharp(sources[index]).resize(1024,1024,{fit:'contain',withoutEnlargement:true}).png({compressionLevel:9}).toBuffer()
 await fs.writeFile(path.join(destination,name),output)
}
console.log('Exported five clean 1024px transparent learning level icons.')
