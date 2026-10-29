import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createBuildIdentity,verifyBuildIdentity} from '../tools/lib/build-identity.mjs'

test('构建指纹跨换行一致，代码和图片变化可检出，本机教材和生成标识不参与',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'wordpal-build-identity-'))
 try{
  fs.mkdirSync(path.join(root,'src/static'),{recursive:true});fs.mkdirSync(path.join(root,'packages'))
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'1.2.8'}));fs.writeFileSync(path.join(root,'src/manifest.json'),JSON.stringify({versionName:'1.2.8',versionCode:'128'}))
  const code=path.join(root,'src/main.ts');fs.writeFileSync(code,'export const value=1\n');const first=createBuildIdentity(root)
  fs.writeFileSync(code,'export const value=1\r\n');assert.equal(createBuildIdentity(root).sourceSha256,first.sourceSha256)
  fs.mkdirSync(path.join(root,'src/content/local-courses'),{recursive:true});fs.writeFileSync(path.join(root,'src/content/local-courses/catalog.json'),'["local-only-fixture"]');fs.writeFileSync(path.join(root,'src/static/build-info.json'),'{}')
  assert.equal(createBuildIdentity(root).sourceSha256,first.sourceSha256)
  fs.writeFileSync(code,'export const value=2\n');const changed=createBuildIdentity(root);assert.notEqual(changed.sourceSha256,first.sourceSha256)
  fs.writeFileSync(path.join(root,'src/static/picture.png'),Buffer.from([1,2,3]));assert.notEqual(createBuildIdentity(root).sourceSha256,changed.sourceSha256)
 }finally{const relative=path.relative(fs.realpathSync(os.tmpdir()),fs.realpathSync(root));if(relative.startsWith('..')||path.isAbsolute(relative)||!relative.startsWith('wordpal-build-identity-'))throw Error('Unexpected temporary test directory');fs.rmSync(root,{recursive:true,force:true})}
})

test('发布核验拒绝旧源码、错版本、无提交标识、开发模式与本机内容',()=>{
 const expected={schemaVersion:1,version:'1.2.8',versionCode:'128',revision:'a'.repeat(40),sourceSha256:'b'.repeat(64),sourceFiles:3}
 const actual={...expected,mode:'production',localContent:false},read=(value:object)=>()=>Buffer.from(JSON.stringify(value))
 assert.equal(verifyBuildIdentity(read(actual),expected).revision,expected.revision)
 for(const key of ['version','versionCode','revision','sourceSha256'])assert.throws(()=>verifyBuildIdentity(read({...actual,[key]:'stale'}),expected),/differs from source/)
 assert.throws(()=>verifyBuildIdentity(read({...actual,mode:'development'}),expected),/committed production/)
 assert.throws(()=>verifyBuildIdentity(read({...actual,localContent:true}),expected),/committed production/)
 assert.throws(()=>verifyBuildIdentity(read({...actual,revision:'unversioned'}),{...expected,revision:'unversioned'}),/committed production/)
})
