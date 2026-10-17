import {mkdir} from 'node:fs/promises'
import sharp from 'sharp'
import {elements} from '../packages/pet_engine'
import {petDressIconNames} from '../src/services/pet-dress-icons'
import {petWearableSource,petWearableSvg} from '../src/services/pet-wearables'
import type {PetForm} from '../src/services/pet-growth'
async function main(){
await mkdir('src/static/pet-house/wearables',{recursive:true})
for(const element of elements)for(const form of [1,2,3,4] as PetForm[])for(const item of petDressIconNames)for(const layer of ['back','front'] as const){
 // Re-encoding emits only image data, with no source metadata or external references.
 await sharp(Buffer.from(petWearableSvg(element,form,item,layer))).png({compressionLevel:9}).toFile('src'+petWearableSource(element,form,item,layer))
}
console.log('Exported 48 fitted outfits with separate front and back layers.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
