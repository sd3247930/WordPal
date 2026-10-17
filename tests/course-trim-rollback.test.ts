import test from 'node:test'
import assert from 'node:assert/strict'
import {courseSourceResidue,trimCourseSource} from '../src/services/course/CourseSourceTrimmer'

const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)??'',setStorageSync:(key:string,data:string)=>void storage.set(key,data)}

test('裁剪后重新导入同一课程包可恢复该册，已学词条仍可复用',async()=>{
 storage.clear()
 storage.set('wordpal.content.directory.v1',JSON.stringify({'imported-demo':{courseId:'imported-demo',title:'导入示范册',positions:[{lexemeId:'alpha'}]}}))
 storage.set('wordpal.content.retained-lexemes.v1',JSON.stringify([{id:'alpha',word:'alpha',meaning:'阿尔法'}]))
 storage.set('wordpal.content.catalog.v2',JSON.stringify([]))
 await trimCourseSource('imported-demo')
 assert.deepEqual(JSON.parse(storage.get('wordpal.content.directory.v1')!),{})
 // 重新导入：安装目录与目录描述符写回同一 courseId
 storage.set('wordpal.content.catalog.v2',JSON.stringify([{courseId:'imported-demo',key:'wordpal.content.pack.imported-demo.0123456789abcdef'}]))
 storage.set('wordpal.content.directory.v1',JSON.stringify({'imported-demo':{courseId:'imported-demo',positions:[{lexemeId:'alpha'}]}}))
 const residue=await courseSourceResidue('imported-demo')
 assert.equal(residue.residues.catalogEntry,true)
 assert.equal(residue.residues.directoryDescriptor,true)
 assert.ok(JSON.parse(storage.get('wordpal.content.retained-lexemes.v1')!).some((word:{id:string})=>word.id==='alpha'))
})
