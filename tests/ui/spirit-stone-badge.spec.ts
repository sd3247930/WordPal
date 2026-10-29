import {previewSnack} from './helpers'
import {test,expect} from '@playwright/test'
import {go,setAppearance,seedDatabase,database} from './helpers'
import {goldenDatabase} from './fixtures'

for(const theme of ['swiss','clay'])for(const mode of ['light','dark'])test(`${theme} ${mode} 顶部水晶五页同源、八档宽度及200%字体不遮挡`,async({page})=>{
 test.setTimeout(90000)
 await setAppearance(page,theme,mode);await seedDatabase(page,{...goldenDatabase(),gems:13});await page.setViewportSize({width:390,height:844})
 for(const screen of ['home','learn','pet','review','settings']){
  await go(page,screen);await expect(page.locator('.wp-brand-header')).toHaveCount(1);await expect(page.locator('.spirit-stone-badge')).toHaveAttribute('aria-label','灵石余额 13，查看灵石说明')
  await page.locator('.wp-brand-header img').evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode().catch(()=>{}))))
  await expect(page.locator('.spirit-stone-icon img')).toHaveJSProperty('naturalWidth',128)
  await expect(page.locator('.wp-blue-diamond-fallback')).toHaveCount(0)
  await page.locator('.wp-brand-header').screenshot({path:test.info().outputPath(`${screen}-${theme}-${mode}-390.png`)})
 }
 const before=await database(page)
 for(const scale of [1,2])for(const width of [320,360,390,600,768,840,1024,1280]){
  await page.setViewportSize({width,height:900})
  await page.evaluate(async scale=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=scale},scale)
  const metrics=await page.locator('.wp-brand-header').evaluate(header=>{
   const brand=header.querySelector('.compact-brand')!.getBoundingClientRect(),badge=header.querySelector('.spirit-stone-badge')!.getBoundingClientRect(),icon=header.querySelector('.spirit-stone-icon')!.getBoundingClientRect()
   return {overlap:brand.left<badge.right&&brand.right>badge.left&&brand.top<badge.bottom&&brand.bottom>badge.top,width:badge.width,height:badge.height,icon:icon.width,overflow:document.documentElement.scrollWidth>innerWidth+1}
  })
  expect(metrics.overlap).toBe(false);expect(metrics.overflow).toBe(false);expect(metrics.width).toBeGreaterThanOrEqual(48);expect(metrics.height).toBeGreaterThanOrEqual(48);expect(metrics.icon).toBeGreaterThanOrEqual(28)
 }
 expect(await database(page)).toEqual(before)
})

test('点击水晶和整个徽章统一高亮，连续点击不叠层，Esc/遮罩关闭后焦点恢复且档案不变',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seedDatabase(page,{...goldenDatabase(),gems:12800});await go(page,'home');const before=await database(page),badge=page.locator('.spirit-stone-badge')
 await badge.locator('.spirit-stone-icon').click();await expect(badge).toHaveClass(/icon-highlighted/);await expect(page.getByRole('dialog',{name:'我的灵石'})).toHaveCount(1);await expect(page.locator('.spirit-stone-full-balance')).toHaveText('12800')
 await expect(page.locator('.spirit-stone-detail-icon img')).toHaveJSProperty('naturalWidth',192)
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'关闭灵石说明'})).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('.spirit-stone-panel')).toHaveCount(0);await expect(badge).toBeFocused();await expect(badge).toHaveAttribute('aria-pressed','false')
 await badge.evaluate(element=>{for(let i=0;i<5;i++)element.dispatchEvent(new MouseEvent('click',{bubbles:true}))});await expect(page.locator('.spirit-stone-panel')).toHaveCount(1)
 const box=await badge.boundingBox();await page.mouse.click(box!.x+box!.width/2,box!.y+box!.height/2);await expect(page.locator('.spirit-stone-panel')).toHaveCount(0);await expect(badge).toHaveAttribute('aria-pressed','false')
 expect(await database(page)).toEqual(before)
})

test('零余额可查看，图标缺失回退仍可点击；读取错误不显示假零',async({page})=>{
 await page.route('**/static/brand/blue-diamond-*.png',route=>route.abort());await seedDatabase(page,{...goldenDatabase(),gems:0});await go(page,'settings');const before=await database(page)
 await expect(page.locator('.wp-blue-diamond-fallback')).toBeVisible();await expect(page.locator('.spirit-stone-count')).toHaveText('0');await page.locator('.spirit-stone-badge').click();await expect(page.locator('.spirit-stone-full-balance')).toHaveText('0');await page.getByRole('button',{name:'关闭灵石说明'}).click()
 expect(await database(page)).toEqual(before)
 await page.evaluate(async()=>{const {useProfileStore}=await import('/src/stores/profile.ts' as string);useProfileStore().readOnly=true})
 await expect(page.locator('.spirit-stone-count')).toHaveText('—');await page.locator('.spirit-stone-badge').click();await expect(page.locator('.spirit-stone-full-balance')).toHaveText('暂时无法读取');expect(await database(page)).toEqual(before)
})

test('真实喂食消费后顶部及时更新，预览、说明与切页不产生额外扣费',async({page})=>{
 await seedDatabase(page,goldenDatabase());await go(page,'pet');const before=await database(page)
 await page.getByRole('group',{name:'宠物屋功能',exact:true}).getByRole('button',{name:'喂食',exact:true}).click()
 await previewSnack(page,1)
 expect(await database(page)).toEqual(before);await page.getByRole('button',{name:'确认分享 · 5 灵石',exact:true}).click();const after=await database(page)
 expect(after.gems).toBe(before.gems-5);await expect(page.locator('.spirit-stone-badge')).toHaveAttribute('aria-label',`灵石余额 ${after.gems}，查看灵石说明`)
 await page.locator('.spirit-stone-badge').click();await expect(page.locator('.spirit-stone-full-balance')).toHaveText(String(after.gems));await page.getByRole('button',{name:'关闭灵石说明'}).click();await go(page,'home');expect(await database(page)).toEqual(after)
})

test('20次主题切换、高对比和系统深色保持余额；长数字在200%窄屏完整可查',async({page})=>{
 test.setTimeout(60000)
 await page.setViewportSize({width:320,height:844});await seedDatabase(page,{...goldenDatabase(),gems:Number.MAX_SAFE_INTEGER});await go(page,'settings');const before=await database(page)
 for(let i=0;i<20;i++){
  const theme=i%2===0?'clay':'swiss';await page.locator(`.theme-choice[data-theme-choice="${theme}"]`).click();await expect(page.locator('.wp-app')).toHaveAttribute('data-theme',theme)
 }
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'})
 await page.evaluate(async()=>{const {useThemeStore}=await import('/src/stores/theme.ts' as string);const theme=useThemeStore();theme.settings.colorMode='system';theme.settings.highContrast=true;const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=2})
 await expect(page.locator('.wp-app')).toHaveAttribute('data-mode','dark');await expect(page.locator('.wp-app')).toHaveClass(/reduce-motion/)
 const badge=page.locator('.spirit-stone-badge');await expect(badge).toHaveAttribute('aria-label',`灵石余额 ${Number.MAX_SAFE_INTEGER}，查看灵石说明`)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 expect(await badge.locator('.spirit-stone-count').evaluate(element=>{const number=element.getBoundingClientRect(),button=element.closest('.spirit-stone-badge')!.getBoundingClientRect();return number.left>=button.left&&number.right<=button.right})).toBe(true)
 await badge.hover();await page.mouse.down();await expect.poll(()=>badge.evaluate(element=>getComputedStyle(element).transform)).toBe('none');await page.mouse.up();await expect(page.locator('.spirit-stone-full-balance')).toHaveText(String(Number.MAX_SAFE_INTEGER));await page.locator('.spirit-stone-panel').screenshot({path:test.info().outputPath('spirit-stone-long-balance.png')});await page.getByRole('button',{name:'关闭灵石说明'}).click();expect(await database(page)).toEqual(before)
})
