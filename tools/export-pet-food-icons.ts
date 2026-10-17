import {mkdirSync,writeFileSync} from 'node:fs'
import sharp from 'sharp'
import {petFoodIconSvg,type PetFoodIconName} from '../src/services/pet-food-icons'
const directory='src/static/icons/pet-foods'
async function main(){
 mkdirSync(directory,{recursive:true})
 for(const name of ['water','pearl','leaf','feather'] as PetFoodIconName[]){
  writeFileSync(`${directory}/${name}.svg`,petFoodIconSvg(name))
  for(const mode of ['light','dark'])for(const state of ['normal','contrast'])await sharp(Buffer.from(petFoodIconSvg(name,{dark:mode==='dark',highContrast:state==='contrast'}))).resize(192,192).png().toFile(`${directory}/${mode}-${state}-${name}.png`)
 }
 console.log('Exported 4 soft-palette pet-food SVGs and 16 clean PNG fallbacks.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
