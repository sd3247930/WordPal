import {mkdirSync,writeFileSync,existsSync} from 'node:fs'
import sharp from 'sharp'
import {petGrowthIconNames,petGrowthIconSource,petGrowthContrastSvg} from '../src/services/pet-growth-icons'
async function main(){
 const sources=process.argv[2],directory='src/static/icons/pet-growth';mkdirSync(directory,{recursive:true})
 for(const name of petGrowthIconNames){
  const target='src'+petGrowthIconSource(name)
  if(sources){const input=sharp(`${sources}/${name}.png`);if(!(await input.metadata()).hasAlpha)throw new Error('Transparent icon required: '+name);await input.resize(1024,1024,{fit:'contain',background:'#00000000'}).png({compressionLevel:9}).toFile(target)}else if(!existsSync(target))throw new Error('Provide transparent icon masters.')
  for(const dark of [false,true])await sharp(Buffer.from(petGrowthContrastSvg(name,dark))).resize(256,256).png().toFile('src'+petGrowthIconSource(name,true,dark))
  writeFileSync(`${directory}/${name}.svg`,petGrowthContrastSvg(name))
 }
 console.log('Prepared five HD illustrations and ten accessible local variants without metadata.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
