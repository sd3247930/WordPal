import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'

test('家长验证五枚 PNG 尺寸、透明度及公开元数据约束',async()=>{
 for(const name of ['heading','question','answer','refresh','guard']){
  const png=await fs.readFile('src/static/icons/parent-gate/'+name+'.png'),meta=await sharp(png).metadata(),size=name==='heading'?512:256
  assert.equal(meta.width,size);assert.equal(meta.height,size);assert.equal(meta.hasAlpha,true)
  for(let offset=8;offset<png.length;){const length=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8);assert(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(kind),name+':'+kind);offset+=length+12}
 }
})
