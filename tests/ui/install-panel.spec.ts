import {test,expect} from '@playwright/test'
import {go,seedDatabase,setAppearance,database} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {WORDPAL_APK_URL} from '../../src/services/install'
for(const screen of [{width:320,height:700,largeText:true},{width:390,height:844,largeText:false},{width:1280,height:800,largeText:false}])for(const theme of ['swiss','clay'])test(`安装入口与备份导航 ${theme}-${screen.width}`,async({page})=>{
 await page.setViewportSize(screen);await setAppearance(page,theme,'light',{largeText:screen.largeText});await seedDatabase(page,freshDatabase())
 for(const route of ['home','learn','pet','review','settings']){
  await go(page,route)
  if(route==='pet'&&screen.width<600){await expect(page.getByRole('button',{name:'安装 WordPal',exact:true})).toBeHidden();continue}
  const trigger=page.getByRole('button',{name:'安装 WordPal',exact:true}),gem=page.locator('.spirit-stone-badge'),buttonBox=await trigger.boundingBox(),gemBox=await gem.boundingBox()
  expect(buttonBox!.x+buttonBox!.width).toBeLessThanOrEqual(gemBox!.x+1)
  expect(buttonBox!.height).toBeGreaterThanOrEqual(48)
  const before=await database(page)
  await trigger.click()
  const panel=page.getByRole('dialog',{name:'安装 WordPal',exact:true})
  await expect(panel).toBeVisible();await expect(panel.getByRole('link',{name:'📥 下载应用（APK）',exact:true})).toHaveAttribute('href',WORDPAL_APK_URL)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const bounds=await panel.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(screen.width+1)
  await page.keyboard.press('Escape');await expect(panel).toBeHidden();await expect(trigger).toBeFocused()
  expect(await database(page)).toEqual(before)
 }
 await page.getByRole('button',{name:'安装 WordPal',exact:true}).click()
 await page.getByRole('button',{name:'前往学习备份',exact:true}).click()
 await expect(page.locator('.parent-math-question')).toBeVisible()
 await expect(page.locator('.learning-backup-panel')).toHaveCount(0)
})
