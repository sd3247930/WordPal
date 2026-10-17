import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import sharp from 'sharp'
import {petDressIconSvg,petDressIconSource,petDressIconNames} from '../src/services/pet-dress-icons'
const directory='src/static/icons/pet-dress'
async function main(){
 mkdirSync(directory,{recursive:true})
 for(const name of petDressIconNames){
  writeFileSync(`${directory}/${name}.svg`,petDressIconSvg(name))
  // The normal illustration is a clean bitmap master. Never replace it with a vector fallback.
  const master=readFileSync(`${directory}/light-normal-${name}.png`)
  if((await sharp(master).metadata()).width!==1024)throw new Error('Missing high-definition icon master: '+name)
  for(const dark of [false,true]){
   await sharp(master).png({compressionLevel:9}).toFile('src'+petDressIconSource(name,{dark}))
   await sharp(Buffer.from(petDressIconSvg(name,{dark,highContrast:true}))).resize(512,512).png({compressionLevel:9}).toFile('src'+petDressIconSource(name,{dark,highContrast:true}))
  }
 }
 console.log('Preserved three 1024px illustrations and exported accessible theme variants.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
