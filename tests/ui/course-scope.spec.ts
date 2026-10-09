import {test,expect} from '@playwright/test'
import {go,database} from './helpers'
test('三 Scope 浏览与课程学习独立，不提供无效 Unit',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordpal.test.synthetic-course','1'));await go(page,'review');const before=await database(page)
 const scopes=page.getByRole('group',{name:'单词本课程范围'}).getByRole('button');await expect(scopes).toHaveCount(3)
 await page.getByRole('button',{name:'全部已安装',exact:true}).click();await expect(page.locator('uni-picker[aria-label="选择浏览单元"]')).toHaveCount(0)
 await page.locator('.review-tabs .mode-button').filter({hasText:'所有单词'}).click();await page.locator('.wordbook-search input').fill('合成单元二');await expect(page.locator('.review-row')).toHaveCount(1);await expect(page.locator('.review-row')).toContainText('amber')
 expect(await database(page)).toEqual(before)
})
