import {test,expect,type Page} from '@playwright/test'
import {go,database,completeDaily} from './helpers'
import {freshDatabase,type Database} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {selectDailyPlan,STUDY_STEPS,stepMode} from '../../src/services/learning/DailyLearningPlan'
import {starterPack,wordById} from '../../src/services/content/ContentRegistry'
import {captureMemoryVersions} from '../../src/services/learning/MemorySettlement'

async function seed(page:Page,dictation=false){
 const db:Database={...freshDatabase(),version:2,currentCourseId:'starter',abilityLevel:'L1',courseProgress:{starter:initialProgress('starter')},auxiliaryRecords:[]}
 if(dictation){
  const plan=selectDailyPlan(db,starterPack)!;plan.flow!.begunAt=plan.startedAt;plan.flow!.step='dictation';plan.mode=stepMode('dictation');plan.wordSnapshot=JSON.parse(JSON.stringify(wordById));plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,'new_word']));plan.memoryVersions=captureMemoryVersions(db,plan.wordIds)
  for(const step of STUDY_STEPS.slice(0,4))plan.flow!.completed[step]=[...plan.wordIds]
  db.courseProgress!.starter.dailyPlan=plan;db.courseProgress!.starter.studyActivity='daily'
 }
 await page.addInitScript(db=>{if(localStorage.getItem('wordpal.database.active.v2'))return;localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},db)
}

test('今日学习立即锁题型，六环节与结算完成后才开放自定义练习',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:390,height:844});await seed(page);await go(page,'learn')
 await expect(page.locator('.study-practice-entry-button')).toBeVisible();await page.getByRole('button',{name:'开始今日学习',exact:true}).click()
 await expect(page.locator('.daily-session-lock')).toContainText('完成本轮六环节后解锁切换');await expect(page.locator('.study-round-tools')).toBeDisabled();await expect(page.locator('.study-practice-entry-button')).toHaveCount(0);await expect(page.locator('.mode-button')).toHaveCount(0)
 await completeDaily(page);await expect(page.locator('.study-completion')).toBeVisible();await expect(page.locator('.daily-session-lock')).toHaveCount(0);await expect(page.locator('.study-practice-entry-button')).toBeVisible()
 await page.locator('.study-practice-entry-button').click();await expect(page.locator('.custom-practice-workspace')).toBeVisible()
})

test('听写积木含易混项，取消或保存离开均不解锁，刷新与返回恢复同一草稿',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seed(page,true);await go(page,'learn')
 await page.getByRole('button',{name:'用字母积木辅助',exact:true}).click();await expect(page.locator('.block-slot')).toHaveCount(3);await expect(page.locator('.letter-tile')).toHaveCount(6)
 await expect(page.locator('.letter-tile[data-letter="e"]')).toBeVisible();await expect(page.locator('.meaning,.ipa,.word-picture-stage')).toHaveCount(0)
 await page.locator('.letter-tile[data-letter="c"]').first().click();await expect.poll(async()=>(await database(page)).courseProgress.starter.dailyPlan.letterDraft?.history.length).toBe(1);const before=await database(page),pool=await page.locator('.letter-tile').evaluateAll(tiles=>tiles.map(tile=>tile.getAttribute('data-tile-id')))
 await page.getByRole('button',{name:'首页',exact:true}).last().click();await expect(page.locator('.uni-modal')).toContainText('本轮进度会保存');await page.locator('.uni-modal').getByText('继续学习',{exact:true}).click();await expect(page.locator('.block-slot.filled')).toHaveCount(1);await expect(page.locator('.study-round-tools')).toBeDisabled()
 await page.getByRole('button',{name:'首页',exact:true}).last().click();await page.locator('.uni-modal').getByText('保存并离开',{exact:true}).click();await expect(page.locator('.wp-brand-header .brand-subtitle')).toHaveText('Home')
 await page.getByRole('button',{name:/^(开始|继续)今日学习$/}).click();await expect(page.locator('.block-slot.filled')).toHaveCount(1);await page.reload();await expect(page.locator('.block-slot.filled')).toHaveCount(1);expect(await page.locator('.letter-tile').evaluateAll(tiles=>tiles.map(tile=>tile.getAttribute('data-tile-id')))).toEqual(pool)
 const after=await database(page);expect(after.courseProgress.starter.dailyPlan.id).toBe(before.courseProgress.starter.dailyPlan.id);expect(after.courseProgress.starter.dailyPlan.letterDraft).toEqual(before.courseProgress.starter.dailyPlan.letterDraft);for(const key of ['history','cards','gems','pets','rewardIds'])expect(after[key]).toEqual(before[key]);await expect(page.locator('.study-practice-entry-button')).toHaveCount(0)
})
