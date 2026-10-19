import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import {createPinia,setActivePinia} from 'pinia'
import {useLearningStore} from '../src/stores/learning'
import {useProfileStore,freshDatabase} from '../src/stores/profile'
import {starterPack,loadCourseRegistry} from '../src/services/content/ContentRegistry'
import {initialProgress} from '../src/services/storage/MigrationV1toV2'
import {STUDY_STEPS,selectDailyPlan} from '../src/services/learning/DailyLearningPlan'
import {studyRoundProgress,todayCourseWordIds} from '../src/services/learning/StudyStats'
import {answerDailyWord,finishDaily} from './helpers/daily-flow'

const storage=new Map<string,string>();let fail=false
;(globalThis as any).uni={getStorageSync:(key:string)=>storage.get(key)||'',setStorageSync:(key:string,value:string)=>{if(fail)throw Error('Quota');storage.set(key,value)},removeStorageSync:(key:string)=>storage.delete(key)}
function reset(){storage.clear();fail=false;loadCourseRegistry();setActivePinia(createPinia());const profile=useProfileStore();profile.transact(d=>{d.abilityLevel='L1'});return {profile,learning:useLearningStore()}}

test('未开始和无效轮次不伪造百分比，读取统计不写档案',()=>{
 const db=freshDatabase(),before=JSON.stringify(db)
 assert.deepEqual(studyRoundProgress(null),{status:'ready',completed:0,total:0})
 const plan=selectDailyPlan(db,starterPack)!
 plan.wordIds=[];assert.equal(studyRoundProgress(plan).status,'unavailable')
 assert.equal(JSON.stringify(db),before)
})

test('六环节累计题步跨环节不归零，去重且忽略非计划词',()=>{
 const plan=selectDailyPlan(freshDatabase(),starterPack)!,total=plan.wordIds.length*6
 plan.flow!.completed.flash=[...plan.wordIds]
 assert.deepEqual(studyRoundProgress(plan),{status:'active',completed:plan.wordIds.length,total})
 plan.flow!.completed.connect=[plan.wordIds[0],plan.wordIds[0],'foreign-word']
 assert.equal(studyRoundProgress(plan).completed,plan.wordIds.length+1)
 for(const step of STUDY_STEPS)plan.flow!.completed[step]=[...plan.wordIds]
 assert.deepEqual(studyRoundProgress(plan),{status:'completed',completed:total,total})
})

test('独立复习统计已提交题步，答错不丢失进度，重复答案不增加',()=>{
 const plan=selectDailyPlan(freshDatabase(),starterPack)!;delete plan.flow
 plan.answers=[{id:'answer',wordId:plan.wordIds[0],correct:false,rating:1,at:new Date().toISOString(),source:'review_due',mode:'flash',input:''}]
 plan.answers.push({...plan.answers[0],id:'duplicate'})
 assert.deepEqual(studyRoundProgress(plan),{status:'active',completed:1,total:plan.wordIds.length})
})

test('今日词明细与当前教材真实完成记录一致，旧日期及浏览不计入',()=>{
 const db=freshDatabase(),now=new Date(2026,9,18,0,5),previous=new Date(2026,9,17,23,55),next=new Date(2026,9,19,0,5)
 db.courseProgress={starter:{...initialProgress('starter'),curriculumSchema:1,fullLearnedWords:{cat:now.toISOString(),dog:previous.toISOString(),'foreign-word':now.toISOString()},introducedWords:{fish:now.toISOString()}},other:{...initialProgress('other'),fullLearnedWords:{bird:now.toISOString()}}}
 const before=JSON.stringify(db)
 assert.deepEqual(todayCourseWordIds(db,starterPack,now),['cat'])
 assert.deepEqual(todayCourseWordIds(db,starterPack,next),[])
 assert.equal(JSON.stringify(db),before)
})

test('真实轮次重启恢复、重复提交和存储失败均不虚增统计或奖励',()=>{
 let {profile,learning}=reset();learning.start();answerDailyWord(learning)
 assert.deepEqual(studyRoundProgress(learning.session),{status:'active',completed:1,total:30})
 setActivePinia(createPinia());learning=useLearningStore();profile=useProfileStore()
 assert.equal(studyRoundProgress(learning.session).completed,1)
 const before=JSON.stringify(profile.db);fail=true
 assert.equal(learning.submit(3),false);assert.equal(JSON.stringify(profile.db),before);fail=false
 assert(learning.submit(3));const submitted=JSON.stringify(profile.db)
 assert.equal(learning.submit(3),false);assert.equal(JSON.stringify(profile.db),submitted)
 assert.equal(studyRoundProgress(learning.session).completed,2)
 learning.next();finishDaily(learning)
 assert.deepEqual(studyRoundProgress(learning.session),{status:'completed',completed:30,total:30})
 assert.equal(learning.newToday,5);assert.equal(learning.newTodayWordIds.length,5)
 const completed=JSON.stringify(profile.db)
 assert.equal(learning.submit(3),false);assert.equal(JSON.stringify(profile.db),completed)
 assert.equal(profile.db.history.length,5)
})

test('公开图标保留透明像素，仅包含干净 PNG 图像块',async()=>{
 for(const name of ['today_new','due_review','round_progress'])for(const size of [1024,256]){
  const data=await fs.readFile(`src/static/icons/study-stats/wordpal_study_${name}_${size}.png`),meta=await sharp(data).metadata()
  assert.equal(meta.width,size);assert.equal(meta.height,size);assert(meta.hasAlpha)
  const {data:pixels}=await sharp(data).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  assert.equal(pixels[3],0);assert.equal(pixels[pixels.length-1],0)
  for(let offset=8;offset<data.length;){const length=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);assert(['IHDR','IDAT','IEND','pHYs'].includes(type),`Unexpected PNG chunk: ${type}`);offset+=length+12}
 }
})
