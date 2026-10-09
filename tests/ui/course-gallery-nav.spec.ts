import {test,expect} from '@playwright/test'
import {go} from './helpers'

test('推入的教材选择页隐藏底部导航，返回学习页后恢复',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordpal.test.synthetic-course','1'))
 await page.setViewportSize({width:390,height:844})
 await go(page,'learn')
 const nav=page.locator('.bottom-nav')
 await expect(nav).toHaveCount(1)
 await expect(nav).toBeVisible()

 await page.getByRole('button',{name:'选择教材',exact:true}).click()
 await expect(page.locator('.course-gallery-heading')).toBeVisible()
 await expect(nav).toHaveCount(0)

 await page.getByRole('button',{name:'返回学习',exact:true}).click()
 await expect(page.locator('.current-course-card')).toBeVisible()
 await expect(nav).toHaveCount(1)
 await expect(nav).toBeVisible()
})
