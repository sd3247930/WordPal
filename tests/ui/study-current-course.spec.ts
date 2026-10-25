import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,database,unlockParent} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'
import {selectDailyPlan} from '../../src/services/learning/DailyLearningPlan'
import {customCourse} from '../helpers/custom-course'
import type {EntryLevel,AbilityLevelId} from '../../packages/parent_settings'
import {contrast} from '../../src/styles/themes'

const time=new Date('2026-10-03T08:00:00Z'),card=(page:Page)=>page.locator('.study-current-course')
function textbook(){const pack=customCourse('current-card',111);pack.title='合成英语教材 四年级下册';pack.units=Array.from({length:6},(_,i)=>({id:'card-u'+i,title:'合成单元 '+(i+1),lessons:[{id:'card-l'+i,title:'合成课 '+(i+1),wordIds:pack.vocabulary.slice(i*19,i*19+19).map(w=>w.id)}]}));return pack}
async function prepare(page:Page,options:{learned?:number;level?:EntryLevel;mode?:string;largeText?:boolean;long?:boolean;frozen?:boolean}={}){
 const pack=textbook(),other=customCourse('current-card-b',7);other.title='另一份合成教材';if(options.long)pack.title='合成出版社 · 小学英语三年级起点 四年级下册 · 自然拼读与单词应用超长教材名称 完整显示验证'.repeat(2)
 const db=freshDatabase();db.version=2;db.currentCourseId=pack.courseId;db.abilityLevel=('L'+(options.level||4)) as AbilityLevelId;db.auxiliaryRecords=[]
 db.courseProgress={[pack.courseId]:{...initialProgress(pack.courseId),curriculumSchema:1,fullLearnedWords:Object.fromEntries(pack.vocabulary.slice(0,options.learned||0).map(w=>[w.id,time.toISOString()]))},[other.courseId]:{...initialProgress(other.courseId),curriculumSchema:1,fullLearnedWords:Object.fromEntries(other.vocabulary.slice(0,2).map(w=>[w.id,time.toISOString()]))}}
 if(options.frozen){const plan=selectDailyPlan(db,pack,time)!;plan.flow!.begunAt=time.toISOString();db.courseProgress[pack.courseId].dailyPlan=plan;db.abilityLevel='L5'}
 await page.clock.install({time});await setAppearance(page,'clay',options.mode||'light',{largeText:!!options.largeText,highContrast:!!options.largeText,reducedMotion:true})
 await page.addInitScript(({db,packs})=>{if(localStorage.getItem('wordpal.database.active.v2'))return;localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.database.v2',JSON.stringify(db));const catalog=packs.map((pack,index)=>{const key='wordpal.content.pack.'+pack.courseId+'.'+String(index+1).repeat(16);localStorage.setItem(key,JSON.stringify(pack));return {courseId:pack.courseId,key,archived:false,aliases:{}}});localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify(catalog))},{db,packs:[pack,other]})
 await go(page,'learn');return {pack,other}
}
async function inspect(page:Page){
 const root=card(page);await expect(root).toBeVisible();for(const image of await root.locator('.course-art-image img').all())await expect(image).toHaveJSProperty('naturalWidth',256)
 const metrics=await root.evaluate(node=>{const outer=node.getBoundingClientRect(),button=node.querySelector('.course-choose')!.getBoundingClientRect(),elements=Array.from(node.querySelectorAll('.current-course-art,.current-course-label,.current-course-name,.current-course-meta,.course-choose,.course-progress-panel,.course-progress-copy'));return {overflow:node.scrollWidth>node.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1,inside:elements.every(el=>{const r=el.getBoundingClientRect();return r.left>=outer.left-.5&&r.right<=outer.right+.5&&r.top>=outer.top-.5&&r.bottom<=outer.bottom+.5&&el.scrollWidth<=el.clientWidth+1}),buttonHeight:button.height,buttonWidth:button.width}})
 expect(metrics.overflow,JSON.stringify(metrics)).toBe(false);expect(metrics.inside,JSON.stringify(metrics)).toBe(true);expect(metrics.buttonHeight).toBeGreaterThanOrEqual(48);expect(metrics.buttonWidth).toBeGreaterThanOrEqual(48)
 await expect(root.locator('.course-entry-level')).toHaveText(await root.locator('.course-level-label').innerText());await expect(root.locator('.course-level-on-book')).toHaveText(await root.locator('.course-level-label').innerText())
 const ink=await root.locator('.course-level-on-book').evaluate(node=>'#'+getComputedStyle(node).color.match(/\d+/g)!.slice(0,3).map(channel=>Number(channel).toString(16).padStart(2,'0')).join(''));expect(contrast(ink,'#fffdf7')).toBeGreaterThanOrEqual(4.5)
}

for(const learned of [0,1,55,111])test(`111词6单元完成${learned}词：分子分母、取整百分比与原始填充比例一致`,async({page})=>{
 await prepare(page,{learned});const before=await database(page)
 await expect(card(page).locator('.current-course-meta')).toContainText('111 词');await expect(card(page).locator('.current-course-meta')).toContainText('6 单元');await expect(card(page).locator('.course-level-label')).toHaveText('L4');await expect(card(page).locator('.course-plan-line')).toContainText('今日计划 '+(learned===111?0:15)+' 词')
 await expect(card(page).locator('.course-completion-count')).toHaveText(`${learned} / 111`);await expect(card(page).locator('.course-completion-percent')).toHaveText(Math.floor(learned/111*100)+'%')
 const progress=card(page).getByRole('progressbar',{name:'当前教材完整学习进度',exact:true});expect(Number(await progress.getAttribute('aria-valuenow'))).toBeCloseTo(learned/111*100,8);expect(await progress.locator('.bar').evaluate(el=>parseFloat((el as HTMLElement).style.width))).toBeCloseTo(learned/111*100,4)
 await card(page).locator('.current-course-name').click();await card(page).locator('.course-progress-art').click();expect(await database(page)).toEqual(before);await expect(page.locator('.brand-subtitle')).toHaveText('Study')
})

for(const mode of ['light','dark'])for(const largeText of [false,true])test(`${mode} 大字${largeText} 长教材名、手机平板横竖屏及真实分屏`,async({page})=>{
 test.setTimeout(90000);await prepare(page,{learned:55,mode,largeText,long:largeText});const before=await database(page)
 for(const size of [{width:320,height:740},{width:390,height:844},{width:412,height:915},{width:844,height:390},{width:600,height:900},{width:768,height:1024},{width:834,height:1194},{width:1024,height:768},{width:1280,height:800}]){await page.setViewportSize(size);await inspect(page);if(size.width===390||size.width===834){await card(page).evaluate(node=>node.scrollIntoView({block:'center'}));await card(page).screenshot({path:test.info().outputPath(`course-${mode}-${largeText?'large':'normal'}-${size.width}.png`)})}}
 await card(page).evaluate(node=>(node as HTMLElement).style.width='250px');await expect(card(page)).toHaveClass(/course-card-stacked/);await inspect(page);await card(page).evaluate(node=>(node as HTMLElement).style.removeProperty('width'))
 await page.setViewportSize({width:320,height:1000});await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2});await expect(card(page)).toHaveClass(/course-card-stacked/);await inspect(page);const button=card(page).getByRole('button',{name:'选择教材',exact:true});await button.evaluate(node=>node.scrollIntoView({block:'center'}));expect(await button.evaluate(node=>{const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true)
 // Component evidence hides fixed navigation; functional checks above use the real shell.
 await page.addStyleTag({content:'.bottom-nav{visibility:hidden!important}'});await card(page).screenshot({path:test.info().outputPath(`course-${mode}-${largeText?'large':'normal'}-200.png`)});expect(await database(page)).toEqual(before)
})

test('选择入口整块可点，快速三击只推入一页；取消及切书后进度互不混用',async({page})=>{
 await page.setViewportSize({width:390,height:1000});const {pack,other}=await prepare(page,{learned:1});const before=await database(page)
 await page.evaluate(()=>{const api=(window as any).uni,original=api.navigateTo;(window as any).courseNavigationCalls=0;api.navigateTo=(option:unknown)=>{(window as any).courseNavigationCalls++;return original.call(api,option)}})
 await card(page).getByRole('button',{name:'选择教材',exact:true}).evaluate((el:HTMLElement)=>{el.click();el.click();el.click()});await expect(page.locator('.course-gallery-heading')).toBeVisible();expect(await page.evaluate(()=>(window as any).courseNavigationCalls)).toBe(1)
 await page.getByRole('button',{name:'返回学习',exact:true}).click();await expect(card(page)).toBeVisible();expect(await database(page)).toEqual(before)
 async function choose(title:string){await card(page).getByRole('button',{name:'选择教材',exact:true}).click();await page.locator('.course-gallery-card').filter({hasText:title}).click();await expect(card(page).locator('.current-course-name')).toHaveText(title)}
 await choose(other.title);await expect(card(page).locator('.course-completion-count')).toHaveText('2 / 7');await expect(card(page).locator('.course-plan-line')).toContainText('今日计划 5 词');await expect(card(page).locator('.current-course-meta')).toContainText('7 词')
 await choose(pack.title);await expect(card(page).locator('.course-completion-count')).toHaveText('1 / 111');const after=await database(page);for(const field of ['history','cards','gems','pets','rewardIds'])expect(after[field]).toEqual(before[field]);expect(after.courseProgress[pack.courseId].fullLearnedWords).toEqual(before.courseProgress[pack.courseId].fullLearnedWords)
})

test('L1–L5 来自家长生效设置，图标与上下文字同步，词量不写死',async({page})=>{
 test.setTimeout(60000);await prepare(page);const before=await database(page)
 for(const [level,count]of [[1,5],[2,5],[3,10],[4,15],[5,20]]){await unlockParent(page,false);await page.getByRole('radio',{name:new RegExp('L'+level)}).click();await go(page,'learn');await expect(card(page).locator('.course-level-label,.course-entry-level,.course-level-on-book')).toHaveText(Array(3).fill('L'+level));await expect(card(page).locator('.course-plan-line')).toContainText('今日计划 '+count+' 词')}
 const after=await database(page);for(const field of ['cards','history','pets','gems','rewardIds','currentCourseId'])expect(after[field]).toEqual(before[field])
})

test('已开始计划保留旧能力起点；跨日只改待续标签，不清理计划或发奖',async({page})=>{
 await prepare(page,{level:2,frozen:true});const before=await database(page);await expect(card(page).locator('.course-level-label')).toHaveText('L2');await expect(card(page).locator('.course-plan-line')).toContainText('今日计划 5 词');expect(before.abilityLevel).toBe('L5')
 await page.clock.setFixedTime(new Date('2026-10-04T08:00:00Z'));await page.clock.runFor(31000);await expect(card(page).locator('.course-plan-line')).toContainText('待续计划 5 词');await expect(card(page).locator('.course-level-label')).toHaveText('L2');expect(await database(page)).toEqual(before)
})

test('空词表边界没有假百分比、除零或旧计数；不持久化测试注入',async({page})=>{
 const {pack}=await prepare(page,{learned:55});const before=await database(page),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await page.evaluate(async id=>{const {courseRegistry}=await import('/src/services/content/ContentRegistry.ts' as string);courseRegistry[id].vocabulary=[]},pack.courseId)
 await expect(card(page).locator('.course-progress-label')).toHaveText('暂无教材单词');await expect(card(page).locator('.course-completion-count')).toHaveText('0 / 0');await expect(card(page).locator('.course-completion-percent,[role=progressbar]')).toHaveCount(0);await expect(card(page)).not.toContainText(/NaN|Infinity/);expect(await database(page)).toEqual(before);expect(errors).toEqual([])
})

test('图标离线失败降级现有高清书本位图，文字、进度和选择入口保持可用',async({page,context})=>{
 for(const pattern of ['**/static/icons/study-course/*.png*','**/static/icons/study-compact/current-cover.png*'])await page.route(pattern,route=>route.request().resourceType()==='image'?route.abort():route.continue());await prepare(page,{learned:55});const before=await database(page)
 for(const image of await card(page).locator('.course-art-image img').all())await expect(image).toHaveAttribute('src',/hd-book[.]png/);await expect(card(page).locator('.course-completion-count')).toHaveText('55 / 111');await context.setOffline(true);await card(page).locator('.current-course-name').click();expect(await database(page)).toEqual(before);await context.setOffline(false);await card(page).getByRole('button',{name:'选择教材',exact:true}).click();await expect(page.locator('.course-gallery-heading')).toBeVisible()
})

test('损坏档案显示未知与恢复提示，不冒充启蒙教材与零进度',async({page})=>{
 await setAppearance(page,'clay','light');await page.addInitScript(()=>{localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.database.v2','current-course-unreadable')});await go(page,'learn');await expect(card(page).locator('.current-course-name')).toHaveText('教材资料暂不可用');await expect(card(page).locator('.course-completion-count')).toHaveText('— / —');await expect(card(page).locator('[role=progressbar],.course-completion-percent')).toHaveCount(0);await expect(card(page).getByRole('status')).toContainText('请先恢复学习档案');expect(await page.evaluate(()=>localStorage.getItem('wordpal.database.v2'))).toBe('current-course-unreadable')
})
