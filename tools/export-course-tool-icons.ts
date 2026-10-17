import {mkdirSync,writeFileSync,existsSync} from 'node:fs'
import sharp from 'sharp'
import {courseToolIconSvg,courseToolIconNames,courseToolIconSource} from '../src/services/course-tool-icons'
const directory='src/static/icons/course-tools'
async function main(){
 mkdirSync(directory,{recursive:true})
 for(const name of courseToolIconNames){
  const target='src'+courseToolIconSource(name),sources=process.argv[2]
  if(sources){const input=sharp(`${sources}/${name}.png`);if(!(await input.metadata()).hasAlpha)throw new Error('Transparent source required: '+name);await input.trim({threshold:8}).resize(896,896,{fit:'contain',background:'#00000000'}).extend({top:64,bottom:64,left:64,right:64,background:'#00000000'}).png({compressionLevel:9}).toFile(target)}else if(!existsSync(target))throw new Error('Provide high-definition transparent course tool icons.')
  writeFileSync(`${directory}/${name}.svg`,courseToolIconSvg(name))
  for(const mode of ['light','dark'])for(const state of ['normal','contrast']){const size=state==='contrast'?256:168;await sharp(Buffer.from(courseToolIconSvg(name,{dark:mode==='dark',highContrast:state==='contrast'}))).resize(size,size).png().toFile(`${directory}/${mode}-${state}-${name}.png`)}
 }
 console.log('Preserved four 1024px transparent icons; exported accessible course tools and clean PNG fallbacks.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
