import sharp from 'sharp'
import {mkdir,stat} from 'node:fs/promises'
import {resolve} from 'node:path'

// Pass eight name/source pairs. Originals stay outside the public asset directory.
const args=process.argv.slice(2)
if(args.length!==16)throw new Error('Expected eight asset name/source pairs')
const output=resolve('src/static/pet-house');await mkdir(output,{recursive:true})
for(let i=0;i<args.length;i+=2){
 const [name,source]=args.slice(i,i+2)
 if(!/^(water|fire|earth|wind)-(pet|scene)$/.test(name))throw new Error('Unknown asset name')
 const isPet=name.endsWith('-pet'),target=resolve(output,name+(isPet?'.png':'.jpg'))
 const input=sharp(source);const metadata=await input.metadata()
 if(isPet&&!metadata.hasAlpha)throw new Error('Character must have genuine transparency')
 if(isPet)await input.resize({width:512,height:684,fit:'inside',withoutEnlargement:true}).png({compressionLevel:9,palette:true,quality:90,colours:256,dither:.3}).toFile(target)
 else await input.resize({width:1024,withoutEnlargement:true}).jpeg({quality:82,mozjpeg:true}).toFile(target)
 const clean=await sharp(target).metadata()
 if(clean.exif||clean.xmp||clean.iptc)throw new Error('Unexpected image metadata')
 console.log(name,clean.width+'×'+clean.height,Math.round((await stat(target)).size/1024)+' KiB',isPet?'alpha retained':'clean JPEG')
}
