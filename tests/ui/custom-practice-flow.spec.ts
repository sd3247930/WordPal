import {test,expect,type Page} from '@playwright/test'
import {selectCustomModes,go,database,seedDatabase,setAppearance,waitForArtwork} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {customCourse} from '../helpers/custom-course'
import {CUSTOM_MODES,CUSTOM_MODE_NAMES} from '../../src/services/learning/CustomPractice'

async function openConfig(page:Page){await page.getByRole('button',{name:'自定义练习，不计今日任务',exact:true}).first().click();await expect(page.locator('[data-custom-screen="config"]')).toBeVisible()}
async function count(page:Page,value:string){await page.locator('.custom-count-input input').fill(value)}
async function fakeAudio(page:Page){await page.addInitScript(()=>{
 const paused=new WeakMap<HTMLMediaElement,boolean>();(window as any).customAudioPlays=0
 Object.defineProperty(HTMLMediaElement.prototype,'paused',{configurable:true,get(){return paused.get(this)!==false}})
 HTMLMediaElement.prototype.play=function(){paused.set(this,false);(window as any).customAudioPlays++;this.dispatchEvent(new Event('play'));return Promise.resolve()}
 HTMLMediaElement.prototype.pause=function(){paused.set(this,true);this.dispatchEvent(new Event('pause'))}
})}
async function seedFullBook(page:Page){const pack=customCourse();await page.addInitScript(pack=>{
 const key='wordpal.content.pack.custom-fixture.0123456789abcdef'
 localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]))
},pack);await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.active.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},{...freshDatabase(),version:2,currentCourseId:pack.courseId,courseProgress:{[pack.courseId]:{currentLessonId:pack.courseId+'-l1',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}},auxiliaryRecords:[]})}
const protectedFields=(db:any)=>Object.fromEntries(Object.entries(db).filter(([key])=>!['customPractice','practiceAnswers'].includes(key)))

test('全书真实上限、任意整数、快捷数量和单元范围都在原入口配置',async({page})=>{
 await seedFullBook(page);await go(page,'learn');const before=await database(page);await openConfig(page)
 await expect(page.locator('.custom-count-input input')).toHaveValue('10');await expect(page.getByRole('button',{name:'全部 113 词',exact:true})).toBeVisible()
 for(const value of ['0','-1','1.5','','abc','114']){await count(page,value);await expect(page.getByRole('button',{name:/^开始(?:连续训练|练习)$/})).toBeDisabled();await expect(page.locator('.custom-config .notice.error')).toBeVisible()}
 for(const value of ['1','5','10','20','30','31','50','100','112','113']){await count(page,value);await expect(page.getByRole('button',{name:/^开始(?:连续训练|练习)$/})).toBeEnabled()}
 await page.getByRole('button',{name:'指定单元',exact:true}).click();await expect(page.locator('.custom-count-input input')).toHaveValue('10');await expect(page.locator('.custom-unit-options').getByRole('button').first()).toHaveText('Unit 1')
 await page.getByRole('button',{name:'Unit 2',exact:true}).click();await expect(page.getByRole('button',{name:'全部 20 词',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Unit 1',exact:true}).click();await expect(page.getByRole('button',{name:'全部 10 词',exact:true})).toBeVisible()
 expect(await database(page)).toEqual(before)
})

test('完整五模式用相同快照自动衔接，重复发音有效且正式日计划和奖励不变',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await fakeAudio(page);await go(page,'home');await page.locator('.hero-cta').click();const before=protectedFields(await database(page));await openConfig(page);await count(page,'1');await page.getByRole('button',{name:'全选五项',exact:true}).click();await page.getByRole('button',{name:/^开始(?:连续训练|练习)$/}).click();await expect(page.locator('[data-custom-screen="overview"]')).toBeVisible();await expect(page.locator('.custom-route-number').first()).toBeVisible();await waitForArtwork(page);await page.screenshot({path:test.info().outputPath('custom-overview-phone.png'),fullPage:true});const initial=(await database(page)).customPractice;await page.getByRole('button',{name:'开始连续训练',exact:true}).click()
 await waitForArtwork(page)
 for(const mode of CUSTOM_MODES){
  await expect(page.locator('.study-session-heading')).toContainText(CUSTOM_MODE_NAMES[mode]);expect((await database(page)).customPractice.wordIds).toEqual(initial.wordIds)
  await waitForArtwork(page);await page.screenshot({path:test.info().outputPath(`custom-training-${mode}-phone.png`),fullPage:true})
  if(mode==='flash'){
   // Rapid clicks are deliberately coalesced by audio; verify each independent replay actually starts.
   for(let i=0;i<3;i++){const plays=await page.evaluate(()=>(window as any).customAudioPlays);await page.getByRole('button',{name:'播放当前练习单词的发音',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).customAudioPlays)).toBe(plays+1)}
   await page.getByRole('button',{name:'开始自评',exact:true}).click();await page.locator('.rating-grid').getByRole('button').nth(2).click()
  }
  else{if(mode==='connect'||mode==='listen')await page.locator(`.answer-choice[data-word-id="${initial.wordIds[0]}"]`).click();else await page.locator('.spelling-input input').fill(initial.wordSnapshot[initial.wordIds[0]].word);await expect(page.getByRole('button',{name:'确认答案 →',exact:true})).toBeEnabled();await page.getByRole('button',{name:'确认答案 →',exact:true}).click()}
 }
 await expect(page.locator('[data-custom-screen="summary"]')).toBeVisible();await expect(page.locator('.custom-complete-card')).toContainText('已完成 5/5 项')
 await waitForArtwork(page);await page.screenshot({path:test.info().outputPath('custom-summary-phone.png'),fullPage:true})
 const after=await database(page);expect(protectedFields(after)).toEqual(before);expect(after.practiceAnswers).toHaveLength(5);for(const mode of CUSTOM_MODES)expect(after.customPractice.results[mode].completedWordIds).toEqual(initial.wordIds)
 expect(await page.evaluate(()=>(window as any).customAudioPlays)).toBeGreaterThanOrEqual(5)
 await page.getByRole('button',{name:'再练一次',exact:true}).click();await expect(page.locator('.custom-count-input input')).toHaveValue('10');expect((await database(page)).customPractice.id).toBe(initial.id)
})

test('暂停保留草稿与模式，刷新后独立恢复，结束可取消且新建词数恢复家长默认',async({page})=>{
 await go(page,'learn');await openConfig(page);await count(page,'5');await selectCustomModes(page,['spell']);await page.getByRole('button',{name:/^开始(?:连续训练|练习)$/}).click();await page.locator('.spelling-input input').fill('ca');const token=(await database(page)).customPractice.id;await page.getByRole('button',{name:'暂停练习',exact:true}).click();await expect(page.locator('[data-custom-screen="paused"]')).toBeVisible();await waitForArtwork(page);await page.screenshot({path:test.info().outputPath('custom-paused-phone.png'),fullPage:true});await page.reload();await expect(page.locator('.study-custom-resume')).toHaveCount(0);await page.locator('.study-practice-entry-button').click();await page.getByRole('button',{name:'继续上次自定义练习',exact:true}).click();await expect(page.locator('.spelling-input input')).toHaveValue('ca');expect((await database(page)).customPractice.id).toBe(token)
 await page.getByRole('button',{name:'结束练习',exact:true}).click();await page.getByRole('button',{name:'继续当前练习',exact:true}).click();await expect(page.locator('.spelling-input input')).toHaveValue('ca');await page.getByRole('button',{name:'结束练习',exact:true}).click();await page.getByRole('button',{name:'确认结束',exact:true}).click();await expect(page.locator('.custom-practice-workspace')).toHaveCount(0);expect((await database(page)).customPractice.status).toBe('ended');await openConfig(page);await expect(page.locator('.custom-count-input input')).toHaveValue('10')
})

for(const theme of ['swiss','clay'])for(const mode of ['light','dark'])test(`方案A ${theme} ${mode} 手机平板、大字体、模式取消与安全操作栏`,async({page})=>{
 await setAppearance(page,theme,mode);await seedFullBook(page);await go(page,'learn');await openConfig(page)
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:width===1280?800:844});await expect(page.getByRole('button',{name:/^开始(?:连续训练|练习)$/})).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await expect(page.locator('.bottom-nav')).toHaveCount(0)
  expect(await page.locator('.custom-config .study-mode-tile').evaluateAll(nodes=>nodes.every(node=>{const box=node.getBoundingClientRect();return box.width>=48&&box.height>=48}))).toBe(true)
 }
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 const flash=page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:/^闪现，/});await flash.click();await expect(page.getByRole('button',{name:/^开始(?:连续训练|练习)$/})).toBeDisabled();await flash.click();await expect(page.getByRole('button',{name:/^开始(?:连续训练|练习)$/})).toBeEnabled()
 await waitForArtwork(page);await page.screenshot({path:test.info().outputPath(`custom-config-${theme}-${mode}-phone.png`),fullPage:true});await page.setViewportSize({width:1280,height:800});await page.screenshot({path:test.info().outputPath(`custom-config-${theme}-${mode}-tablet.png`),fullPage:true})
})
