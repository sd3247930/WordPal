import {test,expect} from '@playwright/test'
import fs from 'node:fs/promises'
import {go,setAppearance,seedDatabase,database,openStudyOverview} from './helpers'
import {freshDatabase} from '../../src/stores/profile'

for(const theme of ['swiss','clay'])test(`${theme} 首页进入与本轮定位的真实点击路径`,async({page})=>{
 await setAppearance(page,theme,'light',{reducedMotion:true});await seedDatabase(page,freshDatabase());await page.setViewportSize({width:390,height:844});await go(page,'home')
 const result=[]
 for(const state of ['fresh','resume']){
  await page.locator('.hero-cta').click();const card=page.locator('.study-main .wp-word-card').first();await expect(card).toBeVisible();await page.waitForTimeout(250)
  const measure=()=>card.evaluate(el=>{const r=el.getBoundingClientRect(),nav=document.querySelector('.bottom-nav')?.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight,navTop:nav?.top,visibleHeight:Math.max(0,Math.min(r.bottom,nav?.top||innerHeight)-Math.max(0,r.top))}})
  const first=await measure();await openStudyOverview(page);await page.locator('.study-stat-action').last().click();await page.waitForTimeout(350);const second=await measure()
  expect(second.visibleHeight).toBeGreaterThan(0);result.push({state,clicks:2,first,second});const before=await database(page);await go(page,'home');expect(await database(page)).toEqual(before)
 }
 await fs.mkdir('.tmp/theme-clay-b',{recursive:true});await fs.writeFile(`.tmp/theme-clay-b/entry-${theme}.json`,JSON.stringify(result,null,2))
})
