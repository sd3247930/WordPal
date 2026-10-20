import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,realpathSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import sharp from 'sharp'
import {spiritStoneArtwork,verifySpiritStoneArtwork} from '../tools/lib/spirit-stone-artwork.mjs'

test('公开水晶图片可独立解码，透明像素导出没有私有元数据',async()=>{
 verifySpiritStoneArtwork((file:string)=>readFileSync(path.join('src',file)))
 for(const {file,size} of spiritStoneArtwork){
  const {data,info}=await sharp(path.join('src',file)).raw().toBuffer({resolveWithObject:true})
  assert.equal(info.width,size);assert.equal(info.height,size);assert.equal(info.channels,4)
  assert.ok(data.some((value:number,index:number)=>index%4===3&&value===0),'Artwork needs transparent padding.')
  assert.ok(data.some((value:number,index:number)=>index%4===3&&value===255),'Artwork must contain visible pixels.')
 }
})

test('公开发布检查拒绝遗漏、损坏或带额外元数据的水晶图',()=>{
 const read=(file:string)=>readFileSync(path.join('src',file))
 assert.throws(()=>verifySpiritStoneArtwork(()=>Buffer.alloc(0)),/Invalid spirit-stone PNG/)
 assert.throws(()=>verifySpiritStoneArtwork((file:string)=>read(file).subarray(0,30)),/Truncated|Unexpected/)
 assert.throws(()=>verifySpiritStoneArtwork((file:string)=>{const bytes=read(file);bytes[48]^=1;return bytes}),/differs from reviewed source/)
 assert.throws(()=>verifySpiritStoneArtwork((file:string)=>{
  const bytes=read(file),chunk=Buffer.alloc(12);chunk.write('tEXt',4,'ascii')
  return Buffer.concat([bytes.subarray(0,-12),chunk,bytes.subarray(-12)])
 }),/Unexpected spirit-stone PNG chunk/)
})

test('本机水晶素材阻断默认公开构建，明确本机打包才允许包含',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'wordpal-stone-release-')),script=path.resolve('tools/prepare-local-content.mjs'),env={...process.env};delete env.VITE_WORDPAL_LOCAL_CONTENT
 const run=(local=false)=>spawnSync(process.execPath,[script,'--release'],{cwd:root,env:{...env,...(local?{VITE_WORDPAL_LOCAL_CONTENT:'1'}:{})},encoding:'utf8'})
 try{
  assert.equal(run().status,0)
  const media=path.join(root,'src/static/local-spirit-stone');mkdirSync(media,{recursive:true});writeFileSync(path.join(media,'sample.png'),'local-only-fixture')
  const blocked=run();assert.notEqual(blocked.status,0);assert.ok(blocked.stderr.includes('私有素材尚未授权再分发'));assert.equal(run(true).status,0)
 }finally{
  const relative=path.relative(realpathSync(tmpdir()),realpathSync(root));if(relative.startsWith('..')||path.isAbsolute(relative)||!relative.startsWith('wordpal-stone-release-'))throw Error('Unexpected cleanup target.')
  rmSync(root,{recursive:true,force:true})
 }
})
