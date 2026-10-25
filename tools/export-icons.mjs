import {mkdirSync} from 'node:fs'
import sharp from 'sharp'
const source=process.argv[2] || 'private/assets/element-magic-book.png'
mkdirSync('src/static/icons',{recursive:true})
for(const size of [20,29,36,40,48,58,60,72,76,80,87,96,120,128,144,152,167,180,192,512,1024]){
 // Preserve the complete artwork and a small launcher margin; iOS requires an opaque square.
 const artwork=Math.round(size*.9),inset=Math.floor((size-artwork)/2)
 const pixels=await sharp(source).resize(artwork,artwork,{fit:'contain',background:'#00000000'})
  .extend({top:inset,left:inset,bottom:size-artwork-inset,right:size-artwork-inset,background:'#00000000'})
  .png().toBuffer()
 await sharp(pixels).flatten({background:'#fffdf4'}).removeAlpha().png().toFile(`src/static/icons/icon-${size}.png`)
}
// Header/sidebar variants share the same source, retain transparency and have no launcher tile.
for(const size of [128,256])await sharp(source).resize(size,size,{fit:'contain',background:'#00000000'}).png().toFile(`src/static/icons/logo-${size}.png`)
