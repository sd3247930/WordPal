import {answerDailyWord,finishDaily} from './helpers/daily-flow'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useProfileStore} from '../src/stores/profile'
import {useCourseStore} from '../src/stores/course'
import {useLearningStore} from '../src/stores/learning'
import {loadCourseRegistry,wordById,starterPack} from '../src/services/content/ContentRegistry'
import {installTextCourse} from '../src/services/content/StorageRepository'
import {orderedCourseWords,courseIntroductions} from '../src/services/learning/CourseStudySequence'
import {initialProgress,validateDatabase} from '../src/services/storage/MigrationV1toV2'
import {newCard} from '../packages/srs_fsrs'
import type {CoursePack} from '../packages/content_schema/course'
import type {LearningSession} from '../packages/core_learning'
const storage=new Map<string,string>();let fail=false
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(fail)throw new Error('Quota');storage.set(key,value)},removeStorageSync:(key:string)=>storage.delete(key)}
function reset(){storage.clear();fail=false;loadCourseRegistry();setActivePinia(createPinia())}
function example():CoursePack{return {schemaVersion:2,courseId:'ordered-example',contentVersion:'1.0.0',title:'合成顺序教材',route:'theme',abilityLevels:['L3'],sources:[{id:'source',type:'author-created',rightsStatus:'redistribution-approved',attribution:'合成顺序案例',revision:'r1'}],vocabulary:['plate','cup','spoon'].map((word,index)=>({id:'order-'+word,language:'en',lemma:word,meaning:['盘子','杯子','勺子'][index],pos:'n.',sourceId:'source'})),units:[{id:'u',title:'餐具',lessons:[{id:'first',title:'第一课',wordIds:['order-plate','order-cup']},{id:'second',title:'第二课',wordIds:['order-spoon']}]}],assets:[]}}
function records(profile:ReturnType<typeof useProfileStore>){return JSON.stringify([profile.db.cards,profile.db.history,profile.db.practiceAnswers,profile.db.gems,profile.db.pets,profile.db.rewardIds])}
function oldSession(ids:string[],owner='starter'):LearningSession{return {id:'old-mixed',courseId:owner,contentVersion:'1.0.0',date:'2026-10-16',startedAt:'2026-10-16T08:00:00Z',kind:'review_due',wordIds:ids,index:0,mode:'spell',input:'old',selected:'',revealed:false,answers:[],wordSnapshot:Object.fromEntries(ids.map(id=>[id,JSON.parse(JSON.stringify(wordById[id]))]))}}

test('外国词的到期记录不进入当前教材，旧章节游标不会使首词偏离 cat',async()=>{
 reset();await installTextCourse(example());const profile=useProfileStore(),course=useCourseStore(),learning=useLearningStore()
 profile.transact(db=>{db.cards['order-plate']=newCard('order-plate',new Date('2000-01-01'));db.cards.dog=newCard('dog',new Date('2000-01-01'));db.lessonIndex=3;db.courseProgress!.starter=initialProgress('starter',3)})
 const before=records(profile);assert(learning.start());assert.equal(learning.current?.id,'cat');assert.equal(learning.currentPosition?.index,1);assert.deepEqual(learning.session!.wordIds,orderedCourseWords(starterPack).slice(0,10));assert(!learning.session!.wordIds.includes('order-plate'));assert.equal(records(profile),before)
 for(const word of Object.values(learning.session!.wordSnapshot!))assert(orderedCourseWords(starterPack).includes(word.id));course.choose('ordered-example');assert(learning.start());assert.equal(learning.current?.word,'plate');assert.deepEqual(learning.session!.wordIds,['order-plate','order-cup','order-spoon']);assert.equal(learning.due.length,1);assert.equal(records(profile),before)
})

test('已共享的 SRS 不等于教材已开始，未到期旧词以练习介绍且不重置原卡',()=>{
 reset();const profile=useProfileStore(),learning=useLearningStore();const card=newCard('cat',new Date('2100-01-01'));profile.transact(db=>{db.cards.cat=card});assert(learning.studyWords.includes('cat'));assert(!learning.newWords.includes('cat'));learning.start();assert.equal(learning.current?.id,'cat');assert.equal(learning.currentSource,'practice');learning.reveal();learning.submit(3);assert.equal(JSON.stringify(profile.db.cards.cat),JSON.stringify(card));assert.equal(profile.db.history.length,0);assert.equal(Object.keys(courseIntroductions(profile.db,'starter')).length,0);learning.next();assert.equal(learning.current?.id,'dog');assert.deepEqual(learning.currentPosition,{index:2,total:20})
})

test('整册分日逐词推进至最后一词，不受旧章节选择、到期词或新词选择入口打乱',context=>{
 reset();context.mock.timers.enable({apis:['Date'],now:new Date('2040-01-01T12:00:00Z')});const profile=useProfileStore(),course=useCourseStore(),learning=useLearningStore();profile.transact(db=>{db.abilityLevel='L1'});const visited:string[]=[]
 for(let round=0;round<4;round++){
  course.chooseLesson('lesson-4');assert(learning.startSelected(undefined,'pencil'));assert.deepEqual(learning.session!.wordIds,orderedCourseWords(starterPack).slice(round*5,round*5+5))
  visited.push(...learning.session!.wordIds);finishDaily(learning)
  assert.equal(learning.newToday,5);context.mock.timers.tick(86400000)
 }
 assert.deepEqual(visited,orderedCourseWords(starterPack));assert.equal(Object.keys(profile.db.courseProgress!.starter.introducedWords!).length,20);assert.equal(learning.studyWords.length,0);assert.equal(learning.current?.id,'pencil');assert(validateDatabase(profile.db))
})

test('清理混入其他教材的当前和缓存队列，历史/SRS 不变；合法草稿仍独立恢复',async()=>{
 reset();await installTextCourse(example());let profile=useProfileStore(),course=useCourseStore(),learning=useLearningStore();profile.transact(db=>{db.cards['order-plate']=newCard('order-plate',new Date('2000-01-01'));db.session=oldSession(['order-plate','cat']);db.courseSessions={'ordered-example':oldSession(['cat','order-plate'],'ordered-example')}});const before=records(profile);assert(profile.reconcileCourseMemory());assert.equal(profile.db.session,null);assert.equal(profile.db.courseSessions?.['ordered-example'],undefined);assert.equal(records(profile),before);assert(learning.start());assert.equal(learning.current?.id,'cat');learning.setMode('spell');learning.patch({input:'ca'});const saved=JSON.stringify(learning.session);course.choose('ordered-example');learning.start();assert.equal(learning.current?.word,'plate');course.choose('starter');assert.equal(JSON.stringify(learning.session),saved);setActivePinia(createPinia());learning=useLearningStore();assert.equal(JSON.stringify(learning.session),saved)
})

test('显式练习/复习入口拒绝教材外单词，选择题快照及选项仅包含本册词',async()=>{
 reset();await installTextCourse(example());const profile=useProfileStore(),course=useCourseStore(),learning=useLearningStore();course.choose('ordered-example');const before=records(profile);assert.equal(learning.start(['cat']),false);assert.equal(learning.startDue(['cat']),false);assert.equal(learning.session,null);assert(learning.start());for(const word of Object.values(learning.session!.wordSnapshot!)){assert(course.wordIds.includes(word.id));assert(word.distractors.every(id=>course.wordIds.includes(id)))}assert.equal(learning.choices.length,3);assert(learning.choices.every(word=>course.wordIds.includes(word.id)));assert.equal(records(profile),before)
})

test('无法保存时教材介绍游标和 SRS 均不推进，不会跳过首词',()=>{
 reset();const profile=useProfileStore(),learning=useLearningStore();learning.start();learning.reveal();const before=JSON.stringify(profile.db);fail=true;assert.equal(learning.submit(3),false);fail=false;assert.equal(JSON.stringify(profile.db),before);assert.equal(learning.currentPosition?.index,1);assert(learning.submit(3));learning.next();assert.equal(learning.currentPosition?.index,2)
})

test('旧版未作答的跳章新词队列回到教材首词，显式单词复习保持可恢复',()=>{
 reset();const profile=useProfileStore(),learning=useLearningStore();const queued=oldSession(['book','pen']);queued.kind='new_word';queued.input='';profile.transact(db=>{db.session=queued});const before=records(profile);profile.reconcileCourseMemory();assert.equal(profile.db.session,null);assert(learning.start());assert.equal(learning.current?.id,'cat');assert.equal(records(profile),before)
 profile.transact(db=>{db.session=null;db.cards.dog=newCard('dog',new Date('2000-01-01'))});assert(learning.startDue(['dog']));const review=JSON.stringify(learning.session);setActivePinia(createPinia());assert.equal(JSON.stringify(useLearningStore().session),review);assert.equal(useLearningStore().current?.id,'dog')
})

test('旧单环节会话完整保留为历史，不能冒充六环节完成而跳过教材首词',()=>{
 reset();const profile=useProfileStore(),learning=useLearningStore(),session=oldSession(['cat']);Object.assign(session,{kind:'new_word',input:'',completedAt:'2000-01-01T00:00:00Z',answers:[{id:'legacy:0',wordId:'cat',rating:3,correct:true,at:'2000-01-01T00:00:00Z',source:'new_word',mode:'flash',input:''}]});profile.transact(db=>{db.session=session});assert(learning.start());assert.equal(learning.current?.id,'cat');assert.equal(profile.db.session?.answers[0].wordId,'cat');setActivePinia(createPinia());assert.equal(useLearningStore().current?.id,'cat')
})
