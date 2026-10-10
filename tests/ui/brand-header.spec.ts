import {test,expect} from '@playwright/test'
import {go,setAppearance,seedDatabase,database} from './helpers'
import {goldenDatabase} from './fixtures'

for(const scale of [1.25,1.6])test(`顶部品牌字体按 ${scale} 比例放大，窄屏灵石换行保留完整信息`,async({page})=>{
 await setAppearance(page,'bento','light',{largeText:scale===1.25});await seedDatabase(page,{...goldenDatabase(),gems:999999})
 for(const width of [320,390,600,840]){
  await page.setViewportSize({width,height:900});await go(page,'home')
  if(scale===1.6){await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=1.6})}
  const header=page.locator('.wp-brand-header');await expect.poll(()=>header.locator('.brand-name').evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeCloseTo((width<360?22:width<600?24:26)*scale,1)
  const positions=await header.evaluate(h=>{const brand=h.querySelector('.compact-brand')!.getBoundingClientRect(),actions=h.querySelector('.topbar-actions')!.getBoundingClientRect(),subtitle=h.querySelector('.brand-subtitle')!,s=getComputedStyle(subtitle);return {overlap:brand.right>actions.left&&brand.top<actions.bottom&&actions.top<brand.bottom,stacked:actions.top>=brand.bottom,font:parseFloat(s.fontSize),height:h.getBoundingClientRect().height}})
  expect(positions.overlap).toBe(false);expect(positions.font).toBeCloseTo((width<360?13:14)*scale,1);if(width===320)expect(positions.stacked).toBe(true)
  await expect(header.locator('.gem-chip')).toContainText('999999 灵石');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }
})

test('原生顶部安全区只计入一次，旋转尺寸改变后按新窗口适配',async({page})=>{
 await page.setViewportSize({width:390,height:844});await go(page,'home');const before=await database(page)
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.safeTop=39})
 const header=page.locator('.wp-brand-header');await expect.poll(()=>header.evaluate(h=>h.getBoundingClientRect().height)).toBe(111)
 expect(await header.evaluate(h=>parseFloat(getComputedStyle(h).paddingTop))).toBe(47)
 await page.setViewportSize({width:844,height:390});await expect.poll(()=>header.evaluate(h=>h.getBoundingClientRect().height)).toBe(119);expect(await header.locator('.brand-logo').evaluate(n=>n.getBoundingClientRect().width)).toBe(64)
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.safeTop=0});await expect.poll(()=>header.evaluate(h=>h.getBoundingClientRect().height)).toBe(80);expect(await database(page)).toEqual(before)
})
