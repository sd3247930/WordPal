import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
const sourceRoot=process.argv[2]||'private'
const sources={water:'1-月光深海中的珍珠人鱼.png',fire:'2-辉耀烈焰中的可爱凤凰.png',earth:'3-月光森林中的水晶鹿灵.png',wind:'4-紫晶星环中的幻翼精灵.png'}
fs.mkdirSync('src/static/pets/avatars',{recursive:true})
for(const [element,name] of Object.entries(sources)){
 const source=path.join(sourceRoot,name)
 // Re-encoding without withMetadata drops C2PA, EXIF and source identifiers.
 await sharp(source).resize({width:512}).png({palette:true,colours:256}).toFile('src/static/pets/'+element+'.png')
 await sharp(source).extract({left:100,top:100,width:880,height:880}).resize(160,160).png({palette:true,colours:256}).toFile('src/static/pets/avatars/'+element+'.png')
}
console.log('Four pet portraits and avatars exported.')
