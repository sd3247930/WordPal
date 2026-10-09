import {test,expect} from '@playwright/test'
import {go,database} from './helpers'

// The synthetic course is public test content and is only registered when the page
// opts in, so it never changes the product course list outside this spec.
test('合成教材：选择 → 待核对确认 → 应用 → 学习页与单词本同步',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordpal.test.synthetic-course','1'))
 await go(page,'learn')
 await expect(page.locator('.current-course-card')).toContainText('原创启蒙课程')
 await page.getByRole('button',{name:'选择教材',exact:true}).click()
 await expect(page.locator('.course-gallery-heading')).toContainText('选择教材')

 const card=page.locator('.course-gallery-card').filter({hasText:'合成测试教材'})
 await expect(card).toContainText('待核对')
 await card.click()
 await expect(page.locator('.course-review-panel')).toContainText('社区索引')
 await expect(page.locator('.course-review-panel')).toContainText('3 词')

 const confirm=page.getByRole('button',{name:'确认并应用',exact:true})
 await expect(confirm).toBeDisabled()
 await page.locator('.course-review-panel .course-check').click()
 await expect(confirm).toBeEnabled()
 await confirm.click()

 await expect(page.locator('.current-course-card')).toContainText('合成测试教材')
 await expect(page.locator('.current-course-card')).toContainText('待核对')
 expect((await database(page)).currentCourseId).toBe('synthetic-classroom')

 await go(page,'review')
 await expect(page.locator('.wordbook-course-filters')).toContainText('合成测试教材')
 await page.locator('.review-tabs .mode-button').filter({hasText:'所有单词'}).click()
 await expect(page.locator('.review-row')).toHaveCount(3)
 await expect(page.locator('.review-row').first()).toContainText('合成单元一')
})

test('单词本指定册次可浏览其他教材，不影响学习课程',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordpal.test.synthetic-course','1'))
 await go(page,'review')
 await page.locator('.wordbook-course-filters .wp-segment').filter({hasText:'指定册次'}).click()
 await page.locator('uni-picker[aria-label="选择浏览教材"] .course-picker').click()
 await page.locator('.uni-picker-container').filter({visible:true}).locator('.uni-picker-select .uni-picker-item').filter({hasText:'合成测试教材'}).click()
 await page.locator('uni-picker[aria-label="选择浏览单元"] .course-picker').click()
 await page.locator('.uni-picker-container').filter({visible:true}).locator('.uni-picker-select .uni-picker-item').filter({hasText:'合成单元二'}).click()
 await page.locator('.review-tabs .mode-button').filter({hasText:'所有单词'}).click()
 await expect(page.locator('.review-row')).toHaveCount(1)
 await expect(page.locator('.review-row').first()).toContainText('amber')
 expect((await database(page)).currentCourseId).toBe('starter')
})
