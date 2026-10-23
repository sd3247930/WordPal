import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,database} from './helpers'
import {seedSpellingPractice} from '../helpers/spelling-practice'
import {freshDatabase,type Database} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {selectDailyPlan,STUDY_STEPS} from '../../src/services/learning/DailyLearningPlan'
import {wordById,starterPack} from '../../src/services/content/ContentRegistry'
import {normalizeSpellingWord} from '../../packages/phonics/letter-blocks'
import {spellingInputPreferenceKey} from '../../src/stores/spelling-input'

type Mode='spell'|'dictation'
type Entry='daily'|'overview'|'custom'
const names={spell:'拼写',dictation:'听写'}
const input=(page:Page)=>page.locator('.letter-block-input')
const confirm=(page:Page)=>page.getByRole('button',{name:'确认答案 →',exact:true})
async function seedDaily(page:Page,mode:Mode){
 const db:Database={...freshDatabase(),version:2,currentCourseId:'starter',abilityLevel:'L1',courseProgress:{starter:initialProgress('starter')},auxiliaryRecords:[]}
 const plan=selectDailyPlan(db,starterPack)!;plan.flow!.begunAt=plan.startedAt;plan.flow!.step=mode;plan.mode=mode;plan.revealed=false;plan.wordSnapshot=JSON.parse(JSON.stringify(wordById));plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,'new_word']))
 for(const step of STUDY_STEPS.slice(0,STUDY_STEPS.indexOf(mode)))plan.flow!.completed[step]=[...plan.wordIds]
 db.courseProgress!.starter.dailyPlan=plan;db.courseProgress!.starter.studyActivity='daily'
 await page.addInitScript(db=>{if(localStorage.getItem('wordpal.database.active.v2'))return;localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},db)
}
async function current(page:Page,entry:Entry){const db=await database(page);return entry==='custom'?db.customPractice:db.courseProgress.starter.dailyPlan}
async function lemma(page:Page,entry:Entry){const s=await current(page,entry);return s.wordSnapshot[s.wordIds[s.index]].word as string}
async function choose(page:Page,mode:'tiles'|'keyboard'){
 if(await input(page).getAttribute('data-block-mode')===mode)return
 await page.getByRole('button',{name:mode==='tiles'?'用字母积木辅助':'键盘输入',exact:true}).click();await expect(input(page)).toHaveAttribute('data-block-mode',mode)
}
async function tileAnswer(page:Page,word:string){
 for(const slot of normalizeSpellingWord(word).slots){const tiles=page.locator('.letter-tile');let used=false;for(const tile of await tiles.all())if(await tile.getAttribute('data-letter')===slot.char.toLowerCase()&&await tile.isEnabled()){await tile.click();used=true;break}expect(used).toBe(true)}
}
async function submit(page:Page){const replay=page.locator('.practice-audio');if(await replay.count())await replay.click();await confirm(page).evaluate(n=>n.scrollIntoView({block:'center'}));await expect(confirm(page)).toBeEnabled();await confirm(page).click()}
async function next(page:Page){await page.locator('.answer-feedback').getByRole('button').last().click()}
async function open(page:Page,entry:Entry,mode:Mode){
 if(entry==='custom'){
  await seedSpellingPractice(page,mode);await go(page,'learn');await page.locator('.study-practice-entry-button').click();await page.locator('.custom-count-input input').fill('3');const option=page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:new RegExp('^'+names[mode]+'，')});if(await option.getAttribute('aria-pressed')!=='true')await option.click();await page.getByRole('button',{name:'开始练习',exact:true}).click()
 }else{await seedDaily(page,mode);await go(page,'learn');if(entry==='overview')await page.locator('.study-overview-toggle').click()}
 await expect(input(page)).toBeVisible()
}

for(const theme of ['swiss','clay'])for(const entry of ['daily','overview','custom'] as Entry[])for(const mode of ['spell','dictation'] as Mode[])test(`后续单词沿用最近输入方式 ${theme} ${entry} ${mode}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,theme,'light');await open(page,entry,mode)
 await choose(page,'tiles');await tileAnswer(page,await lemma(page,entry));await submit(page);await next(page)
 await expect(input(page)).toHaveAttribute('data-block-mode','tiles');await expect(page.locator('.block-slot.filled')).toHaveCount(0);expect((await current(page,entry)).input).toBe('')
 await choose(page,'keyboard');await page.locator('.slot-native input').fill(await lemma(page,entry));await submit(page);await next(page)
 await expect(input(page)).toHaveAttribute('data-block-mode','keyboard');await expect(page.locator('.slot-native input')).toHaveValue('');expect((await current(page,entry)).inputAssistance).not.toBe('tiles')
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),spellingInputPreferenceKey)).toBe('keyboard')
 await page.locator('.slot-native input').fill(await lemma(page,entry));await submit(page)
 const s=await current(page,entry),answers=entry==='custom'?s.results[mode].attempts:s.flow.attempts
 expect(answers).toHaveLength(3);expect(answers[0].inputAssistance).toBe('tiles');expect(answers[1].inputAssistance).toBe('tiles');expect(answers[2].inputAssistance).toBeUndefined();expect(answers.every((a:any)=>a.correct)).toBe(true)
})

test('今日拼写完整一环后自动进入听写，继续沿用积木，再次选择键盘可覆盖',async({page})=>{
 test.setTimeout(90000);await setAppearance(page,'clay','light');await open(page,'daily','spell');await choose(page,'tiles');const initial=await current(page,'daily')
 for(let i=0;i<initial.wordIds.length;i++){await tileAnswer(page,await lemma(page,'daily'));await submit(page);if(i<initial.wordIds.length-1)await next(page)}
 await expect.poll(async()=>(await current(page,'daily')).mode).toBe('dictation');await expect(input(page)).toHaveAttribute('data-block-mode','tiles');await expect(page.locator('.block-slot.filled')).toHaveCount(0);await expect(page.locator('.word-picture-stage,.meaning')).toHaveCount(0)
 await choose(page,'keyboard');await page.locator('.slot-native input').fill(await lemma(page,'daily'));await submit(page);await next(page);await expect(input(page)).toHaveAttribute('data-block-mode','keyboard')
})

test('键盘偏好跨入口与刷新保留，自定义暂停恢复保持当前草稿',async({page})=>{
 await setAppearance(page,'clay','light');await seedSpellingPractice(page,'spell');await go(page,'learn');await choose(page,'keyboard');await page.locator('.slot-native input').fill('doc');await page.reload();await expect(input(page)).toHaveAttribute('data-block-mode','keyboard');await expect(page.locator('.slot-native input')).toHaveValue('doc')
 await page.locator('.study-practice-entry-button').click();await page.locator('.custom-count-input input').fill('2');await page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:/^听写，/}).click();await page.getByRole('button',{name:'开始练习',exact:true}).click();await expect(input(page)).toHaveAttribute('data-block-mode','keyboard')
 await choose(page,'tiles');await page.locator('.letter-tile').first().click();const draft=(await database(page)).customPractice.letterDraft;await page.getByRole('button',{name:'暂停练习',exact:true}).click();await page.reload();await expect(page.locator('.study-custom-resume')).toHaveCount(0);await page.locator('.study-practice-entry-button').click();await page.getByRole('button',{name:'查看已保存进度',exact:true}).click();await page.getByRole('button',{name:'继续练习',exact:true}).click();await expect(input(page)).toHaveAttribute('data-block-mode','tiles');expect((await database(page)).customPractice.letterDraft).toEqual(draft)
})

test('特殊字符临时使用键盘，后续普通词恢复积木偏好',async({page})=>{
 await setAppearance(page,'clay','light');await seedSpellingPractice(page,'spell','B2B');await page.addInitScript(key=>localStorage.setItem(key,JSON.stringify('tiles')),spellingInputPreferenceKey);await go(page,'learn');await expect(input(page)).toHaveAttribute('data-block-mode','keyboard');await page.locator('.slot-native input').fill('B2B');await submit(page);await next(page);await expect(input(page)).toHaveAttribute('data-block-mode','tiles');await expect(page.locator('.block-slot.filled')).toHaveCount(0)
})

test('旧版已有键盘草稿在没有偏好时迁移，之后新词保持键盘',async({page})=>{
 await setAppearance(page,'clay','light');await seedSpellingPractice(page,'spell');await go(page,'learn');await choose(page,'keyboard');await page.locator('.slot-native input').fill('doc');await page.evaluate(key=>localStorage.removeItem(key),spellingInputPreferenceKey);await page.reload();await expect(input(page)).toHaveAttribute('data-block-mode','keyboard');await expect(page.locator('.slot-native input')).toHaveValue('doc');await page.locator('.slot-native input').fill('doctor');await submit(page);await next(page);await expect(input(page)).toHaveAttribute('data-block-mode','keyboard');await expect(page.locator('.slot-native input')).toHaveValue('')
})
