import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import type {Word} from '../packages/core_learning'
import {detailExamples,detailPronunciations,wordDetailIcons,wordDetailIcon} from '../src/services/word-detail-presentation'
const word=(extra:Partial<Word>={}):Word=>({id:'detail-synthetic',word:'doctor',meaning:'合成释义',ipa:'/test/',pos:'',audio:'/static/audio/apple.wav',image:'',example:'',unit:'',lesson:'',phonics:[],phonemes:[],syllables:[],difficulty:1,distractors:[],...extra})

test('详情例句只展示已有文本，英文与译文精确配对，缺失不补造',()=>{
 assert.deepEqual(detailExamples(word()),[])
 const source=word({example:'A supplied sentence.',examples:[{en:'Another supplied sentence.',zh:'另一合成译文'},{en:'Another supplied sentence.',zh:'另一合成译文'}]})
 const before=JSON.stringify(source)
 assert.deepEqual(detailExamples(source),[{en:'A supplied sentence.',zh:''},{en:'Another supplied sentence.',zh:'另一合成译文'}]);assert.equal(JSON.stringify(source),before)
 assert.deepEqual(detailExamples(word({example:'Same.',examples:[{en:'Same.',zh:'合成译文'}]})),[{en:'Same.',zh:'合成译文'}])
})
test('主发音和音标不重复；不同口音及只有音标的真实差异保留',()=>{
 assert.deepEqual(detailPronunciations(word({audioUS:'/static/audio/apple.wav',phoneticUS:'/test/'})),[])
 assert.deepEqual(detailPronunciations(word({audioUK:'/uk.wav',audioUS:'/us.wav',phoneticUK:'/uk/',phoneticUS:'/test/'})),[{label:'英式发音',url:'/uk.wav',ipa:'/uk/'},{label:'美式发音',url:'/us.wav',ipa:''}])
 assert.deepEqual(detailPronunciations(word({audioUK:'/other.wav',audioUS:'/other.wav',phoneticUS:'/us/'})),[{label:'英式发音',url:'/other.wav',ipa:''},{label:'美式发音',url:'',ipa:'/us/'}])
})
test('十三枚详情图标均为真实透明 PNG，尺寸足够且无内容凭证/EXIF/文本元数据',async()=>{
 assert.equal(Object.keys(wordDetailIcons).length,13)
 for(const name of Object.keys(wordDetailIcons) as (keyof typeof wordDetailIcons)[]){
  const data=await fs.readFile('src'+wordDetailIcon(name)),meta=await sharp(data).metadata()
  assert.equal(meta.width,256);assert.equal(meta.height,256);assert.equal(meta.hasAlpha,true)
  for(let offset=8;offset<data.length;){const size=data.readUInt32BE(offset),kind=data.toString('ascii',offset+4,offset+8);assert(['IHDR','PLTE','tRNS','IDAT','IEND'].includes(kind),name+':'+kind);offset+=size+12}
 }
})
