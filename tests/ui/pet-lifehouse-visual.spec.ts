import {test,expect} from '@playwright/test'
import {setAppearance,seedDatabase,go,waitForArtwork} from './helpers'
import {goldenDatabase} from './fixtures'
for(const mode of ['light','dark'])for(const size of [{name:'compact',width:390,height:844},{name:'medium',width:768,height:1024},{name:'expanded',width:1100,height:900}])test('精灵屋 V2 '+mode+' '+size.name+' 视觉基线',async({page})=>{
 await page.clock.install({time:new Date('2026-10-03T08:00:00Z')});await page.setViewportSize(size);await setAppearance(page,'swiss',mode);await seedDatabase(page,goldenDatabase());await go(page,'pet');await waitForArtwork(page);await expect(page).toHaveScreenshot(`lifehouse-v2-swiss-${mode}-${size.name}.png`,{fullPage:true,animations:'disabled'})
})
