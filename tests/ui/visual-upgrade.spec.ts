import {test,expect} from '@playwright/test'
import {go,setAppearance,seedDatabase,database,openExploration,openCustomPractice} from './helpers'
import {goldenDatabase} from './fixtures'
test('四宠正式插画和选择卡接入真实成长，点心外观不改变排程',async({page})=>{
 const db=goldenDatabase();db.gems=10;await seedDatabase(page,db);await go(page,'pet')
 await expect(page.locator('.wp-pet-card')).toHaveCount(4)
 const images=page.locator('.wp-pet-card .pet-cutout-image img');await expect(images).toHaveCount(4)
 for(const [index,element]of ['water','fire','earth','wind'].entries())await expect(images.nth(index)).toHaveAttribute('src',new RegExp(element+'-juvenile[.]png$'))
 await page.locator('.pet-action-tab').filter({hasText:'喂食'}).click()
 const before=await database(page);await page.locator('.food-choice').filter({hasText:'风之羽'}).click();expect(await database(page)).toEqual(before)
 await page.locator('.pet-choice').filter({hasText:'祝融'}).click();await page.locator('.pet-growth .wp-button').filter({hasText:'预览分享小点心'}).click();await page.locator('.confirm-feed').click()
 const after=await database(page);expect(after.cards).toEqual(before.cards);expect(after.history).toEqual(before.history);expect(after.gems).toBe(5);expect(after.pets.fire.exp).toBe(before.pets.fire.exp)
 await expect(page.locator('.notice')).toContainText('风之羽已分享')
})
test('学习以单词为焦点，宠物只在正确反馈出现，跟读不评分',async({page})=>{
 await go(page,'home');await page.locator('.hero-cta').click();await openCustomPractice(page);await page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:/^闪现，/}).click();await expect(page.locator('.learning-pet-feedback')).toHaveCount(0);await expect(page.locator('.word-picture img')).toHaveJSProperty('naturalWidth',512);await expect(page.locator('.word-picture-fallback')).toHaveCount(0)
 await expect(page.locator('.pronunciation-practice')).toHaveCount(0)
 await page.locator('.answer-actions .wp-button').filter({hasText:'开始自评'}).click();await expect(page.locator('.word-picture img')).toHaveJSProperty('naturalWidth',512)
 await openExploration(page);await expect(page.locator('.pronunciation-practice')).toContainText('录音仅本地临时播放')
 await page.locator('.rating-grid .wp-button').filter({hasText:'记住了'}).click();await expect(page.locator('.learning-pet-feedback')).toBeVisible()
 await page.locator('.answer-feedback .wp-button').click();await expect(page.locator('.learning-pet-feedback')).toHaveCount(0)
})
test('主题和导航保持数据库快照，深色模式无白色大卡片',async({page})=>{
 await seedDatabase(page,goldenDatabase());await go(page,'home');const before=await database(page)
 await go(page,'settings');await page.getByRole('group',{name:'明暗模式',exact:true}).getByRole('button',{name:'深色',exact:true}).click();await go(page,'home')
 expect(await database(page)).toEqual(before)
 const colors=await page.locator('.wp-card').evaluateAll(cards=>cards.map(card=>getComputedStyle(card).backgroundColor))
 for(const color of colors){const rgb=color.match(/\d+/g)!.slice(0,3).map(Number);expect(Math.max(...rgb)).toBeLessThan(90)}
})
test('320 像素与大字体：学习控件至少 48 像素，其余核心控件至少 56 像素且无溢出',async({page})=>{
 await setAppearance(page,'swiss','light',{largeText:true,reducedMotion:true});await seedDatabase(page,goldenDatabase())
 for(const width of [320,600,840,1600]){await page.setViewportSize({width,height:900});for(const screen of ['home','learn','pet']){await go(page,screen);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const minimum=screen==='learn'?48:56;const small=await page.locator('[role=button]:visible').evaluateAll((buttons,minimum)=>buttons.filter(b=>b.getBoundingClientRect().height<minimum).map(b=>({text:b.textContent,className:b.className,height:b.getBoundingClientRect().height})),minimum);expect(small,`${width} ${screen} ${JSON.stringify(small)}`).toEqual([])}}
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
