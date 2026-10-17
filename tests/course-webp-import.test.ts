import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {sha256} from '../src/services/content/digest'
import {makeZip,readZip} from '../src/services/course-import/ZipImporter'
import type {CoursePack} from '../packages/content_schema/course'

function archive(bytes:Uint8Array){
 const pack:CoursePack={schemaVersion:2,courseId:'webp-test',contentVersion:'1.0.0',title:'合成图片验证课',route:'theme',abilityLevels:['L1'],
  sources:[{id:'synthetic',type:'author-created',rightsStatus:'private-use-declared',attribution:'自动生成的纯色测试图片'}],
  vocabulary:[{id:'blue-tile',language:'en',lemma:'blue',meaning:'蓝色',sourceId:'synthetic',assetRefs:{image:'blue-image'}}],
  units:[{id:'u01',title:'颜色',lessons:[{id:'l01',title:'蓝色',wordIds:['blue-tile']}]}],
  assets:[{id:'blue-image',path:'images/blue.webp',mediaType:'image/webp',bytes:bytes.length,sha256:sha256(bytes),sourceId:'synthetic',license:'原创合成测试图片'}]}
 return makeZip(pack,{'images/blue.webp':bytes})
}

// 有损、无损和含透明通道的 WebP 均应走正式课程 ZIP 导入路径。
test('ZIP 可以导入带真实 WebP 图片的课程',async()=>{
 for(const options of [{quality:80},{lossless:true},{quality:80,alphaQuality:80}]){
  const image=await sharp({create:{width:20,height:16,channels:4,background:{r:20,g:80,b:200,alpha:.8}}}).webp(options).toBuffer()
  const result=readZip(archive(image))
  assert.equal(result.pack.assets[0].mediaType,'image/webp')
  assert.deepEqual(Buffer.from(result.files['images/blue.webp']),image)
 }
})

// 即使清单摘要被同时改写，也不能把其他类型文件伪装成 WebP。
test('ZIP 拒绝以 WebP 声明的 PNG 和 WAV',async()=>{
 const png=await sharp({create:{width:8,height:8,channels:3,background:'blue'}}).png().toBuffer()
 const wav=Buffer.alloc(32);wav.write('RIFF');wav.write('WAVE',8)
 for(const bytes of [png,wav])assert.throws(()=>readZip(archive(bytes)),/格式不一致/)
})

test('ZIP 拒绝 RIFF 长度损坏或截断的 WebP',async()=>{
 const good=await sharp({create:{width:8,height:8,channels:3,background:'blue'}}).webp().toBuffer()
 const broken=Buffer.from(good);broken.writeUInt32LE(good.length,4)
 for(const bytes of [broken,good.subarray(0,16)])assert.throws(()=>readZip(archive(bytes)),/格式不一致/)
})
