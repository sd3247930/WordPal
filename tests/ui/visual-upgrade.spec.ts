import {test,expect} from '@playwright/test'
import {go,setAppearance,seedDatabase,database} from './helpers'
import {goldenDatabase} from './fixtures'
test('四宠正式插画和选择卡接入真实成长，点心外观不改变排程',async({page})=>{
 const db=goldenDatabase();db.gems=10;await seedDatabase(page,db);await go(page,'pet')
 await expect(page.locator('.wp-pet-card')).toHaveCount(4)
 const images=page.locator('.wp-pet-card .pet-image img');await expect(images).toHaveCount(4)
 for(const [index,element]of ['water','fire','earth','wind'].entries())await expect(images.nth(index)).toHaveAttribute('src',new RegExp('/static/pets/avatars/'+element+'.png'))
 await page.locator('.pet-current-hero .companion-link').click()
 const before=await database(page);await page.locator('.food-choice').filter({hasText:'风之羽'}).click();expect(await database(page)).toEqual(before)
 await page.locator('.pet-choice').filter({hasText:'小焰'}).click();await page.locator('.pet-growth .wp-button').filter({hasText:'预览分享小点心'}).click();await page.locator('.confirm-feed').click()
 const after=await database(page);expect(after.cards).toEqual(before.cards);expect(after.history).toEqual(before.history);expect(after.gems).toBe(5);expect(after.pets.fire.exp).toBe(before.pets.fire.exp)
 await expect(page.locator('.notice')).toContainText('风之羽已分享')
})
test('学习以单词为焦点，宠物只在正确反馈出现，跟读不评分',async({page})=>{
 await go(page,'home');await page.locator('.hero-cta').click();await expect(page.locator('.learning-pet-feedback')).toHaveCount(0);await expect(page.locator('.word-illustration')).toHaveCount(0)
 await expect(page.locator('.pronunciation-practice')).toContainText('录音仅本地临时播放')
 await page.locator('.answer-actions .wp-button').filter({hasText:'查看答案'}).click();await expect(page.locator('.word-illustration')).toBeVisible()
 await page.locator('.rating-grid .wp-button').filter({hasText:'记住了'}).click();await expect(page.locator('.learning-pet-feedback')).toBeVisible()
 await page.locator('.answer-feedback .wp-button').click();await expect(page.locator('.learning-pet-feedback')).toHaveCount(0)
})
test('主题和导航保持数据库快照，夜读无白色大卡片',async({page})=>{
 await seedDatabase(page,goldenDatabase());await go(page,'home');const before=await database(page)
 await go(page,'settings');await page.locator('.theme-choice').filter({hasText:'夜读星幕'}).click();await go(page,'home')
 expect(await database(page)).toEqual(before)
 const colors=await page.locator('.wp-card').evaluateAll(cards=>cards.map(card=>getComputedStyle(card).backgroundColor))
 for(const color of colors){const rgb=color.match(/\d+/g)!.slice(0,3).map(Number);expect(Math.max(...rgb)).toBeLessThan(90)}
})
test('320 像素、大字体与超宽屏的核心控件至少 56 像素且无溢出',async({page})=>{
 await setAppearance(page,'soft','light',{largeText:true,reducedMotion:true});await seedDatabase(page,goldenDatabase())
 for(const width of [320,600,840,1600]){await page.setViewportSize({width,height:900});for(const screen of ['home','learn','pet']){await go(page,screen);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const heights=await page.locator('[role=button]:visible').evaluateAll(buttons=>buttons.map(b=>b.getBoundingClientRect().height));expect(Math.min(...heights)).toBeGreaterThanOrEqual(56)}}
})
test('双栏平板的学习数据与复习优先级各占一张可见卡片',async({page})=>{
 await seedDatabase(page,goldenDatabase())
 for(const width of [600,840,1100]){
  await page.setViewportSize({width,height:900});await go(page,'home')
  const data=await page.locator('.home-data').boundingBox(),priority=await page.locator('.home-priority').boundingBox()
  expect(data).not.toBeNull();expect(priority).not.toBeNull()
  expect(data!.width).toBeGreaterThan(150);expect(data!.height).toBeGreaterThan(200)
  expect(priority!.x).toBeGreaterThanOrEqual(data!.x+data!.width)
  await expect(page.locator('.home-data')).toContainText('今日正确率')
 }
})

