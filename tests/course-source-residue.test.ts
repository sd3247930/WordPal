import test from 'node:test'
import assert from 'node:assert/strict'
import {courseSourceResidue} from '../src/services/course/CourseSourceTrimmer'

const storage=new Map<string,string>()
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)??'',setStorageSync:(key:string,data:string)=>void storage.set(key,data)}

test('残留清单逐项反映内容源状态',async()=>{
 storage.clear()
 storage.set('wordpal.content.catalog.v2',JSON.stringify([{courseId:'imported-demo',key:'k'}]))
 storage.set('wordpal.content.directory.v1',JSON.stringify({'imported-demo':{courseId:'imported-demo',positions:[]}}))
 const residue=await courseSourceResidue('imported-demo')
 assert.match(residue.courseId,/imported-demo/)
 assert.equal(residue.residues.catalogEntry,true)
 assert.equal(residue.residues.directoryDescriptor,true)
 assert.equal(residue.residues.archiveKey,false)
 assert.equal(residue.residues.cleanupEntry,false)
 assert.equal(residue.residues.installationKey,false)
 assert.equal(residue.residues.packKey,false)
 assert.equal(residue.residues.mediaDirectory,false)
})
