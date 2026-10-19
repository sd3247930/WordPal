import {test,expect,type Page} from '@playwright/test'
import {go,database,setAppearance} from './helpers'
import {freshDatabase,type Database} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {selectDailyPlan} from '../../src/services/learning/DailyLearningPlan'
import {starterPack,wordById} from '../../src/services/content/ContentRegistry'
import {orderedCourseWords} from '../../src/services/learning/CourseStudySequence'
import {newCard} from '../../packages/srs_fsrs'

function fixture():Database{return {...freshDatabase(),version:2,currentCourseId:'starter',abilityLevel:'L1',courseProgress:{starter:initialProgress('starter')},auxiliaryRecords:[]}}
async function seed(page:Page,db=fixture()){
 await page.addInitScript(db=>{if(localStorage.getItem('wordpal.database.active.v2'))return;localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},db)
}
const stat=(page:Page,id:string)=>page.locator(`[data-stat="${id}"]`)

for(const mode of ['light','dark'])for(const largeText of [false,true])test(`${mode} 大字=${largeText} 统计图标和文字适配手机、分屏与平板`,async({page})=>{
 await seed(page);await setAppearance(page,'swiss',mode,{largeText,reducedMotion:true,highContrast:largeText});await go(page,'learn');const before=await database(page)
 for(const width of [320,360,390,600,768,1024,1280]){
  await page.setViewportSize({width,height:1000})
  await expect(page.locator('.study-stat-card')).toHaveCount(3)
  await expect(page.locator('.study-stat-hint')).toHaveCount(0)
  await expect(page.locator('.study-stats-row')).not.toContainText(/当前教材|查看明细|到期复习|已提交题步|继续学习/)
  for(const icon of await page.locator('.study-stat-image img').all()){await expect(icon).toHaveJSProperty('naturalWidth',256);await expect(icon).toHaveJSProperty('naturalHeight',256)}
  await expect(stat(page,'round').locator('.study-stat-value')).toHaveText('待开始');await expect(stat(page,'round').getByRole('progressbar')).toHaveCount(0)
  const cards=await page.locator('.study-stat-card').evaluateAll(items=>items.map(item=>{
   const action=item.querySelector('.study-stat-action')!,image=item.querySelector('.study-stat-art')!,copy=item.querySelector('.study-stat-copy')!,a=action.getBoundingClientRect(),i=image.getBoundingClientRect(),c=copy.getBoundingClientRect()
   return {overflow:item.scrollWidth>item.clientWidth+1,touch:a.height>=48&&a.width>=48,inside:i.left>=a.left&&i.right<=a.right&&c.left>=a.left&&c.right<=a.right+1,font:parseFloat(getComputedStyle(item.querySelector('.study-stat-label')!).fontSize),valueFont:parseFloat(getComputedStyle(item.querySelector('.study-stat-value')!).fontSize),reduced:getComputedStyle(action).transitionDuration}
  }))
  expect(cards.every(c=>!c.overflow&&c.touch&&c.inside&&c.font>=14&&c.valueFont>=24&&c.reduced==='0s')).toBe(true)
  if(!largeText&&[360,390].includes(width))for(const card of await page.locator('.study-stat-card').all())expect((await card.boundingBox())!.height).toBeLessThan(160)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if([390,768,1280].includes(width)){
   await page.locator('.study-stats-row').evaluate(el=>el.scrollIntoView({block:'start'}))
   if(width<600){const bounds=await page.locator('.study-stats-row').boundingBox(),nav=await page.locator('.bottom-nav').boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(nav!.y)}
   await page.locator('.study-stats-row').screenshot({path:test.info().outputPath(`stats-${mode}-${largeText?'large':'normal'}-${width}.png`)})
  }
 }
 expect(await database(page)).toEqual(before)
})

test('今日已学的明细与计数一致，键盘打开、关闭或刷新不改变记录',async({page})=>{
 const db=fixture(),at=new Date().toISOString(),old=new Date(Date.now()-86400000).toISOString()
 Object.assign(db.courseProgress!.starter,{curriculumSchema:1,fullLearnedWords:{cat:at,dog:old},introducedWords:{fish:at}})
 await seed(page,db);await go(page,'learn');const before=await database(page)
 await expect(stat(page,'today').locator('.study-stat-value')).toHaveText('1')
 const button=stat(page,'today').getByRole('button');await button.focus();await page.keyboard.press('Enter')
 await expect(button).toHaveAttribute('aria-expanded','true');await expect(page.getByRole('region',{name:'今日已学新词明细'})).toContainText('cat');await expect(page.locator('.study-today-word')).toHaveCount(1)
 await page.getByRole('button',{name:'收起明细',exact:true}).click();await expect(page.locator('.study-today-details')).toHaveCount(0)
 expect(await database(page)).toEqual(before);await page.reload();await expect(stat(page,'today').locator('.study-stat-value')).toHaveText('1');expect(await database(page)).toEqual(before)
})

test('点击本轮开始一次，重复点击及刷新恢复原轮次且不发奖',async({page})=>{
 await seed(page);await go(page,'learn');await stat(page,'round').getByRole('button').click()
 await expect(stat(page,'round').locator('.study-stat-value')).toHaveText('0 / 30');await expect(stat(page,'round').getByRole('progressbar')).toHaveAttribute('aria-valuenow','0')
 const before=await database(page);await stat(page,'round').getByRole('button').click();expect(await database(page)).toEqual(before)
 await page.reload();await expect(stat(page,'round').locator('.study-stat-value')).toHaveText('0 / 30');expect(await database(page)).toEqual(before)
})

test('六环节进度从持久记录恢复，错题和重试不虚增，待复习入口保留当前任务',async({page})=>{
 const db=fixture(),plan=selectDailyPlan(db,starterPack)!
 plan.flow!.begunAt=plan.startedAt;plan.flow!.step='connect';plan.flow!.completed.flash=[...plan.wordIds];plan.mode='connect';plan.wordSnapshot=JSON.parse(JSON.stringify(wordById));plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,'new_word']))
 db.courseProgress!.starter.dailyPlan=plan;db.courseProgress!.starter.studyActivity='daily';db.cards.cat={...newCard('cat',new Date('2000-01-01')),reps:1,state:2}
 await seed(page,db);await go(page,'learn');await expect(stat(page,'round').locator('.study-stat-value')).toHaveText('5 / 30')
 const before=await database(page);await stat(page,'review').getByRole('button').click();expect(await database(page)).toEqual(before)
 await page.locator('.answer-choice').nth(1).click();await page.getByRole('button',{name:'确认答案 →',exact:true}).click()
 await expect(page.locator('.answer-feedback')).toContainText('再认识它');await expect(stat(page,'round').locator('.study-stat-value')).toHaveText('5 / 30')
 await page.getByRole('button',{name:'再试一次 →',exact:true}).click();await page.locator('.answer-choice').first().click();await page.getByRole('button',{name:'确认答案 →',exact:true}).click()
 await expect(stat(page,'round').locator('.study-stat-value')).toHaveText('6 / 30');await expect(stat(page,'round').getByRole('progressbar')).toHaveAttribute('aria-valuenow','20')
 const submitted=await database(page);await page.reload();await expect(stat(page,'round').locator('.study-stat-value')).toHaveText('6 / 30');expect(await database(page)).toEqual(submitted)
})

test('待复习读取真实排程并可进入，数量不受每日五词限制',async({page})=>{
 const db=fixture(),ids=orderedCourseWords(starterPack).slice(0,12);expect(ids).toHaveLength(12)
 for(const id of ids)db.cards[id]={...newCard(id,new Date('2000-01-01')),reps:1,state:2}
 await seed(page,db);await go(page,'learn');await expect(stat(page,'review').locator('.study-stat-value')).toHaveText('12')
 await stat(page,'review').getByRole('button').click();await expect(page.locator('.learn-workspace')).toBeVisible();const started=await database(page)
 expect(started.session.kind).toBe('review_due');expect(started.session.wordIds).toHaveLength(12);expect(started.history).toEqual([]);expect(started.cards).toEqual(db.cards)
 await page.getByRole('button',{name:'查看答案',exact:true}).click();await page.locator('.rating-grid').getByRole('button').nth(2).click()
 await expect(stat(page,'review').locator('.study-stat-value')).toHaveText('11');await expect(stat(page,'round').locator('.study-stat-value')).toHaveText('1 / 12')
})

test('零到期和图标失效时文字及入口仍可使用，不创建虚假学习记录',async({page})=>{
 await page.route('**/static/icons/study-stats/*.png',route=>route.abort());await seed(page);await go(page,'learn')
 await expect(page.locator('.study-stat-fallback')).toHaveCount(3);const before=await database(page)
 await stat(page,'today').getByRole('button').click();await expect(page.locator('.study-today-details')).toContainText('今天还没有新学单词');expect(await database(page)).toEqual(before)
 await stat(page,'review').getByRole('button').click();await expect(page.locator('.wordbook-overview')).toBeVisible();expect(await database(page)).toEqual(before)
})

test('跨本地午夜后统计自动刷新，到期词按现有排程更新',async({page})=>{
 const now=new Date('2026-10-18T19:59:50Z'),db=fixture()
 db.courseProgress!.starter.curriculumSchema=1;db.courseProgress!.starter.fullLearnedWords={cat:now.toISOString()}
 db.cards.cat={...newCard('cat',new Date('2026-10-18T20:00:05Z')),reps:1,state:2}
 await page.clock.install({time:now});await seed(page,db);await go(page,'learn');await expect(stat(page,'today').locator('.study-stat-value')).toHaveText('1');await expect(stat(page,'review').locator('.study-stat-value')).toHaveText('0')
 const before=await database(page);await page.clock.fastForward(31000);await expect(stat(page,'today').locator('.study-stat-value')).toHaveText('0');await expect(stat(page,'review').locator('.study-stat-value')).toHaveText('1');expect(await database(page)).toEqual(before)
})

test('二十词六环节的三位数进度在窄手机保持一行并可读',async({page})=>{
 const db=fixture();db.abilityLevel='L5'
 const plan=selectDailyPlan(db,starterPack)!
 plan.flow!.begunAt=plan.startedAt;plan.flow!.step='consolidate';plan.mode='flash';plan.revealed=true;plan.wordSnapshot=JSON.parse(JSON.stringify(wordById));plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,'new_word']))
 for(const step of ['flash','connect','listen','spell','dictation'] as const)plan.flow!.completed[step]=[...plan.wordIds]
 db.courseProgress!.starter.dailyPlan=plan;db.courseProgress!.starter.studyActivity='daily'
 await seed(page,db);await page.setViewportSize({width:360,height:844});await go(page,'learn');await expect(stat(page,'round').locator('.study-stat-value')).toHaveText('100 / 120')
 const size=await stat(page,'round').locator('.study-stat-value').evaluate(el=>{const r=el.getBoundingClientRect(),copy=el.closest('.study-stat-copy')!.getBoundingClientRect(),style=getComputedStyle(el);return {height:r.height,lineHeight:parseFloat(style.lineHeight),font:parseFloat(style.fontSize),inside:r.left>=copy.left-1&&r.right<=copy.right+1}})
 expect(size.height).toBeLessThanOrEqual(size.lineHeight+1);expect(size.font).toBeGreaterThanOrEqual(24);expect(size.inside).toBe(true)
 await page.locator('.study-stats-row').evaluate(el=>el.scrollIntoView({block:'start'}));await page.locator('.study-stats-row').screenshot({path:test.info().outputPath('stats-active-360.png')})
})

test('教材全部学完且暂无复习时，本轮入口浏览教材而不创建空轮次',async({page})=>{
 const db=fixture();db.courseProgress!.starter.curriculumSchema=1;db.courseProgress!.starter.fullLearnedWords=Object.fromEntries(orderedCourseWords(starterPack).map(id=>[id,'2020-01-01T00:00:00.000Z']))
 await seed(page,db);await go(page,'learn');await expect(stat(page,'round').getByRole('button')).toHaveAttribute('aria-label',/查看教材单词/);const before=await database(page)
 await stat(page,'round').getByRole('button').click();await expect(page.locator('.wordbook-overview')).toBeVisible();expect(await database(page)).toEqual(before)
})

for(const mode of ['light','dark'])test(`${mode} 点击和键盘激活高亮对应统计卡，明细收起清除高亮且不改学习数据`,async({page})=>{
 const db=fixture(),plan=selectDailyPlan(db,starterPack)!
 plan.flow!.begunAt=plan.startedAt;plan.wordSnapshot=JSON.parse(JSON.stringify(wordById));plan.wordSources=Object.fromEntries(plan.wordIds.map(id=>[id,'new_word']));plan.revealed=true
 db.courseProgress!.starter.dailyPlan=plan;db.courseProgress!.starter.studyActivity='daily';db.cards.cat={...newCard('cat',new Date('2000-01-01')),reps:1,state:2}
 await page.setViewportSize({width:390,height:900});await setAppearance(page,'swiss',mode,{reducedMotion:true});await seed(page,db);await go(page,'learn');const before=await database(page)
 const idle=await stat(page,'today').evaluate(el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopColor}))
 const today=stat(page,'today').getByRole('button');await today.focus();await page.keyboard.press('Enter');await expect(stat(page,'today')).toHaveClass(/is-highlighted/)
 const active=await stat(page,'today').evaluate(el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopColor}));expect(active.background).not.toBe(idle.background);expect(active.border).not.toBe(idle.border)
 await page.getByRole('button',{name:'收起明细',exact:true}).click();await expect(page.locator('.study-stat-card.is-highlighted')).toHaveCount(0)
 await stat(page,'round').getByRole('button').click();await expect(stat(page,'round')).toHaveClass(/is-highlighted/);await expect(page.locator('.study-stat-card.is-highlighted')).toHaveCount(1)
 const review=stat(page,'review').getByRole('button');await review.focus();await page.keyboard.press('Space');await expect(stat(page,'review')).toHaveClass(/is-highlighted/);await expect(page.locator('.study-stat-card.is-highlighted')).toHaveCount(1)
 expect(await database(page)).toEqual(before)
 await page.locator('.study-stats-row').evaluate(el=>el.scrollIntoView({block:'start'}));await page.locator('.study-stats-row').screenshot({path:test.info().outputPath(`stats-highlight-${mode}.png`)})
})
