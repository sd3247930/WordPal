import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,realpathSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'

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
