import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,database,completeDaily} from './helpers'
import {freshDatabase,type Database} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {selectDailyPlan,recordDailyAnswer,advanceDailyPlan} from '../../src/services/learning/DailyLearningPlan'
import {starterPack,wordById} from '../../src/services/content/ContentRegistry'
import {orderedCourseWords} from '../../src/services/learning/CourseStudySequence'

const time=new Date('2040-01-01T08:00:00Z'),ids=orderedCourseWords(starterPack)
function fresh():Database{return {...freshDatabase(),version:2,abilityLevel:'L1',currentCourseId:'starter',courseProgress:{starter:initialProgress('starter')},auxiliaryRecords:[]}}
function completed(){
 const db=fresh(),plan=selectDailyPlan(db,starterPack,time)!
 plan.wordSnapshot={...wordById};plan.flow!.begunAt=time.toISOString()
 while(!plan.completedAt){recordDailyAnswer(plan,{id:`${plan.id}:${plan.flow!.step}:${plan.index}`,wordId:plan.wordIds[plan.index],courseId:'starter',mode:plan.mode,source:'practice',correct:true,rating:3,input:'',at:time.toISOString()});advanceDailyPlan(plan,time)}
 Object.assign(db.courseProgress!.starter,{dailyPlan:plan,studyActivity:'daily',fullLearnedWords:Object.fromEntries(plan.wordIds.map(id=>[id,time.toISOString()]))})
 return db
}
async function prepare(page:Page,theme='clay',mode='light',db=fresh()){
 await page.clock.install({time});await setAppearance(page,theme,mode)
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.active.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db)
 await go(page,'home')
}
const continueButton=(page:Page)=>page.getByRole('button',{name:'继续学习',exact:true})
const resultButton=(page:Page)=>page.getByRole('button',{name:'查看今日成果',exact:true})
async function shownIds(page:Page,theme='clay'){
 return theme==='clay'?page.locator('.home-word-tile').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-word-id'))):page.locator('.today-word .word-mini').allTextContents()
}
async function style(page:Page,name:string){return page.getByRole('button',{name,exact:true}).evaluate(node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return Object.fromEntries(['minHeight','paddingTop','paddingBottom','paddingLeft','paddingRight','borderRadius','borderWidth','borderColor','backgroundColor','backgroundImage','boxShadow','color','fontSize','fontWeight','lineHeight','justifyContent'].map(key=>[key,s[key as keyof CSSStyleDeclaration]]).concat([['height',String(r.height)]]))})}

for(const theme of ['swiss','clay'])for(const mode of ['light','dark'])test(`${theme} ${mode} 继续学习与查看成果样式一致，连点只创建下一批`,async({page})=>{
 await prepare(page,theme,mode,completed());const before=await database(page)
 for(const width of [320,390,834,1280]){await page.setViewportSize({width,height:900});expect(await style(page,'继续学习')).toEqual(await style(page,'查看今日成果'));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
 await page.setViewportSize({width:390,height:844});await continueButton(page).scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath(`${theme}-${mode}-completed.png`),fullPage:true})
 const homeStyle=await style(page,'继续学习');await resultButton(page).click();await expect(page.locator('.study-completion')).toBeVisible();expect(await style(page,'继续学习')).toEqual(homeStyle)
 await go(page,'home');await continueButton(page).evaluate(node=>{for(let i=0;i<20;i++)(node as HTMLElement).click()});await expect(page.locator('.daily-step.active')).toContainText('闪现')
 const after=await database(page),plan=after.courseProgress.starter.dailyPlan
 expect(plan.wordIds).toEqual(ids.slice(5,10));expect(plan.index).toBe(0);expect(plan.id).not.toBe(before.courseProgress.starter.dailyPlan.id);expect(after.courseProgress.starter.completedDailyPlans).toHaveLength(1)
 for(const field of ['history','cards','gems','pets','rewardIds'])expect(after[field]).toEqual(before[field])
 await go(page,'home');await expect(continueButton(page)).toHaveCount(0);expect(await shownIds(page,theme)).toEqual(theme==='clay'?ids.slice(5,10):ids.slice(5,10).map(id=>wordById[id].word))
})

test('真实完成两批六环节、保存断点、跨天完成后下一日从第11词顺延，首页只列当前5词',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:390,height:844});await prepare(page)
 await expect(continueButton(page)).toHaveCount(0);await page.getByRole('button',{name:'开始今日学习',exact:true}).click();await completeDaily(page)
 let db=await database(page);expect(db.history).toHaveLength(5);await go(page,'home');expect(await shownIds(page)).toEqual(ids.slice(0,5));await continueButton(page).click()
 for(let i=0;i<2;i++){await page.locator('.rating-grid').getByRole('button').nth(2).click();await page.locator('.answer-feedback').getByRole('button').click()}
 const saved=(await database(page)).courseProgress.starter.dailyPlan;await page.reload();await expect(page.locator('.study-word-position')).toContainText('第 8 /');expect((await database(page)).courseProgress.starter.dailyPlan).toEqual(saved)
 await page.clock.setSystemTime(new Date('2040-01-02T08:00:00Z'));await go(page,'home');await expect(page.locator('.home-word-heading')).toContainText('待续学');expect(await shownIds(page)).toEqual(ids.slice(5,10));await page.getByRole('button',{name:'继续今日学习',exact:true}).click();expect((await database(page)).courseProgress.starter.dailyPlan).toEqual(saved)
 await completeDaily(page);db=await database(page);expect(db.history).toHaveLength(10);expect(db.courseProgress.starter.dailyPlan.flow.finishedDate).toBe('2040-01-02');expect(Object.keys(db.courseProgress.starter.fullLearnedWords)).toHaveLength(10)
 await go(page,'home');expect(await shownIds(page)).toEqual(ids.slice(5,10));await expect(page.locator('.home-today .task-value')).toHaveText(Array(4).fill('5 / 5'))
 await page.clock.setSystemTime(new Date('2040-01-03T08:00:00Z'));await page.clock.runFor(31000);await expect.poll(()=>shownIds(page)).toEqual(ids.slice(10,15));await page.getByRole('button',{name:'开始今日学习',exact:true}).click();await expect(page.locator('.study-word-position')).toContainText('第 11 /');db=await database(page);expect(db.courseProgress.starter.dailyPlan.wordIds).toEqual(ids.slice(10,15));expect(db.courseProgress.starter.completedDailyPlans).toHaveLength(2)
})

test('保存失败留在成果页并显示原因，重试成功后从原游标开启下一批',async({page})=>{
 await prepare(page,'clay','light',completed());const before=await database(page)
 await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).__restoreBatchStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(key,value){if(key==='wordpal.database.v2')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value)}})
 await continueButton(page).click();await expect(page.locator('.wp-app')).toContainText('保存失败');expect(await database(page)).toEqual(before);await expect(resultButton(page)).toBeEnabled();await expect(continueButton(page)).toBeEnabled()
 await page.evaluate(()=>(window as any).__restoreBatchStorage());await continueButton(page).click();await expect(page.locator('.daily-step.active')).toContainText('闪现');expect((await database(page)).courseProgress.starter.dailyPlan.wordIds).toEqual(ids.slice(5,10))
})
