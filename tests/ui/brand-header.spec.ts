import {test,expect} from '@playwright/test'
import {go,setAppearance,seedDatabase,database} from './helpers'
import {goldenDatabase} from './fixtures'

for(const scale of [1.25,1.6])test(`顶部品牌字体按 ${scale} 比例放大，窄屏灵石保留完整读屏信息`,async({page})=>{
 await setAppearance(page,'swiss','light',{largeText:scale===1.25});await seedDatabase(page,{...goldenDatabase(),gems:999999})
 for(const width of [320,390,600,840]){
  await page.setViewportSize({width,height:900});await go(page,'home')
  if(scale===1.6){await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=1.6})}
  const header=page.locator('.wp-brand-header');await expect.poll(()=>header.locator('.brand-name').evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeCloseTo((width<360?22:width<600?24:26)*scale,1)
  const positions=await header.evaluate(h=>{const brand=h.querySelector('.compact-brand')!.getBoundingClientRect(),actions=h.querySelector('.topbar-actions')!.getBoundingClientRect(),subtitle=h.querySelector('.brand-subtitle')!,s=getComputedStyle(subtitle);return {overlap:brand.right>actions.left&&brand.top<actions.bottom&&actions.top<brand.bottom,stacked:actions.top>=brand.bottom,font:parseFloat(s.fontSize),height:h.getBoundingClientRect().height}})
  expect(positions.overlap).toBe(false);expect(positions.font).toBeCloseTo((width<360?12:width<600?13:14)*scale,1);if(width===320)expect(positions.stacked).toBe(true)
  await expect(header.locator('.gem-chip')).toHaveAttribute('aria-label','灵石余额 999999，查看灵石说明');await expect(header.locator('.spirit-stone-count')).toHaveText('99.99万');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }
})

test('原生顶部安全区只计入一次，旋转尺寸改变后按新窗口适配',async({page})=>{
 await page.setViewportSize({width:390,height:844});await go(page,'home');const before=await database(page)
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.safeTop=39})
 const header=page.locator('.wp-brand-header');await expect.poll(()=>header.evaluate(h=>h.getBoundingClientRect().height)).toBe(107)
 expect(await header.evaluate(h=>parseFloat(getComputedStyle(h).paddingTop))).toBe(47)
 await page.setViewportSize({width:844,height:390});await expect.poll(()=>header.evaluate(h=>h.getBoundingClientRect().height)).toBe(115);expect(await header.locator('.brand-logo').evaluate(n=>n.getBoundingClientRect().width)).toBe(60)
 await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.safeTop=0});await expect.poll(()=>header.evaluate(h=>h.getBoundingClientRect().height)).toBe(76);expect(await database(page)).toEqual(before)
})

test('精灵屋紧凑Header避开39px原生安全区，手机横竖屏均完整显示标题',async({page})=>{
 await go(page,'pet');await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.safeTop=39})
 for(const width of [359,390,844]){await page.setViewportSize({width,height:900});const bounds=await page.locator('.wp-brand-header').evaluate(header=>{const h=header.getBoundingClientRect(),title=header.querySelector('.brand-name')!.getBoundingClientRect(),logo=header.querySelector('.brand-logo')!.getBoundingClientRect();return{top:title.top,bottom:title.bottom,headerBottom:h.bottom,logoTop:logo.top}});expect(bounds.top).toBeGreaterThanOrEqual(39);expect(bounds.logoTop).toBeGreaterThanOrEqual(39);expect(bounds.bottom).toBeLessThanOrEqual(bounds.headerBottom);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
})

for(const mode of ['light','dark'])test(`精灵屋奶油主题 ${mode} 灵石余额沿用蓝灰文字与页面表面配色`,async({page})=>{
 await setAppearance(page,'clay',mode);await go(page,'pet')
 const colors=await page.locator('.spirit-stone-badge').evaluate(badge=>{
  const style=getComputedStyle(badge),reference=document.createElement('span');reference.style.color='var(--lh-ink)';reference.style.backgroundColor='var(--lh-surface)';reference.style.borderColor='var(--lh-line)';badge.append(reference);const palette=getComputedStyle(reference),expected={color:palette.color,background:palette.backgroundColor,border:palette.borderTopColor};reference.remove()
  return {actual:{color:getComputedStyle(badge.querySelector('.spirit-stone-count')!).color,background:style.backgroundColor,border:style.borderTopColor},expected}
 })
 expect(colors.actual).toEqual(colors.expected)
})
