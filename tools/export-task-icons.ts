import {mkdirSync,writeFileSync,existsSync} from 'node:fs'
import sharp from 'sharp'
import {taskIconSvg,taskIconNames,taskIconSource} from '../src/services/task-icons'
const directory='src/static/icons/tasks'
async function main(){
 mkdirSync(directory,{recursive:true})
 const sources=process.argv[2]
 for(const name of taskIconNames){
  const target='src'+taskIconSource(name)
  if(sources){const input=sharp(`${sources}/${name}.png`);if(!(await input.metadata()).hasAlpha)throw new Error('Transparent source required: '+name);await input.trim({threshold:8}).resize(896,896,{fit:'contain',background:'#00000000'}).extend({top:64,bottom:64,left:64,right:64,background:'#00000000'}).png({compressionLevel:9}).toFile(target)}else if(!existsSync(target))throw new Error('Provide high-definition transparent task icons.')
  writeFileSync(`${directory}/${name}.svg`,taskIconSvg(name))
  for(const mode of ['light','dark'])for(const state of ['normal','contrast']){
   const size=state==='contrast'?256:144
   await sharp(Buffer.from(taskIconSvg(name,{dark:mode==='dark',highContrast:state==='contrast'}))).resize(size,size).png().toFile(`${directory}/${mode}-${state}-${name}.png`)
  }
 }
 console.log('Preserved four 1024px illustrations; exported accessible task icons and local fallbacks.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
