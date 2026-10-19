import {openCustomPractice} from './helpers'
import {test,expect} from '@playwright/test'
import {go,setAppearance,seedDatabase,database} from './helpers'
import {goldenDatabase} from './fixtures'
import {freshDatabase} from '../../src/stores/profile'

test('五页 Header、设置命名和底栏图标胶囊统一',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 for(const [screen,subtitle]of [['home','Home'],['learn','Study'],['pet','PetHouse'],['review','Wordbook'],['settings','Settings']]){
  await go(page,screen)
  await expect(page.locator('.topbar .brand-name')).toHaveText('WordPal')
  await expect(page.locator('.brand-subtitle')).toHaveText(subtitle)
  expect(await page.locator('.bottom-item').evaluateAll(items=>items.map(i=>i.getAttribute('aria-label')))).toEqual(['首页','学习','宠物屋','单词本','设置'])
  const active=page.locator('.bottom-item.active')
  expect(await active.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  expect(await active.locator('.nav-icon-container').evaluate(e=>getComputedStyle(e).backgroundImage)).not.toBe('none')
  await expect(active.locator('.nav-icon-container')).toHaveCSS('border-top-width','1px')
  await expect(active.locator('.bottom-label')).toHaveCSS('font-weight','700')
  expect(await active.evaluate(e=>getComputedStyle(e,'::after').borderWidth)).toBe('0px')
 }
})

for(const theme of ['swiss'])test(theme+' 首页首屏能看到任务行和主动作',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,theme,theme==='oled'?'dark':'light');await go(page,'home')
 const nav=(await page.locator('.bottom-nav').boundingBox())!,task=(await page.locator('.home-today .task').first().boundingBox())!
 expect(task.y+task.height).toBeLessThan(nav.y)
 expect((await page.locator('.home-companion').boundingBox())!.height).toBeLessThan(270)
 expect((await page.locator('.hero-cta').boundingBox())!.y).toBeLessThan(nav.y)
 const portrait=page.locator('.home-companion .companion-portrait')
 expect((await portrait.boundingBox())!.width).toBeGreaterThan(112)
 await expect(portrait.locator('img')).toHaveJSProperty('complete',true)
 expect(await portrait.locator('img').evaluate((image:HTMLImageElement)=>image.naturalWidth)).toBeGreaterThanOrEqual(512)
})

test('学习模式一行排列，词卡与主动作可滚动完整显示',async({page})=>{
 await seedDatabase(page,{...freshDatabase(),abilityLevel:'L5'})
 await page.setViewportSize({width:390,height:844});await go(page,'home');await page.locator('.hero-cta').click()
 // Custom flash practice keeps the primary action and word card deterministic.
 await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'闪现'}).click()
 await expect(page.locator('.study-mode-selector .mode-button')).toHaveCount(5)
 const boxes=await page.locator('.study-mode-selector .mode-button').evaluateAll(items=>items.map(i=>i.getBoundingClientRect().top))
 expect(new Set(boxes).size).toBe(1)
 await page.getByRole('button',{name:'查看答案',exact:true}).scrollIntoViewIfNeeded()
 const nav=(await page.locator('.bottom-nav').boundingBox())!,action=(await page.getByRole('button',{name:'查看答案',exact:true}).boundingBox())!
 expect(action.y+action.height).toBeLessThan(nav.y)
 await expect(page.locator('.wp-word-card .word')).toHaveText('cat')
})

test('宠物主列表使用紧凑头像，点击更新当前伙伴与成长入口',async({page})=>{
 await page.setViewportSize({width:390,height:844});await go(page,'pet')
 await expect(page.locator('.wp-pet-card .avatar')).toHaveCount(4)
 await expect(page.locator('.pet-scene')).toBeVisible()
 const heights=await page.locator('.wp-pet-card').evaluateAll(items=>items.map(i=>i.getBoundingClientRect().height))
 expect(Math.max(...heights)).toBeLessThan(180)
 await page.locator('.pet-choice').filter({hasText:'祝融'}).click()
 await expect(page.locator('.current-pet-hero')).toBeVisible()
 expect((await database(page)).companion).toBe('fire')
 await expect(page.locator('.current-pet-hero')).toContainText('祝融')
})

test('零到期词本没有禁用大动作，并能浏览全部单词',async({page})=>{
 await go(page,'review');await expect(page.locator('.review-clear')).toContainText('当前范围没有到期复习')
 await expect(page.getByRole('button',{name:/开始到期复习/})).toHaveCount(0)
 await page.getByRole('button',{name:'浏览全部单词',exact:true}).click()
 await expect(page.locator('.review-tabs .selected')).toContainText('所有单词')
 await expect(page.locator('.review-tabs .mode-button')).toHaveCount(4)
})

test('六个设置区块与声音触感偏好独立保存，不改变学习数据',async({page})=>{
 await seedDatabase(page,goldenDatabase());await go(page,'settings');const before=await database(page)
 for(const name of ['外观','学习','声音与触感','数据与隐私','关于 WordPal'])await expect(page.locator('.settings-main').getByText(name,{exact:true}).first()).toBeVisible()
 await expect(page.locator('.settings-pet')).toContainText('宠物 · 当前陪伴');await expect(page.locator('.appearance-theme')).toHaveCount(1);await expect(page.locator('.appearance-theme')).toContainText('瑞士专注主题')
 await page.getByLabel('学习发音',{exact:true}).click();await page.getByLabel('正确回答轻震动',{exact:true}).click()
 await expect(page.getByRole('button',{name:'试听发音',exact:true})).toBeDisabled()
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.feedback.v1')!))).toEqual({sound:false,haptics:false})
 expect(await database(page)).toEqual(before)
 await page.reload();await expect(page.getByRole('button',{name:'试听发音',exact:true})).toBeDisabled()
})
