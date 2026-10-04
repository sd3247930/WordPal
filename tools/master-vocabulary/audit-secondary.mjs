// Reference texts stay in an external scratch directory, never in the application.
import {execFileSync} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
const repository='jinronga/english-words',directory=join(tmpdir(),'wordpal-master-source-audit')
mkdirSync(directory,{recursive:true})
const api=route=>JSON.parse(execFileSync('gh',['api',route],{encoding:'utf8',maxBuffer:8*1024*1024}))
const branch=api('repos/'+repository).default_branch
const revision=api('repos/'+repository+'/commits/'+branch).sha
const paths=api('repos/'+repository+'/git/trees/'+revision+'?recursive=1').tree.filter(item=>item.path.startsWith('小学/')&&/年级[上下]册\.md$/.test(item.path))
for(const item of paths){const blob=api('repos/'+repository+'/git/blobs/'+item.sha),text=Buffer.from(blob.content,'base64').toString('utf8'),match=item.path.match(/([三四五六])年级([上下])册/);if(!match)throw new Error('参考文件册次无法确定。');const grade={三:3,四:4,五:5,六:6}[match[1]],semester=match[2]==='上'?1:2;writeFileSync(join(directory,'jinronga-g'+grade+'-s'+semester+'.md'),text)}
writeFileSync(join(directory,'secondary-source.json'),JSON.stringify({repository,revision,files:paths.length})+'\n')
console.log('已获取 '+paths.length+' 份小学参考文件到临时目录，仅用于 QA。')
