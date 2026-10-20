import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import sharp from 'sharp'

// Original functional vector substitutes; no pixels are taken from design references.
const directory='src/static/icons/home-priority'
mkdirSync(directory,{recursive:true})
function cleanPng(data){
 const chunks=[data.subarray(0,8)]
 for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),end=offset+length+12,type=data.toString('ascii',offset+4,offset+8);if(end>data.length)throw Error('Invalid PNG chunk length.');if(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(type))chunks.push(data.subarray(offset,end));offset=end}
 return Buffer.concat(chunks)
}
for(const name of ['heading','due','weak','known']){
 const svg=readFileSync(`${directory}/${name}.svg`)
 writeFileSync(`${directory}/${name}.png`,cleanPng(await sharp(svg).resize(256,256).png().toBuffer()))
}
console.log('Exported four original home priority vector substitutes at 256px.')
