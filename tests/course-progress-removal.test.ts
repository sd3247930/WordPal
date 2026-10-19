import {DELETED_COURSES_KEY} from '../packages/content_schema/course-lifecycle'
import {startLegacyRound} from './helpers/daily-flow'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useProfileStore} from '../src/stores/profile'
import {useCourseStore} from '../src/stores/course'
import {useLearningStore} from '../src/stores/learning'
import {useActivitiesStore} from '../src/stores/activities'
import {useStudyPresentation} from '../src/stores/study-presentation'
import {installTextCourse,CATALOG_KEY} from '../src/services/content/StorageRepository'
import {loadCourseRegistry,wordById,isCourseInstalled} from '../src/services/content/ContentRegistry'
import {V2_KEY,POINTER_KEY,initialProgress} from '../src/services/storage/MigrationV1toV2'
import {PRESENTATION_KEY,ACTIVITY_KEY} from '../src/services/learning/CourseProgressMemory'
import {newCard} from '../packages/srs_fsrs'
import type {CoursePack} from '../packages/content_schema/course'

const storage=new Map<string,string>();let failKey=''
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(key===failKey)throw new Error('Quota');storage.set(key,value)},removeStorageSync:(key:string)=>storage.delete(key)}
function pack(id:string):CoursePack{return {schemaVersion:2,courseId:id,contentVersion:'1.0.0',title:'进度隔离 '+id,route:'theme',abilityLevels:['L1','L2','L3','L4','L5'],sources:[{id:'source',type:'author-created',rightsStatus:'redistribution-approved',attribution:'合成教材',revision:'r1'}],vocabulary:['cat','dog','bird'].map(id=>({id,language:'en',lemma:wordById[id].word,meaning:wordById[id].meaning,pos:wordById[id].pos,sourceId:'source'})),units:[{id:'unit',title:'测试单元',lessons:[{id:'one',title:'第一课',wordIds:['cat','dog']},{id:'two',title:'第二课',wordIds:['bird','dog']}]}],assets:[]}}
function stores(){return {profile:useProfileStore(),course:useCourseStore(),learning:useLearningStore(),activities:useActivitiesStore(),view:useStudyPresentation()}}
async function fresh(){storage.clear();failKey='';loadCourseRegistry();setActivePinia(createPinia());await installTextCourse(pack('memory-a'));await installTextCourse(pack('memory-b'));return stores()}
function evidence(db:ReturnType<typeof useProfileStore>['db']){return JSON.stringify({cards:db.cards,history:db.history,practice:db.practiceAnswers,rewards:db.rewardIds,gems:db.gems,pets:db.pets,auxiliary:db.auxiliaryRecords})}

test('两册的课节、题目位置与草稿独立，冷启动和反复切换仍逐字恢复',async()=>{
 let {course,learning,profile}=await fresh();course.choose('memory-a');course.chooseLesson('two');startLegacyRound(learning);learning.patch({mode:'spell',input:'bi',index:1})
 const a=JSON.stringify(learning.session),progressA=JSON.stringify(course.progress),records=evidence(profile.db)
 course.choose('memory-b');assert.equal(learning.session,null);assert.equal(course.progress.currentLessonId,'one');startLegacyRound(learning);learning.patch({mode:'spell',input:'ca'});const b=JSON.stringify(learning.session)
 setActivePinia(createPinia());({course,learning,profile}=stores());assert.equal(JSON.stringify(learning.session),b)
 for(let i=0;i<3;i++){course.choose('memory-a');assert.equal(JSON.stringify(learning.session),a);assert.equal(JSON.stringify(course.progress),progressA);course.choose('memory-b');assert.equal(JSON.stringify(learning.session),b)}
 assert.equal(evidence(profile.db),records)
})

test('两册的轻松练习各自恢复，关闭一册练习不会清掉另一册',async()=>{
 let {course,activities}=await fresh();course.choose('memory-a');activities.start('letters');activities.input('ca');const a=JSON.stringify(activities.state)
 course.choose('memory-b');assert.equal(activities.state,null);activities.start('letters');activities.input('do');const b=JSON.stringify(activities.state)
 setActivePinia(createPinia());({course,activities}=stores());assert.equal(JSON.stringify(activities.state),b);course.choose('memory-a');assert.equal(JSON.stringify(activities.state),a);activities.close();course.choose('memory-b');assert.equal(JSON.stringify(activities.state),b)
})

test('错词回看的输入和回看位置随教材保存，不被另一册的界面状态覆盖',async()=>{
 let {course,learning,profile,view}=await fresh();course.choose('memory-a');startLegacyRound(learning);profile.transact(db=>{db.session!.completedAt='2026-10-16T08:00:00Z';db.session!.answers=[{id:'revisit:0',wordId:db.session!.wordIds[0],rating:1,correct:false,at:'2026-10-16T08:00:00Z',source:'new_word',mode:'spell',input:'wrong'}]});view.sync();assert.equal(view.revisiting,true);view.updateInput('ca');const a=JSON.stringify(view.state)
 course.choose('memory-b');startLegacyRound(learning);view.sync();view.chooseMode('spell');view.updateInput('do');const b=JSON.stringify(view.state)
 setActivePinia(createPinia());({course,learning,view}=stores());view.sync();assert.equal(JSON.stringify(view.state),b);course.choose('memory-a');view.sync();assert.equal(view.input,'ca');assert.equal(JSON.stringify(view.state),a)
})

test('删除教材清空全部进度和练习缓存，同 ID 重新导入从头开始，SRS 历史保留',async()=>{
 const {course,learning,profile,activities,view}=await fresh();course.choose('memory-a');course.chooseLesson('two');startLegacyRound(learning);view.sync();view.chooseMode('spell');view.updateInput('bi');activities.start('letters');activities.input('bi');profile.transact(db=>{db.cards.cat=newCard('cat',new Date('2040-01-01'))});course.choose('memory-b');startLegacyRound(learning);learning.patch({mode:'spell',input:'ca'});view.sync();activities.start('letters');activities.input('ca')
 profile.transact(db=>{db.pendingCourseId='memory-a'})
 const b=JSON.stringify(learning.session),records=evidence(profile.db);assert.ok(profile.db.courseSessions?.['memory-a'])
 await course.uninstall('memory-a',true);assert.equal(profile.db.courseSessions?.['memory-a'],undefined);assert.equal(profile.db.courseProgress?.['memory-a'],undefined);assert.equal(profile.db.pendingCourseId,undefined);assert.equal(JSON.stringify(learning.session),b);assert.equal(evidence(profile.db),records)
 for(const key of [PRESENTATION_KEY,ACTIVITY_KEY])assert.equal(JSON.parse(storage.get(key)||'null')?.courseStates?.['memory-a'],undefined)
 await installTextCourse(pack('memory-a'));course.choose('memory-a');view.sync();assert.equal(learning.session,null);assert.equal(course.progress.currentLessonId,'one');assert.equal(activities.state,null);startLegacyRound(learning);view.sync();assert.equal(profile.db.session?.index,0);assert.equal(view.input,'');assert.equal(evidence(profile.db),records)
})

test('冷启动清理已消失教材的活动、会话、课节，保留仍存在教材及单词记忆',async()=>{
 const {profile,course,learning,activities}=await fresh();course.choose('memory-a');startLegacyRound(learning);activities.start('letters');const orphan=JSON.parse(JSON.stringify(learning.session));const db=JSON.parse(JSON.stringify(profile.db));db.cards.cat=newCard('cat',new Date('2040-01-01'));db.currentCourseId='removed-book';db.session={...orphan,courseId:'removed-book'};db.courseSessions={'memory-a':orphan,'removed-cache':{...orphan,id:'removed-cache-session',courseId:'removed-cache'}};db.courseProgress['removed-book']=initialProgress('starter');const records=evidence(db)
 storage.set(V2_KEY,JSON.stringify(db));storage.set(POINTER_KEY,JSON.stringify('v2'));storage.set(ACTIVITY_KEY,JSON.stringify({...activities.state,courseId:'removed-book'}));storage.set(PRESENTATION_KEY,JSON.stringify({sessionId:'removed-cache-session',input:'old'}));setActivePinia(createPinia());const restored=stores()
 assert.equal(restored.profile.db.currentCourseId,'starter');assert.equal(restored.profile.db.session,null);assert.equal(restored.profile.db.courseSessions?.['removed-cache'],undefined);assert.equal(restored.profile.db.courseProgress?.['removed-book'],undefined);assert.ok(restored.profile.db.courseSessions?.['memory-a']);assert.equal(storage.get(ACTIVITY_KEY),'null');assert.equal(storage.get(PRESENTATION_KEY),'null');assert.equal(evidence(restored.profile.db),records);restored.course.choose('memory-a');assert.deepEqual(restored.learning.session,orphan)
})

test('教材删除提交失败时恢复原进度及练习缓存，不丢失其他教材的状态',async()=>{
 const {course,learning,profile,view,activities}=await fresh();course.choose('memory-a');startLegacyRound(learning);view.sync();view.chooseMode('spell');view.updateInput('ca');activities.start('letters');activities.input('ca');course.choose('memory-b');const before=JSON.stringify(profile.db),ui=[PRESENTATION_KEY,ACTIVITY_KEY].map(key=>storage.get(key));failKey=DELETED_COURSES_KEY
 await assert.rejects(course.uninstall('memory-a',true),/Quota/);failKey='';assert.equal(isCourseInstalled('memory-a'),true);assert.equal(JSON.stringify(profile.db),before);assert.deepEqual([PRESENTATION_KEY,ACTIVITY_KEY].map(key=>storage.get(key)),ui);course.choose('memory-a');view.sync();assert.equal(view.input,'ca');assert.equal(activities.state?.input,'ca')
})

test('删除当前已完成教材失败时恢复原课程、完成位置和缓存，不滞留替代教材',async()=>{
 const {course,learning,profile}=await fresh();course.choose('memory-a');startLegacyRound(learning);profile.transact(db=>{db.session!.completedAt='2026-10-16T08:00:00Z'});const before=JSON.stringify(profile.db);failKey=DELETED_COURSES_KEY
 await assert.rejects(course.uninstall('memory-a',true,'memory-b'),/Quota/);failKey='';assert.equal(course.currentId,'memory-a');assert.equal(isCourseInstalled('memory-a'),true);assert.equal(JSON.stringify(profile.db),before)
})

test('进度存储写入失败时拒绝删除教材，原学习状态不变',async()=>{
 const {course,learning,profile}=await fresh();course.choose('memory-a');startLegacyRound(learning);course.choose('memory-b');const before=JSON.stringify(profile.db);failKey=V2_KEY
 await assert.rejects(course.uninstall('memory-a',true));failKey='';assert.equal(isCourseInstalled('memory-a'),true);assert.equal(JSON.stringify(profile.db),before)
})
