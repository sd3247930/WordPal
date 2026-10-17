import {existsSync,mkdirSync,writeFileSync} from 'node:fs'
import sharp from 'sharp'
import {petHomeLearningIconSource,petHomeLearningContrastSvg,type PetHomeLearningIconName} from '../src/services/pet-home-learning-icons'
const directory='src/static/icons/pet-home-learning'
const sources=process.argv[2]
const only=process.argv[3],names:PetHomeLearningIconName[]=['practice','complete','spelling','together']
async function main(){
 if(only&&!names.includes(only as PetHomeLearningIconName))throw new Error('Unknown icon name.')
 mkdirSync(directory,{recursive:true})
 for(const name of names.filter(name=>!only||name===only)){
  const target='src'+petHomeLearningIconSource(name)
  if(sources){
   const source=sharp(`${sources}/${name}.png`),metadata=await source.metadata()
   if(!metadata.hasAlpha)throw new Error('A transparent source is required for '+name)
   await source.trim({threshold:8}).resize(448,448,{fit:'contain',background:'#00000000'}).extend({top:32,bottom:32,left:32,right:32,background:'#00000000'}).png({compressionLevel:9}).toFile(target)
  }else if(!existsSync(target))throw new Error('Provide a source directory containing transparent icon masters.')
  writeFileSync(`${directory}/${name}.svg`,petHomeLearningContrastSvg(name))
  for(const mode of ['light','dark'])await sharp(Buffer.from(petHomeLearningContrastSvg(name,{dark:mode==='dark'}))).resize(288,288).png().toFile(`${directory}/${mode}-contrast-${name}.png`)
 }
 console.log('Prepared '+(only?'one':'four')+' high-definition learning icons and their high-contrast PNGs without source metadata.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
