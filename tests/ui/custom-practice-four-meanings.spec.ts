import {test,expect} from '@playwright/test'
import {go,database,selectCustomModes,setAppearance,waitForArtwork} from './helpers'
import {customCourse} from '../helpers/custom-course'
import {freshDatabase} from '../../src/stores/profile'
for(const theme of ['clay','swiss'])test(`连接每题四个唯一词义含正确项，末组与暂停恢复正常 ${theme}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await setAppearance(page,theme,'light');await go(page,'learn');await page.locator('.study-practice-entry-button').click();await page.locator('.custom-count-input input').fill('5');await selectCustomModes(page,['connect']);await page.locator('.custom-action-bar').getByRole('button').click();const original=(await database(page)).customPractice.wordIds
 for(let index=0;index<5;index++){
  if(index===1){await page.getByRole('button',{name:'暂停练习',exact:true}).click();await page.reload();await page.locator('.study-practice-entry-button').click();await page.getByRole('button',{name:'继续上次自定义练习',exact:true}).click()}
  await expect.poll(async()=>(await database(page)).customPractice.index).toBe(index);const s=(await database(page)).customPractice,id=s.wordIds[index],options=page.getByRole('group',{name:'选择配对词义'}).locator('.answer-choice');await expect(options).toHaveCount(4);expect(new Set(await options.allTextContents()).size).toBe(4);await expect(options.filter({hasText:s.wordSnapshot[id].meaning})).toHaveCount(1);await expect(page.locator(`.custom-match-meanings [data-word-id="${id}"]`)).toBeVisible()
  if(index===4){await waitForArtwork(page);await page.screenshot({path:test.info().outputPath('four-meanings-tail.png'),fullPage:true})}
  await page.locator(`.custom-match-meanings [data-word-id="${id}"]`).click();await page.getByRole('button',{name:'确认答案 →',exact:true}).click();await expect.poll(async()=>{const next=(await database(page)).customPractice;return next.status==='completed'||next.index!==index}).toBe(true)
 }
 await expect(page.locator('[data-custom-screen=summary]')).toBeVisible();expect((await database(page)).customPractice.results.connect.completedWordIds).toEqual(original);expect((await database(page)).customPracticeCursors[0].nextOffset).toBe(5)
})
test('不足四个不同词义的教材仅禁用连接，保留其他可用模式',async({page})=>{
 const pack=customCourse('four-choice-small',3),db={...freshDatabase(),version:2,currentCourseId:pack.courseId,courseProgress:{[pack.courseId]:{currentLessonId:pack.courseId+'-l1',completedLessons:[],lastLessonAccuracy:null,checkAccuracy:{},checkAttempts:{}}},auxiliaryRecords:[]}
 await page.addInitScript(({pack,db})=>{const key='wordpal.content.pack.four-choice-small.0123456789abcdef';localStorage.setItem(key,JSON.stringify(pack));localStorage.setItem('wordpal.content.catalog.v2',JSON.stringify([{courseId:pack.courseId,key,archived:false,aliases:{}}]));localStorage.setItem('wordpal.database.v2',JSON.stringify(db));localStorage.setItem('wordpal.database.active.v2',JSON.stringify('v2'))},{pack,db});await go(page,'learn');await page.locator('.study-practice-entry-button').click();await expect(page.locator('.custom-config [data-mode=connect]')).toBeDisabled();await expect(page.locator('.custom-config [data-mode=connect]')).toHaveAttribute('aria-label',/4 个不同词义/);await expect(page.locator('.custom-config [data-mode=flash]')).toBeEnabled();await expect(page.locator('.custom-action-bar').getByRole('button')).toBeEnabled()
})
