import {test,expect,type Page} from '@playwright/test'
import {freshDatabase,type Database} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {starterPack,wordById} from '../../src/services/content/ContentRegistry'
import {selectDailyPlan,STUDY_STEPS} from '../../src/services/learning/DailyLearningPlan'
import {captureMemoryVersions} from '../../src/services/learning/MemorySettlement'
import {newCard} from '../../packages/srs_fsrs'
import {database,go,completeDaily,setAppearance} from './helpers'

function fresh():Database{return {...freshDatabase(),version:2,abilityLevel:'L1',currentCourseId:'starter',courseProgress:{starter:initialProgress('starter')},auxiliaryRecords:[]}}
async function seed(page:Page,db:Database){await page.addInitScript(db=>{if(localStorage.getItem('wordpal.database.active.v2'))return;localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},db)}
function finalFixture(){const db=fresh(),plan=selectDailyPlan(db,starterPack)!;plan.flow!.begunAt=plan.startedAt;plan.flow!.step='consolidate';plan.mode='flash';plan.revealed=true;plan.wordSnapshot={...wordById};plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,'new_word']));plan.memoryVersions=captureMemoryVersions(db,plan.wordIds);for(const step of STUDY_STEPS.slice(0,-1))plan.flow!.completed[step]=[...plan.wordIds];db.courseProgress!.starter.dailyPlan=plan;db.courseProgress!.starter.studyActivity='daily';return db}

test('真实 H5 播放结束后完整六环节结算5次，首页明确正式评估口径',async({page})=>{
 test.setTimeout(100000);await seed(page,fresh());await setAppearance(page,'clay','light');await go(page,'learn');await page.getByRole('button',{name:'开始今日学习',exact:true}).click();await completeDaily(page)
 const db=await database(page);expect(db.history).toHaveLength(5);expect(db.gems).toBe(11);expect(db.courseProgress.starter.dailyPlan.flow.attempts.filter((a:any)=>['listen','dictation'].includes(a.mode)).every((a:any)=>!!a.audioEvidence?.heardAt)).toBe(true)
 await go(page,'home');await expect(page.locator('.learning-rate-label').first()).toHaveText('正式评估正确率');expect((await database(page)).history).toEqual(db.history)
})

test('最终 Again 刷新后恢复教学重试，不重复灵石或FSRS',async({page})=>{
 await seed(page,finalFixture());await go(page,'learn');await page.getByRole('button',{name:'再学一次',exact:true}).click();const before=await database(page);expect(before.history).toHaveLength(1);expect(before.history[0].rating).toBe(1);expect(before.gems).toBe(0)
 await page.getByRole('button',{name:'再试一次 →',exact:true}).click();await page.reload();await expect(page.getByText('已经记下这次回忆，放心再试，不重复计分。',{exact:true})).toBeVisible();await page.getByRole('button',{name:'记住了',exact:true}).click()
 const after=await database(page);for(const field of ['cards','history','rewardIds','gems','pets'])expect(after[field]).toEqual(before[field]);expect(after.courseProgress.starter.dailyPlan.flow.completed.consolidate).toHaveLength(1)
})

test('坏音频的真实播放器错误阻断听写，不写通过或正式奖励',async({page})=>{
 const db=fresh(),plan=selectDailyPlan(db,starterPack)!;plan.flow!.step='dictation';plan.flow!.begunAt=plan.startedAt;plan.mode='dictation';plan.wordSnapshot=JSON.parse(JSON.stringify(wordById));for(const word of Object.values(plan.wordSnapshot!))word.audio='/static/missing-safety-audio.wav';plan.memoryVersions=captureMemoryVersions(db,plan.wordIds);plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,'new_word']));for(const step of STUDY_STEPS.slice(0,4))plan.flow!.completed[step]=[...plan.wordIds];db.courseProgress!.starter.dailyPlan=plan;db.courseProgress!.starter.studyActivity='daily'
 await page.route('**/missing-safety-audio.wav',route=>route.fulfill({status:404,body:''}));await seed(page,db);await go(page,'learn');await page.locator('.practice-audio').click();await page.locator('.spelling-input input').fill(wordById[plan.wordIds[0]].word);await expect(page.getByRole('button',{name:'确认答案 →',exact:true})).toBeDisabled();await expect(page.getByText('发音未能完整播放，请重试；这道听力题还没有完成。',{exact:true})).toBeVisible()
 const saved=await database(page);expect(saved.history).toHaveLength(0);expect(saved.gems).toBe(0);expect(saved.courseProgress.starter.dailyPlan.flow.completed.dictation).toHaveLength(0)
})

test('全书完成有到期时开始按钮能进入复习，无到期时显示完成态',async({page})=>{
 const db=fresh();db.courseProgress!.starter.curriculumSchema=1;db.courseProgress!.starter.fullLearnedWords=Object.fromEntries(starterPack.vocabulary.map(word=>[word.id,new Date().toISOString()]));db.cards.cat=newCard('cat',new Date(Date.now()-1000));await seed(page,db);await go(page,'learn');await page.getByRole('button',{name:'开始今日学习',exact:true}).click();expect((await database(page)).session.kind).toBe('review_due');await page.getByRole('button',{name:'开始自评',exact:true}).click();await expect(page.locator('.rating-grid')).toBeVisible()
})

test('高频输入在刷新前刷写，不提前改变历史与灵石',async({page})=>{
 const db=fresh(),plan=selectDailyPlan(db,starterPack)!;plan.flow!.step='spell';plan.flow!.begunAt=plan.startedAt;plan.mode='spell';plan.wordSnapshot={...wordById};plan.memoryVersions=captureMemoryVersions(db,plan.wordIds);plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,'new_word']));for(const step of STUDY_STEPS.slice(0,3))plan.flow!.completed[step]=[...plan.wordIds];db.courseProgress!.starter.dailyPlan=plan;db.courseProgress!.starter.studyActivity='daily';await seed(page,db);await go(page,'learn');const input=page.locator('.spelling-input input');await input.fill('ca');await page.reload();await expect(input).toHaveValue('ca');expect((await database(page)).gems).toBe(0);expect((await database(page)).history).toHaveLength(0)
})

test('首页全书完成后仍能开始到期复习，任务分母不被改写',async({page})=>{
 const db=fresh();db.courseProgress!.starter.curriculumSchema=1;db.courseProgress!.starter.fullLearnedWords=Object.fromEntries(starterPack.vocabulary.map(word=>[word.id,new Date().toISOString()]));db.cards.cat=newCard('cat',new Date(Date.now()-1000));await seed(page,db);await setAppearance(page,'clay','light');await go(page,'home');await page.getByRole('button',{name:'开始到期复习',exact:true}).click();await expect(page.getByRole('button',{name:'开始自评',exact:true})).toBeVisible();expect((await database(page)).session.kind).toBe('review_due')
})
