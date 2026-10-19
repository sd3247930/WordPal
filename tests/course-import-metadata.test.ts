import test from 'node:test'
import assert from 'node:assert/strict'
import {inferImportMetadata,previewImport} from '../src/services/course-import/ImportWizard'
import original from '../src/content/courses/original-primary.json'

test('无元信息词表自动区分课程，重复导入与行重排保持标识，文件名仅用于显示',()=>{
 const a='word,meaning\nquartz,石英\ngrove,林地',b='word,meaning\ngrove,林地\nquartz,石英'
 const one=inferImportMetadata(a,'csv','森林词表.csv'),two=inferImportMetadata(b,'csv','改名.csv')
 assert.equal(one.courseId,two.courseId);assert.equal(one.title,'森林词表')
 assert.notEqual(one.courseId,inferImportMetadata('word,meaning\ncomet,彗星','csv').courseId)
 assert.equal(one.declared,false)
 const preview=previewImport(a,'csv',{...one,declared:true},{})
 assert.deepEqual(preview.issues,[]);assert.equal(preview.pack?.title,'森林词表');assert.equal(preview.pack?.sources[0].rightsStatus,'private-use-declared')
})
test('CSV显式课程ID与映射保留，混合多个课程拒绝导入',()=>{
 const text='课程,英文,中文\nforest-course,grove,林地',mapping={'课程':'course_id','英文':'word','中文':'meaning'}
 const meta=inferImportMetadata(text,'csv','',mapping)
 assert.equal(meta.courseId,'forest-course');assert.equal(previewImport(text,'csv',meta,{},mapping).pack?.vocabulary[0].lemma,'grove')
 assert.throws(()=>inferImportMetadata('course_id,word,meaning\na,cat,猫\nb,dog,狗','csv'),/多个课程/)
})
test('JSON课程隐藏表单后仍保留名称版本路线等级与来源，声明不提升公开权限',()=>{
 const input={...original,contentVersion:'2.3.4'},text=JSON.stringify(input)
 const p=previewImport(text,'json',{...inferImportMetadata(text,'json','另一个名称.json'),declared:true},{})
 assert.deepEqual(p.issues,[])
 for(const field of ['courseId','title','contentVersion','route','abilityLevels'] as const)assert.deepEqual(p.pack?.[field],input[field])
 assert.equal(p.pack?.sources[0].attribution,input.sources[0].attribution)
 assert.equal(previewImport('null','json',inferImportMetadata('null','json'),{}).pack,null)
})
