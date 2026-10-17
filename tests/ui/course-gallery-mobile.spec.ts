import {test,expect} from '@playwright/test'
import {go} from './helpers'

const PHONE={width:390,height:844}
async function openGallery(page:import('@playwright/test').Page){
 await page.addInitScript(()=>localStorage.setItem('wordpal.test.synthetic-course','1'))
 await page.setViewportSize(PHONE)
 await go(page,'learn')
 await page.getByRole('button',{name:'选择教材',exact:true}).click()
 await expect(page.locator('.course-gallery-heading')).toBeVisible()
}

test('手机视口：确认按钮整块可点，未被底部导航遮挡',async({page})=>{
 await openGallery(page)
 const confirm=page.getByRole('button',{name:'确认并应用',exact:true})
 await expect(confirm).toBeEnabled()
 // Pushed pages hide the tab bar, so nothing can overlap the primary action.
 await expect(page.locator('.bottom-nav')).toHaveCount(0)
 const box=(await confirm.boundingBox())!
 expect(box.height).toBeGreaterThanOrEqual(48)
 expect(box.y+box.height).toBeLessThanOrEqual(PHONE.height)
 const hits=await page.evaluate(({x,y,width,height})=>{
  const out:Array<{cls:string;tag:string}|null>=[]
  for(const ratio of [0.05,0.25,0.5,0.75,0.95]){
   const el=document.elementFromPoint(x+width/2,y+height*ratio)
   out.push(el?{cls:String(el.className),tag:el.tagName}:null)
  }
  return out
 },box)
 for(const hit of hits){
  expect(hit).not.toBeNull()
  expect(hit!.cls).toContain('wp-button')
  expect(hit!.cls).not.toContain('bottom-item')
  expect(hit!.cls).not.toContain('bottom-nav')
 }
})

test('手机视口：学习页底部导航在上，教材选择页不与其重叠',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wordpal.test.synthetic-course','1'))
 await page.setViewportSize(PHONE)
 await go(page,'learn')
 const nav=page.locator('.bottom-nav')
 await expect(nav).toHaveCount(1)
 const navBox=(await nav.boundingBox())!
 expect(navBox.y+navBox.height).toBeLessThanOrEqual(PHONE.height+1)
 const card=page.locator('.current-course-card')
 await expect(card).toBeVisible()
 expect((await card.boundingBox())!.y).toBeLessThan(navBox.y)
})
