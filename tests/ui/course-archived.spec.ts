import {test,expect} from '@playwright/test'
import {go,database} from './helpers'

const ARCHIVED='wordpal.content.archive.synthetic-archived-course'

test('归档教材：显示「已归档」角标，主按钮变为「恢复并使用」并一步完成',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('wordpal.test.synthetic-course','1')
  localStorage.setItem('wordpal.content.archive.synthetic-archived-course','true')
 })
 await page.setViewportSize({width:390,height:844})
 await go(page,'learn')
 await page.getByRole('button',{name:'选择教材',exact:true}).click()

 const card=page.locator('.course-gallery-card').filter({hasText:'合成归档教材'}).first()
 await expect(card).toContainText('已归档')
 await card.click()
 await expect(page.locator('.course-review-panel')).toContainText('合成归档教材')

 // 待核对 + 已归档：仍必须先勾选确认
 const restore=page.getByRole('button',{name:'恢复并使用',exact:true})
 await expect(restore).toBeDisabled()
 await expect(page.getByRole('button',{name:'确认并应用',exact:true})).toHaveCount(0)
 await page.locator('.course-review-panel .course-check').first().click()
 await expect(restore).toBeEnabled()

 // Record the toast payload directly: uni's H5 toast auto-dismisses and its DOM node is timing dependent.
 await page.evaluate(()=>{
  const w=window as unknown as {uni:{showToast:(o:unknown)=>unknown};__toasts:string[]}
  w.__toasts=[]
  const original=w.uni.showToast
  w.uni.showToast=(option:unknown)=>{w.__toasts.push(String((option as {title?:string})?.title||''));return original.call(w.uni,option)}
 })
 await restore.click()
 await expect(page.locator('.current-course-card')).toContainText('合成归档教材')
 const toasts=await page.evaluate(()=>(window as unknown as {__toasts:string[]}).__toasts.join('|'))
 expect(toasts).toContain('已恢复')
 expect((await database(page)).currentCourseId).toBe('synthetic-archived-course')
 expect(await page.evaluate(key=>localStorage.getItem(key),ARCHIVED)).toBe('false')
})
