import {test,expect,type Page} from '@playwright/test'
import {go,setAppearance,seedDatabase,database,waitForArtwork} from './helpers'
import {goldenDatabase} from './fixtures'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
import {customCourse} from '../helpers/custom-course'
import {contrast} from '../../src/styles/themes'

const values=(page:Page)=>page.locator('.home-stat-value')
const fixedTime=new Date('2026-10-03T08:00:00Z')
async function prepare(page:Page,mode='light',largeText=false){await page.clock.install({time:fixedTime});await setAppearance(page,'clay',mode,{largeText,highContrast:largeText,reducedMotion:true});await seedDatabase(page,goldenDatabase());await go(page,'home')}

test('三栏使用既有连续日、当前教材到期数和任务词数，静态查看与导航不写学习数据',async({page})=>{
 await prepare(page);const before=await database(page)
 await expect(values(page)).toHaveText(['3','3','5']);await expect(page.locator('.home-stat-unit')).toHaveText(['天','个','个'])
 await expect(page.getByRole('group',{name:'今日复习，3 个，当前教材到期待复习',exact:true})).toBeVisible();await expect(page.getByRole('group',{name:'今日新词，5 个，当前每日任务词数',exact:true})).toBeVisible()
 await expect(page.locator('.home-stats-strip [role="button"],.home-stats-strip button')).toHaveCount(0)
 await page.locator('.home-stats-strip').click();await expect(page.locator('.home-stats-strip')).toBeVisible()
 for(const screen of ['review','home','settings','home'])await go(page,screen)
 await page.reload();await expect(values(page)).toHaveText(['3','3','5']);expect(await database(page)).toEqual(before)
})

for(const mode of ['light','dark'])for(const largeText of [false,true])test(`Clay ${mode} 大字=${largeText} 一体三栏、分隔线和手机平板窗口`,async({page})=>{
 await prepare(page,mode,largeText);const before=await database(page)
 for(const width of [320,359,360,390,507,600,768,834,1024,1194,1280]){
  await page.setViewportSize({width,height:width>1000?800:1000});await expect(page.locator('.home-stat')).toHaveCount(3)
  const metrics=await page.locator('.home-stat').evaluateAll(nodes=>nodes.map(node=>{const row=node.getBoundingClientRect(),icon=node.querySelector('.home-stat-icon')!.getBoundingClientRect(),copy=node.querySelector('.home-stat-copy')!.getBoundingClientRect(),title=node.querySelector('.home-stat-title')!.getBoundingClientRect(),before=getComputedStyle(node,'::before');return {width:row.width,overflow:node.scrollWidth>node.clientWidth+1,inside:copy.left>=row.left-.1&&copy.right<=row.right+.1,overlap:icon.left<copy.right-.1&&icon.right>copy.left+.1&&icon.top<copy.bottom-.1&&icon.bottom>copy.top+.1,iconWidth:icon.width,titleFont:parseFloat(getComputedStyle(node.querySelector('.home-stat-title')!).fontSize),titleBottom:title.bottom,line:before.content!=='none',lineWidth:before.width,lineTop:parseFloat(before.top),lineBottom:parseFloat(before.bottom)}}))
  expect(metrics.every(metric=>!metric.overflow&&metric.inside&&!metric.overlap&&metric.iconWidth>=(width>=353&&width<=379?32:36)&&metric.iconWidth<=42&&metric.titleFont>=14),JSON.stringify({width,metrics})).toBe(true)
  expect(Math.max(...metrics.map(item=>item.width))-Math.min(...metrics.map(item=>item.width))).toBeLessThan(1)
  expect(metrics.slice(1).every(item=>item.line&&item.lineWidth==='1px'&&item.lineTop>0&&item.lineBottom>0)).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(!largeText&&[359,360,390].includes(width)){const positions=await page.locator('.home-stat').evaluateAll(nodes=>nodes.map(node=>{const icon=node.querySelector('.home-stat-icon')!.getBoundingClientRect(),copy=node.querySelector('.home-stat-copy')!.getBoundingClientRect();return icon.right<=copy.left+.1}));expect(positions).toEqual([true,true,true]);expect(Math.max(...metrics.map(item=>item.titleBottom))-Math.min(...metrics.map(item=>item.titleBottom))).toBeLessThan(1)}
  if([390,1280].includes(width)){await waitForArtwork(page);await page.locator('.home-stats-strip').screenshot({path:test.info().outputPath(`stats-${mode}-${largeText?'large':'normal'}-${width}.png`)})}
 }
 const colors=await page.locator('.home-stat-reading,.home-stat-title').evaluateAll(nodes=>nodes.map(node=>{const rgb=(value:string)=>'#'+value.match(/\d+/g)!.slice(0,3).map(part=>Number(part).toString(16).padStart(2,'0')).join('');return {text:rgb(getComputedStyle(node).color),surface:getComputedStyle(node.closest('.wp-app')!).getPropertyValue('--wp-surface').trim()}}))
 expect(colors.every(color=>contrast(color.text,color.surface)>=4.5),JSON.stringify(colors)).toBe(true)
 for(const image of await page.locator('.home-stat-icon img').all())await expect(image).toHaveJSProperty('naturalWidth',256)
 expect(await database(page)).toEqual(before)
})

test('真实零值保留，超大连续日数完整显示，200%字体可降级且不改原记录',async({page})=>{
 await page.clock.install({time:fixedTime});await setAppearance(page,'clay','light');const db=freshDatabase(),day=new Date(2026,9,3,12)
 for(let index=0;index<12345;index++){db.streakDates.push(`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`);day.setDate(day.getDate()-1)}
 await seedDatabase(page,db);await go(page,'home');const before=await database(page);await expect(values(page)).toHaveText(['12345','0','10'])
 await page.setViewportSize({width:320,height:1100});await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2})
 await expect(page.locator('.home-stats-strip')).toHaveClass(/stats-a11y-stack/);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 expect(await page.locator('.home-stat').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+1))).toBe(true);await expect(values(page)).toHaveText(['12345','0','10']);expect(await database(page)).toEqual(before)
})

test('档案读取失败显示不可用占位，不以空档案零值冒充原记录',async({page})=>{
 await setAppearance(page,'clay','light');await page.addInitScript(()=>{localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'));localStorage.setItem('wordpal.database.v2','unreadable-test-archive')});await go(page,'home')
 await expect(values(page)).toHaveText(['—','—','—']);await expect(page.locator('.home-stats-unavailable')).toContainText('统计暂不可用');await expect(page.getByRole('group',{name:'连续学习，数据暂不可用',exact:true})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('wordpal.database.v2'))).toBe('unreadable-test-archive')
})

test('图标失败使用文字占位，统计与正式学习入口仍正常',async({page})=>{
 await page.route('**/static/icons/home-stats/*.png',route=>route.abort());await prepare(page);const before=await database(page);await expect(page.locator('.home-stat-fallback')).toHaveText(['日','复','词']);await expect(values(page)).toHaveText(['3','3','5']);expect(await database(page)).toEqual(before);await page.locator('.hero-cta').click();await expect(page.locator('.learn-workspace')).toBeVisible()
})

test('跨午夜与后台恢复刷新日期、连续日和到期数，只刷新读取不发奖或分配新任务',async({page})=>{
 await page.clock.install({time:new Date('2026-10-04T19:59:50Z')});await setAppearance(page,'clay','light');const db=goldenDatabase();db.cards.cat.due='2026-10-04T20:00:05Z';await seedDatabase(page,db);await go(page,'home');const before=await database(page)
 await expect(values(page)).toHaveText(['3','2','5']);await page.clock.runFor(40000);await expect(values(page)).toHaveText(['0','3','5']);await expect(page.locator('.home-date')).toContainText('10月5日')
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))});await page.clock.setSystemTime(new Date('2026-10-06T08:00:00Z'));await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'))});await expect(page.locator('.home-date')).toContainText('10月6日');expect(await database(page)).toEqual(before)
})

test('切换合成教材仅刷新本册到期与任务量，学习记录和自定义练习不被覆盖',async({page})=>{
 await page.clock.install({time:fixedTime});await setAppearance(page,'clay','light');const packs=[customCourse('stats-a',20),customCourse('stats-b',2)],db=freshDatabase();db.version=2;db.currentCourseId='stats-a';db.abilityLevel='L1';db.auxiliaryRecords=[];db.courseProgress=Object.fromEntries(packs.map(pack=>[pack.courseId,{currentLessonId:pack.courseId+'-l1',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}]));for(const pack of packs)for(const word of pack.vocabulary.slice(0,pack.courseId==='stats-a'?2:1))db.cards[word.id]=newCard(word.id,new Date('2000-01-01'))
 await page.addInitScript(({packs,db})=>{localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify(packs.map(pack=>{const key='wordpal.content.pack.'+pack.courseId+'.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));return {key,courseId:pack.courseId,archived:false,aliases:{}}})));localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},{packs,db});await go(page,'home');const before=await database(page);await expect(values(page)).toHaveText(['0','2','5'])
 for(const [id,expected]of [['stats-b',['0','1','2']],['stats-a',['0','2','5']]] as const){expect(await page.evaluate(async id=>{const {useCourseStore}=await import('/src/stores/course.ts' as string);return useCourseStore().choose(id).ok},id)).toBe(true);await expect(values(page)).toHaveText(expected)}
 const after=await database(page);for(const field of ['cards','history','rewardIds','gems','pets','session','customPractice','streakDates'])expect(after[field]).toEqual(before[field]);expect(after.courseProgress['stats-a']).toEqual(before.courseProgress['stats-a'])
})

test('瑞士主题保留原统计结构与样式，主题往返及系统明暗切换不改数据',async({page})=>{
 await prepare(page);const before=await database(page)
 await page.evaluate(async()=>{const {useThemeStore}=await import('/src/stores/theme.ts' as string);useThemeStore().settings.themeId='swiss'});await expect(page.locator('.home-stats')).toBeVisible();await expect(page.locator('.home-stats-strip')).toHaveCount(0)
 expect(await page.locator('.home-stats').evaluate(node=>getComputedStyle(node).boxShadow)).toBe('none')
 await page.evaluate(async()=>{const {useThemeStore}=await import('/src/stores/theme.ts' as string);useThemeStore().settings.themeId='clay';useThemeStore().settings.colorMode='system'});await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('.wp-app')).toHaveAttribute('data-mode','dark');await expect(values(page)).toHaveText(['3','3','5']);await page.emulateMedia({colorScheme:'light'});await expect(page.locator('.wp-app')).toHaveAttribute('data-mode','light');expect(await database(page)).toEqual(before)
})
