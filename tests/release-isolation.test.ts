import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'

function fixture(run:(root:string)=>void){
 const root=mkdtempSync(path.join(tmpdir(),'wordpal-release-check-'))
 try{run(root)}finally{
  const relative=path.relative(realpathSync(tmpdir()),realpathSync(root))
  if(relative.startsWith('..')||path.isAbsolute(relative)||!relative.startsWith('wordpal-release-check-'))throw Error('Unexpected test cleanup target.')
  rmSync(root,{recursive:true,force:true})
 }
}
const check=(root:string)=>spawnSync(process.execPath,['tools/check-release-isolation.mjs',root],{encoding:'utf8'})
test('发布检查递归接受正常构建文件',()=>fixture(root=>{
 mkdirSync(path.join(root,'assets'));writeFileSync(path.join(root,'assets','app.js'),'const theme="clay";');assert.equal(check(root).status,0)
}))
test('发布检查拒绝测试开关或合成教材，即使位于嵌套产物中',()=>fixture(root=>{
 mkdirSync(path.join(root,'assets'))
 for(const marker of ['wordpal.test.synthetic-course','wordpal.test.textbook-series','synthetic-quartz','synthetic-archived','synthetic-textbook']){
  writeFileSync(path.join(root,'assets','app.js'),JSON.stringify(marker));assert.notEqual(check(root).status,0,marker)
 }
}))
test('缺失或没有可检查构建文件时不能误报通过',()=>fixture(root=>{
 assert.notEqual(check(root).status,0);assert.notEqual(check(path.join(root,'missing')).status,0)
}))
