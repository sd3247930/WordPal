import {test,expect} from '@playwright/test'
import {go,setAppearance,database,completeDaily} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
import {initialProgress} from '../../src/services/storage/MigrationV1toV2'

for(const state of ['selected','missing-textbook','completed'] as const)test(`发布审查入口 ${state}`,async({page})=>{
 test.setTimeout(90000)
 await setAppearance(page,'clay','light',{reducedMotion:true});await page.setViewportSize({width:390,height:844})
 const db={...freshDatabase(),version:2 as const,currentCourseId:state==='missing-textbook'?'synthetic-not-installed':'starter',courseProgress:{starter:initialProgress('starter')},auxiliaryRecords:[]}
 if(state==='completed')db.abilityLevel='L1'
 await page.addInitScript(db=>{if(localStorage.getItem('wordpal.database.active.v2'))return;localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},db)
 await go(page,'home')
 if(state==='completed'){await page.locator('.hero-cta').click();await completeDaily(page);await go(page,'home')}
 const before=await database(page);await page.locator('.hero-cta').click()
 if(state==='completed'){
  await expect(page.locator('.study-completion')).toBeVisible();expect(await database(page)).toEqual(before)
 }else{
  const card=page.locator('.study-main .wp-word-card').first();await expect(card).toBeVisible();await page.locator('.study-stat-action').last().click();await page.waitForTimeout(350)
  const box=await card.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThan(752)
  expect((await database(page)).currentCourseId).toBe('starter')
 }
})
