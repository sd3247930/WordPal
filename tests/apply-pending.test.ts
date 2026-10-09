import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useProfileStore} from '../src/stores/profile'
import {useCourseStore} from '../src/stores/course'
import {useLearningStore} from '../src/stores/learning'
import {wordById,loadCourseRegistry} from '../src/services/content/ContentRegistry'
import {installTextCourse,setArchived} from '../src/services/content/StorageRepository'
import type {CoursePack} from '../packages/content_schema/course'

const storage=new Map<string,string>()
;(globalThis as any).uni={
 getStorageSync:(key:string)=>storage.get(key)||'',
 setStorageSync:(key:string,value:string)=>storage.set(key,value),
 removeStorageSync:(key:string)=>storage.delete(key)
}
function reset(){storage.clear();loadCourseRegistry();setActivePinia(createPinia())}
function pack(id:string):CoursePack{
 return {schemaVersion:2,courseId:id,contentVersion:'1.0.0',title:'排队课 '+id,route:'theme',abilityLevels:['L1','L2','L3'],
  sources:[{id:'queue-source',type:'user-provided',rightsStatus:'private-use-declared',attribution:'本机合成测试课程',revision:'r1'}],
  vocabulary:['cat','dog','bird'].map(word=>({id:word,language:'en',lemma:wordById[word].word,meaning:wordById[word].meaning,pos:wordById[word].pos,sourceId:'queue-source'})),
  units:[{id:'u01',title:'合成单元',lessons:[{id:'l01',title:'合成课节',wordIds:['cat','dog','bird']}]}],assets:[]}
}
async function ready(){
 reset()
 const profile=useProfileStore(),course=useCourseStore(),learning=useLearningStore()
 await installTextCourse(pack('queue-one'));await installTextCourse(pack('queue-two'))
 course.choose('queue-one');learning.start()
 return {profile,course,learning}
}

test('队列为空时不触发，也不改动当前课程',()=>{
 reset()
 const profile=useProfileStore(),course=useCourseStore()
 assert.equal(profile.db.pendingCourseId,undefined)
 assert.equal(course.applyPending(),false)
 assert.equal(course.currentId,'starter')
})

test('本轮未完成时不应用排队课程，pending 保持可见',async()=>{
 const {profile,course}=await ready()
 course.choose('queue-two')
 assert.equal(course.applyPending(),false)
 assert.equal(course.currentId,'queue-one');assert.equal(profile.db.pendingCourseId,'queue-two')
})

test('本轮完成后应用排队课程，并写入独立的课程进度',async()=>{
 const {profile,course}=await ready()
 course.choose('queue-two')
 profile.transact(d=>{d.session!.completedAt=new Date().toISOString()})
 assert.equal(course.applyPending(),true)
 assert.equal(course.currentId,'queue-two');assert.equal(profile.db.pendingCourseId,undefined)
 assert.equal(course.progress.currentLessonId,'l01')
})

test('取消排队清空 pending 但不影响当前课程与正在进行的输入',async()=>{
 const {profile,course,learning}=await ready()
 learning.patch({input:'draft'})
 course.choose('queue-two')
 assert.equal(course.clearPending(),true)
 assert.equal(profile.db.pendingCourseId,undefined);assert.equal(course.currentId,'queue-one')
 assert.equal(learning.session?.input,'draft')
 assert.equal(course.clearPending(),false)
})

test('排队目标被归档时清空队列，不会切换到失效课程',async()=>{
 const {profile,course}=await ready()
 course.choose('queue-two')
 setArchived('queue-two',true)
 assert.equal(course.applyPending(),false)
 assert.equal(profile.db.pendingCourseId,undefined);assert.equal(course.currentId,'queue-one')
})
