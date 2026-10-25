import {test,expect,type Page} from '@playwright/test'
import {go,database,selectWordbookScope} from './helpers'
import {freshDatabase,type Database} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
import {wordById} from '../../packages/content_schema'
import type {LearningSession} from '../../packages/core_learning'
import synthetic from '../../src/content/synthetic/course.json'
/** 原内置教材已裁剪：另置一枚已安装导入课程，用于「待切换课程」与主课程区分。 */
async function seedPendingCourse(page:Page){
 const pack={...JSON.parse(JSON.stringify(synthetic)),courseId:'wordbook-pending',title:'待切换验证课',route:'theme',sources:synthetic.sources.map(source=>({...source,rightsStatus:'redistribution-approved'}))}
 const key='wordpal.content.pack.wordbook-pending.0123456789abcdef'
 await page.addInitScript(({pack,key})=>{
  if(!localStorage.getItem('wordpal.content.catalog.v2')){
   localStorage.setItem(key,JSON.stringify(pack))
   localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]))
  }
 },{pack,key})
}

const scopes=['当前教材','全部单词','只看已学'] as const
function savedStudy(kind:LearningSession['kind'],due=false):Database{
 const db=freshDatabase(),at='2026-10-01T08:00:00.000Z'
 Object.assign(db,{version:2,currentCourseId:'starter',courseProgress:{'starter':{currentLessonId:'l01',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}},auxiliaryRecords:[]})
 const answer={id:'scope-session:0',wordId:'cat',rating:3 as const,correct:true,at,source:'new_word' as const,mode:'spell' as const,input:'cat'}
 db.cards.cat={...newCard('cat',new Date(due?'2000-01-01T00:00:00Z':'2100-01-01T00:00:00Z')),reps:2,stability:4,difficulty:5,state:2,last_review:at}
 db.history=[answer];db.rewardIds=[answer.id];db.gems=7
 db.session={id:'scope-session',date:'2026-10-01',startedAt:at,kind,wordIds:['cat','dog'],index:1,mode:'spell',input:'do',selected:'',revealed:false,answers:[answer],courseId:'starter',contentVersion:'1.0.0',lessonId:'l01',seed:12,wordSnapshot:Object.fromEntries(['cat','dog'].map(id=>[id,JSON.parse(JSON.stringify(wordById[id]))]))}
 return db
}
async function seed(page:Page,db:Database,presentation?:object){
 await seedPendingCourse(page)
 await page.addInitScript(({db,presentation})=>{
  if(!localStorage.getItem('wordpal.database.active.v2')){
   localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))
   if(presentation)localStorage.setItem('wordpal.study.presentation.v1',JSON.stringify(presentation))
  }
 },{db,presentation})
}
for(const scope of scopes)for(const kind of ['new_word','review_due','practice'] as const)test(`${scope} 继续${kind}且无到期词，冻结输入和完整档案不变`,async({page})=>{
 await seed(page,savedStudy(kind));await go(page,'review');const before=await database(page)
 await selectWordbookScope(page,scope)
 await expect(page.getByRole('button',{name:'继续当前学习',exact:true})).toBeVisible();await page.getByRole('button',{name:'继续当前学习',exact:true}).click()
 // P3: the learn headline no longer repeats the textbook name; it lives on the current-course card.
 await expect(page.locator('.spelling-input input')).toHaveValue('do');await expect(page.locator('.current-course-card')).toContainText('原创启蒙课程')
 expect(await database(page)).toEqual(before);await page.reload();await expect(page.locator('.spelling-input input')).toHaveValue('do');expect(await database(page)).toEqual(before)
})
test('Scope 连续20轮、分类与搜索切换后，仍恢复原课程而非待切换课程或到期队列',async({page})=>{
 // 20 轮、80 次范围选择及逐次校验需要独立序列预算；保留全部轮次与单步断言。
 test.setTimeout(60000)
 await seed(page,savedStudy('new_word',true));await go(page,'review');const before=await database(page)
 await page.locator('.review-tabs').getByRole('button',{name:'所有单词',exact:true}).click();await page.locator('.wordbook-search input').fill('dog')
 for(let i=0;i<20;i++)for(const scope of [...scopes,'当前教材'] as const){
  await selectWordbookScope(page,scope);const button=page.getByRole('button',{name:scope,exact:true});await expect(button).toHaveAttribute('aria-pressed','true')
  await expect(page.locator('.review-tabs .selected .wordbook-category-title')).toHaveText('所有单词');await expect(page.locator('.wordbook-search input')).toHaveValue('dog')
  await expect(page.locator('.wordbook-course-filters .course-picker')).toHaveCount(scope==='当前教材'?1:0)
 }
 expect(await database(page)).toEqual(before)
 for(const scope of scopes){
  await selectWordbookScope(page,scope);await page.getByRole('button',{name:'继续当前学习',exact:true}).click()
  await expect(page.locator('.spelling-input input')).toHaveValue('do');expect(await database(page)).toEqual(before);await go(page,'review')
 }
})
test('已保存的错词回看从任意 Scope 继续，不覆盖完成的正式 Session 或再次排程',async({page})=>{
 const db=savedStudy('new_word'),session=db.session!;session.completedAt='2026-10-01T08:05:00.000Z'
 Object.assign(session.answers[0],{correct:false,rating:1,input:'wrong'})
 session.answers.push({...session.answers[0],id:'scope-session:1',wordId:'dog',correct:true,rating:3,input:'dog'});db.history=[...session.answers]
 db.cards.dog=newCard('dog',new Date('2100-01-01T00:00:00Z'))
 const presentation={sessionId:session.id,manual:true,revisitStarted:true,queue:['cat'],index:0,input:'ca',selected:'',revealed:false,answer:null,answers:[],finished:false,petId:'water',startExp:0,rewardTracked:false}
 await seed(page,db,presentation);await go(page,'review');const before=await database(page)
 for(const scope of scopes){
  await selectWordbookScope(page,scope);await page.getByRole('button',{name:'继续当前学习',exact:true}).click()
  await expect(page.locator('.study-session-heading')).toContainText('错词回看');await expect(page.locator('.spelling-input input')).toHaveValue('ca');expect(await database(page)).toEqual(before)
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.study.presentation.v1')!))).toEqual(presentation);await go(page,'review')
 }
})
test('没有未完成 Session 时，单词本仍可新建原有到期复习',async({page})=>{
 const db=savedStudy('review_due',true);db.session=null;db.pendingCourseId=undefined;await seed(page,db);await go(page,'review');const before=await database(page)
 await selectWordbookScope(page,'全部单词');await page.locator('.wordbook-due-action').click();await expect(page.locator('.learn-workspace')).toBeVisible()
 // 到期复习优先，之后的空余名额才排新词；当前课程的课节已扩展为多词，因此只断言顺序与来源。
 const after=await database(page);expect(after.session.kind).toBe('review_due');expect(after.session.courseId).toBe(before.currentCourseId)
 expect(after.session.wordIds[0]).toBe('cat');expect(after.session.wordSources?.['cat']).toBe('review_due')
 expect((after.session.wordIds as string[]).slice(1).every((id:string)=>after.session.wordSources?.[id]==='new_word')).toBe(true)
 for(const field of ['cards','history','rewardIds','gems','pets'])expect(after[field]).toEqual(before[field])
 expect(after.courseProgress).toEqual({...before.courseProgress,[before.currentCourseId]:{...before.courseProgress[before.currentCourseId],studyActivity:'independent'}})
})
