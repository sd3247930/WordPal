import {startLegacyRound} from './helpers/daily-flow'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {freshDatabase,useProfileStore} from '../src/stores/profile'
import {useCourseStore} from '../src/stores/course'
import {useLearningStore} from '../src/stores/learning'
import {wordById,loadCourseRegistry} from '../src/services/content/ContentRegistry'
import {installTextCourse,setArchived} from '../src/services/content/StorageRepository'
import {COURSE_SELECTION_MESSAGE,type CourseSelectionFailure} from '../src/services/course/CourseSelection'
import {V1_KEY,V2_KEY,POINTER_KEY} from '../src/services/storage/MigrationV1toV2'
import type {CoursePack} from '../packages/content_schema/course'

const storage=new Map<string,string>()
let failKey=''
;(globalThis as any).uni={
 getStorageSync:(key:string)=>storage.get(key)||'',
 setStorageSync:(key:string,value:string)=>{if(key===failKey)throw new Error('Quota');storage.set(key,value)},
 removeStorageSync:(key:string)=>storage.delete(key)
}
function reset(){storage.clear();failKey='';loadCourseRegistry();setActivePinia(createPinia())}
function pack(id:string):CoursePack{
 return {schemaVersion:2,courseId:id,contentVersion:'1.0.0',title:'合成切换课 '+id,route:'theme',abilityLevels:['L1','L2','L3'],
  sources:[{id:'switch-source',type:'user-provided',rightsStatus:'private-use-declared',attribution:'本机合成测试课程',revision:'r1'}],
  vocabulary:['cat','dog','bird'].map(word=>({id:word,language:'en',lemma:wordById[word].word,meaning:wordById[word].meaning,pos:wordById[word].pos,sourceId:'switch-source'})),
  units:[{id:'u01',title:'合成单元',lessons:[{id:'l01',title:'合成课节',wordIds:['cat','dog','bird']}]}],assets:[]}
}

test('每一次切换失败都返回可读原因，不再静默',()=>{
 reset()
 const course=useCourseStore()
 const missing=course.choose('missing-course')
 assert.equal(missing.ok,false);assert.equal(missing.reason,'not-registered');assert.equal(missing.message,COURSE_SELECTION_MESSAGE['not-registered'])
 assert.match(missing.message||'',/未找到/)
 for(const reason of ['not-registered','archived','db-version-mismatch','db-readonly','unknown'] as CourseSelectionFailure[])
  assert.ok(COURSE_SELECTION_MESSAGE[reason].length>0)
})

test('归档课程拒绝选择，恢复后可以重新选择',async()=>{
 reset()
 const course=useCourseStore()
 await installTextCourse(pack('choose-archived'))
 setArchived('choose-archived',true)
 const blocked=course.choose('choose-archived')
 assert.equal(blocked.ok,false);assert.equal(blocked.reason,'archived');assert.match(blocked.message||'',/归档/)
 setArchived('choose-archived',false)
 assert.equal(course.choose('choose-archived').ok,true)
})

test('档案仍为 v1 时报升级中，只读档案报只读，两者都不改当前课程',()=>{
 reset();storage.set(V1_KEY,JSON.stringify(freshDatabase()));failKey=V2_KEY
 const profile=useProfileStore(),course=useCourseStore()
 assert.equal(profile.db.version,1)
 const before=profile.db.currentCourseId
 const migrating=course.choose('starter')
 assert.equal(migrating.ok,false);assert.equal(migrating.reason,'db-version-mismatch');assert.equal(profile.db.currentCourseId,before)

 reset();storage.set(V2_KEY,'damaged');storage.set(POINTER_KEY,JSON.stringify('v2'))
 const guarded=useProfileStore(),guardedCourse=useCourseStore()
 assert.equal(guarded.readOnly,true)
 const readonly=guardedCourse.choose('starter')
 assert.equal(readonly.ok,false);assert.equal(readonly.reason,'db-readonly');assert.match(readonly.message||'',/只读/)
})

test('学习中切换立即生效，切回恢复冻结会话、输入和学习记录',async()=>{
 reset()
 const profile=useProfileStore(),course=useCourseStore(),learning=useLearningStore()
 await installTextCourse(pack('switch-one'));await installTextCourse(pack('switch-two'))
 assert.equal(course.choose('switch-one').ok,true)
 assert.equal(startLegacyRound(learning),true)
 learning.patch({input:'draft',mode:'spell'})
 const frozen=JSON.stringify(learning.session),records=JSON.stringify({cards:profile.db.cards,history:profile.db.history,pets:profile.db.pets,gems:profile.db.gems})
 const switched=course.choose('switch-two')
 assert.equal(switched.ok,true);assert.equal(switched.queued,false)
 assert.equal(course.currentId,'switch-two');assert.equal(profile.db.pendingCourseId,undefined)
 assert.equal(learning.session,null);assert.equal(JSON.stringify(profile.db.courseSessions?.['switch-one']),frozen)
 assert.ok(course.choose('switch-one').ok);assert.equal(JSON.stringify(learning.session),frozen)
 assert.equal(JSON.stringify({cards:profile.db.cards,history:profile.db.history,pets:profile.db.pets,gems:profile.db.gems}),records)
})

test('applyCourseSelection 反馈成功文案与词数',async()=>{
 reset()
 const course=useCourseStore(),toasts:string[]=[]
 ;(globalThis as any).uni.showToast=({title}:{title:string})=>toasts.push(title)
 await installTextCourse(pack('switch-toast'))
 const result=course.applyCourseSelection('switch-toast')
 assert.equal(result.ok,true)
 assert.match(toasts.at(-1)||'',/已切换到《合成切换课 switch-toast》，共 3 词/)
 course.applyCourseSelection('missing-course')
 assert.match(toasts.at(-1)||'',/未找到该课程/)
 delete (globalThis as any).uni.showToast
})
