import {expect,type Page} from '@playwright/test'
export const app=(page:Page)=>page.locator('.wp-app')
export const go=async(page:Page,screen:string)=>{await page.goto(`/#/pages/${screen}/index`);await app(page).waitFor();await page.waitForLoadState('networkidle')}
export async function setAppearance(page:Page,themeId:string,colorMode:string,extra:Record<string,boolean>={}){
 await page.addInitScript(({themeId,colorMode,extra})=>{
   if(!localStorage.getItem('wordpal.appearance.v1'))localStorage.setItem('wordpal.appearance.v1',JSON.stringify({themeId,colorMode,reducedMotion:true,largeText:false,highContrast:false,screenReaderLabels:true,dynamicColor:false,...extra}))
 },{themeId,colorMode,extra})
}
export async function seedDatabase(page:Page,db:object){
 await page.addInitScript(db=>{if(!localStorage.getItem('wordpal.database.v1'))localStorage.setItem('wordpal.database.v1',JSON.stringify(db))},db)
}
export async function database(page:Page){return page.evaluate(()=>{const pointer=JSON.parse(localStorage.getItem('wordpal.database.active.v2')||'null'),key=pointer==='v2'?'wordpal.database.v2':pointer?.version===2?pointer.key:'wordpal.database.v1';return JSON.parse(localStorage.getItem(key)!)} )}
export async function openCustomPractice(page:Page){const button=page.getByRole('button',{name:/^自定义练习 ·/});await button.waitFor({state:'visible'});if(await button.getAttribute('aria-expanded')!=='true')await button.click()}
export async function openExploration(page:Page){const button=page.getByRole('button',{name:'展开自然拼读与例句',exact:true});if(await button.count())await button.click()}

export async function answerParentGate(page:Page){
 const question=await page.locator('.parent-math-question').innerText(),numbers=question.match(/\d+/g)!.map(Number)
 await page.getByRole('spinbutton',{name:'家长验证答案'}).fill(String(numbers[0]*numbers[1]))
 await page.getByRole('button',{name:'验证并打开',exact:true}).click()
 await expect(page.locator('.parent-learning-settings')).toBeVisible()
}
export async function unlockParent(page:Page){await go(page,'parent');await answerParentGate(page)}
