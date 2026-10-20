import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,database,waitForArtwork,completeDaily,unlockParent,openCustomPractice} from './helpers'
import {freshDatabase,type Database} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {selectDailyPlan,STUDY_STEPS,stepMode} from '../../src/services/learning/DailyLearningPlan'
import {starterPack,wordById} from '../../src/services/content/ContentRegistry'
import {contrast} from '../../src/styles/themes'
import {customCourse} from '../helpers/custom-course'
import type {StudyStep} from '../../packages/core_learning'

const time=new Date('2026-10-03T08:00:00Z'),titles=['新学单词','听音辨义','拼写练习','复习巩固']
function fresh(){return {...freshDatabase(),version:2,currentCourseId:'starter',abilityLevel:'L1',courseProgress:{starter:initialProgress('starter')},auxiliaryRecords:[]} as Database}
async function prepare(page:Page,mode='light',largeText=false,db=fresh()){
 await page.clock.install({time});await setAppearance(page,'clay',mode,{largeText,highContrast:largeText,reducedMotion:true})
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.active.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db);await go(page,'home')
}
const card=(page:Page)=>page.locator('.home-today-clay')
async function inspect(page:Page){
 const metrics=await card(page).evaluate(node=>{
  const bounds=node.getBoundingClientRect(),counter=node.querySelector('.task-count')!.getBoundingClientRect(),inside=(a:DOMRect,b:DOMRect)=>a.left>=b.left-.2&&a.right<=b.right+.2&&a.top>=b.top-.2&&a.bottom<=b.bottom+.2
  const rows=Array.from(node.querySelectorAll('.task')).map(row=>{const title=row.querySelector('.task-title')!.getBoundingClientRect(),value=row.querySelector('.task-value')!.getBoundingClientRect(),detail=row.querySelector('.task-detail')!,description=detail.getBoundingClientRect(),action=row.querySelector('.task-action,.task-done')!.getBoundingClientRect(),icon=row.querySelector('.task-icon')!,art=icon.getBoundingClientRect(),copy=row.querySelector('.task-copy')!.getBoundingClientRect();return {inside:inside(action,bounds)&&inside(art,bounds)&&inside(copy,bounds),overflow:row.scrollWidth>row.clientWidth+1,vertical:title.bottom<=value.top+.2&&value.bottom<=description.top+.2,aligned:Math.abs(value.left-description.left)<.2,right:Math.abs(counter.right-action.right),actionWidth:action.width,actionHeight:action.height,iconWidth:art.width,iconBackground:getComputedStyle(icon).backgroundColor,expectedBackground:getComputedStyle(node.closest('.wp-app')!).getPropertyValue('--wp-secondary').trim(),detailVisible:getComputedStyle(detail).display!=='none',separate:art.right<=copy.left+.2&&(action.left>=copy.right-.2||action.top>=copy.bottom-.2)}})
  return {rows,overflow:node.scrollWidth>node.clientWidth+1,width:bounds.width,clientWidth:node.clientWidth,scrollWidth:node.scrollWidth}
 })
 expect(metrics.overflow,JSON.stringify(metrics)).toBe(false)
 expect(metrics.rows.every(row=>row.inside&&!row.overflow&&row.vertical&&row.aligned&&row.right<1.5&&row.actionHeight>=48&&row.iconWidth>=48&&row.detailVisible&&row.separate),JSON.stringify(metrics)).toBe(true)
 expect(Math.max(...metrics.rows.map(row=>row.actionWidth))-Math.min(...metrics.rows.map(row=>row.actionWidth))).toBeLessThan(1)
 expect(Math.max(...metrics.rows.map(row=>row.actionHeight))-Math.min(...metrics.rows.map(row=>row.actionHeight))).toBeLessThan(1)
 for(const row of metrics.rows){const hex='#'+row.iconBackground.match(/\d+/g)!.slice(0,3).map(value=>Number(value).toString(16).padStart(2,'0')).join('');expect(hex.toLowerCase()).toBe(row.expectedBackground.toLowerCase());expect(hex).not.toBe('#ffffff')}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
}

for(const mode of ['light','dark'])for(const largeText of [false,true])test(`Clay ${mode} 大字${largeText} 任务三层信息、按钮对齐与奶茶图标底座`,async({page})=>{
 await prepare(page,mode,largeText);const before=await database(page)
 await expect(card(page).locator('.task-title')).toHaveText(titles);await expect(card(page).locator('.task-value')).toHaveText(['0 / 5','0 / 5','0 / 5','0 / 5'])
 await expect(card(page).locator('.hero-cta')).toHaveText('开始今日学习');await expect(card(page).locator('.task-action')).toHaveText(['去学习','去学习','去学习','去学习'])
 for(const [width,height]of [[320,800],[359,800],[390,844],[507,1000],[600,900],[768,1024],[834,1194],[1024,768],[1194,834],[1280,800],[1600,900]]){
  await page.setViewportSize({width,height});await inspect(page)
  for(const image of await card(page).locator('.task-symbol img').all())await expect(image).toHaveJSProperty('naturalWidth',largeText?256:1024)
  if([390,1280].includes(width)){await waitForArtwork(page);await card(page).evaluate(node=>{const bottom=document.querySelector('.bottom-nav')?.getBoundingClientRect().top||innerHeight;scrollBy(0,Math.max(0,node.getBoundingClientRect().bottom-bottom+12))});await card(page).screenshot({path:test.info().outputPath(`today-${mode}-${largeText?'large':'normal'}-${width}.png`)})}
 }
 const colors=await card(page).locator('.hero-cta,.task-action').evaluateAll(nodes=>nodes.map(node=>{const style=getComputedStyle(node),hex=(value:string)=>'#'+value.match(/\d+/g)!.slice(0,3).map(part=>Number(part).toString(16).padStart(2,'0')).join('');return {fg:hex(style.color),bg:hex(style.backgroundColor)}}));expect(colors.every(color=>contrast(color.fg,color.bg)>=4.5),JSON.stringify(colors)).toBe(true)
 await page.setViewportSize({width:320,height:1100});await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});await expect(card(page)).toHaveClass(/home-tasks-stacked/);await inspect(page);expect(await database(page)).toEqual(before)
})

test('五个入口保持同一正式任务，快速重复点击只启动和导航一次，不提前完成或发奖',async({page})=>{
 await prepare(page);const before=await database(page)
 await page.evaluate(()=>{const api=(window as any).uni,redirect=api.redirectTo;(window as any).__taskNavigations=0;api.redirectTo=function(options:any){if(options.url==='/pages/learn/index')(window as any).__taskNavigations++;return redirect.call(this,options)}})
 await card(page).locator('.task-action').nth(2).evaluate(node=>{for(let index=0;index<20;index++)(node as HTMLElement).click()});await expect(page.locator('.daily-step.active')).toContainText('闪现');expect(await page.evaluate(()=>(window as any).__taskNavigations)).toBe(1)
 const started=await database(page)
 for(const field of ['cards','history','gems','pets','rewardIds'])expect(started[field]).toEqual(before[field])
 for(const index of [-1,0,1,2,3]){
  await go(page,'home');await expect(card(page).locator('.task-count')).toHaveText('0 / 4');const target=index<0?card(page).locator('.hero-cta'):card(page).locator('.task-action').nth(index);await target.click();await expect(page.locator('.daily-step.active')).toContainText('闪现');const after=await database(page);expect(after.courseProgress.starter.dailyPlan).toEqual(started.courseProgress.starter.dailyPlan);for(const field of ['cards','history','gems','pets','rewardIds'])expect(after[field]).toEqual(before[field])
 }
})

test('正式六环节完成后首页四项真实5/5，查看成果不重复奖励',async({page})=>{
 test.setTimeout(90000);await prepare(page);await card(page).locator('.hero-cta').click();await completeDaily(page);const before=await database(page);await go(page,'home')
 await expect(card(page).locator('.task-count')).toHaveText('4 / 4');await expect(card(page).locator('.task-value')).toHaveText(['5 / 5','5 / 5','5 / 5','5 / 5']);await expect(card(page).locator('.task-done')).toHaveText(['已完成','已完成','已完成','已完成']);await expect(card(page).locator('.task-action')).toHaveCount(0);await expect(card(page).locator('.hero-cta')).toHaveText('查看今日成果');await inspect(page)
 await card(page).locator('.hero-cta').click();await expect(page.locator('.study-completion')).toBeVisible();const after=await database(page);for(const field of ['cards','history','pets','gems','rewardIds'])expect(after[field]).toEqual(before[field])
})

test('听音辨义按连接与听音的共同完成词数统计，入口保留真实听音断点',async({page})=>{
 const db=fresh(),plan=selectDailyPlan(db,starterPack,time)!,step:StudyStep='listen';plan.flow!.begunAt=time.toISOString();plan.flow!.step=step;plan.mode=stepMode(step);plan.index=2;plan.revealed=false
 for(const old of STUDY_STEPS.slice(0,STUDY_STEPS.indexOf(step)))plan.flow!.completed[old]=[...plan.wordIds]
 plan.flow!.completed.listen=plan.wordIds.slice(0,2);plan.answers=plan.wordIds.slice(0,2).map((wordId,index)=>({id:'partial-listen-'+index,wordId,courseId:'starter',mode:'listen',source:'practice',correct:true,rating:3,input:'',at:time.toISOString()}));plan.flow!.attempts=[...plan.answers];plan.wordSnapshot={...wordById};db.courseProgress!.starter.dailyPlan=plan;db.courseProgress!.starter.studyActivity='daily'
 await prepare(page,'light',false,db);const before=await database(page);await expect(card(page).locator('.task-value')).toHaveText(['5 / 5','2 / 5','0 / 5','0 / 5']);await expect(card(page).locator('.task-count')).toHaveText('1 / 4');await expect(card(page).locator('.hero-cta')).toHaveText('继续今日学习');await card(page).locator('.task-action').last().click();await expect(page.locator('.daily-step.active')).toContainText('听音');const after=await database(page);expect(after.courseProgress.starter.dailyPlan.flow).toEqual(before.courseProgress.starter.dailyPlan.flow);expect(after.courseProgress.starter.dailyPlan.index).toBe(2);for(const field of ['history','cards','pets','gems'])expect(after[field]).toEqual(before[field])
})

test('家长等级更新只影响未开始任务，已开始后的目标和自定义草稿保持',async({page})=>{
 test.setTimeout(60000);await prepare(page);await unlockParent(page);await page.getByRole('radio',{name:/L4/}).click();await go(page,'home');await expect(card(page).locator('.task-value')).toHaveText(Array(4).fill('0 / 15'));await card(page).locator('.hero-cta').click();await openCustomPractice(page);await page.getByRole('group',{name:'选择学习方式'}).locator('[data-mode="spell"]').click();await page.getByRole('textbox',{name:'输入中文对应的英文单词',exact:true}).fill('ca');const saved=await database(page)
 await unlockParent(page);await page.getByRole('radio',{name:/L5/}).click();await go(page,'home');await expect(card(page).locator('.task-value')).toHaveText(Array(4).fill('0 / 15'));await card(page).locator('.hero-cta').click();await openCustomPractice(page);await expect(page.getByRole('textbox',{name:'输入中文对应的英文单词',exact:true})).toHaveValue('ca');const after=await database(page);expect(after.session).toEqual(saved.session);for(const field of ['history','cards','pets','gems'])expect(after[field]).toEqual(saved[field])
})

test('图标支持点击高亮与取消，资源故障仍有文字和正式学习入口',async({page})=>{
 await prepare(page);const before=await database(page)
 for(const tile of await card(page).locator('.task-icon').all()){await tile.locator('img').click();await expect(tile).toHaveAttribute('aria-pressed','true');await tile.click();await expect(tile).toHaveAttribute('aria-pressed','false')}
 expect(await database(page)).toEqual(before);await page.route('**/static/icons/tasks/*.png',route=>route.abort());await page.reload();await expect(card(page).locator('.task-symbol-fallback')).toHaveText(['词','听','拼','复']);await expect(card(page).locator('.task-value')).toHaveText(Array(4).fill('0 / 5'));await card(page).locator('.task-action').first().focus();await page.keyboard.press('Enter');await expect(page.locator('.daily-step.active')).toContainText('闪现')
})

test('无任务时显示真实0/0和原因，不创建学习记录',async({page})=>{
 const db=fresh();db.courseProgress!.starter.fullLearnedWords=Object.fromEntries(starterPack.vocabulary.map(word=>[word.id,time.toISOString()]));await prepare(page,'light',false,db);const before=await database(page);await expect(card(page).locator('.task-value')).toHaveText(Array(4).fill('0 / 0'));await expect(card(page).locator('.task-unavailable')).toContainText('暂无今日任务');for(const button of await card(page).locator('.hero-cta,.task-action').all())await expect(button).toBeDisabled();expect(await database(page)).toEqual(before)
})

test('档案读取失败显示未知进度和恢复说明，保护故障原始档案',async({page})=>{
 await setAppearance(page,'clay','light');await page.addInitScript(()=>{localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.database.v2','task-unreadable-fixture')});await go(page,'home');await expect(card(page).locator('.task-count')).toHaveText('— / 4');await expect(card(page).locator('.task-value')).toHaveText(Array(4).fill('— / —'));await expect(card(page).locator('.task-unavailable')).toContainText('档案暂不可用');for(const button of await card(page).locator('.hero-cta,.task-action').all())await expect(button).toBeDisabled();expect(await page.evaluate(()=>localStorage.getItem('wordpal.database.v2'))).toBe('task-unreadable-fixture')
})

test('切换合成教材同步四行真实目标，内容故障阻断入口并保留持久化档案',async({page})=>{
 const packs=[customCourse('task-a',20),customCourse('task-b',2)],db=fresh();db.currentCourseId='task-a';db.courseProgress=Object.fromEntries(packs.map(pack=>[pack.courseId,{...initialProgress(pack.courseId),currentLessonId:pack.units[0].lessons[0].id}]))
 await page.addInitScript(packs=>{localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify(packs.map(pack=>{const key='wordpal.content.pack.'+pack.courseId+'.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));return {key,courseId:pack.courseId,archived:false,aliases:{}}})))},packs)
 await prepare(page,'light',false,db);const before=await database(page)
 for(const [id,count]of [['task-b',2],['task-a',5]] as const){expect(await page.evaluate(async id=>{const {useCourseStore}=await import('/src/stores/course.ts' as string);return useCourseStore().choose(id).ok},id)).toBe(true);await expect(card(page).locator('.task-value')).toHaveText(Array(4).fill(`0 / ${count}`))}
 const selected=await database(page);for(const field of ['history','cards','pets','gems','rewardIds','session','customPractice'])expect(selected[field]).toEqual(before[field])
 await page.evaluate(async()=>{const {useLearningStore}=await import('/src/stores/learning.ts' as string),{useProfileStore}=await import('/src/stores/profile.ts' as string),profile=useProfileStore(),plan=useLearningStore().todayPlan!;profile.db.courseProgress![profile.db.currentCourseId!].dailyPlan={...plan,wordIds:['missing-fixture-word',...plan.wordIds.slice(1)]}})
 await expect(card(page).locator('.task-unavailable')).toContainText('教材内容已变更');for(const button of await card(page).locator('.hero-cta,.task-action').all())await expect(button).toBeDisabled();expect(await database(page)).toEqual(selected)
})

test('减少动效设置下主按钮、任务按钮和图标按压保持原位',async({page})=>{
 await prepare(page);const before=await database(page)
 for(const selector of ['.hero-cta','.task-action','.task-icon']){const button=card(page).locator(selector).first();await button.hover();await page.mouse.down();expect(await button.evaluate(node=>getComputedStyle(node).transform)).toBe('none');await page.mouse.move(0,0);await page.mouse.up()}
 expect(await database(page)).toEqual(before)
})
