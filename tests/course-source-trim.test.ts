import test from 'node:test'
import assert from 'node:assert/strict'
import {courseSourceResidue,trimCourseSource} from '../src/services/course/CourseSourceTrimmer'
import {starterPack} from '../packages/content_schema/registry'
import {retainLearnedLexemes} from '../src/services/content/StorageRepository'

const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)??'',setStorageSync:(key:string,data:string)=>void storage.set(key,data)}
function seed(){
 storage.clear()
 storage.set('wordpal.content.directory.v1',JSON.stringify({'imported-demo':{courseId:'imported-demo',title:'导入示范册',positions:[{lexemeId:'alpha'},{lexemeId:'beta'}]}}))
 storage.set('wordpal.content.archive.imported-demo',JSON.stringify(true))
 storage.set('wordpal.content.cleanup.v1',JSON.stringify([{key:'wordpal.content.pack.imported-demo.0123456789abcdef',pack:{courseId:'imported-demo',vocabulary:[]}}]))
 storage.set('wordpal.content.installation.v1',JSON.stringify({'imported-demo':'notInstalled'}))
 storage.set('wordpal.content.retained-lexemes.v1',JSON.stringify([{id:'alpha',word:'alpha'}]))
 storage.set('wordpal.content.catalog.v2',JSON.stringify([]))
}

test('裁剪内容源：清目录描述符、归档键、待清理条目与安装态残留键，并保留已学词条',async()=>{
 seed()
 const retainedBefore=storage.get('wordpal.content.retained-lexemes.v1')
 const result=await trimCourseSource('imported-demo')
 assert.equal(result.ok,true,result.message)
 assert.equal(result.cleaned.directoryDescriptor,true)
 assert.equal(result.cleaned.archiveKey,true)
 assert.equal(result.cleaned.cleanupEntry,true)
 assert.equal(result.cleaned.installationKey,true)
 assert.equal(result.cleaned.catalogEntry,true)
 assert.equal(result.retainedWordCount,1,'目录描述符中的已学词应计入保留数')
 assert.deepEqual(result.residues,[])
 assert.equal(storage.get('wordpal.content.retained-lexemes.v1'),retainedBefore,'已学词条不得被裁剪改动')
 assert.deepEqual(JSON.parse(storage.get('wordpal.content.directory.v1')!),{})
 assert.deepEqual(JSON.parse(storage.get('wordpal.content.archive.imported-demo')!) ,null)
 assert.deepEqual(JSON.parse(storage.get('wordpal.content.cleanup.v1')!),[])
 assert.deepEqual(JSON.parse(storage.get('wordpal.content.installation.v1')!),{})
 const residue=await courseSourceResidue('imported-demo')
 assert.deepEqual(Object.values(residue.residues).filter(Boolean),[])
})

test('裁剪幂等：重复执行不报错，保留词数稳定',async()=>{
 seed()
 await trimCourseSource('imported-demo')
 const again=await trimCourseSource('imported-demo')
 assert.equal(again.ok,true)
 assert.equal(again.retainedWordCount,1)
})

test('裁剪前的安全网：把已学词条从仍可用的课程复制到保留词条，重复执行不累加',()=>{
 storage.clear()
 const ids=starterPack.vocabulary.slice(0,2).map(word=>word.id)
 assert.equal(retainLearnedLexemes(ids),2)
 const retained=JSON.parse(storage.get('wordpal.content.retained-lexemes.v1')!) as {id:string}[]
 assert.deepEqual(retained.map(word=>word.id).sort(),[...ids].sort())
 assert.equal(retainLearnedLexemes(ids),0,'已保留的词条不重复写入')
 assert.equal(retainLearnedLexemes(['nonexistent-word-id']),0,'不能凭空补出没有来源的词条')
})
