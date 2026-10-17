import {mkdirSync,existsSync,writeFileSync} from 'node:fs'
import sharp from 'sharp'
import {petStatusNames} from '../src/services/pet-status'
import {petStatusIconSource,petStatusIconSvg} from '../src/services/pet-status-icons'
async function main(){
 const sources=process.argv[2],directory='src/static/icons/pet-status';mkdirSync(directory,{recursive:true})
 for(const name of petStatusNames){
  const target='src'+petStatusIconSource(name)
  if(sources){const input=sharp(`${sources}/${name}.png`);if(!(await input.metadata()).hasAlpha)throw new Error('Transparent master required: '+name);await input.trim({threshold:8}).resize(896,896,{fit:'contain',background:'#00000000'}).extend({top:64,bottom:64,left:64,right:64,background:'#00000000'}).png({compressionLevel:9}).toFile(target)}else if(!existsSync(target))throw new Error('Provide transparent icon masters.')
  writeFileSync(`${directory}/${name}.svg`,petStatusIconSvg(name))
  for(const dark of [false,true])await sharp(Buffer.from(petStatusIconSvg(name,dark))).resize(256,256).png().toFile('src'+petStatusIconSource(name,true,dark))
 }
 console.log('Four transparent HD icons and eight contrast variants prepared without source metadata.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
