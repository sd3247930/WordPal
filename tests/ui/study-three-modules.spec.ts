import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,database,waitForArtwork} from './helpers'
import {compactStudyFixture} from '../helpers/compact-study'
import {activityNames} from '../../src/services/course/ActivityAvailability'
import {selectDailyPlan,STUDY_STEPS} from '../../src/services/learning/DailyLearningPlan'
import type {Database} from '../../src/stores/profile'

async function prepare(page:Page,theme='clay',mode='light',fixture=compactStudyFixture(),largeText=false){
 await page.clock.install({time:fixture.now});await setAppearance(page,theme,mode,{largeText,reducedMotion:true})
 await page.addInitScript(({db,packs})=>{if(localStorage.getItem('wordpal.database.active.v2'))return;localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify(packs.map(pack=>{const key='wordpal.content.pack.'+pack.courseId+'.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));return {courseId:pack.courseId,key,archived:false,aliases:{}}})))},{db:fixture.db,packs:[fixture.pack]})
 await go(page,'learn')
}
const course=(page:Page)=>page.locator('.study-current-course'),complete=(page:Page)=>page.locator('.study-completion'),menu=(page:Page)=>page.locator('.activity-menu')
async function inspect(page:Page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 for(const root of [course(page),complete(page),menu(page)]){
  const result=await root.evaluate(node=>{const outer=node.getBoundingClientRect();return {overflow:node.scrollWidth>node.clientWidth+1,outside:Array.from(node.querySelectorAll('.course-choose,.course-progress-panel,.completion-result,.completion-actions,.activity-tile,.activity-menu-copy,.activity-reason')).filter(child=>{const r=child.getBoundingClientRect();return r.left<outer.left-.5||r.right>outer.right+.5||child.scrollWidth>child.clientWidth+1}).map(child=>child.className),small:Array.from(node.querySelectorAll('button,[role=button]')).some(child=>{const r=child.getBoundingClientRect();return r.height<48||r.width<44})}})
  expect(result,JSON.stringify(result)).toEqual({overflow:false,outside:[],small:false})
 }
 const columns=await menu(page).locator('.activity-grid').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length);expect(columns).toBe(2)
}
for(const theme of ['swiss','clay'])for(const mode of ['light','dark'])test(`${theme} ${mode} 三模块紧凑、真实动态数据与高清图标，双列不越界`,async({page})=>{
 await prepare(page,theme,mode);const before=await database(page)
 await expect(course(page).locator('.current-course-meta')).toContainText('23 词');await expect(course(page).locator('.current-course-meta')).toContainText('3 单元');await expect(course(page).locator('.course-completion-count')).toHaveText('10 / 23');await expect(course(page).locator('.course-completion-percent')).toHaveText('43%')
 await expect(complete(page).locator('.completion-number')).toHaveText(['10 / 10','0']);await expect(complete(page).getByRole('button')).toHaveCount(1);await expect(complete(page).getByRole('button')).toHaveText('回到今日任务');await expect(page.locator('.study-pet-companion,.study-completion .wp-pet-avatar')).toHaveCount(0)
 await expect(menu(page).locator('.activity-menu-name')).toHaveText(Object.values(activityNames));await expect(menu(page).locator('.activity-tile')).toHaveCount(11)
 for(const width of [320,390,768,834,1024]){await page.setViewportSize({width,height:1000});await inspect(page)}
 await page.setViewportSize({width:390,height:844});expect((await course(page).boundingBox())!.height).toBeLessThan(300);expect((await complete(page).boundingBox())!.height).toBeLessThan(390)
 await waitForArtwork(page);for(const [name,root] of [['current',course(page)],['completion',complete(page)],['practice',menu(page)]] as const){await root.scrollIntoViewIfNeeded();await root.screenshot({path:test.info().outputPath(`${theme}-${mode}-${name}.png`),style:'.bottom-nav{visibility:hidden!important}'})}
 for(const art of await page.locator('.activity-menu-icon img').all())await expect(art).toHaveJSProperty('naturalWidth',256);await expect(complete(page).locator('.completion-art img')).toHaveJSProperty('naturalWidth',384)
 expect(await database(page)).toEqual(before)
})

test('系统两倍字体保持双列、长功能名和禁用原因可读，按钮保留触控面积',async({page})=>{
 await prepare(page,'clay','dark',compactStudyFixture(true,false),true);await page.setViewportSize({width:320,height:1000});await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});await inspect(page);await expect(menu(page).getByRole('button',{name:'自然拼读与跟读',exact:true})).toBeDisabled();await expect(menu(page).locator('[data-activity=phonics] .activity-reason')).toHaveText('暂无规则')
})

test('十一入口进入对应实际功能，退出恢复菜单滚动与教材，不改变正式记录',async({page})=>{
 test.setTimeout(90000);await prepare(page);const before=await database(page)
 for(const [id,name] of Object.entries(activityNames)){
  const button=menu(page).getByRole('button',{name,exact:true});await expect(button).toBeEnabled();await button.scrollIntoViewIfNeeded();const y=await page.evaluate(()=>scrollY);await button.click();await expect(page.locator('.activity-workspace .section-title').first()).toHaveText(name)
  const kind=await page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.activities.session.v2')!).kind);expect(kind).toBe(id)
  await page.getByRole('button',{name:'收起练习',exact:true}).click();await expect(menu(page)).toBeVisible();await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(y,0);expect(await database(page)).toEqual(before)
 }
})

test('锁定条件反映当前课资源；图标失败保留名称与正确入口，不使用矢量或Emoji替代',async({page})=>{
 await page.route('**/static/icons/study-compact/pair.png*',route=>route.request().resourceType()==='image'?route.abort():route.continue());await prepare(page,'clay','light',compactStudyFixture(true,false));const before=await database(page)
 for(const id of ['check','sentence','cloze','story','picture','listen-picture','phonics'])await expect(menu(page).locator(`[data-activity="${id}"] .activity-tile`)).toBeDisabled()
 await expect(menu(page).locator('[data-activity=story] .activity-menu-icon img')).toHaveAttribute('src',/story-locked[.]png/);await expect(menu(page).locator('[data-activity=pair] .activity-menu-icon')).toHaveCount(0)
 await menu(page).getByRole('button',{name:'词义配对',exact:true}).click();await expect(page.locator('.activity-workspace .section-title').first()).toHaveText('词义配对');expect(await database(page)).toEqual(before)
})

test('最终环节保存失败不显示已保存；重试成功才展示完成，重复进入不重奖',async({page})=>{
 const fixture=compactStudyFixture(false),plan=selectDailyPlan(fixture.db,fixture.pack,fixture.now)!,ids=plan.wordIds;plan.flow!.begunAt=fixture.now.toISOString();plan.flow!.step='consolidate';plan.mode='flash';plan.index=ids.length-1;plan.revealed=true
 for(const step of STUDY_STEPS)plan.flow!.completed[step]=step==='consolidate'?ids.slice(0,-1):[...ids]
 plan.answers=ids.slice(0,-1).map((wordId,i)=>({id:'saved-before-'+i,wordId,courseId:fixture.pack.courseId,mode:'flash' as const,source:'practice' as const,correct:true,rating:3 as const,input:'',at:fixture.now.toISOString()}));plan.flow!.attempts=[...plan.answers];fixture.db.courseProgress![fixture.pack.courseId].dailyPlan=plan;fixture.db.courseProgress![fixture.pack.courseId].studyActivity='daily'
 await prepare(page,'clay','light',fixture);await page.locator('.rating-grid').getByRole('button').nth(2).click();await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).__restoreCompactStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(key,value){if(key==='wordpal.database.v2')throw Error('Synthetic quota');return original.call(this,key,value)}});await page.clock.runFor(800);await expect(complete(page)).toHaveCount(0);await expect(page.locator('.wp-app')).toContainText('保存失败');expect((await database(page)).courseProgress[fixture.pack.courseId].dailyPlan.completedAt).toBeUndefined()
 await page.evaluate(()=>(window as any).__restoreCompactStorage());await page.locator('.answer-feedback').getByRole('button').click();await expect(complete(page)).toBeVisible();await expect(complete(page).locator('.completion-saved')).toHaveText('学习进度已保存');const saved=await database(page);await page.reload();await expect(complete(page)).toBeVisible();expect(await database(page)).toEqual(saved)
})
