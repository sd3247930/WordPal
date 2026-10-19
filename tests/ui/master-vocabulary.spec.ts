import {answerParentGate,unlockParent as openParentSettings} from './helpers'
import {openCustomPractice} from './helpers'
import {test,expect,type Page} from '@playwright/test'
import {go,database,seedDatabase} from './helpers'
import {freshDatabase} from '../../src/stores/profile'
test.skip(process.env.WORDPAL_TEST_LOCAL_CONTENT!=='1','此组验证需要本机词库；公开检出使用合成领域测试。')
async function select(page:Page,label:string,text:string){await page.locator('uni-picker[aria-label="'+label+'"] .course-picker').click();const menu=page.locator('.uni-picker-container').filter({visible:true});await menu.locator('.uni-picker-select .uni-picker-item').filter({hasText:text}).click()}
/** The learn page no longer hosts the selector block; every switch goes through the gallery. */
async function primary(page:Page){
 await go(page,'learn')
 await page.getByRole('button',{name:'选择教材',exact:true}).click()
 await page.getByRole('button',{name:/^出版社 \/ 版本 \/ 起点筛选/}).click()
 await select(page,'筛选教材出版社','人教版社区索引')
 await select(page,'筛选教材年级','3 年级')
 await select(page,'筛选教材册次','上册')
 await page.locator('.course-gallery-card').filter({hasText:'小学英语 · 3年级上册（社区索引）'}).click()
 await expect(page.locator('.current-course-card')).toContainText('小学英语 · 3年级上册（社区索引）')
}
async function openUnit(page:Page,unit:string){
 await page.getByRole('button',{name:'选择教材',exact:true}).click()
 await page.locator('.course-unit-row').filter({hasText:unit}).first().getByRole('button',{name:'从这一单元开始'}).click()
}
test('本机12册筛选、6单元和独立起点可用，手机平板不溢出',async({page})=>{
 await primary(page);await expect(page.locator('.current-course-card')).not.toContainText('待核对');await expect(page.locator('.current-course-card')).toContainText('L2');expect((await database(page)).currentCourseId).toBe('primary-community-e1-g3-s1')
 await openUnit(page,'Unit 6');await expect(page.locator('.study-heading')).toContainText('Birthdays');expect((await database(page)).courseProgress['primary-community-e1-g3-s1'].currentLessonId).toBe('u06-l01')
 for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,720]]){await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
 await page.reload();await expect(page.locator('.study-heading')).toContainText('Birthdays');expect((await database(page)).history).toHaveLength(0)
})
test('本机离线音频听写、拼写、错误回看刷新恢复，正式记录仅写一次',async({page,context,baseURL})=>{
 await seedDatabase(page,{...freshDatabase(),abilityLevel:'L5'})
 const external:string[]=[];page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(baseURL!).origin)external.push(r.url())})
 await primary(page);await page.getByRole('button',{name:'开始今日学习',exact:true}).click();const audio=page.getByRole('button',{name:'播放当前单词的标准发音'});await expect(audio).toBeEnabled();await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'听写'}).click();await expect(audio).toContainText('正在播放');await expect(audio).toContainText('再听一次',{timeout:5000})
 await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'拼写'}).click();await page.getByRole('textbox',{name:'输入中文对应的英文单词'}).fill('wrong');await page.reload();await expect(page.getByRole('textbox',{name:'输入中文对应的英文单词'})).toHaveValue('wrong')
 // Load the packaged clip once, then verify playback without network access.
 await audio.click();await expect(audio).toContainText('正在播放');await expect(audio).toContainText('听发音',{timeout:5000});await context.setOffline(true);await audio.click();await expect(audio).toContainText('正在播放');await expect(audio).toContainText('听发音',{timeout:5000});await context.setOffline(false)
 for(let i=0;i<5;i++){await openCustomPractice(page);await page.locator('.mode-button').filter({hasText:'拼写'}).click();await page.getByRole('textbox',{name:'输入中文对应的英文单词'}).fill('wrong');await page.getByRole('button',{name:'确认答案 →',exact:true}).click();await page.locator('.answer-feedback').getByRole('button').click()}
 await expect(page.locator('.study-estimate')).toHaveText('本轮错词回看');const before=await database(page);expect(before.history).toHaveLength(5);await page.reload();await expect(page.locator('.study-estimate')).toHaveText('本轮错词回看');expect((await database(page)).cards).toEqual(before.cards);expect(external).toEqual([])
})
test('限时练习显式开始、切页暂停、重启可继续，课程本机使用限制可见',async({page})=>{
 await primary(page);const before=await database(page);await page.getByRole('button',{name:'闪电判断',exact:true}).click();await expect(page.getByRole('button',{name:'准备好，开始计时',exact:true})).toBeVisible();await page.getByRole('button',{name:'准备好，开始计时',exact:true}).click();await expect(page.getByRole('button',{name:'暂停计时',exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'准备好，开始计时',exact:true})).toBeVisible();expect((await database(page)).cards).toEqual(before.cards);expect((await database(page)).history).toEqual(before.history)
 await page.getByRole('button',{name:'收起练习',exact:true}).click();await go(page,'parent');await answerParentGate(page);const item=page.locator('.course-item').filter({hasText:'小学英语 · 3年级上册（社区索引）'});await item.getByRole('button',{name:'导出课程包',exact:true}).click();await expect(page.locator('.course-management')).toContainText('仅允许本机使用')
})
