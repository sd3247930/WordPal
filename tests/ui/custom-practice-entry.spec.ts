import {test,expect} from '@playwright/test'
import {selectCustomModes,go,database} from './helpers'
import {openTasks} from './lifehouse-helpers'
test('宠物屋拼写入口打开新配置，实际额外答题不创建正式每日计划',async({page})=>{
 await go(page,'pet');await openTasks(page);await page.getByRole('button',{name:'试一试拼写或听写',exact:true}).click();await expect(page.locator('[data-custom-screen="config"]')).toBeVisible();expect((await database(page)).courseProgress.starter.dailyPlan).toBeUndefined();await selectCustomModes(page,['spell']);await page.getByRole('button',{name:'开始练习',exact:true}).click();await page.locator('.spelling-input input').fill('cat');await page.getByRole('button',{name:'确认答案 →',exact:true}).click();const db=await database(page);expect(db.courseProgress.starter.dailyPlan).toBeUndefined();expect(db.history).toHaveLength(0);expect(db.practiceAnswers).toHaveLength(1);expect(db.cards).toEqual({});expect(db.session).toBeNull()
})
test('已有正式任务时宠物屋隐藏额外练习入口，继续后保留词表、阶段和完成集合',async({page})=>{
 await go(page,'home');await page.locator('.hero-cta').click();await page.locator('.rating-grid').getByRole('button').nth(2).click();await page.locator('.answer-feedback').getByRole('button').click();const before=(await database(page)).courseProgress.starter.dailyPlan;await go(page,'pet');await openTasks(page);await expect(page.getByRole('button',{name:'试一试拼写或听写',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'一起去学习',exact:true}).click();await expect(page.locator('[data-custom-screen="config"]')).toHaveCount(0);await expect(page.locator('.study-round-tools')).toBeDisabled();await expect(page.locator('.daily-step.active')).toContainText('闪现');expect((await database(page)).courseProgress.starter.dailyPlan).toEqual(before)
})
