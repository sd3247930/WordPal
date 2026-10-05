import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia,setActivePinia} from 'pinia'
import {freshDatabase,useProfileStore,type Database} from '../src/stores/profile'
import {useParentSettingsStore} from '../src/stores/parent-settings'
import {useLearningStore} from '../src/stores/learning'
import {useCourseStore} from '../src/stores/course'
import {useStudyPresentation} from '../src/stores/study-presentation'
import {migrateParentSettings,ABILITY_LEVELS,DAILY_NEW_WORD_LIMITS,type DailyNewWordLimit,type EntryLevel} from '../packages/parent_settings'
import {planDailySession} from '../src/services/learning/SessionPlanner'
import {automaticMode} from '../src/services/study-presentation'
import {newCard,FSRSScheduler} from '../packages/srs_fsrs'
import {validateDatabase,V2_KEY,POINTER_KEY} from '../src/services/storage/MigrationV1toV2'
import {courseRegistry,loadCourseRegistry} from '../src/services/content/ContentRegistry'
import {installTextCourse} from '../src/services/content/StorageRepository'
import type {CoursePack} from '../packages/content_schema/course'
const storage=new Map<string,string>();let fail=false,writes=0
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(fail)throw Error('Quota');writes++;storage.set(key,value)},removeStorageSync:(key:string)=>storage.delete(key)}
function fresh(database?:Database){storage.clear();fail=false;writes=0;loadCourseRegistry();if(database){storage.set(V2_KEY,JSON.stringify(database));storage.set(POINTER_KEY,JSON.stringify('v2'))}setActivePinia(createPinia());return {profile:useProfileStore(),parent:useParentSettingsStore(),learning:useLearningStore(),course:useCourseStore()}}
function legacy(limit=3){const db={...freshDatabase(),version:2,courseProgress:{},auxiliaryRecords:[]} as Database;delete db.parentSettingsVersion;delete db.parentSettingsUpdatedAt;db.dailyLimit=limit as DailyNewWordLimit;db.abilityLevel='L2';db.cards.cat=newCard('cat',new Date('2040-01-01'));db.gems=12;db.session={id:'existing',date:'2026-10-06',startedAt:'2026-10-06T08:00:00Z',kind:'practice',wordIds:['cat'],index:0,mode:'spell',input:'ca',selected:'',revealed:false,answers:[]};return db}
function protectedFields(db:Database){const {dailyLimit,abilityLevel,parentSettingsVersion,parentSettingsUpdatedAt,...rest}=db;return JSON.stringify(rest)}
async function largeCourse(course:ReturnType<typeof useCourseStore>){
 const starter=courseRegistry['original-primary'],ids=starter.vocabulary.slice(0,40).map(w=>w.id)
 const pack:CoursePack={...JSON.parse(JSON.stringify(starter)),courseId:'parent-settings-course',title:'合成家长设置验证课',abilityLevels:['L1','L2','L3','L4','L5'],units:[{id:'u01',title:'合成单元',lessons:[{id:'l01',title:'合成长课',wordIds:ids}]}]}
 await installTextCourse(pack);assert.equal(course.choose(pack.courseId),true);return ids
}
test('家长设置一次迁移旧3/5/10及异常有限值，保留等级、完整Session和学习数据',()=>{
 for(const [before,after] of [[3,5],[5,5],[10,10],[-1,5],[0,5],[6,10],[15,10],[16,20],[99,20]]){
  const old=legacy(before);assert.ok(validateDatabase(old));const snapshot=JSON.stringify(old),migrated=migrateParentSettings(old,123)
  assert.equal(migrated.dailyLimit,after);assert.equal(migrated.abilityLevel,'L2');assert.equal(migrated.parentSettingsVersion,2);assert.equal(migrated.parentSettingsUpdatedAt,123);assert.equal(protectedFields(migrated),protectedFields(old));assert.equal(JSON.stringify(old),snapshot);assert.equal(migrateParentSettings(migrated,999),migrated);assert.ok(validateDatabase(migrated))
 }
 const {profile,parent}=fresh(legacy());assert.equal(profile.db.dailyLimit,5);assert.equal(parent.dailyState,'pending');const saved=storage.get(V2_KEY),count=writes;setActivePinia(createPinia());assert.equal(useProfileStore().db.dailyLimit,5);assert.equal(storage.get(V2_KEY),saved);assert.equal(writes,count)
 const bad={...legacy(),parentSettingsVersion:2} as Database;assert.equal(validateDatabase(bad),false)
})
test('迁移或保存失败保留最后成功值，恢复后离线持久化，不伪装已生效',()=>{
 const old=legacy();storage.clear();storage.set(V2_KEY,JSON.stringify(old));storage.set(POINTER_KEY,JSON.stringify('v2'));fail=true;setActivePinia(createPinia());const profile=useProfileStore(),parent=useParentSettingsStore();assert.equal(JSON.stringify(profile.db),JSON.stringify(old));assert.equal(parent.dailyState,'error');assert.equal(parent.persisted,false)
 fail=false;assert.equal(parent.save({dailyNewWordLimit:10}),true);const before=JSON.stringify(profile.db);fail=true;assert.equal(parent.save({dailyNewWordLimit:20,entryLevel:5}),false);assert.equal(JSON.stringify(profile.db),before);assert.equal(parent.settings.dailyNewWordLimit,10);assert.equal(parent.settings.entryLevel,2);assert.equal(parent.levelState,'error');assert.match(parent.error,/未保存/)
 fail=false;assert.equal(parent.save({dailyNewWordLimit:20}),true);setActivePinia(createPinia());assert.equal(useParentSettingsStore().settings.dailyNewWordLimit,20)
})
test('L1–L5元数据、推荐引擎和默认题型实际读取能力起点；不强制切课或改变档案',()=>{
 const {profile,parent,course}=fresh();assert.equal(parent.settings.dailyNewWordLimit,10);assert.equal(parent.settings.entryLevel,3);assert.deepEqual(DAILY_NEW_WORD_LIMITS,[5,10,20]);const before=protectedFields(profile.db)
 for(const level of [1,5,2,3,4] as EntryLevel[]){assert.equal(parent.save({entryLevel:level}),true);const meta=ABILITY_LEVELS[level-1];assert.ok(meta.title&&meta.description&&meta.recommendedSkills.length);assert.equal(course.recommendation.entryLevel,level);assert.equal(course.recommendationConfig.entryLevel,level);assert.ok(course.recommendation.courses.every(c=>c.abilityLevels.includes('L'+level)));assert.equal(parent.levelState,'applied');assert.equal(protectedFields(profile.db),before);assert.equal(automaticMode(0,'new_word',level),meta.modes[0])}
 assert.ok(!ABILITY_LEVELS[0].modes.includes('dictation'));assert.ok(ABILITY_LEVELS[4].modes.includes('dictation'))
})
test('Planner去重并按due→weak→new排序；12个到期不被5/10/20新词上限截断，计入今日已学',()=>{
 for(const limit of DAILY_NEW_WORD_LIMITS){const due=Array.from({length:12},(_,i)=>'due-'+i),news=Array.from({length:30},(_,i)=>'new-'+i),plan=planDailySession({config:{dailyNewWordLimit:limit,entryLevel:3},dueIds:[...due,due[0]],weakIds:[due[0],'weak'],newIds:['weak',...news],newToday:2});assert.deepEqual(plan.dueIds,due);assert.deepEqual(plan.weakIds,['weak']);assert.equal(plan.newIds.length,limit-2);assert.deepEqual(plan.wordIds.slice(0,13),[...due,'weak'])}
})
test('真实Store在下一Session应用5/10/20，保留12个到期，正确记录复习/新词且继续使用原FSRS',async()=>{
 for(const limit of DAILY_NEW_WORD_LIMITS){const {profile,parent,learning,course}=fresh(),ids=await largeCourse(course);parent.save({dailyNewWordLimit:limit});profile.transact(d=>{for(const id of ids.slice(0,12))d.cards[id]=newCard(id,new Date('2000-01-01'))});const cards=JSON.parse(JSON.stringify(profile.db.cards));assert.equal(learning.start(),true);assert.deepEqual(learning.session!.wordIds.slice(0,12),ids.slice(0,12));assert.equal(learning.session!.wordIds.length,12+limit);assert.deepEqual(profile.db.cards,cards);assert.equal(learning.session!.plannerConfig!.dailyNewWordLimit,limit)
  while(!learning.session!.completedAt){const id=learning.current!.id,before=profile.db.cards[id];learning.setMode('spell');learning.patch({input:learning.current!.word});assert.equal(learning.submit(),true);const answer=profile.db.history.at(-1)!;assert.equal(answer.source,ids.slice(0,12).includes(id)?'review_due':'new_word');const now=new Date(answer.at);assert.deepEqual(profile.db.cards[id],new FSRSScheduler().schedule(before||newCard(id,now),answer.rating,now).card);learning.next()}
  assert.equal(learning.newToday,limit);assert.equal(learning.dailyPlan.newIds.length,0);assert.equal(profile.db.history.length,12+limit)
 }
})
test('进行中Session改上限和能力不改题目、输入、快照或排程；重启后保留等待状态，下一轮用新难度',async()=>{
 const {profile,parent,learning,course}=fresh();await largeCourse(course);parent.save({dailyNewWordLimit:20,entryLevel:1});learning.start();learning.setMode('spell');learning.patch({input:'draft'});const before=protectedFields(profile.db),session=JSON.stringify(learning.session)
 parent.save({dailyNewWordLimit:5,entryLevel:5});assert.equal(protectedFields(profile.db),before);assert.equal(JSON.stringify(learning.session),session);assert.equal(parent.dailyState,'pending');assert.equal(parent.levelState,'applied');assert.equal(parent.difficultyPending,true)
 setActivePinia(createPinia());const loaded=useLearningStore(),loadedParent=useParentSettingsStore(),loadedProfile=useProfileStore();assert.equal(JSON.stringify(loaded.session),session);assert.equal(loadedParent.dailyState,'pending');assert.equal(loadedParent.settings.entryLevel,5);loadedProfile.transact(d=>{d.session!.completedAt=new Date().toISOString()});assert.equal(loaded.start(),true);assert.equal(loaded.session!.wordIds.length,5);assert.equal(loaded.session!.plannerConfig!.entryLevel,5);const view=useStudyPresentation();view.sync();assert.equal(view.mode,loaded.current!.audio?'dictation':'flash');assert.equal(loadedParent.dailyState,'applied')
})
test('重点巩固排在新词前，巩固答题不写正式历史、奖励或SRS，手动练习仍先完成到期',async()=>{
 const {profile,parent,learning,course}=fresh(),ids=await largeCourse(course);parent.save({dailyNewWordLimit:5});profile.transact(d=>{d.cards[ids[0]]=newCard(ids[0],new Date('2000-01-01'));d.cards[ids[1]]={...newCard(ids[1],new Date('2040-01-01')),lapses:1}});learning.start();assert.deepEqual(learning.session!.wordIds.slice(0,2),ids.slice(0,2));assert.equal(learning.session!.wordSources![ids[1]],'practice');learning.setMode('spell');learning.patch({input:learning.current!.word});learning.submit();learning.next();const before=JSON.stringify({cards:profile.db.cards,history:profile.db.history,rewardIds:profile.db.rewardIds,gems:profile.db.gems,pets:profile.db.pets});learning.setMode('spell');learning.patch({input:learning.current!.word});learning.submit();assert.equal(JSON.stringify({cards:profile.db.cards,history:profile.db.history,rewardIds:profile.db.rewardIds,gems:profile.db.gems,pets:profile.db.pets}),before)
})
