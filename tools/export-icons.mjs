import {mkdirSync} from 'node:fs'
import sharp from 'sharp'
const source=process.argv[2] || 'private/assets/app-logo.png'
mkdirSync('src/static/icons',{recursive:true})
for(const size of [20,29,36,40,48,58,60,72,76,80,87,96,120,128,144,152,167,180,192,512,1024]){
 // Re-encode without keepMetadata; removes EXIF/XMP/C2PA and retains only pixels.
 await sharp(source).resize(size,size,{fit:'cover'}).flatten({background:'#fffdf4'}).png().toFile(`src/static/icons/icon-${size}.png`)
}
await sharp(source).resize(128,128).flatten({background:'#fffdf4'}).png().toFile('src/static/icons/logo-128.png')
