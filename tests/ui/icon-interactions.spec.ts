import {test,expect,type Locator} from '@playwright/test'
import {go,database,seedDatabase,setAppearance,openCustomPractice} from './helpers'
import {freshDatabase} from '../../src/stores/profile'

async function toggleImage(tile:Locator){
 if(await tile.getAttribute('aria-pressed')==='true')await tile.click()
 const picture=tile.locator('img').first();if(await picture.count())await picture.click();else await tile.click()
 await expect(tile).toHaveAttribute('aria-pressed','true');await expect(tile).toHaveClass(/icon-highlighted/);await expect(tile).toHaveAttribute('data-icon-highlight','true')
 await tile.click();await expect(tile).toHaveAttribute('aria-pressed','false');await expect(tile).not.toHaveClass(/icon-highlighted/)
}
test('首页任务图片点击与反选不启动学习、不改完成状态',async({page})=>{
 await page.setViewportSize({width:390,height:844});await go(page,'home');const before=await database(page)
 for(const tile of await page.locator('.task-icon').all())await toggleImage(tile)
 await expect(page.locator('.task-check')).toHaveCount(0);expect(await database(page)).toEqual(before);await page.locator('.task-icon').first().focus();await page.keyboard.press('Enter');await expect(page.locator('.task-icon').first()).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Space');await expect(page.locator('.task-icon').first()).toHaveAttribute('aria-pressed','false')
})
for(const width of [390,1024])test(`${width} 五页导航可取消图标高亮并保持当前页，随后仍可正常切页`,async({page})=>{
 await page.setViewportSize({width,height:900});await go(page,'home');const before=await database(page)
 for(const [screen,label]of [['home','首页'],['learn','学习'],['pet','宠物屋'],['review','单词本'],['settings','设置']]){
  const nav=width<600?page.getByRole('navigation',{name:'底部导航'}):page.getByRole('navigation',{name:'主要导航'})
  const button=nav.getByRole('button',{name:label,exact:true});if(!page.url().includes(`/pages/${screen}/`))await button.click()
  await expect(page).toHaveURL(new RegExp(`/pages/${screen}/index`));await expect(button).toHaveAttribute('aria-current','page');await expect(button).toHaveAttribute('aria-pressed','true');await button.locator('.wp-nav-icon').click();await expect(button).toHaveAttribute('aria-pressed','false');await expect(button).not.toHaveClass(/icon-highlighted/);await expect(button).toHaveAttribute('aria-current','page');await expect(page).toHaveURL(new RegExp(`/pages/${screen}/index`));await button.click();await expect(button).toHaveAttribute('aria-pressed','true')
 }
 expect(await database(page)).toEqual(before)
})
test('学习题型保留有效模式、选择题可真正取消，取消不会提交答案或发奖',async({page})=>{
 await seedDatabase(page,{...freshDatabase(),abilityLevel:'L5'});await go(page,'learn');await openCustomPractice(page)
 const group=page.getByRole('group',{name:'选择学习方式'}),connect=group.locator('[data-mode="connect"]');if(await connect.getAttribute('aria-pressed')!=='true')await connect.click();const before=await database(page)
 await connect.locator('img').click();await expect(connect).toHaveAttribute('aria-pressed','false');expect((await database(page)).session.mode).toBe('connect');await connect.click();await expect(connect).toHaveAttribute('aria-pressed','true');await expect(page.locator('.study-mode-check')).toHaveCount(0)
 const answer=page.locator('.answer-choice').first();await answer.click();await expect(answer).toHaveAttribute('aria-pressed','true');expect((await database(page)).session.selected).not.toBe('');await answer.click();await expect(answer).toHaveAttribute('aria-pressed','false');expect((await database(page)).session.selected).toBe('');await expect(page.getByRole('button',{name:'确认答案 →',exact:true})).toBeDisabled()
 const after=await database(page);for(const field of ['cards','history','practiceAnswers','gems','pets','rewardIds'])expect(after[field]).toEqual(before[field])
})
test('宠物屋当前功能重复点击保持选中，取消点心预览不会扣费',async({page})=>{const db=freshDatabase();db.gems=20;await seedDatabase(page,db);await go(page,'pet');const before=await database(page),feed=page.getByRole('group',{name:'宠物屋功能'}).getByRole('button',{name:'喂食',exact:true});await feed.click();await page.locator('.food-choice').nth(1).click();await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.locator('.feed-preview')).toHaveCount(0);await feed.click();await expect(feed).toHaveAttribute('aria-pressed','true');await expect(page.locator('.pet-feed-panel')).toBeVisible();expect(await database(page)).toEqual(before)})

test('单词本统计图标及已学条件可反选，取消高亮不改变统计与课程',async({page})=>{
 await go(page,'review');const before=await database(page),counts=await page.locator('.familiarity-state-count').allTextContents();for(const tile of await page.locator('.familiarity-state').all())await toggleImage(tile)
 const current=page.getByRole('button',{name:'当前教材',exact:true});await current.click();await expect(current).toHaveAttribute('aria-pressed','false');expect(await page.locator('.familiarity-state-count').allTextContents()).toEqual(counts);await current.click();await expect(current).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'全部单词',exact:true}).click();const learned=page.getByRole('button',{name:'只看已学',exact:true});await learned.click();await expect(learned).toHaveAttribute('aria-pressed','true');await learned.click();await expect(learned).toHaveAttribute('aria-pressed','false');await expect(page.locator('.wordbook-learned-dot')).toHaveCount(0);expect(await database(page)).toEqual(before)
})
test('设置预览与明暗选项重复点击保持真实选中状态和已保存配置',async({page})=>{
 await setAppearance(page,'swiss','light');await page.setViewportSize({width:390,height:844});await go(page,'settings');const before=await database(page);const preview=page.locator('[data-theme-choice="swiss"]');await preview.click();await expect(preview).toHaveAttribute('aria-pressed','true');await expect(preview).toHaveAttribute('aria-current','true');await preview.click();const dark=page.getByRole('group',{name:'明暗模式',exact:true}).getByRole('button',{name:'深色',exact:true});await dark.click();await expect(dark).toHaveAttribute('aria-pressed','true');await dark.click();await expect(dark).toHaveAttribute('aria-pressed','true');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.appearance.v1')!).colorMode)).toBe('dark');await expect(page.locator('.wp-app')).toHaveAttribute('data-mode','dark');await dark.click();await expect(dark).toHaveAttribute('aria-pressed','true');expect(await database(page)).toEqual(before)
})
