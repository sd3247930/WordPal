import {test,expect} from '@playwright/test'
import {go,database} from './helpers'

// The synthetic course is public test content and is only registered when the page
// opts in, so it never changes the product course list outside this spec.
test('合成教材：点击立即应用，无待核对标记，学习页与单词本同步',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordpal.test.synthetic-course','1'))
 await go(page,'learn')
 await expect(page.locator('.current-course-card')).toContainText('原创启蒙课程')
 await page.getByRole('button',{name:'选择教材',exact:true}).click()
 await expect(page.locator('.course-gallery-heading')).toContainText('选择教材')

 const card=page.locator('.course-gallery-card').filter({hasText:'合成测试教材'})
 await expect(card).not.toContainText('待核对')
 await card.click()

 await expect(page.locator('.current-course-card')).toContainText('合成测试教材')
 await expect(page.locator('.current-course-card')).not.toContainText('待核对')
 expect((await database(page)).currentCourseId).toBe('synthetic-classroom')

 await go(page,'review')
 await expect(page.locator('.wordbook-course-filters')).toContainText('合成测试教材')
 await page.locator('.review-tabs .mode-button').filter({hasText:'所有单词'}).click()
 await expect(page.locator('.review-row')).toHaveCount(3)
 await expect(page.locator('.review-row').filter({hasText:'grove'})).toContainText('合成单元一')
})
