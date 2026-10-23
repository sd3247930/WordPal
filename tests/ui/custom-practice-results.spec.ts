import {test,expect,type Page} from '@playwright/test'
import {go,database,setAppearance,selectCustomModes,waitForArtwork} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {customCourse} from '../helpers/custom-course'
const all=['flash','connect','listen','spell','dictation']
const formal=(db:any)=>Object.fromEntries(Object.entries(db).filter(([key])=>!['customPractice','practiceAnswers','customPracticeCursors'].includes(key)))
async function open(page:Page,modes:string[]){await go(page,'learn');await page.locator('.study-practice-entry-button').click();await page.locator('.custom-count-input input').fill('1');await selectCustomModes(page,modes);await page.locator('.custom-action-bar').getByRole('button').click();if(modes.length>1){await expect(page.locator('[data-custom-screen=overview]')).toBeVisible();expect(await page.locator('.custom-route-step').evaluateAll(rows=>rows.map(row=>row.getAttribute('data-mode')))).toEqual(modes);await expect(page.locator('.custom-practice-workspace .avatar')).toHaveCount(0);await page.getByRole('button',{name:'开始连续训练',exact:true}).click()}}
async function complete(page:Page){
 for(let guard=0;guard<6;guard++){
  const s=(await database(page)).customPractice;if(s.status==='completed')return
  const mode=s.modes[s.modeIndex],id=s.wordIds[0],word=s.wordSnapshot[id]
  if(mode==='flash'){await page.getByRole('button',{name:'开始自评',exact:true}).click();await page.locator('.rating-grid').getByRole('button').nth(2).click()}
  else{
   if(['listen','dictation'].includes(mode))await expect(page.locator('.practice-audio')).toHaveAttribute('data-audio-state','playing')
   if(['connect','listen'].includes(mode))await page.locator(`.answer-choice[data-word-id="${id}"]`).click()
   else{const keyboard=page.getByRole('button',{name:'键盘输入',exact:true});if(await keyboard.count())await keyboard.click();await page.locator('.slot-native input').fill(word.word)}
   await page.getByRole('button',{name:'确认答案 →',exact:true}).click()
  }
  await expect.poll(async()=>{const next=(await database(page)).customPractice;return next.status==='completed'||next.modeIndex!==s.modeIndex}).toBe(true)
 }
 throw Error('Custom combination did not finish')
}
async function checkIcons(page:Page,modes:string[]){
 const rows=page.locator('.custom-complete-card .custom-route-step');expect(await rows.evaluateAll(rows=>rows.map(row=>row.getAttribute('data-mode')))).toEqual(modes)
 for(const mode of modes){const icon=page.locator(`.custom-complete-card [data-mode="${mode}"] .custom-route-icon img`);await expect(icon).toHaveAttribute('src',new RegExp('/custom-practice/results/'+mode+'\\.png$'));await expect(page.locator(`.custom-complete-card [data-mode="${mode}"]`)).toContainText('1/1')}
 await waitForArtwork(page);await expect(page.locator('.custom-practice-workspace .avatar')).toHaveCount(0)
}
for(const modes of [['spell'],['flash','dictation'],['connect','spell','dictation'],['flash','listen','spell','dictation'],all,['flash']])test(`完成页准确显示 ${modes.join('+')} 的图标与独立词数`,async({page})=>{
 await setAppearance(page,'clay','light');await open(page,modes);const before=formal(await database(page)),id=(await database(page)).customPractice.id;await complete(page);await expect(page.locator('[data-custom-screen=summary]')).toBeVisible();await checkIcons(page,modes);await expect(page.locator('.custom-result-heading')).toContainText('完成 1 个词');await expect(page.locator('.custom-result-heading')).toContainText(`已完成 ${modes.length}/${modes.length} 项`)
 if(modes.length===1&&modes[0]==='flash'){await expect(page.locator('.custom-result-stats')).toContainText('完成率');await expect(page.locator('.custom-result-stats')).not.toContainText('正确率')}
 expect(formal(await database(page))).toEqual(before);await page.screenshot({path:test.info().outputPath('result.png'),fullPage:true});await page.getByRole('button',{name:'再练一次',exact:true}).click();expect(await page.locator('.custom-config [aria-pressed=true][data-mode]').evaluateAll(rows=>rows.map(row=>row.getAttribute('data-mode')))).toEqual(modes);await page.locator('.custom-action-bar').getByRole('button').click();expect((await database(page)).customPractice.id).not.toBe(id);expect((await database(page)).customPractice.results[modes[0]].completedWordIds).toEqual([])
})
for(const [width,theme,largeText] of [[320,'clay',false],[360,'swiss',false],[390,'clay',false],[430,'clay',true],[768,'swiss',true],[1024,'clay',false]] as const)test(`总览及五项完成页紧凑无溢出 ${width} ${theme} ${largeText}`,async({page})=>{
 await page.setViewportSize({width,height:width>=768?1024:844});await setAppearance(page,theme,'light',{largeText});await go(page,'learn');await page.locator('.study-practice-entry-button').click();await page.locator('.custom-count-input input').fill('1');await selectCustomModes(page,all);await page.getByRole('button',{name:'开始连续训练',exact:true}).click();await expect(page.locator('.custom-route-step')).toHaveCount(5);await waitForArtwork(page)
 for(const screen of ['overview','summary']){
  if(screen==='summary')await page.evaluate(async()=>{const {useCustomPracticeStore}=await import('/src/stores/custom-practice.ts' as string),{useProfileStore}=await import('/src/stores/profile.ts' as string),service=await import('/src/services/learning/CustomPractice.ts' as string);const custom=useCustomPracticeStore();custom.resume();useProfileStore().transact((db:any)=>{const s=db.customPractice;while(s.status==='running'){const mode=s.modes[s.modeIndex];s.revealed=true;s.selected=s.wordIds[s.index];s.input=s.wordSnapshot[s.wordIds[s.index]].word;service.recordCustomAnswer(db,service.customToken(s),3,true);if(s.modeIndex===s.modes.length-1)break;service.advanceCustom(s,service.customToken(s))}});custom.next()})
  await expect(page.locator(`[data-custom-screen=${screen}]`)).toBeVisible();await waitForArtwork(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const last=page.locator('.custom-route-step').last();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await expect.poll(async()=>{const box=await last.boundingBox(),footer=await page.locator('.custom-action-bar').boundingBox();return box!.y+box!.height<=footer!.y+1}).toBe(true)
  await page.screenshot({path:test.info().outputPath(screen+'.png'),fullPage:true});if(screen==='summary')await checkIcons(page,all)
 }
 await page.getByRole('button',{name:'返回学习页',exact:true}).click();await expect(page.locator('.study-practice-entry-button')).toBeVisible()
})
for(const width of [320,768])test(`长教材名和100/100阶段进度在大字体下可读 ${width}`,async({page})=>{
 const pack=customCourse();pack.title='合成教材：很长的中文课程名称与英文短语专项练习';const db={...freshDatabase(),version:2,currentCourseId:pack.courseId,courseProgress:{[pack.courseId]:{currentLessonId:pack.courseId+'-l1',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}},auxiliaryRecords:[]}
 await page.addInitScript(({pack,db})=>{const key='wordpal.content.pack.custom-fixture.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]));localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},{pack,db});await page.setViewportSize({width,height:844});await setAppearance(page,'clay','light',{largeText:true});await go(page,'learn');await page.locator('.study-practice-entry-button').click();await page.locator('.custom-count-input input').fill('100');await selectCustomModes(page,all);await page.getByRole('button',{name:'开始连续训练',exact:true}).click()
 await page.evaluate(async()=>{const {useCustomPracticeStore}=await import('/src/stores/custom-practice.ts' as string),{useProfileStore}=await import('/src/stores/profile.ts' as string),service=await import('/src/services/learning/CustomPractice.ts' as string);const custom=useCustomPracticeStore();custom.resume();useProfileStore().transact((db:any)=>{const s=db.customPractice;while(s.status==='running'){s.revealed=true;s.selected=s.wordIds[s.index];s.input=s.wordSnapshot[s.wordIds[s.index]].word;service.recordCustomAnswer(db,service.customToken(s),3,true);if(s.modeIndex===4&&s.index===99)break;service.advanceCustom(s,service.customToken(s))}});custom.next()})
 await expect(page.locator('[data-custom-screen=summary]')).toBeVisible();await expect(page.locator('.custom-session-summary')).toContainText(pack.title);await expect(page.locator('.custom-route-status .strong')).toHaveText(Array(5).fill('100/100'));await waitForArtwork(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 expect(await page.locator('.custom-route-copy>.strong').evaluateAll(nodes=>nodes.every(node=>{const b=node.getBoundingClientRect();return b.width>=32&&b.height<60}))).toBe(true);await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));const last=await page.locator('.custom-route-step').last().boundingBox(),footer=await page.locator('.custom-action-bar').boundingBox();expect(last!.y+last!.height).toBeLessThan(footer!.y);await page.screenshot({path:test.info().outputPath('long-name-large.png'),fullPage:true})
})
