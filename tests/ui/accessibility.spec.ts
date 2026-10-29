import {startIndependentStudy} from './helpers'
import {openCustomPractice} from './helpers'
import {test,expect} from '@playwright/test'
import {app,go,setAppearance,seedDatabase} from './helpers'
import {goldenDatabase} from './fixtures'
for(const theme of ['swiss'])for(const mode of ['light','dark'])for(const reducedMotion of [false,true])for(const largeText of [false,true]){
 test(`${theme}/${mode} 减少动效=${reducedMotion} 大字体=${largeText}`,async({page})=>{
  await setAppearance(page,theme,mode,{reducedMotion,largeText});await seedDatabase(page,goldenDatabase())
  for(const width of [390,768,1280]){
   await page.setViewportSize({width,height:900})
   for(const screen of ['home','learn','pet','review','settings']){
    await go(page,screen);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy()
    if(largeText)await expect(app(page)).toHaveClass(/large-text/)
    if(reducedMotion)await expect(app(page)).toHaveClass(/reduce-motion/)
    const minimum=await page.locator('[role=button]:visible').evaluateAll(elements=>Math.min(...elements.map(e=>e.getBoundingClientRect().height)))
    const small=await page.locator('[role=button]:visible').evaluateAll(nodes=>nodes.filter(e=>e.getBoundingClientRect().height<48).map(e=>({label:e.getAttribute('aria-label')||e.textContent,className:e.className,height:e.getBoundingClientRect().height})))
    expect(minimum,JSON.stringify(small)).toBeGreaterThanOrEqual(screen==='pet'?44:48)
   }
  }
 })
}
test('实际输入和按钮有名称，键盘聚焦可见并能激活',async({page})=>{
 await go(page,'home');await startIndependentStudy(page);await openCustomPractice(page);const spell=page.locator('.mode-button').filter({hasText:'拼写'});await spell.focus();await expect(spell).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('textbox',{name:'输入中文对应的英文单词'})).toBeVisible()
 await expect(page.getByRole('button',{name:'播放当前单词的标准发音'})).toBeVisible()
})
