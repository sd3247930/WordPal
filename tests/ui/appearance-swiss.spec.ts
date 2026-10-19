import {test,expect} from '@playwright/test'
import {go,app,setAppearance,seedDatabase,database} from './helpers'
import {goldenDatabase} from './fixtures'

const appearanceKey='wordpal.appearance.v1'
for(const legacy of ['bento','soft','oled'])test(`${legacy} 旧外观自动迁移为瑞士，双主题入口不改学习记录`,async({page})=>{
 await setAppearance(page,legacy,'dark',{largeText:true,reducedMotion:true,highContrast:true,screenReaderLabels:false})
 await seedDatabase(page,goldenDatabase());await go(page,'home');const before=await database(page)
 await go(page,'settings')
 await expect(app(page)).toHaveAttribute('data-theme','swiss');await expect(app(page)).toHaveAttribute('data-mode','dark')
 await expect(page.getByRole('group',{name:'外观主题',exact:true})).toContainText('瑞士专注主题')
 await expect(page.locator('.appearance-theme')).toHaveCount(1);await expect(page.locator('.theme-choice')).toHaveCount(2);await expect(page.locator('[data-theme-choice="swiss"]')).toHaveAttribute('aria-current','true')
 for(const name of ['便当任务岛','柔和宠物屋','夜读星幕'])await expect(page.getByText(name,{exact:true})).toHaveCount(0)
 const expected={themeId:'swiss',colorMode:'dark',largeText:true,reducedMotion:true,highContrast:true,screenReaderLabels:false,dynamicColor:false}
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),appearanceKey)).toEqual(expected)
 await page.reload();await expect(app(page)).toHaveAttribute('data-theme','swiss')
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),appearanceKey)).toEqual(expected)
 expect(await database(page)).toEqual(before)
})

test('瑞士外观明暗、跟随系统和辅助显示可操作并持久化',async({page})=>{
 await go(page,'settings');const before=await database(page)
 await expect(app(page)).toHaveAttribute('data-theme','swiss')
 const mode=page.getByRole('group',{name:'明暗模式',exact:true})
 await mode.getByRole('button',{name:'深色',exact:true}).click();await expect(app(page)).toHaveAttribute('data-mode','dark')
 await mode.getByRole('button',{name:'浅色',exact:true}).click();await expect(app(page)).toHaveAttribute('data-mode','light')
 await mode.getByRole('button',{name:'跟随系统',exact:true}).click()
 await page.emulateMedia({colorScheme:'dark'});await expect(app(page)).toHaveAttribute('data-mode','dark')
 await page.emulateMedia({colorScheme:'light'});await expect(app(page)).toHaveAttribute('data-mode','light')
 for(const label of ['减少动效','大字体','高对比度','屏幕阅读器提示'])await page.getByLabel(label,{exact:true}).click()
 await expect(app(page)).toHaveClass(/large-text/);await expect(app(page)).toHaveClass(/reduce-motion/)
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),appearanceKey)
 expect(saved).toEqual({themeId:'swiss',colorMode:'system',reducedMotion:true,largeText:true,highContrast:true,screenReaderLabels:false,dynamicColor:false})
 await page.reload();expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),appearanceKey)).toEqual(saved)
 expect(await database(page)).toEqual(before)
 await expect(page.getByLabel('动态色',{exact:true})).toHaveAttribute('disabled','true')
})

for(const mode of ['light','dark'])test(`瑞士${mode} 五页在手机平板及大字体中布局一致，保留宠物场景与学习记录`,async({page})=>{
 test.setTimeout(90000)
 await setAppearance(page,'swiss',mode,{largeText:true,reducedMotion:true});await seedDatabase(page,goldenDatabase())
 await page.addInitScript(()=>localStorage.setItem('wordpal.pethouse.appearance.v1',JSON.stringify({sceneId:'fire'})))
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await go(page,'home');const before=await database(page)
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:900})
  for(const screen of ['home','learn','pet','review','settings']){
   await go(page,screen);await expect(app(page)).toHaveAttribute('data-theme','swiss');await expect(app(page)).toHaveAttribute('data-mode',mode)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   if(screen==='settings'){
    await expect(page.locator('.appearance-theme')).toContainText('瑞士专注主题')
    const bounds=await page.locator('.appearance-theme').evaluate(el=>({overflow:el.scrollWidth>el.clientWidth+1,text:getComputedStyle(el).color,width:el.clientWidth,scroll:el.scrollWidth,children:Array.from(el.querySelectorAll('*')).filter(n=>n.getBoundingClientRect().right>el.getBoundingClientRect().right).map(n=>({class:n.className,width:n.getBoundingClientRect().width,right:n.getBoundingClientRect().right}))}))
    expect(bounds.overflow,JSON.stringify(bounds)).toBe(false)
    if([390,1280].includes(width))await page.screenshot({path:test.info().outputPath(`settings-${mode}-${width}.png`),fullPage:true})
   }
  }
 }
 expect(await database(page)).toEqual(before)
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.pethouse.appearance.v1')!).sceneId)).toBe('fire')
 expect(errors).toEqual([])
})
