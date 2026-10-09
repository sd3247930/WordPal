import {test,expect,type Page} from '@playwright/test'
import {go,database,setAppearance} from './helpers'
import {freshDatabase,type Database} from '../../src/stores/profile'
import original from '../../src/content/courses/original-primary.json'
import type {CoursePack} from '../../packages/content_schema/course'
import {newCard} from '../../packages/srs_fsrs'
import {mkdirSync} from 'node:fs'
const pack:CoursePack={...JSON.parse(JSON.stringify(original)),courseId:'parent-settings-test',title:'合成家长设置验证课',abilityLevels:['L1','L2','L3','L4','L5'],units:[{id:'u01',title:'合成单元',lessons:[{id:'l01',title:'合成长课',wordIds:original.vocabulary.slice(0,40).map(w=>w.id)}]}]}
const ids=pack.units[0].lessons[0].wordIds
function fixture(){return {...freshDatabase(),version:2,currentCourseId:pack.courseId,courseProgress:{[pack.courseId]:{currentLessonId:'l01',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}},auxiliaryRecords:[]} as Database}
async function seed(page:Page,db=fixture()){
 await page.addInitScript(pack=>{if(!localStorage.getItem('wordpal.content.catalog.v2')){const key='wordpal.content.pack.parent-settings-test.c0a1b2c3d4e5f6a7';localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{key,archived:false,aliases:{}}]))}},pack)
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.active.v2')){localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))}},db)
}
async function unlock(page:Page){await go(page,'parent');const gate=page.getByRole('spinbutton',{name:'家长验证答案'});if(await gate.count()){await gate.fill('56');await page.getByRole('button',{name:'打开家长设置',exact:true}).click()}await expect(page.locator('.parent-learning-settings')).toBeVisible()}
const limit=(page:Page,n:number)=>page.getByRole('group',{name:'每日新词上限',exact:true}).getByRole('button',{name:n+' 个',exact:true})
const level=(page:Page,n:number)=>page.getByRole('group',{name:'能力起点',exact:true}).getByRole('button').filter({hasText:'L'+n})
function protectedData(db:Database){const {dailyLimit,abilityLevel,parentSettingsVersion,parentSettingsUpdatedAt,...protectedFields}=db;return protectedFields}

for(const cap of [5,10,20])test(`${cap}新词上限保存后实际编排12个到期复习及上限内新词，学习数据不因设置改变`,async({page})=>{
 const db=fixture();for(const id of ids.slice(0,12))db.cards[id]=newCard(id,new Date('2000-01-01'))
 await seed(page,db);await unlock(page);const before=await database(page);await limit(page,cap).click()
 await expect(limit(page,cap)).toHaveAttribute('aria-pressed','true');await expect(page.locator('.parent-settings-summary')).toContainText(cap+' 个 / 天');await expect(page.locator('[data-state="applied"]').first()).toContainText('已生效')
 await expect(page.locator('.parent-plan-preview')).toContainText(`12 个到期复习 · 0 个重点巩固 · 最多 ${Math.min(cap,10)} 个新词`);expect(protectedData(await database(page))).toEqual(protectedData(before))
 await go(page,'home');await page.locator('.hero-cta').click();const saved=await database(page)
 expect(saved.session.wordIds.slice(0,12)).toEqual(ids.slice(0,12));expect(saved.session.wordIds.length).toBe(12+Math.min(cap,10));expect(Object.values(saved.session.wordSources).filter(s=>s==='new_word')).toHaveLength(Math.min(cap,10));expect(saved.session.plannerConfig).toEqual({dailyNewWordLimit:cap,entryLevel:3});await expect(page.locator('.session-header')).toContainText('到期复习')
})

test('当前轮次中修改后显示下次生效，输入和快照跨重启不变，完成后实际使用新能力及剩余新词额度',async({page})=>{
 test.setTimeout(60000);await seed(page);await unlock(page);await limit(page,5).click()
 // L1 only offers flash/connect, so use L3 to stage a text input for the "draft survives restart" check.
 await level(page,3).click();await go(page,'home');await page.locator('.hero-cta').click();await page.locator('.mode-button').filter({hasText:'拼写'}).click();await page.locator('.spelling-input input').fill('draft')
 const before=await database(page);await unlock(page);await limit(page,20).click();await level(page,5).click()
 await expect(page.locator('[data-state="pending"]')).toContainText('已保存 · 下次学习生效');await expect(page.locator('.ability-explanation')).toContainText('L5 · 进阶表达');await expect(page.locator('.ability-recommendations')).toHaveAttribute('data-entry-level','5');expect(protectedData(await database(page))).toEqual(protectedData(before))
 await page.reload();await page.getByRole('spinbutton',{name:'家长验证答案'}).fill('56');await page.getByRole('button',{name:'打开家长设置',exact:true}).click();await expect(limit(page,20)).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-state="pending"]')).toContainText('下次学习生效')
 await go(page,'learn');await expect(page.locator('.spelling-input input')).toHaveValue('draft');expect((await database(page)).session).toEqual(before.session)
 for(let i=0;i<5;i++){const db=await database(page),word=db.session.wordSnapshot[db.session.wordIds[i]].word;await page.locator('.spelling-input input').fill(word);await page.locator('.answer-actions .wp-button').filter({hasText:'确认答案'}).click();await page.locator('.answer-feedback .wp-button').click()}
 await page.locator('.completion .wp-button').filter({hasText:'继续今日学习'}).click();const next=await database(page);expect(next.session.id).not.toBe(before.session.id);expect(next.session.plannerConfig).toEqual({dailyNewWordLimit:20,entryLevel:5});expect(next.session.wordIds).toHaveLength(15)
 // 合成课程未含离线音频，L5 首题听写应回退闪现；第二题实际采用 L5 拼写。
 await expect(page.locator('.mode-button.selected').first()).toContainText('闪现');await page.getByRole('button',{name:'查看答案',exact:true}).click();await page.getByRole('button',{name:'记住了',exact:true}).click();await page.locator('.answer-feedback .wp-button').click();await expect(page.locator('.spelling-input input')).toHaveValue('');await expect(page.locator('.mode-button.selected').first()).toContainText('拼写')
})

test('能力L1→L5→L2更新说明和真实推荐而不切课或改学习数据；断网保存后重载保留',async({page})=>{
 await seed(page);await unlock(page);const before=protectedData(await database(page))
 for(const [n,title] of [[1,'启蒙识词'],[5,'进阶表达'],[2,'基础拼读']] as const){await level(page,n).click();await expect(page.locator('.ability-explanation')).toContainText(title);await expect(page.locator('.ability-recommendations')).toHaveAttribute('data-entry-level',String(n));await expect(page.locator('.ability-recommendations')).toContainText('合成家长设置验证课');expect(protectedData(await database(page))).toEqual(before)}
 await page.context().setOffline(true);await level(page,1).click();await level(page,2).click();await limit(page,20).click();await expect(limit(page,20)).toHaveAttribute('aria-pressed','true');expect((await database(page)).abilityLevel).toBe('L2');await page.context().setOffline(false)
 // The learn page now exposes the applied settings through its effective-settings line.
 await go(page,'learn');await expect(page.locator('.study-effective-line')).toContainText('L2');await expect(page.locator('.current-course-card')).toBeVisible()
 await page.reload();expect((await database(page)).abilityLevel).toBe('L2');expect(protectedData(await database(page))).toEqual(before)
})

test('保存失败恢复最后成功选择并显示错误，重试成功才显示已保存与已生效',async({page})=>{
 await seed(page);await unlock(page);await limit(page,5).click();const before=await database(page)
 await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).parentSettingsFail=true;Storage.prototype.setItem=function(key,value){if((window as any).parentSettingsFail&&key==='wordpal.database.v2')throw new Error('Synthetic quota failure');return original.call(this,key,value)}})
 await limit(page,20).click();await expect(limit(page,5)).toHaveAttribute('aria-pressed','true');await expect(limit(page,20)).toHaveAttribute('aria-pressed','false');await expect(page.locator('.parent-learning-settings [role=alert]')).toContainText('设置未保存');await expect(page.locator('.parent-learning-settings [data-state="applied"]')).toHaveCount(0);expect(await database(page)).toEqual(before)
 await page.evaluate(()=>(window as any).parentSettingsFail=false);await limit(page,20).click();await expect(limit(page,20)).toHaveAttribute('aria-pressed','true');await expect(page.locator('.parent-learning-settings')).toContainText('已保存');await expect(page.locator('.parent-learning-settings [data-state="applied"]')).toHaveCount(2)
})

test('旧3迁移成5并保留L2、已有轮次和档案，刷新不重复迁移',async({page})=>{
 const db=fixture();delete db.parentSettingsVersion;delete db.parentSettingsUpdatedAt;db.dailyLimit=3 as any;db.abilityLevel='L2';db.session={id:'legacy-parent-session',date:'2026-10-06',startedAt:'2026-10-06T08:00:00Z',kind:'practice',wordIds:[ids[0]],index:0,mode:'spell',input:'draft',selected:'',revealed:false,answers:[]}
 await seed(page,db);await unlock(page);const saved=await database(page);expect(saved.dailyLimit).toBe(5);expect(saved.abilityLevel).toBe('L2');expect(saved.parentSettingsVersion).toBe(2);expect(protectedData(saved)).toEqual(protectedData(db));await page.reload();expect(await database(page)).toEqual(saved)
})

for(const theme of ['bento','swiss','soft','oled'])test(`${theme}家长设置手机平板、大字、高对比和减少动效可读`,async({page})=>{
 await setAppearance(page,theme,theme==='oled'?'dark':'light',{largeText:true,highContrast:true,reducedMotion:true});await seed(page);await unlock(page)
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await expect(page.getByRole('group',{name:'每日新词上限'}).getByRole('button')).toHaveCount(3);await expect(page.getByRole('group',{name:'能力起点'}).getByRole('button')).toHaveCount(5);const widths=await page.getByRole('group',{name:'能力起点'}).getByRole('button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));expect(Math.max(...widths)-Math.min(...widths)).toBeLessThanOrEqual(1)}
 mkdirSync('private/verification/parent-settings',{recursive:true});await page.screenshot({path:`private/verification/parent-settings/${theme}-1280.png`,fullPage:true})
})
