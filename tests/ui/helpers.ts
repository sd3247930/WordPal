import type {Page} from '@playwright/test'
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
export async function database(page:Page){return page.evaluate(()=>JSON.parse(localStorage.getItem('wordpal.database.v1')!))}
