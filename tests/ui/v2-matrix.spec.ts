import {test,expect} from '@playwright/test'
import {go,setAppearance,seedDatabase,waitForArtwork} from './helpers'
import {goldenDatabase} from './fixtures'
const windows=[
 {name:'android-phone',width:412,height:915},{name:'iphone',width:393,height:852},
 {name:'android-tablet-portrait',width:800,height:1280},{name:'android-tablet-landscape',width:1280,height:800},
 {name:'ipad-portrait',width:834,height:1194},{name:'ipad-landscape',width:1194,height:834},{name:'ipad-split',width:507,height:1024}
]
for(const theme of ['swiss'])for(const size of windows)test(theme+' / '+size.name+' 五页窗口模拟',async({page})=>{
 test.setTimeout(90000)
 await page.clock.install({time:new Date('2026-10-04T08:00:00Z')});await page.setViewportSize(size)
 await setAppearance(page,theme,theme==='oled'?'dark':'light');await seedDatabase(page,goldenDatabase())
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 for(const screen of ['home','learn','pet','review','settings']){
  await go(page,screen)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(size.width<600)await expect(page.locator('.bottom-nav')).toBeVisible()
  else{await expect(page.locator('.bottom-nav')).toBeHidden();await expect(page.locator('.sidebar')).toBeVisible()}
  await waitForArtwork(page);await expect(page).toHaveScreenshot('v2-'+screen+'-'+theme+'-'+size.name+'.png',{fullPage:true,animations:'disabled'})
 }
 expect(errors).toEqual([])
})
