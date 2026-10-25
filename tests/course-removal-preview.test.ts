import test from 'node:test'
import assert from 'node:assert/strict'
import {courseRemovalPreview} from '../src/services/course/CourseRemovalPreview'
import {lifecyclePack} from './helpers/lifecycle-fixture'

test('删除快照使用实际稳定 ID、完整名称与去重词数，原课程消失后快照不丢信息',()=>{
 const pack=lifecyclePack('deletion-preview');pack.title='教材《English A》 · 2026 版';pack.vocabulary.push({...pack.vocabulary[0]})
 const snapshot=courseRemovalPreview(pack,false)!
 assert.deepEqual(snapshot,{courseId:pack.courseId,title:pack.title,wordCount:2,mediaCount:0,bundled:false})
 pack.title='';pack.vocabulary=[];assert.equal(snapshot.title,'教材《English A》 · 2026 版');assert.equal(snapshot.wordCount,2)
})
test('缺失身份、标题或数量列表不能伪装为 0，真实空列表可以显示 0',()=>{
 const pack=lifecyclePack('deletion-preview')
 for(const value of [undefined,{...pack,courseId:''},{...pack,title:''},{...pack,title:'（待核对）'},{...pack,vocabulary:undefined},{...pack,assets:undefined},{...pack,vocabulary:[null]}])assert.equal(courseRemovalPreview(value as typeof pack,false),null)
 const empty=courseRemovalPreview({...pack,vocabulary:[],assets:[]},true)!
 assert.equal(empty.wordCount,0);assert.equal(empty.mediaCount,0);assert.equal(empty.bundled,true)
})
