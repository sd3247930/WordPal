import {test,expect,type Page} from '@playwright/test'
import {go,database,unlockParent,setAppearance} from './helpers'
import {freshDatabase,type Database} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {selectDailyPlan,STUDY_STEPS,stepMode} from '../../src/services/learning/DailyLearningPlan'
import {starterPack,wordById} from '../../src/services/content/ContentRegistry'
import type {EntryLevel} from '../../packages/parent_settings'
import type {StudyStep} from '../../packages/core_learning'
async function seed(page:Page,level:EntryLevel=1,step:StudyStep='flash'){
 const db:Database={...freshDatabase(),version:2,currentCourseId:'starter',abilityLevel:`L${level}`,courseProgress:{starter:initialProgress('starter')},auxiliaryRecords:[]}
 const plan=selectDailyPlan(db,starterPack)!;plan.flow!.begunAt=plan.startedAt;plan.flow!.step=step;plan.mode=stepMode(step);plan.revealed=plan.mode==='flash';plan.wordSnapshot=Object.fromEntries(Object.entries(wordById).map(([id,word])=>[id,JSON.parse(JSON.stringify(word))]));plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,'new_word']))
 for(const old of STUDY_STEPS.slice(0,STUDY_STEPS.indexOf(step)))plan.flow!.completed[old]=[...plan.wordIds]
 db.courseProgress!.starter.dailyPlan=plan;db.courseProgress!.starter.studyActivity='daily'
 await page.addInitScript(db=>{if(localStorage.getItem('wordpal.database.active.v2'))return;localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},db)
}
async function answer(page:Page){
 const db=await database(page),plan=db.courseProgress.starter.dailyPlan
 // Local starter media can also supply its approved wording (for example bag = 包).
 // Use that course view over the frozen fixture, as the page does, rather than
 // answering a locally replaced textbook with the public fallback's wording.
 const word=await page.evaluate(async plan=>{
  const registry=await import('/src/services/content/ContentRegistry.ts' as string)
  return registry.resolveFrozenWord(plan.wordSnapshot[plan.wordIds[plan.index]],plan.courseId,plan.contentVersion)
 },plan)
 if(['connect','listen'].includes(plan.mode)){await page.locator('.answer-choice').filter({has:page.getByText(plan.mode==='connect'?word.meaning:word.word,{exact:true})}).first().click();await page.getByRole('button',{name:'确认答案 →',exact:true}).click()}
 else if(['spell','dictation'].includes(plan.mode)){await page.locator('.spelling-input input').fill(word.word);await page.getByRole('button',{name:'确认答案 →',exact:true}).click()}
 else {if(!plan.revealed)await page.getByRole('button',{name:'查看答案',exact:true}).click();await page.locator('.rating-grid').getByRole('button').nth(2).click()}
 if(plan.index<plan.wordIds.length-1)await page.locator('.answer-feedback').getByRole('button').click()
 else await expect.poll(async()=>{const next=(await database(page)).courseProgress.starter.dailyPlan;return next.completedAt?'done':next.flow.step}).not.toBe(plan.flow.step)
}
test('手机完整六环节自动衔接、答案隐藏、首页四项统一5/5且不重复发奖',async({page})=>{
 test.setTimeout(60000)
 await page.setViewportSize({width:390,height:844});await seed(page);await go(page,'learn')
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 for(const step of STUDY_STEPS){await expect(page.locator('.daily-step.active')).toContainText(step==='consolidate'?'复习巩固':({flash:'闪现',connect:'连接',listen:'听音',spell:'拼写',dictation:'听写'} as const)[step]);for(let i=0;i<5;i++){if(['listen','spell','dictation'].includes(step)){await expect(page.locator('.word-core .ipa')).toHaveCount(0);await expect(page.locator('.word-core .word')).toHaveText('···')}await answer(page)}}
 await expect(page.locator('.study-completion')).toContainText('今日六环节');const before=await database(page);expect(before.history).toHaveLength(5);expect(before.pets.water.exp).toBe(70)
 await go(page,'home');for(const task of await page.locator('.home-today .task').all())await expect(task).toContainText('5 / 5')
 await page.getByRole('button',{name:/今日学习/}).first().click();await expect(page.locator('.study-completion')).toBeVisible();const after=await database(page);expect(after.history).toEqual(before.history);expect(after.pets).toEqual(before.pets);expect(errors).toEqual([])
})
test('20词连接持续覆盖全部词，拼写错三次后答对只完成一个，刷新恢复草稿',async({page})=>{
 test.setTimeout(90000)
 await seed(page,5,'connect');await go(page,'learn');const ids=(await database(page)).courseProgress.starter.dailyPlan.wordIds
 for(let i=0;i<20;i++){await expect(page.locator('.study-word-position')).toHaveText(`教材词序：第 ${i+1} / 20 词`);await answer(page)}
 expect((await database(page)).courseProgress.starter.dailyPlan.flow.completed.connect).toEqual(ids)
 for(let i=0;i<20;i++)await answer(page)
 for(let i=0;i<3;i++){await page.locator('.spelling-input input').fill('wrong');await page.getByRole('button',{name:'确认答案 →',exact:true}).click();await page.getByRole('button',{name:'再试一次 →',exact:true}).click()}
 expect((await database(page)).courseProgress.starter.dailyPlan.flow.completed.spell).toHaveLength(0);await page.locator('.spelling-input input').fill('ca');await page.reload();await expect(page.locator('.spelling-input input')).toHaveValue('ca');await answer(page);expect((await database(page)).courseProgress.starter.dailyPlan.flow.completed.spell).toHaveLength(1)
})
for(const [width,height,large] of [[320,740,false],[390,844,true],[834,1112,false],[1280,800,false]] as const)for(const mode of ['light','dark'])test(`${width} ${mode} 大字${large} 家长设置和卡片无横向溢出`,async({page})=>{
 await page.setViewportSize({width,height});await seed(page,3);await setAppearance(page,'swiss',mode,{largeText:large});await go(page,'learn');await expect(page.locator('.word-core .ipa')).toBeVisible();await page.screenshot({path:`test-results/daily-study-${width}-${mode}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await unlockParent(page);await expect(page.getByRole('radiogroup',{name:'学习等级'}).getByRole('radio')).toHaveCount(5);await expect(page.getByText('每日新词上限',{exact:true})).toHaveCount(0);await page.getByRole('radio',{name:/L5/}).click();await expect(page.locator('.level-effective')).toContainText('下一学习日');await page.screenshot({path:`test-results/daily-parent-${width}-${mode}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect((await database(page)).courseProgress.starter.dailyPlan.wordIds).toHaveLength(10)
})

