import {startIndependentStudy} from './helpers'
import {test,expect} from '@playwright/test'
import {freshDatabase} from '../../src/stores/profile'
import {go,seedDatabase,setAppearance,openCustomPractice,database} from './helpers'

for(const large of [false,true])test(`左右卡大字作用域与提示关闭输入保持，系统缩放=${!large} 大字=${large}`,async({page})=>{
 await page.setViewportSize({width:320,height:800});await setAppearance(page,'swiss','light',{largeText:large});await seedDatabase(page,{...freshDatabase(),abilityLevel:'L5',gems:10});await go(page,'home');await startIndependentStudy(page);const daily=(await database(page)).courseProgress.starter.dailyPlan
 await openCustomPractice(page);await page.getByRole('group',{name:'选择学习方式'}).getByRole('button',{name:/^拼写，/}).click()
 if(!large)await page.evaluate(async()=>{const {windowLayout}=await import('/src/services/window/index.ts' as string);windowLayout.fontScale=1.6})
 await expect.poll(async()=>(await page.locator('.wp-app').boundingBox())!.width).toBe(320)
 await expect(page.locator('.word-core .word')).toHaveText('···');await expect(page.locator('.word-core .ipa')).toHaveCount(0);await expect(page.locator('.meaning')).toHaveText('猫');await expect(page.locator('.word-primary-card .meaning')).toHaveText('猫')
 const image=await page.locator('.word-picture-stage').boundingBox(),meaning=await page.locator('.meaning').boundingBox();expect(meaning!.x).toBeGreaterThan(image!.x+image!.width)
 await page.getByRole('button',{name:/^(?:查看)?提示/}).click();await expect(page.locator('.study-hint')).toContainText('首字母是 c');await page.getByRole('button',{name:'收起提示',exact:true}).click();await page.locator('.spelling-input input').fill('cat');await expect(page.locator('.study-hint')).toHaveCount(0);await page.getByRole('button',{name:'再看提示',exact:true}).click();expect((await database(page)).gems).toBe(9);await expect(page.locator('.word-core .word')).toHaveText('···')
 expect((await database(page)).courseProgress.starter.dailyPlan).toEqual(daily);expect((await database(page)).history).toHaveLength(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
