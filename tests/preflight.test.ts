import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {scanBytes,forbiddenPath,imageMetadata,runAudit} from '../tools/preflight-scan.mjs'

const scanner=fileURLToPath(new URL('../tools/preflight-scan.mjs',import.meta.url))
const secret=()=>['gh','p_', 'a'.repeat(32)].join('')
const windowsPath=()=>String.fromCharCode(67,58,92)+'local'+String.fromCharCode(92)+'fixture'
test('公开词库 Git SHA 豁免仅限审核过的整行，邻行同一数字和其他文件仍阻断',()=>{
 const name='tools/master-vocabulary/index.ts',line=fs.readFileSync(name,'utf8').split('\n').find(row=>row.startsWith('const revision='))!,digits=line.match(/\d{16,19}/)![0]
 assert.deepEqual(scanBytes(name,Buffer.from(line)),[])
 assert.equal(scanBytes(name,Buffer.from(line+'\naccount = '+digits)).filter((h:any)=>h.category==='identity/account digits').length,1)
 assert.ok(scanBytes('other.ts',Buffer.from(line)).some((h:any)=>h.category==='identity/account digits'))
})
function fixture(action:(root:string)=>void){
 const parent=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(parent,'wordpal-purity-fixture-'))
 try{action(root)}finally{const resolved=fs.realpathSync(root);assert.equal(path.dirname(resolved),parent);assert.ok(path.basename(resolved).startsWith('wordpal-purity-fixture-'));fs.rmSync(resolved,{recursive:true,force:true})}
}
function git(root:string,args:string[],input?:string){const result=spawnSync('git',args,{cwd:root,input,encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);return result.stdout.trim()}
function stage(root:string,name:string,data:string){const oid=git(root,['hash-object','-w','--stdin'],data);git(root,['update-index','--add','--cacheinfo','100644',oid,name])}
function init(root:string){git(root,['init','-q']);fs.writeFileSync(path.join(root,'.gitignore'),'/docs/\n/private/\n');stage(root,'.gitignore','/docs/\n/private/\n')}

test('纯净检查识别短密码、服务凭据、正反斜杠路径和隐私，不打印原始值',()=>{
 const password=['pass','word'].join('')+' = "ab"'
 const forward=windowsPath().split(String.fromCharCode(92)).join('/')
 for(const text of [password,secret(),windowsPath(),forward,['user','@','made-up-domain.test'].join(''),['138','1234','5678'].join('')]){
  const hits=scanBytes('fixture.txt',Buffer.from(text));assert.ok(hits.length);assert.ok(hits.every((hit:any)=>!('value' in hit)&&!('text' in hit)))
 }
 const jsonKey=['api','Key'].join('');assert.ok(scanBytes('config.json',Buffer.from(JSON.stringify({[jsonKey]:'unprefixed-credential-value'}))).some((hit:any)=>hit.category==='credential assignment'))
 const numericKey=['p','in'].join('');assert.ok(scanBytes('config.json',Buffer.from(JSON.stringify({[numericKey]:42}))).some((hit:any)=>hit.category==='numeric credential'))
 fixture(root=>{fs.writeFileSync(path.join(root,'fixture.txt'),secret());fs.writeFileSync(path.join(root,'.gitignore'),'/docs/\n/private/\n');const result=spawnSync(process.execPath,[scanner,'--root',root],{encoding:'utf8'});assert.equal(result.status,1);assert.ok(!result.stdout.includes(secret()))})
})

test('版本号豁免只针对包清单版本，示例邮箱不能掩盖同一行其他邮箱',()=>{
 const version=['3.0.0-','50206','20260917001'].join('')
 assert.deepEqual(scanBytes('package.json',Buffer.from(JSON.stringify({version}))),[])
 assert.ok(scanBytes('other.json',Buffer.from(JSON.stringify({version}))).length)
 assert.ok(scanBytes('package.json',Buffer.from(JSON.stringify({account:version.slice(6)}))).length)
 const email=['private','@','made-up-domain.test'].join(''),example=['demo','@','example.com'].join('')
 assert.equal(scanBytes('fixture.txt',Buffer.from(example+' '+email)).filter((hit:any)=>hit.category==='email address').length,1)
 assert.deepEqual(scanBytes('example.txt',Buffer.from(['api','_key = "YOUR_API_KEY"'].join(''))),[])
})

test('超过旧2MiB阈值的文本仍会扫描；UTF16文本也能识别秘密',()=>{
 const large=Buffer.from('x\n'.repeat(1100000)+secret());assert.ok(scanBytes('large.txt',large).some((hit:any)=>hit.category==='service credential'))
 assert.ok(scanBytes('unicode.txt',Buffer.concat([Buffer.from([255,254]),Buffer.from(secret(),'utf16le')])).length)
})

test('修改为媒体扩展名不能隐藏纯文本秘密，示例配置中的未引用凭据也阻断',()=>{
 const disguised=scanBytes('hidden.png',Buffer.from(secret()));assert.ok(disguised.some((hit:any)=>hit.category==='service credential'));assert.ok(disguised.some((hit:any)=>hit.category==='asset signature mismatch'))
 assert.ok(scanBytes('.env.example',Buffer.from(['PASS','WORD=','fake-credential'].join(''))).some((hit:any)=>hit.category==='unquoted configuration credential'))
})

test('PNG整文件元数据扫描可发现8KiB之后的内容凭证',()=>{
 const chunk=(kind:string,body=Buffer.alloc(0))=>{const length=Buffer.alloc(4);length.writeUInt32BE(body.length);return Buffer.concat([length,Buffer.from(kind),body,Buffer.alloc(4)])}
 const image=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IDAT',Buffer.alloc(9000)),chunk('caBX',Buffer.from('metadata')),chunk('IEND')])
 assert.deepEqual(imageMetadata(image,'.png'),['image metadata caBX'])
 assert.ok(scanBytes('image.png',image).some((hit:any)=>hit.category==='image metadata caBX'))
})

test('整个Git索引扫描使用已暂存内容，工作目录清理不能隐藏暂存的秘密',()=>fixture(root=>{
 init(root);stage(root,'unchanged.txt',secret());fs.writeFileSync(path.join(root,'unchanged.txt'),'clean')
 assert.deepEqual(runAudit({root}).findings,[])
 assert.ok(runAudit({root,staged:true}).findings.some((hit:any)=>hit.path==='unchanged.txt'&&hit.category==='service credential'))
}))

test('docs/private及测试垃圾即使强制进入索引也阻断；私有扫描与公开结果分开',()=>fixture(root=>{
 init(root);fs.mkdirSync(path.join(root,'private'));fs.writeFileSync(path.join(root,'private','fixture.txt'),secret())
 const local=runAudit({root,includeLocalOnly:true});assert.deepEqual(local.findings,[]);assert.ok(local.localFindings.length)
 for(const name of ['docs/fixture.md','private/fixture.txt','test-results/trace.zip'])stage(root,name,'clean')
 assert.equal(runAudit({root,staged:true}).findings.filter((hit:any)=>hit.category==='forbidden archive path').length,3)
 for(const name of ['.env','build/output.txt','debug.log','test-results/last-run.json'])assert.ok(forbiddenPath(name))
 assert.equal(forbiddenPath('tests/ui/fixture.spec.ts-snapshots/synthetic.png'),false)
}))

test('提交信息同样检查本地路径，JSON审计报告不能写到公开目录',()=>fixture(root=>{
 fs.writeFileSync(path.join(root,'message.txt'),windowsPath())
 assert.ok(runAudit({root,messageFile:path.join(root,'message.txt')}).findings.some((hit:any)=>hit.category==='local absolute path'))
 fs.writeFileSync(path.join(root,'.gitignore'),'/docs/\n/private/\n')
 const result=spawnSync(process.execPath,[scanner,'--root',root,'--report','public-audit.json'],{encoding:'utf8'});assert.equal(result.status,2);assert.equal(fs.existsSync(path.join(root,'public-audit.json')),false)
}))

test('实际Git提交钩子拦截已暂存秘密，提交信息钩子也能拒绝危险正文',()=>fixture(root=>{
 init(root);fs.mkdirSync(path.join(root,'tools'));fs.mkdirSync(path.join(root,'.githooks'))
 for(const name of ['preflight-scan.mjs','preflight-scan.ps1']){const data=fs.readFileSync(new URL('../tools/'+name,import.meta.url),'utf8');fs.writeFileSync(path.join(root,'tools',name),data);stage(root,'tools/'+name,data)}
 for(const name of ['pre-commit','commit-msg']){const data=fs.readFileSync(new URL('../.githooks/'+name,import.meta.url),'utf8');fs.writeFileSync(path.join(root,'.githooks',name),data);fs.chmodSync(path.join(root,'.githooks',name),0o755);stage(root,'.githooks/'+name,data)}
 git(root,['config','core.hooksPath','.githooks']);git(root,['config','user.name','Fixture Archive']);git(root,['config','user.email',['fixture','@','archive.invalid'].join('')])
 stage(root,'fixture.txt',secret());fs.writeFileSync(path.join(root,'fixture.txt'),'clean')
 const blocked=spawnSync('git',['commit','-m','fixture'],{cwd:root,encoding:'utf8'});assert.notEqual(blocked.status,0);assert.match(blocked.stdout+blocked.stderr,/service credential/)
 stage(root,'fixture.txt','clean')
 const badMessage=spawnSync('git',['commit','-m',secret()],{cwd:root,encoding:'utf8'});assert.notEqual(badMessage.status,0);assert.match(badMessage.stdout+badMessage.stderr,/<commit-message>/)
 assert.notEqual(spawnSync('git',['rev-parse','--verify','HEAD'],{cwd:root}).status,0)
}))
