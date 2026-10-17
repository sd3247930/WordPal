// 本机真机验证夹具：生成一份带音频与图片的课程包，并落到真机媒体目录。
// 仅用于本机验收，不参与构建，也不写入 private/。
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import os from 'node:os'

const sha256Hex=(bytes)=>createHash('sha256').update(Buffer.from(bytes)).digest('hex')
const courseId=process.argv[2]||'device-media-test'
const outRoot=path.join(os.tmpdir(),'wordpal-device','media-fixture')

const audioBytes=Buffer.concat([Buffer.from('ID3\x03\x00\x00\x00','binary'),Buffer.alloc(2048,7),Buffer.from('WORDPAL-FIXTURE-AUDIO')])
const imageBytes=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(64,0),Buffer.from('WEBPVP8 '),Buffer.alloc(4096,11),Buffer.from('WORDPAL-FIXTURE-IMAGE')])

const assets=[
 {id:'audio-u01-dev-fixture',path:'audio/u01_dev_fixture.mp3',mediaType:'audio/mpeg',bytes:audioBytes.length,sha256:sha256Hex(audioBytes),sourceId:'device-fixture',license:'本机验收夹具，不可再分发'},
 {id:'image-u01-dev-fixture',path:'images/u01_dev_fixture.webp',mediaType:'image/webp',bytes:imageBytes.length,sha256:sha256Hex(imageBytes),sourceId:'device-fixture',license:'本机验收夹具，不可再分发'}
]

const words=[
 {id:'dev-fixture-alpha',language:'en',lemma:'alpha',meaning:'阿尔法（夹具）',pos:'n.',sourceId:'device-fixture',order:1,learningLevel:1,phonics:['a','l','ph','a'],phonemes:['/æ/','/l/','/f/','/ə/'],syllables:['al','pha'],assetRefs:{audio:'audio-u01-dev-fixture',image:'image-u01-dev-fixture'}},
 {id:'dev-fixture-bravo',language:'en',lemma:'bravo',meaning:'太棒了（夹具）',pos:'int.',sourceId:'device-fixture',order:2,learningLevel:1,phonics:['b','r','a','v','o'],phonemes:['/b/','/r/','/ɑː/','/v/','/əʊ/'],syllables:['bra','vo']},
 {id:'dev-fixture-charlie',language:'en',lemma:'charlie',meaning:'查理（夹具）',pos:'n.',sourceId:'device-fixture',order:3,learningLevel:1,phonics:['ch','a','r','l','ie'],phonemes:['/tʃ/','/ɑː/','/r/','/l/','/i/'],syllables:['char','lie']}
]

const pack={
 schemaVersion:2,courseId,contentVersion:'1.0.0',title:'真机媒体删除测试（夹具）',route:'theme',abilityLevels:['L1'],
 sources:[{id:'device-fixture',type:'author-created',rightsStatus:'private-use-declared',attribution:'WordPal 真机验收夹具，仅本机使用',revision:'device-fixture-1',textLicense:'本项目自建验收内容'}],
 vocabulary:words,
 units:[{id:'du01',title:'夹具单元',lessons:[{id:'dl01',title:'夹具课节',wordIds:words.map(w=>w.id),activities:['flash','connect','listen','spell']}]}],
 assets
}

const serialized=JSON.stringify(pack)
const key='wordpal.content.pack.'+courseId+'.'+sha256Hex(serialized).slice(0,16)
const dashed=key.replace(/[^a-z0-9-]/g,'-')
const packDir=path.join(outRoot,dashed)
fs.rmSync(outRoot,{recursive:true,force:true})
fs.mkdirSync(path.join(packDir,'audio'),{recursive:true})
fs.mkdirSync(path.join(packDir,'images'),{recursive:true})
fs.writeFileSync(path.join(packDir,'audio','u01_dev_fixture.mp3'),audioBytes)
fs.writeFileSync(path.join(packDir,'images','u01_dev_fixture.webp'),imageBytes)
fs.writeFileSync(path.join(packDir,'manifest.json'),serialized)
fs.writeFileSync(path.join(outRoot,'fixture.json'),JSON.stringify({
 key,packDirName:dashed,serialized,pack,
 catalogEntry:{courseId,key,archived:false,aliases:{}},
 wordIds:words.map(w=>w.id),
 mediaFiles:assets.map(a=>({path:'wordpal/packs/'+dashed+'/'+a.path,bytes:a.bytes,sha256:a.sha256}))
},null,1))
console.log('fixture ok')
console.log('key:',key)
console.log('staging:',packDir)
console.log('manifest bytes:',serialized.length)
