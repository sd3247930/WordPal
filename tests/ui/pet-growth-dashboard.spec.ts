import {test,expect,type Page} from '@playwright/test'
import {go,database,setAppearance,seedDatabase} from './helpers'
import {goldenDatabase} from './fixtures'
import {petInfo,elements} from '../../packages/pet_engine'
import {starterPack} from '../../src/services/content/ContentRegistry'
async function growth(page:Page){await page.getByRole('group',{name:'宠物屋功能',exact:true}).getByRole('button',{name:'成长',exact:true}).click();await expect(page.locator('.pet-growth-dashboard')).toBeVisible()}
const metric=(page:Page,id:string)=>page.locator('.pet-growth-dashboard [data-metric="'+id+'"]')

test('1. 三个统计接口与学习跳转读取原状态，查看说明和进入学习不计奖且保留Session',async({page})=>{
 await page.setViewportSize({width:390,height:950});await seedDatabase(page,goldenDatabase());await go(page,'pet');await growth(page);const before=await database(page)
 for(const id of elements){await page.locator('.pet-choice').filter({hasText:petInfo[id].name}).click();const db=await database(page);await expect(metric(page,'experience').locator('.growth-card-value')).toContainText(String(db.pets[id].exp));await expect(metric(page,'affection').locator('.growth-card-value')).toContainText(String(db.pets[id].affection));await expect(metric(page,'device').locator('.growth-card-value')).toContainText('1 次有效答题')}
 for(const [id,title]of [['experience','经验来自哪里'],['affection','怎样提高亲密度'],['device','本机学习记录']]){await metric(page,id).click();await expect(page.getByRole('region',{name:title,exact:true})).toBeVisible();await page.getByRole('button',{name:'收起说明',exact:true}).click()}
 await page.locator('.pet-choice').filter({hasText:'玄冥'}).click();expect(await database(page)).toEqual(before);await page.locator('.pet-study-link').focus();await page.keyboard.press('Enter');await expect(page.locator('.study-space')).toBeVisible();expect(await database(page)).toEqual(before);await expect(page.locator('.study-pet-companion')).toContainText('玄冥')
})
test('2. 四象与四阶段的学习入口实际图片、名字同步，学习页继续显示所选精灵',async({page})=>{
 const db=goldenDatabase();db.version=2;db.currentCourseId='starter';db.session=null;db.auxiliaryRecords=[];db.courseProgress={starter:{currentLessonId:starterPack.units[0].lessons[0].id,completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},fullLearnedWords:Object.fromEntries(starterPack.vocabulary.map(w=>[w.id,'2026-10-17T08:00:00Z']))}};for(const e of elements)db.pets[e]={...db.pets[e],level:8,exp:700}
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db);await page.setViewportSize({width:390,height:950});await go(page,'pet');await growth(page)
 for(const id of elements){await page.locator('.pet-choice').filter({hasText:petInfo[id].name}).click();for(const [i,form]of ['juvenile','growing','evolved','unknown'].entries()){await page.locator('.pet-growth-panel .pet-form-card').nth(i).click();await expect(page.locator('.pet-study-character .pet-cutout-image img')).toHaveAttribute('src',new RegExp(id+'-'+form+'[.]png$'));await expect(page.locator('.pet-study-copy')).toContainText(petInfo[id].name)}await page.locator('.pet-study-link').click();await expect(page.locator('.study-pet-companion')).toContainText(petInfo[id].name);await expect(page.locator('.study-pet-companion img')).toHaveAttribute('src',new RegExp(id+'-unknown[.]png$'));await go(page,'pet');await growth(page)}
})
test('3. 全教材进度读取教材独立首轮记录，切宠与查看进度不会改变记录',async({page})=>{
 const db=goldenDatabase();db.version=2;db.currentCourseId='starter';db.session=null;db.auxiliaryRecords=[];db.courseProgress={starter:{currentLessonId:starterPack.units[0].lessons[0].id,completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{},fullLearnedWords:Object.fromEntries(starterPack.vocabulary.slice(0,7).map(w=>[w.id,'2026-10-17T08:00:00Z']))}};await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db)
 await go(page,'pet');await growth(page);const before=await database(page),expected=Math.floor(7/starterPack.vocabulary.length*100);await expect(page.locator('.pet-curriculum-progress')).toContainText('7 / '+starterPack.vocabulary.length);await expect(page.getByRole('progressbar',{name:'全部已安装教材单词学习进度',exact:true})).toHaveAttribute('aria-valuenow',String(expected));await page.reload();await growth(page);expect(await database(page)).toEqual(before)
})
for(const mode of ['light','dark'])for(const extra of [{},{largeText:true,highContrast:true}] as Record<string,boolean>[])test(mode+' '+JSON.stringify(extra)+' 成长卡片手机平板可读，图标等比高清，按钮可触达',async({page})=>{
 await seedDatabase(page,goldenDatabase());await setAppearance(page,'swiss',mode,extra);await go(page,'pet');await growth(page);const before=await database(page)
 for(const width of [320,390,600,834,1194]){
  await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  for(const img of await page.locator('.pet-growth-symbol img').all()){await expect(img).toHaveJSProperty('naturalWidth','highContrast' in extra?256:1024)}
  const cards=await page.locator('.growth-data-card,.pet-study-link').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {height:r.height,overflow:el.scrollWidth>el.clientWidth+1,font:parseFloat(getComputedStyle(el.querySelector('.growth-card-title')!).fontSize),name:el.className,width:r.width,scroll:el.scrollWidth}}));expect(cards.every(c=>c.height>=48&&!c.overflow&&c.font>=18),JSON.stringify({width,cards})).toBe(true)
 }
 expect(await database(page)).toEqual(before);await page.setViewportSize({width:390,height:1000});await page.locator('.pet-growth-dashboard').screenshot({path:test.info().outputPath('growth-'+mode+('highContrast' in extra?'-accessible':'')+'.png')})
})
test('图标加载失败时保留中文回退与所有统计及学习入口',async({page})=>{
 await page.route('**/static/icons/pet-growth/*.png',route=>route.abort());await go(page,'pet');await growth(page);await expect(page.locator('.growth-icon-fallback')).toHaveCount(6);await expect(metric(page,'experience')).toContainText('累计经验');await page.locator('.pet-study-link').click();await expect(page.locator('.study-pet-companion')).toBeVisible()
})
test('空会话导航不自动创建答题或奖励，连续点击只导航一次',async({page})=>{
 const db=goldenDatabase();db.session=null;await seedDatabase(page,db);await go(page,'pet');await growth(page);const before=await database(page)
 await page.evaluate(()=>{const api=(window as any).uni,original=api.redirectTo;(window as any).growthNavigationCalls=0;api.redirectTo=(options:unknown)=>{(window as any).growthNavigationCalls++;return original(options)}})
 await page.locator('.pet-study-link').evaluate((el:HTMLElement)=>{el.click();el.click();el.click()});await expect(page.locator('.study-ready')).toBeVisible();expect(await page.evaluate(()=>(window as any).growthNavigationCalls)).toBe(1);expect(await database(page)).toEqual(before)
})
