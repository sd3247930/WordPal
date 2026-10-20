import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,seedDatabase,database,selectWordbookScope,completeDaily} from './helpers'
import {goldenDatabase} from './fixtures'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
import {customCourse} from '../helpers/custom-course'
import {contrast} from '../../src/styles/themes'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'

const fixed=new Date('2026-10-03T08:00:00Z'),counts=(page:Page)=>page.locator('.priority-count')
async function prepare(page:Page,mode='light',largeText=false){
 await page.clock.install({time:fixed});await setAppearance(page,'clay',mode,{largeText,highContrast:largeText,reducedMotion:true})
 const db=goldenDatabase();delete db.cards.milk;db.cards.apple.difficulty=7;db.history.push({...db.history[0],id:'practice-milk',wordId:'milk',source:'practice'})
 await seedDatabase(page,db);await page.addInitScript(()=>localStorage.setItem('wordpal.wordbook.preferences.v1',JSON.stringify({favorites:['fish','apple'],later:[]})));await go(page,'home')
}
test('统计、行与箭头分别打开原口径词表，困难词不混成手动重点，浏览不改记录',async({page})=>{
 await prepare(page);const before=await database(page);await expect(counts(page)).toHaveText(['3 个','2 个','7 个'])
 const expected={due:['cat','dog','fish'],weak:['apple','dog'],known:['apple','bird','cat','dog','duck','egg','fish']}
 for(const kind of ['due','weak','known'] as const){
  await page.locator('.priority-'+kind+' .priority-arrow').click();await expect(page.locator('.wordbook-priority-context')).toBeVisible()
  await expect(page.locator('.wordbook-row')).toHaveCount(expected[kind].length)
  expect((await page.locator('.wordbook-row').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-word-id')))).sort()).toEqual(expected[kind])
  await expect(page.locator('.review-list .section-heading')).toContainText(expected[kind].length+' 个独立词')
  if(kind==='weak'){await expect(page.locator('.wordbook-priority-context')).toContainText('系统困难词');await expect(page.locator('.wordbook-row')).not.toContainText(['我的重点','我的重点'])}
  await page.locator('.wordbook-search input').fill('cat');await expect(page.locator('.wordbook-row')).toHaveCount(kind==='weak'?0:1)
  await go(page,'home');await expect(counts(page)).toHaveText(['3 个','2 个','7 个'])
 }
 await page.locator('.priority-weak .priority-art').click();await page.getByRole('button',{name:'返回单词本',exact:true}).click()
 await selectWordbookScope(page,'全部单词');await page.locator('[data-category="weak"]').click();await expect(page.locator('.wordbook-focus-legend')).toContainText('我的重点 2')
 expect((await page.locator('.wordbook-row').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-word-id')))).sort()).toEqual(['apple','fish']);expect(await database(page)).toEqual(before)
})
for(const mode of ['light','dark'])for(const large of [false,true])test(`三行布局、AA对比、窄屏与平板 ${mode} 大字=${large}`,async({page})=>{
 await prepare(page,mode,large);const before=await database(page)
 await expect(page.locator('.priority-heading')).toHaveText('复习优先级');await expect(page.locator('.priority-name')).toHaveText(['到期复习','重点巩固','已经认识'])
 await expect(page.locator('.priority-heading image,.priority-heading uni-image')).toHaveCount(1)
 for(const width of [320,359,390,507,600,768,834,1024,1194,1280]){
  await page.setViewportSize({width,height:1000});await expect(page.locator('.home-priority-row')).toHaveCount(3)
  await expect.poll(()=>page.locator('.home-priority-row').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+1))).toBe(true)
  const metrics=await page.locator('.home-priority-row').evaluateAll(nodes=>nodes.map(node=>{const row=node.getBoundingClientRect(),count=node.querySelector('.priority-count')!.getBoundingClientRect(),arrow=node.querySelector('.priority-arrow')!.getBoundingClientRect(),name=node.querySelector('.priority-name')!.getBoundingClientRect();return {height:row.height,left:count.left,right:count.right,arrow:arrow.left,inside:count.right<=arrow.left&&name.right<=arrow.left&&arrow.right<=row.right}}))
  expect(metrics.every(row=>row.inside&&row.height>=48),JSON.stringify({width,metrics})).toBe(true)
  expect(Math.max(...metrics.map(row=>row.left))-Math.min(...metrics.map(row=>row.left))).toBeLessThan(1)
  expect(Math.max(...metrics.map(row=>row.arrow))-Math.min(...metrics.map(row=>row.arrow))).toBeLessThan(1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(width===390&&!large)expect(await page.locator('.priority-count').evaluateAll(nodes=>nodes.every(node=>{const children=Array.from(node.children);return Math.abs(children[0].getBoundingClientRect().top-children[1].getBoundingClientRect().top)<1}))).toBe(true)
  if([390,768,1280].includes(width))await page.locator('.home-priority').screenshot({path:test.info().outputPath(`priority-${mode}-${large}-${width}.png`)})
 }
 const colors=await page.locator('.priority-name,.priority-count').evaluateAll(nodes=>nodes.map(node=>{const rgb=(value:string)=>'#'+value.match(/\d+/g)!.slice(0,3).map(part=>Number(part).toString(16).padStart(2,'0')).join('');const styles=getComputedStyle(node),row=getComputedStyle(node.closest('.home-priority-row')!);return {text:rgb(styles.color),surface:node.classList.contains('priority-count')?rgb(styles.backgroundColor):row.getPropertyValue('--wp-surface').trim(),tint:row.getPropertyValue('--priority-tint').trim()}}))
 for(const color of colors){expect(contrast(color.text,color.surface)).toBeGreaterThanOrEqual(4.5);expect(contrast(color.text,color.tint)).toBeGreaterThanOrEqual(4.5)}
 for(const image of await page.locator('.home-priority img').all())await expect(image).toHaveJSProperty('naturalWidth',256)
 expect(await database(page)).toEqual(before)
})
test('真实零值和空目标、快速连点单次导航，无嵌套按钮且有完整读屏名称',async({page})=>{
 await page.clock.install({time:fixed});await setAppearance(page,'clay','light');await seedDatabase(page,freshDatabase());await go(page,'home');const before=await database(page)
 await expect(counts(page)).toHaveText(['0 个','0 个','0 个']);await expect(page.getByRole('button',{name:'到期复习，0 个单词，查看详情',exact:true})).toBeVisible()
 await expect(page.locator('.home-priority-row [role="button"]')).toHaveCount(0)
 await page.evaluate(()=>{const target=window as any,original=target.uni.redirectTo;target.priorityRoutes=0;target.uni.redirectTo=function(options:any){target.priorityRoutes++;return original.call(this,options)};const node=document.querySelector('.priority-due') as HTMLElement;node.click();node.click();node.click()})
 await expect(page.locator('.wordbook-priority-context')).toContainText('到期复习');await expect(page.locator('.review-list')).toContainText('暂时没有到期单词');expect(await page.evaluate(()=>(window as any).priorityRoutes)).toBe(1);expect(await database(page)).toEqual(before)
})
test('档案读取失败显示不可用，不能以零冒充原数据',async({page})=>{
 await setAppearance(page,'clay','light');await page.addInitScript(()=>{localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.database.v2','unreadable-test-archive')});await go(page,'home')
 await expect(counts(page)).toHaveText(['—','—','—']);await expect(page.locator('.priority-unavailable')).toContainText('暂不可用');for(const row of await page.locator('.home-priority-row').all())await expect(row).toHaveAttribute('aria-disabled','true')
 expect(await page.evaluate(()=>localStorage.getItem('wordpal.database.v2'))).toBe('unreadable-test-archive')
})
test('离线仍能查看本地统计与匹配词表，图标失败有文字替代',async({page,context})=>{
 await page.route('**/static/icons/home-priority/*.png*',route=>route.request().resourceType()==='image'?route.abort():route.continue())
 await prepare(page);await page.locator('.priority-known').click();await page.getByRole('button',{name:'首页',exact:true}).first().click();await expect(counts(page)).toHaveText(['3 个','2 个','7 个']);const before=await database(page)
 await context.setOffline(true);await expect(page.locator('.priority-icon-fallback')).toHaveText(['芽','复','练','词']);await page.locator('.priority-weak').click();await expect(page.locator('.wordbook-row')).toHaveCount(2);expect(await database(page)).toEqual(before)
})
test('到期时刻、前台恢复和受控记忆变化会刷新，不新增计时器或奖励',async({page})=>{
 await page.clock.install({time:new Date('2026-10-04T19:59:50Z')});await setAppearance(page,'clay','light');const db=goldenDatabase();db.cards.cat.due='2026-10-04T20:00:05Z';await seedDatabase(page,db);await go(page,'home');const before=await database(page)
 await expect(counts(page)).toHaveText(['2 个','1 个','8 个']);await page.clock.runFor(40000);await expect(counts(page)).toHaveText(['3 个','1 个','8 个'])
 await page.evaluate(async()=>{const {useProfileStore}=await import('/src/stores/profile.ts' as string),{useReviewStore}=await import('/src/stores/review.ts' as string);useProfileStore().transact((db:ReturnType<typeof freshDatabase>)=>{db.cards.dog.lapses=0;db.cards.cat.due='2030-01-01T00:00:00Z'});useReviewStore().refresh()})
 await expect(counts(page)).toHaveText(['2 个','0 个','8 个']);await page.locator('.priority-due').click();await expect(page.locator('.wordbook-row')).toHaveCount(2);await go(page,'home');await expect(counts(page)).toHaveText(['2 个','0 个','8 个'])
 const after=await database(page);for(const key of ['history','gems','rewardIds','pets','session','customPractice'])expect(after[key]).toEqual(before[key])
})
test('切换合成教材只影响到期范围，重点与已认识保留全局去重',async({page})=>{
 await page.clock.install({time:fixed});await setAppearance(page,'clay','light');const packs=[customCourse('priority-a',20),customCourse('priority-b',2)],db=freshDatabase();db.version=2;db.currentCourseId='priority-a';db.abilityLevel='L1';db.auxiliaryRecords=[];db.courseProgress=Object.fromEntries(packs.map(pack=>[pack.courseId,{currentLessonId:pack.courseId+'-l1',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}]));for(const pack of packs)for(const word of pack.vocabulary.slice(0,pack.courseId==='priority-a'?2:1))db.cards[word.id]={...newCard(word.id,new Date(0)),difficulty:7}
 await page.addInitScript(({packs,db})=>{localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify(packs.map(pack=>{const key='wordpal.content.pack.'+pack.courseId+'.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));return {key,courseId:pack.courseId,archived:false,aliases:{}}})));localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},{packs,db});await go(page,'home');await expect(counts(page)).toHaveText(['2 个','3 个','3 个']);const before=await database(page)
 await page.evaluate(async()=>{const {useCourseStore}=await import('/src/stores/course.ts' as string);useCourseStore().choose('priority-b')});await expect(counts(page)).toHaveText(['1 个','3 个','3 个']);await page.locator('.priority-due').click();await expect(page.locator('.wordbook-row')).toHaveCount(1);await expect(page.locator('.wordbook-row')).toHaveAttribute('data-course-id','priority-b')
 const after=await database(page);for(const key of ['cards','history','gems','rewardIds','pets','session'])expect(after[key]).toEqual(before[key])
})
test('超大数字与200%字号、键盘焦点和减少动效，瑞士主题仍用原栏',async({page})=>{
 await prepare(page);const before=await database(page);await page.setViewportSize({width:320,height:1100})
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string),{useWordbookStore}=await import('/src/stores/wordbook.ts' as string);windowLayout.fontScale=2;const store=useWordbookStore(),original=store.priority;(window as any).priorityOriginal=original;store.priority=function(kind:any,keyword?:string){const result=original(kind,keyword);return {...result,items:Array(123456).fill(result.items[0])}}})
 await expect(counts(page)).toHaveText(['123456 个','123456 个','123456 个']);await expect(page.locator('.home-priority-content')).toHaveClass(/priority-stacked/);expect(await page.locator('.priority-name').first().evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(34)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(await page.locator('.home-priority-row').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+1))).toBe(true)
 await page.evaluate(async()=>{const {useWordbookStore}=await import('/src/stores/wordbook.ts' as string);useWordbookStore().priority=(window as any).priorityOriginal});await page.locator('.priority-due').focus();expect(await page.locator('.priority-due').evaluate(node=>getComputedStyle(node).outlineStyle)).not.toBe('none');await expect(page.locator('.priority-due')).toHaveCSS('transition-duration','0s');await page.keyboard.press('Enter');await expect(page.locator('.wordbook-priority-context')).toBeVisible()
 await go(page,'home');await page.evaluate(async()=>{const {useThemeStore}=await import('/src/stores/theme.ts' as string);useThemeStore().settings.themeId='swiss'});await expect(page.locator('.home-priority-clay')).toHaveCount(0);await expect(page.locator('.priority-row')).toHaveCount(3);await page.locator('.priority-row').nth(1).click();await expect(page.locator('.wordbook-priority-context')).toContainText('系统困难词');await expect(page.locator('.wordbook-row')).toHaveCount(2);expect(await database(page)).toEqual(before)
})
test('隔离示例档案完成正式六环节后刷新已经认识，浏览成果不重复奖励',async({page})=>{
 test.setTimeout(90000);await page.clock.install({time:fixed});await setAppearance(page,'clay','light')
 const db=freshDatabase();db.version=2;db.currentCourseId='starter';db.abilityLevel='L1';db.courseProgress={starter:initialProgress('starter')};db.auxiliaryRecords=[]
 await page.addInitScript(db=>{localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},db);await go(page,'home');await expect(counts(page)).toHaveText(['0 个','0 个','0 个'])
 await page.locator('.home-today-clay .hero-cta').click();await completeDaily(page);const done=await database(page),ids=Object.keys(done.cards).sort();expect(ids).toHaveLength(5)
 await go(page,'home');await expect(counts(page)).toHaveText(['0 个','0 个','5 个']);await page.locator('.priority-known').click();await expect(page.locator('.wordbook-row')).toHaveCount(ids.length);expect((await page.locator('.wordbook-row').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-word-id')))).sort()).toEqual(ids);expect(await database(page)).toEqual(done)
})
