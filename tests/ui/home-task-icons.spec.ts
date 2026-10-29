import {startIndependentStudy} from './helpers'
import {flushStudyInput} from './helpers'
import {test,expect} from '@playwright/test'
import {go,setAppearance,seedDatabase,database,openCustomPractice} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
import {selectDailyPlan} from '../../src/services/learning/DailyLearningPlan'
import {starterPack} from '../../src/services/content/ContentRegistry'
const titles=['新学单词','听音辨义','拼写练习','复习巩固']

for(const title of ['新学单词','听音辨义','拼写练习'])test(`${title} 进入同一正式任务，不跳过未完成的闪现`,async({page})=>{
 await seedDatabase(page,freshDatabase());await go(page,'home');const before=await database(page)
 await page.getByRole('button',{name:'去学习'+title,exact:true}).click();await expect(page.locator('.learn-workspace')).toBeVisible()
 const after=await database(page),plan=after.courseProgress.starter.dailyPlan;expect(plan.mode).toBe('flash');expect(plan.wordIds[0]).toBe('cat');expect(after.cards).toEqual(before.cards);expect(after.history).toEqual(before.history);expect(after.gems).toBe(before.gems)
})

test('已完成闪现保留图标和标识，复习入口继续当前环节而不跳过正式任务',async({page})=>{
 const db=freshDatabase(),now=new Date();db.abilityLevel='L1'
 db.cards.cat={...newCard('cat',new Date('2000-01-01')),reps:1,state:2,stability:1,difficulty:5,last_review:'2000-01-01T00:00:00.000Z'}
 db.courseProgress={starter:{currentLessonId:'lesson-1',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},introducedWords:Object.fromEntries(['cat','dog','fish','bird','duck'].map(id=>[id,now.toISOString()]))}}
 db.version=2;db.currentCourseId='starter';db.auxiliaryRecords=[]
 const plan=selectDailyPlan(db,starterPack)!;plan.flow!.begunAt=plan.startedAt;plan.flow!.completed.flash=[...plan.wordIds];plan.flow!.step='connect';plan.mode='connect';db.courseProgress.starter.dailyPlan=plan;db.courseProgress.starter.studyActivity='daily'
 await page.addInitScript(db=>{localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},db)
 await go(page,'home');const before=await database(page)
 await expect(page.locator('.task').filter({hasText:'新学单词'}).locator('.task-check')).toHaveCount(0)
 await expect(page.locator('.task').filter({hasText:'新学单词'}).locator('.task-symbol img')).toHaveJSProperty('complete',true)
 await expect(page.getByRole('button',{name:'去学习新学单词',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'去学习复习巩固',exact:true}).click();await expect(page.locator('.learn-workspace')).toBeVisible()
 const after=await database(page),continued=after.courseProgress.starter.dailyPlan;expect(continued.wordIds).toEqual(plan.wordIds);expect(continued.flow).toEqual({...plan.flow,capabilities:expect.any(Object)});expect(continued.index).toBe(plan.index);expect(after.history).toEqual(before.history);expect(after.cards).toEqual(before.cards)
})

test('已有正式会话从任务入口继续，检查点、排程和奖励均不被重置',async({page})=>{
 await go(page,'home');await page.locator('.hero-cta').click();await page.locator('.rating-grid').getByRole('button').nth(2).click();await page.locator('.answer-feedback').getByRole('button').click();const before=await database(page)
 for(const title of ['新学单词','听音辨义','拼写练习']){await go(page,'home');await page.getByRole('button',{name:'去学习'+title,exact:true}).click();await expect(page.locator('.daily-step.active')).toContainText('闪现');const after=await database(page);expect(after.courseProgress.starter.dailyPlan).toEqual(before.courseProgress.starter.dailyPlan);for(const field of ['session','cards','history','gems','pets','rewardIds'])expect(after[field]).toEqual(before[field]);await expect(page.locator('.study-practice-entry-button')).toHaveCount(0);await expect(page.locator('.study-round-tools')).toBeDisabled()}
})

for(const mode of ['light','dark'])for(const largeText of [false,true])test(`${mode} 大字=${largeText} 图标、字体和任务排版覆盖手机平板`,async({page})=>{
 await setAppearance(page,'swiss',mode,{largeText,reducedMotion:true,highContrast:largeText});await go(page,'home');const before=await database(page)
 for(const width of [320,390,600,768,1024,1280]){
  await page.setViewportSize({width,height:1000});await expect(page.locator('.home-today .task')).toHaveCount(4);await expect(page.locator('.task-title')).toHaveText(titles)
  for(const icon of await page.locator('.task-symbol img').all()){await expect(icon).toHaveJSProperty('complete',true);await expect(icon).toHaveJSProperty('naturalWidth',largeText?256:1024);await expect(icon).toHaveJSProperty('naturalHeight',largeText?256:1024);await expect(icon).toHaveAttribute('src',largeText?/contrast-/:/hd-/)}
  const rows=await page.locator('.task').evaluateAll(items=>items.map(item=>{const icon=item.querySelector('.task-icon')!,title=item.querySelector('.task-title')!,value=item.querySelector('.task-value')!,action=item.querySelector('.task-action,.task-done')!,i=icon.getBoundingClientRect(),a=action.getBoundingClientRect(),image=item.querySelector('.task-symbol')!.getBoundingClientRect();return {overflow:item.scrollWidth>item.clientWidth+1,iconWidth:i.width,iconVisible:getComputedStyle(icon).display!=='none',titleFont:parseFloat(getComputedStyle(title).fontSize),valueFont:parseFloat(getComputedStyle(value).fontSize),iconOverlap:i.right>a.left&&a.top<i.bottom,buttonHeight:item.querySelector('.task-action')?a.height:56,square:Math.abs(image.width-image.height)<.1,inside:image.left>=i.left&&image.right<=i.right&&image.top>=i.top&&image.bottom<=i.bottom}}))
  expect(rows.every(r=>!r.overflow&&r.iconVisible&&r.iconWidth>=44&&r.iconWidth<=52&&r.titleFont>=16&&r.valueFont>=14&&!r.iconOverlap&&r.buttonHeight>=48&&r.square&&r.inside),JSON.stringify({width,rows})).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if([390,768].includes(width)){await page.locator('.home-today').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath(`tasks-${mode}-${largeText?'large':'normal'}-${width}.png`)})}
 }
 expect(await database(page)).toEqual(before)
})
test('高清图标故障时正常回退，所有图片失败也不阻断学习入口或完成状态',async({page})=>{
 await page.route('**/static/icons/tasks/hd-*.png',route=>route.abort());await page.setViewportSize({width:390,height:950});await go(page,'home');const before=await database(page)
 for(const icon of await page.locator('.task-symbol img').all()){await expect(icon).toHaveJSProperty('naturalWidth',144);await expect(icon).toHaveAttribute('src',/light-normal-/)}
 await page.route('**/static/icons/tasks/*.png',route=>route.abort());await page.reload();await expect(page.locator('.task-symbol-fallback')).toHaveCount(4);expect(await database(page)).toEqual(before);await expect(page.locator('.task').filter({hasText:'复习巩固'}).locator('.task-action')).toBeVisible();await page.getByRole('button',{name:'去学习新学单词',exact:true}).click();await expect(page.locator('.learn-workspace')).toBeVisible()
})
