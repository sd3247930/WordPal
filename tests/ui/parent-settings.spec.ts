import {test,expect,type Page} from '@playwright/test'
import {go,database,seedDatabase,unlockParent,setAppearance} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {newCard} from '../../packages/srs_fsrs'
const level=(page:Page,n:number)=>page.getByRole('radio',{name:new RegExp('L'+n)})
for(const [n,count]of [[1,5],[2,5],[3,10],[4,15],[5,20]])test(`L${n}保存后正式任务按教材顺序分配${count}词，不混入其他到期词`,async({page})=>{
 const db=freshDatabase();db.cards.cat=newCard('cat',new Date('2000-01-01'));await seedDatabase(page,db);await unlockParent(page,false);const before=await database(page);await level(page,n).click();await expect(level(page,n)).toHaveAttribute('aria-checked','true');await expect(page.locator('.level-effective')).toContainText(`每批${count}词`);expect((await database(page)).cards).toEqual(before.cards);expect((await database(page)).history).toEqual(before.history)
 await go(page,'home');await page.locator('.hero-cta').click();const saved=await database(page),plan=saved.courseProgress.starter.dailyPlan;expect(plan.wordIds).toHaveLength(count);expect(plan.wordIds[0]).toBe('cat');expect(plan.flow.entryLevel).toBe(n);expect(plan.wordSources.cat).toBe('review_due');expect(saved.cards).toEqual(before.cards)
})
test('任务开始后L3切L5提示下一批生效，刷新与重新进入保留原进度',async({page})=>{
 await go(page,'home');await page.locator('.hero-cta').click();await page.locator('.rating-grid').getByRole('button').nth(2).click();await page.locator('.answer-feedback').getByRole('button').click();const before=await database(page),plan=before.courseProgress.starter.dailyPlan;await unlockParent(page,false);await level(page,5).click();await expect(page.locator('.level-effective')).toContainText('下一批');await page.reload();await unlockParent(page,false);await expect(level(page,5)).toHaveAttribute('aria-checked','true');await go(page,'learn');expect((await database(page)).courseProgress.starter.dailyPlan).toEqual(plan);expect((await database(page)).history).toEqual(before.history)
})
test('L1→L5→L2离线保存和重载保留，不切教材或更改学习记录',async({page,context})=>{
 await unlockParent(page,false);const before=await database(page);await context.setOffline(true);for(const n of [1,5,2]){await level(page,n).click();await expect(level(page,n)).toHaveAttribute('aria-checked','true');expect((await database(page)).abilityLevel).toBe('L'+n)}await context.setOffline(false);await page.reload();await unlockParent(page,false);await expect(level(page,2)).toHaveAttribute('aria-checked','true');const saved=await database(page);for(const key of ['cards','history','pets','currentCourseId'])expect(saved[key]).toEqual(before[key])
})
test('保存失败保留上次选择与数据，重试成功才更改等级',async({page})=>{
 await unlockParent(page,false);await level(page,1).click();const before=await database(page);await page.evaluate(()=>{const original=Storage.prototype.setItem;(window as any).failLevelSave=true;Storage.prototype.setItem=function(key,value){if((window as any).failLevelSave&&key.startsWith('wordpal.database.'))throw Error('Synthetic quota');return original.call(this,key,value)}});await level(page,5).click();await expect(level(page,1)).toHaveAttribute('aria-checked','true');await expect(page.locator('.parent-learning-settings [role=alert]')).toBeVisible();expect(await database(page)).toEqual(before);await page.evaluate(()=>(window as any).failLevelSave=false);await level(page,5).click();await expect(level(page,5)).toHaveAttribute('aria-checked','true');await expect(page.locator('.parent-learning-settings [role=alert]')).toHaveCount(0)
})
test('旧上限迁移为单一等级来源，保留L2和历史SRS，重载不重复迁移',async({page})=>{
 const db=freshDatabase();db.abilityLevel='L2';db.dailyLimit=3 as any;delete db.parentSettingsVersion;delete db.parentSettingsUpdatedAt;db.cards.cat=newCard('cat',new Date('2040-01-01'));await seedDatabase(page,db);await unlockParent(page,false);const saved=await database(page);expect(saved.dailyLimit).toBeUndefined();expect(saved.parentSettingsVersion).toBe(3);expect(saved.abilityLevel).toBe('L2');expect(saved.cards).toEqual(db.cards);expect(saved.history).toEqual(db.history);await page.reload();expect(await database(page)).toEqual(saved)
})
test('五张整行等级卡片在手机平板、大字、高对比下可读，无已删除控件',async({page})=>{
 await setAppearance(page,'swiss','dark',{largeText:true,highContrast:true,reducedMotion:true});await unlockParent(page,false)
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(page.getByRole('radiogroup',{name:'学习等级'}).getByRole('radio')).toHaveCount(5);await expect(page.getByRole('group',{name:'每日新词上限',exact:true})).toHaveCount(0);await expect(page.getByText('课程建议',{exact:true})).toHaveCount(0)}
})
