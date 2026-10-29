import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {useProfileStore,freshDatabase} from '../src/stores/profile'
import {useLearningStore} from '../src/stores/learning'
import {useCourseStore} from '../src/stores/course'
import {useStudyPresentation} from '../src/stores/study-presentation'
import {loadCourseRegistry,courseRegistry} from '../src/services/content/ContentRegistry'
import {installTextCourse} from '../src/services/content/StorageRepository'
import {STUDY_STEPS,completedPrefix,selectDailyPlan,continueDailyPlan,fullCourseWords} from '../src/services/learning/DailyLearningPlan'
import {orderedCourseWords} from '../src/services/learning/CourseStudySequence'
import {validateDatabase} from '../src/services/storage/MigrationV1toV2'
import {migrateParentSettings,readParentSettings,type EntryLevel} from '../packages/parent_settings'
import {newCard,FSRSScheduler} from '../packages/srs_fsrs'
import type {CoursePack} from '../packages/content_schema/course'
import {answerDailyWord,finishDaily} from './helpers/daily-flow'
const storage=new Map<string,string>();let fail=false
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(fail)throw Error('Quota');storage.set(key,value)},removeStorageSync:(key:string)=>storage.delete(key)}
function reset(level:EntryLevel=3){storage.clear();fail=false;loadCourseRegistry();setActivePinia(createPinia());const profile=useProfileStore();profile.transact(d=>{d.abilityLevel=`L${level}`});return {profile,learning:useLearningStore(),course:useCourseStore()}}
test('只预览每日任务不写入档案，明确开始后才冻结并持久保存',()=>{
 const {profile,learning}=reset(),before=JSON.stringify(profile.db),stored=JSON.stringify([...storage]);assert(learning.prepareDaily());assert.equal(learning.todayPlan!.wordIds.length,10);assert.equal(JSON.stringify(profile.db),before);assert.equal(JSON.stringify([...storage]),stored);assert.equal(profile.db.courseProgress?.starter.dailyPlan,undefined);assert(learning.start());assert(learning.session!.flow!.begunAt);assert(profile.db.courseProgress!.starter.dailyPlan)
})
function synthetic(id:string,count=47):CoursePack{return {schemaVersion:2,courseId:id,contentVersion:'1.0.0',title:'合成教材',route:'theme',abilityLevels:['L1','L2','L3','L4','L5'],sources:[{id:'test-source',type:'author-created',rightsStatus:'redistribution-approved',attribution:'合成测试',revision:'r1'}],assets:[],vocabulary:Array.from({length:count},(_,i)=>({id:`shared-word-${i}`,language:'en',lemma:`word${i}`,meaning:`释义${i}`,sourceId:'test-source',audio:'/static/synthetic-voice.wav',order:i+1})),units:Array.from({length:7},(_,i)=>({id:`unit-${i+1}`,title:`Unit ${i+1}`,lessons:[{id:`lesson-${i+1}`,title:`课节${i+1}`,wordIds:Array.from({length:count},(_,n)=>n).filter(n=>Math.floor(n/7)===i).map(n=>`shared-word-${n}`)}]})).filter(u=>u.lessons[0].wordIds.length)}}

for(const [level,count] of [[1,5],[2,5],[3,10],[4,15],[5,20]] as const)test(`L${level}: ${count}词、六步骤同序、四组统一、奖励只结算一次`,()=>{
 const {profile,learning}=reset(level);assert(learning.prepareDaily());assert(learning.start());const ids=[...learning.session!.wordIds]
 assert.equal(ids.length,count);assert.deepEqual(learning.tasks.map(t=>[t.done,t.total]),Array.from({length:4},()=>[0,count]))
 for(const step of STUDY_STEPS){assert.equal(learning.session!.flow!.step,step);assert.deepEqual(learning.session!.wordIds,ids)
  for(const id of ids){assert.equal(learning.current!.id,id);assert(learning.currentPosition);answerDailyWord(learning)}
  if(step!=='consolidate'){assert.equal(profile.db.history.length,0);assert.equal(learning.textbookProgress.learned,0)}
 }
 assert(learning.session!.completedAt);assert.deepEqual(learning.tasks.map(t=>[t.done,t.total]),Array.from({length:4},()=>[count,count]));assert.equal(learning.textbookProgress.learned,count)
 assert.equal(profile.db.history.length,count);assert.equal(profile.db.pets.water.exp,count*12+10);assert(validateDatabase(profile.db))
 const before=JSON.stringify(profile.db);assert.equal(learning.submit(3),false);assert.equal(learning.next(),false);assert(learning.start());assert.equal(JSON.stringify(profile.db),before)
 const first=profile.db.history[0];assert.deepEqual(profile.db.cards[first.wordId],new FSRSScheduler().schedule(newCard(first.wordId,new Date(first.at)),first.rating,new Date(first.at)).card)
})

test('L3闪现6/10重启恢复余4；错题三次仍在原词，写入失败不推进',()=>{
 let {profile,learning}=reset();learning.start();for(let i=0;i<6;i++)answerDailyWord(learning)
 const before=JSON.stringify(learning.session);setActivePinia(createPinia());learning=useLearningStore();profile=useProfileStore();assert.equal(JSON.stringify(learning.session),before);assert.equal(learning.session!.index,6)
 for(let i=0;i<4;i++)answerDailyWord(learning);assert.equal(learning.session!.flow!.step,'connect')
 for(let i=0;i<20;i++)answerDailyWord(learning);assert.equal(learning.session!.flow!.step,'spell')
 for(let i=0;i<3;i++){learning.patch({input:'wrong'});assert(learning.submit());assert.equal(learning.submit(),false);assert(learning.next());assert.equal(learning.session!.index,0)}
 assert.equal(learning.session!.flow!.completed.spell.length,0);learning.patch({input:learning.current!.word});const saved=JSON.stringify(profile.db);fail=true;assert.equal(learning.submit(),false);assert.equal(JSON.stringify(profile.db),saved);fail=false;answerDailyWord(learning);assert.equal(learning.session!.flow!.completed.spell.length,1)
})

test('A/B/C共享词、同名教材独立保存步骤/半词输入，快速切换及重启不串进度',async()=>{
 let {profile,learning,course}=reset();for(const id of ['book-a','book-b','book-c'])await installTextCourse(synthetic(id))
 course.choose('book-a');learning.start();for(let i=0;i<31;i++)answerDailyWord(learning);learning.patch({input:'wor'});const a=JSON.stringify(learning.session)
 course.choose('book-b');learning.start();assert.equal(learning.currentPosition!.index,1);for(let i=0;i<4;i++)answerDailyWord(learning);const b=JSON.stringify(learning.session)
 course.choose('book-c');learning.start();assert.equal(learning.currentPosition!.index,1)
 for(let i=0;i<4;i++){course.choose('book-a');assert.equal(JSON.stringify(learning.session),a);course.choose('book-b');assert.equal(JSON.stringify(learning.session),b)}
 setActivePinia(createPinia());course=useCourseStore();learning=useLearningStore();profile=useProfileStore();course.choose('book-a');assert.equal(JSON.stringify(learning.session),a);assert.equal(profile.db.history.length,0);assert(validateDatabase(profile.db))
})

test('跨午夜续旧任务，完成当日不发第二批；下一日用新等级连续跨Unit，末批不足7词',async context=>{
 context.mock.timers.enable({apis:['Date'],now:new Date('2040-01-01T12:00:00Z')});const {profile,learning,course}=reset();await installTextCourse(synthetic('book-tail',47));course.choose('book-tail');learning.start();for(let i=0;i<6;i++)answerDailyWord(learning)
 const ids=[...learning.session!.wordIds];profile.transact(d=>{d.abilityLevel='L5'});context.mock.timers.tick(86400000);learning.refreshDay();assert.deepEqual(learning.todayPlan!.wordIds,ids);finishDaily(learning);assert.equal(learning.todayPlan!.flow!.finishedDate,'2040-01-02');assert(learning.start());assert(learning.session!.completedAt)
 context.mock.timers.tick(86400000);learning.start();assert.equal(learning.session!.wordIds.length,20);assert.equal(learning.currentPosition!.index,11);finishDaily(learning)
 context.mock.timers.tick(86400000);learning.start();assert.equal(learning.session!.wordIds.length,17);finishDaily(learning);assert.equal(learning.textbookProgress.percent,100)
 context.mock.timers.tick(86400000);learning.refreshDay();assert.equal(learning.todayPlan,null);assert(learning.start());assert.equal(learning.session!.kind,'review_due')
 const pack=synthetic('seven',7);assert.equal(selectDailyPlan(profile.db,pack)!.wordIds.length,7)
})

test('旧上限失去控制权，迁移幂等且保留卡/历史/宠物；不把闪现或不连续后段历史当成前缀',()=>{
 const {profile}=reset();const old={...freshDatabase(),dailyLimit:20 as const,parentSettingsVersion:2 as const,abilityLevel:'L2' as const,parentSettingsUpdatedAt:0};const migrated=migrateParentSettings(old,10);assert.equal(migrated.dailyLimit,undefined);assert.equal(readParentSettings(migrated).dailyNewWordLimit,5);assert.equal(migrateParentSettings(migrated),migrated)
 const {dailyLimit,abilityLevel,parentSettingsVersion,parentSettingsUpdatedAt,...evidence}=old;const {dailyLimit:d,abilityLevel:a,parentSettingsVersion:v,parentSettingsUpdatedAt:t,...kept}=migrated;assert.deepEqual(kept,evidence)
 profile.transact(d=>{d.courseProgress!.starter.introducedWords={cat:'2040-01-01T00:00:00Z'};d.courseProgress!.starter.fullLearnedWords={pencil:'2040-01-01T00:00:00Z'}});assert.equal(completedPrefix(profile.db,courseRegistry.starter),0);assert.equal(Object.keys(fullCourseWords(profile.db,courseRegistry.starter)).length,1)
})

test('Unit数字顺序及词条显式order稳定，缺音频/图片不跳过，损坏计划拒绝读取',()=>{
 const {profile}=reset(),pack=synthetic('ordering',21);pack.units=[pack.units[2],pack.units[0],pack.units[1]];pack.units[0].title='Unit10';pack.units[2].title='Unit02';assert.deepEqual(orderedCourseWords(pack).slice(0,7),pack.units[1].lessons[0].wordIds)
 const plan=selectDailyPlan(profile.db,pack)!;assert.equal(plan.wordIds.length,10);profile.transact(d=>{d.courseProgress!.starter.dailyPlan={...plan,courseId:'starter',flow:{...plan.flow!,completed:{...plan.flow!.completed,spell:['foreign']}}}});assert.equal(validateDatabase(profile.db),false)
})

test('写入失败不能跨环节；听写完成后冷启动继续巩固，不重复写SRS或奖励',()=>{
 let {profile,learning}=reset(1);learning.start();for(let i=0;i<4;i++)answerDailyWord(learning);learning.reveal();learning.submit(3)
 const before=JSON.stringify(profile.db);fail=true;assert.equal(learning.next(),false);assert.equal(JSON.stringify(profile.db),before);fail=false;assert(learning.next());assert.equal(learning.session!.flow!.step,'connect')
 for(let i=0;i<20;i++)answerDailyWord(learning);assert.equal(learning.session!.flow!.step,'consolidate');assert.equal(profile.db.history.length,0)
 setActivePinia(createPinia());learning=useLearningStore();profile=useProfileStore();assert.equal(learning.session!.flow!.step,'consolidate');finishDaily(learning);assert.equal(profile.db.history.length,5);assert.equal(profile.db.pets.water.exp,70)
})

test('独立练习和整课检查不推进六环节游标，返回今日任务逐字恢复',()=>{
 const {profile,learning}=reset();learning.start();for(let i=0;i<3;i++)answerDailyWord(learning);const saved=JSON.stringify(learning.session)
 assert(learning.startPractice());assert.equal(learning.isDaily,false);learning.setMode('spell');learning.patch({input:learning.current!.word});assert(learning.submit());assert.equal(profile.db.history.length,0)
 profile.transact(d=>{d.courseProgress!.starter.completedLessons=courseRegistry.starter.units.flatMap(u=>u.lessons.map(l=>l.id))});assert.equal(learning.textbookProgress.learned,0);assert(learning.start());assert.equal(JSON.stringify(learning.session),saved)
})

test('课程外部删除只移除本册计划，内容改版缺词时保留旧任务并明确阻止学习',async()=>{
 const {profile,course,learning}=reset();await installTextCourse(synthetic('removed'));course.choose('removed');learning.start();const plan=JSON.stringify(learning.session),history=JSON.stringify(profile.db.history)
 const pack=courseRegistry.removed;courseRegistry.removed={...pack,vocabulary:pack.vocabulary.slice(1)};learning.refreshDay();assert(learning.planProblem);assert.equal(learning.start(),false);assert.equal(JSON.stringify(learning.session),plan)
 courseRegistry.removed=pack;assert(profile.reconcileCourseMemory('removed'));assert.equal(profile.db.courseProgress?.removed,undefined);assert.equal(JSON.stringify(profile.db.history),history)
})

test('七词末批四组与六环节一致且全书100%，新日保留前日任务完成归档',async context=>{
 context.mock.timers.enable({apis:['Date'],now:new Date('2040-01-01T12:00:00Z')});const {profile,learning,course}=reset(5);await installTextCourse(synthetic('tail-seven',27));course.choose('tail-seven');learning.start();finishDaily(learning);const previous=JSON.parse(JSON.stringify(learning.session));context.mock.timers.tick(86400000);learning.start();assert.equal(learning.session!.wordIds.length,7);assert(learning.tasks.every(task=>task.total===7));assert.equal(profile.db.courseProgress!['tail-seven'].completedDailyPlans![0].id,previous.id);finishDaily(learning);assert.equal(learning.textbookProgress.percent,100)
})

for(const [level,count] of [[1,5],[2,5],[3,10],[4,15],[5,20]] as const)test(`L${level} 主动继续下一批仍固定${count}词，六环节同序且不重复结算`,async()=>{
 const {profile,learning,course}=reset(level),pack=synthetic('extra-batch',47);await installTextCourse(pack);course.choose(pack.courseId)
 assert.equal(learning.continueLearning(),false);learning.start();assert.equal(learning.continueLearning(),false);finishDaily(learning)
 const first=JSON.parse(JSON.stringify(learning.session)),before={history:profile.db.history.length,gems:profile.db.gems,pets:JSON.stringify(profile.db.pets)}
 assert(learning.canContinue);assert(learning.continueLearning());const next=learning.session!
 assert.notEqual(next.id,first.id);assert.equal(next.date,first.date);assert.equal(next.flow!.step,'flash');assert.equal(next.index,0)
 assert.deepEqual(next.wordIds,orderedCourseWords(pack).slice(count,count*2));assert.equal(next.wordIds.length,count);assert.deepEqual(learning.todayTaskWordIds,next.wordIds)
 assert.equal(profile.db.history.length,before.history);assert.equal(profile.db.gems,before.gems);assert.equal(JSON.stringify(profile.db.pets),before.pets)
 assert.deepEqual(profile.db.courseProgress![pack.courseId].completedDailyPlans![0].completed,first.flow.completed)
 const unchanged=JSON.stringify(profile.db);assert.equal(learning.continueLearning(),false);assert.equal(JSON.stringify(profile.db),unchanged)
 for(const step of STUDY_STEPS){assert.equal(learning.session!.flow!.step,step);assert.deepEqual(learning.session!.wordIds,next.wordIds);for(const id of next.wordIds){assert.equal(learning.current!.id,id);answerDailyWord(learning)}}
 assert.equal(learning.newToday,count*2);assert.equal(learning.todayTaskWordIds.length,count);assert.equal(profile.db.history.length,count*2);assert.equal(new Set(profile.db.history.map(answer=>answer.id)).size,count*2);assert.equal(learning.textbookProgress.prefix,count*2);assert(validateDatabase(profile.db))
})

test('提前开始第二批，半词输入重启与跨午夜原位恢复；完成后明日从第三批按词序顺延',async context=>{
 context.mock.timers.enable({apis:['Date'],now:new Date('2040-01-01T12:00:00Z')});let {profile,learning,course}=reset(1)
 const pack=synthetic('resume-extra',27);await installTextCourse(pack);course.choose(pack.courseId);learning.start();finishDaily(learning);assert(learning.continueLearning())
 for(let i=0;i<15;i++)answerDailyWord(learning);assert.equal(learning.session!.flow!.step,'spell');learning.patch({input:'wor'});assert(learning.flushDraft())
 const saved=JSON.stringify(learning.session),ids=learning.session!.wordIds;context.mock.timers.tick(86400000)
 setActivePinia(createPinia());learning=useLearningStore();profile=useProfileStore();course=useCourseStore();learning.refreshDay();assert.equal(JSON.stringify(learning.session),saved);assert.deepEqual(learning.todayPlan!.wordIds,ids)
 finishDaily(learning);assert.equal(learning.newToday,5);assert.equal(learning.textbookProgress.prefix,10);assert.equal(learning.todayTaskWordIds.length,5)
 context.mock.timers.tick(86400000);assert(learning.start());assert.deepEqual(learning.session!.wordIds,orderedCourseWords(pack).slice(10,15));assert.equal(learning.currentPosition!.index,11);assert.equal(profile.db.courseProgress![pack.courseId].completedDailyPlans!.length,2);assert(validateDatabase(profile.db))
})

test('继续学习写入失败保留成果与游标，旧批次重复请求无效；多批末尾不足目标后停止',async context=>{
 context.mock.timers.enable({apis:['Date'],now:new Date('2040-01-01T12:00:00Z')});const {profile,learning,course}=reset(5),pack=synthetic('extra-tail',47);await installTextCourse(pack);course.choose(pack.courseId);learning.start();finishDaily(learning)
 const oldId=learning.session!.id,before=JSON.stringify(profile.db);fail=true;assert.equal(learning.continueLearning(),false);assert.equal(JSON.stringify(profile.db),before);fail=false
 assert(learning.continueLearning());finishDaily(learning);const ready=JSON.stringify(profile.db);assert.equal(continueDailyPlan(profile.db,pack,oldId),null);assert.equal(JSON.stringify(profile.db),ready)
 assert(learning.continueLearning());assert.equal(learning.session!.wordIds.length,7);assert.deepEqual(learning.session!.wordIds,orderedCourseWords(pack).slice(40));assert(learning.tasks.every(task=>task.total===7));finishDaily(learning)
 const progress=profile.db.courseProgress![pack.courseId];assert.equal(progress.completedDailyPlans!.length,2);assert.equal(new Set([...progress.completedDailyPlans!.map(plan=>plan.id),progress.dailyPlan!.id]).size,3);assert.equal(learning.textbookProgress.percent,100);assert.equal(learning.canContinue,false)
 const done=JSON.stringify(profile.db);assert.equal(learning.continueLearning(),false);assert.equal(JSON.stringify(profile.db),done);context.mock.timers.tick(86400000);learning.refreshDay();assert.equal(learning.todayPlan,null);assert(learning.start());assert.equal(learning.session!.kind,'review_due');assert(validateDatabase(profile.db))
})

test('新等级在下一批生效，当前词单不变；独立练习与其他教材进度不被继续学习覆盖',async()=>{
 const {profile,learning,course}=reset(1),a=synthetic('extra-a'),b=synthetic('extra-b');await installTextCourse(a);await installTextCourse(b)
 course.choose(b.courseId);learning.start();answerDailyWord(learning);const other=JSON.stringify(course.progress)
 course.choose(a.courseId);learning.start();const first=[...learning.session!.wordIds];profile.transact(d=>{d.abilityLevel='L4'});assert.deepEqual(learning.todayTaskWordIds,first);finishDaily(learning)
 assert(learning.startPractice());const independent=JSON.stringify(profile.db.session);assert(learning.continueLearning());assert.equal(learning.isDaily,true);assert.equal(learning.session!.wordIds.length,15);assert.deepEqual(learning.session!.wordIds,orderedCourseWords(a).slice(5,20));assert.equal(JSON.stringify(profile.db.session),independent);assert.equal(JSON.stringify(profile.db.courseProgress![b.courseId]),other)
})
