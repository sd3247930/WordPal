import {mkdirSync,writeFileSync,existsSync} from 'node:fs'
import sharp from 'sharp'
import {petActionIconSvg,petActionIconNames,petActionIconSource} from '../src/services/pet-action-icons'
const directory='src/static/icons/pet-actions'
async function main(){
 mkdirSync(directory,{recursive:true})
 const sources=process.argv[2]
 for(const name of petActionIconNames){
  const target='src'+petActionIconSource(name)
  if(sources){const input=sharp(`${sources}/${name}.png`);if(!(await input.metadata()).hasAlpha)throw new Error('Transparent source required: '+name);await input.trim({threshold:8}).resize(896,896,{fit:'contain',background:'#00000000'}).extend({top:64,bottom:64,left:64,right:64,background:'#00000000'}).png({compressionLevel:9}).toFile(target)}else if(!existsSync(target))throw new Error('Provide high-definition transparent icon masters.')
  writeFileSync(`${directory}/${name}.svg`,petActionIconSvg(name))
  for(const mode of ['light','dark'])for(const state of ['normal','contrast'])await sharp(Buffer.from(petActionIconSvg(name,{dark:mode==='dark',highContrast:state==='contrast'}))).resize(state==='contrast'?256:144,state==='contrast'?256:144).png().toFile(`${directory}/${mode}-${state}-${name}.png`)
 }
 console.log('Preserved five 1024px clay illustrations; exported local contrast and fallback icons.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
