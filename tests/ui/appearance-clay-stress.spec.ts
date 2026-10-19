import {test,expect} from '@playwright/test'
import {go,setAppearance,seedDatabase,openCustomPractice} from './helpers'
import {goldenDatabase} from './fixtures'

for(const mode of ['light','dark'])test(`clay ${mode} 200%文字压力下双卡和固定图标网格不溢出`,async({page})=>{
 test.setTimeout(90000);await setAppearance(page,'clay',mode,{reducedMotion:true});await seedDatabase(page,goldenDatabase())
 for(const width of [320,1280])for(const screen of ['settings','review','pet','learn','home']){
  await page.setViewportSize({width,height:1100});await go(page,screen)
  if(screen==='learn')await openCustomPractice(page)
  await page.addStyleTag({content:'.wp-app{--wp-font-body:32px!important;--wp-font-small:28px!important;--wp-font-caption:24px!important;--wp-font-card:34px!important;--wp-font-section:44px!important;--wp-font-title:60px!important}'})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${screen} ${width}`).toBe(true)
  for(const selector of ['.theme-choice','.wordbook-category-tile','.pet-action-tab','.study-mode-tile'])for(const tile of await page.locator(selector).all())expect(await tile.evaluate(node=>node.scrollWidth<=node.clientWidth+1),`${selector} ${width}`).toBe(true)
 }
})
