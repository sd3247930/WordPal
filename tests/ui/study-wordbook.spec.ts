import {test,expect} from '@playwright/test'
import {go,seedDatabase,setAppearance,database} from './helpers'
import {goldenDatabase} from './fixtures'
import {freshDatabase} from '../../src/stores/profile'
test('自动混合五种题型，错词回流刷新后保留，不二次排程或发奖',async({page})=>{
 // Daily pool is whole-course now; pin the round to 5 new words so the 5-mode rotation stays exact.
 await seedDatabase(page,{...freshDatabase(),abilityLevel:'L5',dailyLimit:5})
 await go(page,'home');await page.locator('.hero-cta').click()
 await expect(page.locator('.auto-mode-button')).toContainText('自动编排中')
 // L5 自动轮换顺序为 听写 → 拼写 → 听音 → 连接 → 闪现，目标词依次是 cat/dog/fish/bird/duck。
 await expect(page.locator('.mode-button.selected')).toContainText('听写');await page.locator('.spelling-input input').fill('cat');await page.locator('.answer-actions .wp-button').filter({hasText:'确认答案'}).click();await page.locator('.answer-feedback .wp-button').click()
 await expect(page.locator('.mode-button.selected')).toContainText('拼写');await page.locator('.spelling-input input').fill('dog');await page.locator('.answer-actions .wp-button').filter({hasText:'确认答案'}).click();await page.locator('.answer-feedback .wp-button').click()
 await expect(page.locator('.mode-button.selected')).toContainText('听音');await page.locator('.answer-choice').filter({hasText:'fish'}).click();await page.locator('.answer-actions .wp-button').filter({hasText:'确认答案'}).click();await page.locator('.answer-feedback .wp-button').click()
 await expect(page.locator('.mode-button.selected')).toContainText('连接');await page.locator('.answer-choice').filter({hasText:'鸟'}).click();await page.locator('.answer-actions .wp-button').filter({hasText:'确认答案'}).click();await page.locator('.answer-feedback .wp-button').click()
 await expect(page.locator('.mode-button.selected')).toContainText('闪现');await page.locator('.answer-actions .wp-button').filter({hasText:'查看答案'}).click();await page.locator('.rating-grid .wp-button').filter({hasText:'再学一次'}).click();await page.locator('.answer-feedback .wp-button').click()
 await expect(page.locator('.session-header')).toContainText('错词回看');const before=await database(page);expect(before.history).toHaveLength(5);expect(before.lessonIndex).toBe(1)
 await page.locator('.spelling-input input').fill('du');await page.reload();await expect(page.locator('.spelling-input input')).toHaveValue('du')
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.spelling-input input')).toHaveValue('du');await page.locator('.spelling-input input').fill('duck');await page.locator('.answer-actions .wp-button').filter({hasText:'确认答案'}).click();await page.locator('.answer-feedback .wp-button').click()
 await expect(page.locator('.completion')).toContainText('+62 XP');expect(await database(page)).toEqual(before);await page.reload();await expect(page.locator('.completion')).toBeVisible();expect(await database(page)).toEqual(before)
})
test('英文、中文、单元搜索；重点、稍后、Sheet 焦点与跨窗口状态',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seedDatabase(page,goldenDatabase());await go(page,'review');const before=await database(page)
 await page.locator('.review-tabs .mode-button').filter({hasText:'所有单词'}).click();await page.locator('.wordbook-search input').fill('CAT');await expect(page.locator('.review-row')).toHaveCount(1)
 await page.locator('.wordbook-search input').fill('猫');await expect(page.locator('.review-row')).toHaveCount(1);await page.locator('.review-row').click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('.detail-word')).toHaveText('cat')
 await expect(page.getByRole('button',{name:'关闭单词详情'})).toBeFocused();await page.getByRole('button',{name:'标记为我的重点',exact:true}).click();await page.getByRole('button',{name:/^更多记忆信息/}).click();await page.getByRole('button',{name:'稍后再看',exact:true}).click();expect(await database(page)).toEqual(before)
 await page.setViewportSize({width:768,height:1024});await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.detail-word')).toHaveText('cat');await expect(page.locator('.wordbook-search input')).toHaveValue('猫')
 await page.setViewportSize({width:390,height:844});await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.review-row')).toBeFocused()
 await page.getByRole('button',{name:'清空单词搜索'}).click();await page.locator('.wordbook-search input').fill('探索单元 1');await expect(page.locator('.review-row')).toHaveCount(10)
 await page.getByRole('button',{name:'清空单词搜索'}).click();await page.locator('.review-tabs .mode-button').filter({hasText:'重点复习'}).click();await expect(page.locator('.wordbook-focus-legend')).toContainText('我的重点 1');await page.reload();await page.locator('.review-tabs .mode-button').filter({hasText:'重点复习'}).click();await expect(page.locator('.review-row').filter({hasText:'cat'})).toContainText('我的重点')
 expect(await database(page)).toEqual(before)
})
test('导航高清图标五种语义独立、主题切换稳定且资源完整',async({page})=>{
 await page.setViewportSize({width:390,height:844});await go(page,'home');const images=page.locator('.bottom-nav .wp-nav-icon img');await expect(images).toHaveCount(5)
 const sources=await images.evaluateAll(nodes=>nodes.map(node=>(node as HTMLImageElement).src));expect(new Set(sources).size).toBe(5)
 for(const image of await images.all()){await expect(image).toHaveAttribute('src',/\/static\/icons\/nav\/hd-/);await expect(image).toHaveJSProperty('naturalWidth',1024);await expect(image).toHaveJSProperty('naturalHeight',1024)}
 await go(page,'settings');await page.getByRole('group',{name:'明暗模式',exact:true}).getByRole('button',{name:'深色',exact:true}).click();await go(page,'home');await expect(page.locator('.wp-app')).toHaveAttribute('data-mode','dark');expect(await images.evaluateAll(nodes=>nodes.map(node=>(node as HTMLImageElement).src))).toEqual(sources)
})
const windows=[{name:'phone-portrait',width:390,height:844},{name:'phone-landscape',width:844,height:390},{name:'tablet-portrait',width:768,height:1024},{name:'tablet-landscape',width:1024,height:768},{name:'tablet-wide',width:1280,height:800},{name:'split-narrow',width:600,height:900},{name:'split-wide',width:900,height:900}]
test('手机首屏可完整看到连接提交与闪现评分，不被导航覆盖',async({page})=>{
 await page.setViewportSize({width:390,height:844});await go(page,'home');await page.locator('.hero-cta').click()
 await page.locator('.answer-actions .wp-button').filter({hasText:'查看答案'}).click();const nav=await page.locator('.bottom-nav').boundingBox();const ratings=await page.locator('.rating-grid').boundingBox();expect(ratings!.y+ratings!.height).toBeLessThanOrEqual(nav!.y)
 await page.locator('.rating-grid .wp-button').filter({hasText:'记住了'}).click();await page.locator('.answer-feedback .wp-button').click();await page.locator('.answer-choice').filter({hasText:'狗'}).click();const action=await page.locator('.answer-actions .wp-button').filter({hasText:'确认答案'}).boundingBox();expect(action!.y+action!.height).toBeLessThanOrEqual(nav!.y)
})
for(const theme of ['swiss'])for(const size of windows)test(`${theme} ${size.name} 单词详情与搜索截图`,async({page})=>{
 await page.clock.install({time:new Date('2026-10-04T08:00:00Z')});await page.setViewportSize(size);await setAppearance(page,theme,theme==='oled'?'dark':'light',{largeText:size.name==='split-narrow'});await seedDatabase(page,goldenDatabase());await go(page,'review')
 await page.locator('.wordbook-search input').fill('cat');await page.locator('.review-row').click();await expect(page.locator('.detail-word')).toHaveText('cat');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy()
 // Full-page baselines start at the same document and panel scroll positions after click-to-focus.
 await page.evaluate(()=>{window.scrollTo(0,0);document.querySelectorAll('.word-detail-panel,.sidebar').forEach(e=>e.scrollTop=0)})
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0)
 await expect(page).toHaveScreenshot(`wordbook-detail-${theme}-${size.name}.png`,{fullPage:true,animations:'disabled'})
})
