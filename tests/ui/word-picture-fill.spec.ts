import {test,expect,type Page} from '@playwright/test'
import sharp from 'sharp'
import {seedSpellingPractice} from '../helpers/spelling-practice'
import {go,setAppearance,database,selectCustomModes} from './helpers'
import {freshDatabase,type Database} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {selectDailyPlan,STUDY_STEPS} from '../../src/services/learning/DailyLearningPlan'
import {starterPack,wordById} from '../../src/services/content/ContentRegistry'
import type {LearningMode} from '../../packages/core_learning'
const modes:LearningMode[]=['flash','connect','listen','spell','dictation']
const names={flash:'闪现',connect:'连接',listen:'听音',spell:'拼写',dictation:'听写'}
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1086" height="1448"><rect width="1086" height="1448" fill="#c4dcbd"/><rect y="0" width="90" height="1448" fill="#ff0000"/><rect x="996" width="90" height="1448" fill="#0000ff"/></svg>'
async function imageReady(page:Page){await expect(page.locator('.word-picture img')).toHaveJSProperty('naturalWidth',1086);await expect(page.locator('.word-picture img')).toHaveJSProperty('naturalHeight',1448)}
async function completeImage(page:Page){
 await imageReady(page)
 const stage=page.locator('.word-picture-stage'),pic=page.locator('.word-picture');expect(await pic.boundingBox()).toEqual(await stage.boundingBox())
 const b=(await pic.boundingBox())!,visible=Math.min(b.width,b.height*.75)
 // A portrait must gain visible width over the previous inset square frame.
 if(page.viewportSize()!.width<=430)expect(visible).toBeGreaterThan((b.width-8)*.75*1.25)
 await expect(pic.locator('div').first()).toHaveCSS('background-size','contain')
 // Both side markers must survive the actual rendered image, not just its box.
 const {data,info}=await sharp(await pic.screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true})
 const colors=new Set<string>();for(let x=0;x<info.width;x++){const i=(Math.floor(info.height/2)*info.width+x)*info.channels;colors.add([data[i],data[i+1],data[i+2]].join(','))}
 expect(colors.has('255,0,0')).toBe(true);expect(colors.has('0,0,255')).toBe(true)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
}
for(const theme of ['swiss','clay'])for(const mode of modes)test(`今日六环节及学习概览图片完整 ${theme} ${mode}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,theme,'light')
 const db:Database={...freshDatabase(),version:2,currentCourseId:'starter',abilityLevel:'L1',courseProgress:{starter:initialProgress('starter')},auxiliaryRecords:[]}
 const plan=selectDailyPlan(db,starterPack)!;plan.flow!.begunAt=plan.startedAt;plan.flow!.step=mode;plan.mode=mode;plan.revealed=mode==='flash';plan.wordSnapshot=Object.fromEntries(Object.entries(wordById).map(([id,w])=>[id,{...JSON.parse(JSON.stringify(w)),image:'/static/portrait-boundaries.svg'}]));plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,'new_word']))
 for(const step of STUDY_STEPS.slice(0,STUDY_STEPS.indexOf(mode)))plan.flow!.completed[step]=[...plan.wordIds]
 db.courseProgress!.starter.dailyPlan=plan;db.courseProgress!.starter.studyActivity='daily'
 await page.route('**/static/portrait-boundaries.svg',r=>r.fulfill({contentType:'image/svg+xml',body:svg}));await page.addInitScript(db=>{localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},db);await go(page,'learn')
 const before=await database(page)
 if(mode==='dictation')await expect(page.locator('.word-picture-stage')).toHaveCount(0);else await completeImage(page)
 await page.locator('.study-overview-toggle').click()
 if(mode==='dictation')await expect(page.locator('.word-picture-stage')).toHaveCount(0);else await completeImage(page)
 expect(await database(page)).toEqual(before)
})
for(const mode of modes)test(`自定义练习复用完整原图 ${mode}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,'clay','light');await seedSpellingPractice(page,mode);await page.route('**/static/easy-picture.svg',r=>r.fulfill({contentType:'image/svg+xml',body:svg}));await go(page,'learn')
 await page.locator('.study-practice-entry-button').click();await page.locator('.custom-count-input input').fill('1');await selectCustomModes(page,[mode]);await page.getByRole('button',{name:'开始练习',exact:true}).click();await expect(page.locator('[data-custom-screen="training"]')).toBeVisible()
 if(mode==='dictation')await expect(page.locator('.word-picture-stage')).toHaveCount(0);else await completeImage(page)
 const db=await database(page);expect(db.history).toHaveLength(0);expect(db.gems).toBe(10);expect(db.practiceAnswers||[]).toHaveLength(0)
})
test('图片延迟加载与加载失败不改变图片槽及操作位置',async({page})=>{
 await page.setViewportSize({width:359,height:780});await setAppearance(page,'clay','light');await seedSpellingPractice(page,'spell');let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});await page.route('**/static/easy-picture.svg',async r=>{await gate;await r.fulfill({contentType:'image/svg+xml',body:svg})});await go(page,'learn')
 const stage=page.locator('.word-picture-stage'),button=page.getByRole('button',{name:'确认答案 →',exact:true}),before=await stage.boundingBox(),action=await button.boundingBox();release();await completeImage(page);expect(await stage.boundingBox()).toEqual(before);expect(await button.boundingBox()).toEqual(action)
 await page.locator('.word-picture').dispatchEvent('error');expect(await stage.boundingBox()).toEqual(before);expect(await button.boundingBox()).toEqual(action);await page.getByRole('button',{name:'重新加载词条图片',exact:true}).click();await completeImage(page);expect(await button.boundingBox()).toEqual(action)
})
for(const theme of ['swiss','clay'])test(`听写答后完整展示原图 ${theme}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,theme,'light');await seedSpellingPractice(page,'dictation');await page.route('**/static/easy-picture.svg',r=>r.fulfill({contentType:'image/svg+xml',body:svg}));await go(page,'learn');await expect(page.locator('.word-picture')).toHaveCount(0)
 await page.locator('.practice-audio').click();const keyboard=page.getByRole('button',{name:'键盘输入',exact:true});if(await keyboard.count())await keyboard.click();await page.locator('.slot-native input').fill('wrong');const submit=page.getByRole('button',{name:'确认答案 →',exact:true});await submit.evaluate(n=>n.scrollIntoView({block:'center'}));await submit.click();await expect(page.locator('.answer-feedback')).toBeVisible();await completeImage(page)
 expect((await database(page)).history).toHaveLength(0)
})
