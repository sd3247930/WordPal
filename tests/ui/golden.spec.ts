import {test,expect} from '@playwright/test'
import {setAppearance,seedDatabase,go,app} from './helpers'
import {goldenDatabase} from './fixtures'
const sizes=[{name:'compact',width:390,height:844},{name:'medium',width:768,height:1024},{name:'expanded',width:1100,height:900}]
for(const theme of ['swiss'])for(const mode of ['light','dark'])for(const size of sizes){
 test(`${theme} ${mode} ${size.name} 全局主题截图`,async({page})=>{
  await page.clock.install({time:new Date('2026-10-03T08:00:00Z')})
  await page.setViewportSize(size);await setAppearance(page,theme,mode);await seedDatabase(page,goldenDatabase())
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  for(const screen of ['home','learn','review','pet','achievements','parent','settings']){
   await go(page,screen);await expect(app(page)).toHaveAttribute('data-theme',theme);await expect(app(page)).toHaveAttribute('data-mode',mode)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy()
   await expect(page).toHaveScreenshot(`${screen}-${theme}-${mode}-${size.name}.png`,{fullPage:true,animations:'disabled'})
  }
  expect(errors).toEqual([])
 })
}
